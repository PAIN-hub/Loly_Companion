import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import {
  chatWithGemini,
  chatStreamWithGemini,
  verifyAgentAction,
  listGeminiModels,
  SUPPORTED_GEMINI_MODELS,
  GEMINI_DEFAULT_MODEL,
  resolveCloudModel
} from './gemini.js';
import { runCodingAgent, getWorkspaceDir, setWorkspaceDir } from './agent.js';
import { redactSecrets } from './public/tool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4141;
const HOST = '127.0.0.1';
const SOCKET_PATH = process.platform === 'win32' ? '\\\\.\\pipe\\coucou' : '/tmp/coucou.sock';

/* ---------- Gen-v5 Bridge Engine: Sessions & Stateful Runner ---------- */
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 120_000;
const clampMs = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Math.min(MAX_TIMEOUT_MS, Math.max(1000, Math.round(Number(v)))) : DEFAULT_TIMEOUT_MS);
const MAX_OUTPUT = 1024 * 1024;
const MAX_SESSIONS = 50;
const SIGNALS = os.constants.signals;

const isDir = async (p) => { try { return (await fs.promises.stat(p)).isDirectory(); } catch { return false; } };
const sessions = new Map(); // token -> { cwd, busy }
const TOKEN_RE = /^[a-f0-9]{64}$/;

function createSession() {
  if (sessions.size >= MAX_SESSIONS) sessions.delete(sessions.keys().next().value);
  const token = crypto.randomBytes(32).toString('hex');
  const startDir = getWorkspaceDir() || process.cwd();
  const session = { cwd: startDir, busy: false };
  sessions.set(token, session);
  return { token, session };
}
const findSession = (token) => (typeof token === 'string' && TOKEN_RE.test(token) ? sessions.get(token) : undefined);

// Own process group so Stop/timeout kills whole tree. fd 3 reports final $PWD so `cd` persists.
const runCommand = ({ command, cwd, timeoutMs, signal }) => new Promise((resolve) => {
  const isWin = process.platform === 'win32';
  let child;

  if (isWin) {
    child = spawn('powershell.exe', ['-NoProfile', '-Command', `${command}; Write-Host '__LOLY_PWD__' (Get-Location).Path`], {
      cwd,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } else {
    const script = `trap 'printf %s "$PWD" >&3' EXIT\n${command}`;
    child = spawn('/bin/bash', ['-c', script], {
      cwd,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe', 'pipe'],
      env: { ...process.env, CI: '1', TERM: 'dumb' }
    });
  }

  let stdout = '';
  let stderr = '';
  let cwdOut = '';
  let note = '';
  let exitCode = 1;
  let settled = false;

  const killTree = () => {
    try {
      if (isWin) {
        spawn('taskkill', ['/pid', String(child.pid), '/f', '/t']);
      } else {
        process.kill(-child.pid, 'SIGKILL');
      }
    } catch { /* already gone */ }
  };

  const timer = setTimeout(() => { note = `\n[timed out after ${timeoutMs / 1000}s]`; killTree(); }, timeoutMs);
  const onAbort = () => { note = '\n[cancelled]'; killTree(); };
  signal.addEventListener('abort', onAbort, { once: true });

  const finish = () => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
    for (const s of [child.stdout, child.stderr, child.stdio?.[3]]) s?.destroy?.();
    resolve({ stdout: stdout.trim(), stderr: (stderr + note).trim(), exitCode, cwd: cwdOut || cwd });
  };

  child.stdout?.setEncoding('utf8').on('data', (d) => {
    if (isWin && d.includes('__LOLY_PWD__')) {
      const parts = d.split('__LOLY_PWD__');
      stdout += parts[0];
      cwdOut = parts[1]?.trim() || '';
    } else {
      if (stdout.length < MAX_OUTPUT) stdout += d;
    }
  });
  child.stderr?.setEncoding('utf8').on('data', (d) => { if (stderr.length < MAX_OUTPUT) stderr += d; });
  if (!isWin && child.stdio[3]) {
    child.stdio[3].setEncoding('utf8').on('data', (d) => { if (cwdOut.length < 4096) cwdOut += d; });
  }
  child.on('error', (err) => { stderr += err.message; finish(); });
  child.on('exit', (code, sig) => { exitCode = code ?? 128 + (SIGNALS[sig] ?? 0); setTimeout(finish, 100); });
  child.on('close', finish);
});

function getPublicDir() {
  const localPublic = path.join(__dirname, 'public');
  if (fs.existsSync(localPublic)) {
    return localPublic;
  }
  if (process.resourcesPath) {
    const asarPublic = path.join(process.resourcesPath, 'app.asar', 'public');
    if (fs.existsSync(asarPublic)) return asarPublic;
    const unpackedPublic = path.join(process.resourcesPath, 'public');
    if (fs.existsSync(unpackedPublic)) return unpackedPublic;
  }
  return localPublic;
}

// In-memory runtime state
const sseClients = new Set();
const pendingApprovals = new Map(); // id -> { approval, resolve: function }
let inMemoryApiKey = db.getSetting('gemini_api_key') || process.env.GEMINI_API_KEY || '';
let activeSelectedModel = db.getSetting('selected_model') || GEMINI_DEFAULT_MODEL;
let currentAgent = {
  name: 'gemini-cli',
  status: 'idle', // idle, working, waiting_approval, success, error
  lastActivity: Date.now(),
  tickerText: 'Waiting for agent activity...'
};

// Broadcast an event to all connected UI clients
function broadcast(eventType, data) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch (_) {
      sseClients.delete(client);
    }
  }
}

// Ingest an event from any source (HTTP, Socket, CLI)
function ingestEvent(payload, waitSync = false) {
  const agentName = String(payload.coucou_agent || payload.agent || 'agent').toLowerCase().slice(0, 32);
  const sessionId = payload.session_id || 'default-session';
  const eventType = payload.event_type || 'info';
  const title = payload.title || payload.action || 'Agent Step';
  const details = payload.details || payload.target || '';
  const diff = payload.diff || null;
  const options = payload.options || null;

  db.createOrUpdateSession(sessionId, agentName, payload.prompt || '');
  db.logEvent(sessionId, agentName, eventType, title, typeof details === 'string' ? details : JSON.stringify(details));

  // Update current agent state
  currentAgent.name = agentName;
  currentAgent.lastActivity = Date.now();
  currentAgent.tickerText = title + (details ? `: ${details}` : '');

  let approvalPromise = null;
  let approvalId = null;

  if (payload.requires_approval || eventType === 'approval_request') {
    approvalId = payload.id || `appr-${crypto.randomBytes(6).toString('hex')}`;
    currentAgent.status = 'waiting_approval';

    const approvalData = {
      id: approvalId,
      sessionId,
      agentName,
      actionType: payload.action_type || 'bash_command',
      target: payload.target || title,
      details,
      diff,
      options,
      created_at: new Date().toISOString()
    };

    db.createApproval(approvalId, sessionId, agentName, approvalData.actionType, approvalData.target);

    if (waitSync) {
      approvalPromise = new Promise((resolve) => {
        const timer = setTimeout(() => {
          if (pendingApprovals.has(approvalId)) {
            pendingApprovals.delete(approvalId);
            resolve({ decision: 'timeout' });
          }
        }, 120000); // 2 minute timeout

        pendingApprovals.set(approvalId, {
          data: approvalData,
          resolve: (decision) => {
            clearTimeout(timer);
            resolve(decision);
          }
        });
      });
    } else {
      pendingApprovals.set(approvalId, {
        data: approvalData,
        resolve: () => {}
      });
    }

    broadcast('approval_request', approvalData);
  } else if (eventType === 'completed' || eventType === 'session_end') {
    currentAgent.status = 'success';
    db.endSession(sessionId);
    broadcast('agent_status', { ...currentAgent, eventType });
  } else if (eventType === 'error') {
    currentAgent.status = 'error';
    broadcast('agent_status', { ...currentAgent, eventType });
  } else {
    currentAgent.status = 'working';
    broadcast('agent_activity', {
      agentName,
      sessionId,
      eventType,
      title,
      details,
      diff,
      stats: db.getStats()
    });
  }

  broadcast('agent_status', currentAgent);
  return { approvalId, approvalPromise };
}

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.weba': 'audio/webm'
};

// HTTP Request Handler
const server = http.createServer(async (req, res) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:4141');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1:4141'}`);

  // SSE Event Stream for Real-time Island UI updates
  if (url.pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    });

    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));

    // Send initial snapshot
    const initialData = {
      agent: currentAgent,
      stats: db.getStats(),
      pendingApprovals: Array.from(pendingApprovals.values()).map(v => v.data),
      recentEvents: db.getRecentEvents(15),
      hasApiKey: Boolean(inMemoryApiKey)
    };
    res.write(`event: init\ndata: ${JSON.stringify(initialData)}\n\n`);
    return;
  }

  // Parse JSON Body Helper
  const parseJsonBody = () => new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });

  // REST API Routes
  try {
    // 0a. Shell Bridge Session Creation
    if (url.pathname === '/api/session' && (req.method === 'GET' || req.method === 'POST')) {
      const { token, session } = createSession();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ token, sessionId: token, cwd: session.cwd, timeoutMs: DEFAULT_TIMEOUT_MS, maxTimeoutMs: MAX_TIMEOUT_MS }));
      return;
    }

    // 0b. Shell Bridge Command Execution with fd 3 persistent PWD & Secret Redaction
    if (url.pathname === '/api/exec' && req.method === 'POST') {
      const reqToken = req.headers['x-nexus-token'] || req.headers['x-loly-token'];
      const session = findSession(reqToken);
      if (!session) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad or expired session token' }));
        return;
      }
      if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) {
        res.writeHead(415, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'JSON payload required' }));
        return;
      }
      if (session.busy) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'A command is already executing in this session.' }));
        return;
      }

      session.busy = true;
      try {
        const { command, timeoutMs } = await parseJsonBody();
        if (typeof command !== 'string' || !command.trim() || command.length > 3000) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid command payload' }));
          return;
        }

        const currentStart = getWorkspaceDir() || process.cwd();
        if (!(await isDir(session.cwd))) session.cwd = currentStart;

        const ac = new AbortController();
        res.on('close', () => { if (!res.writableEnded) ac.abort(); });
        const effectiveMs = clampMs(timeoutMs);

        currentAgent.name = 'Loly-Agent';
        currentAgent.status = 'working';
        currentAgent.tickerText = `Running: ${command.slice(0, 40)}...`;
        broadcast('agent_status', currentAgent);
        broadcast('agent_activity', { agentName: 'Loly-Agent', title: 'Running command', details: command });

        const out = await runCommand({ command, cwd: session.cwd, timeoutMs: effectiveMs, signal: ac.signal });

        if (out.cwd && path.isAbsolute(out.cwd) && (await isDir(out.cwd))) {
          session.cwd = out.cwd;
          setWorkspaceDir(out.cwd);
        }

        const so = redactSecrets(out.stdout);
        const se = redactSecrets(out.stderr);
        const redactions = so.count + se.count;

        // Log execution to Loly SQLite database
        db.logEvent('session-active', 'Loly-Agent', 'command_run', command.slice(0, 50), JSON.stringify({ exitCode: out.exitCode, cwd: session.cwd }));

        currentAgent.status = out.exitCode === 0 ? 'idle' : 'error';
        currentAgent.tickerText = out.exitCode === 0 ? `Completed: exit 0 in ${path.basename(session.cwd)}` : `Fault: exit ${out.exitCode}`;
        broadcast('agent_status', currentAgent);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          stdout: so.text,
          stderr: se.text,
          exitCode: out.exitCode,
          cwd: session.cwd,
          timeoutMs: effectiveMs,
          redactions
        }));
        return;
      } catch (execErr) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: execErr.message || 'Execution error' }));
        return;
      } finally {
        session.busy = false;
      }
      return;
    }

    // 1. Asynchronous Agent Hook POST
    if (url.pathname === '/api/hook' && req.method === 'POST') {
      const payload = await parseJsonBody();
      const { approvalId } = ingestEvent(payload, false);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, approvalId }));
      return;
    }

    // 2. Synchronous Agent Hook POST (waits for approval)
    if (url.pathname === '/api/hook/sync' && req.method === 'POST') {
      const payload = await parseJsonBody();
      const { approvalPromise } = ingestEvent(payload, true);
      if (approvalPromise) {
        const decision = await approvalPromise;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, decision }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, decision: 'allow' }));
      }
      return;
    }

    // 3. User Decision on Approval
    if (url.pathname === '/api/approve' && req.method === 'POST') {
      const { id, decision } = await parseJsonBody();
      const pending = pendingApprovals.get(id);
      if (pending) {
        pending.resolve(decision);
        pendingApprovals.delete(id);
        db.resolveApproval(id, decision);

        currentAgent.status = 'working';
        currentAgent.tickerText = `Approval ${decision}: ${pending.data.target}`;
        broadcast('approval_resolved', { id, decision });
        broadcast('agent_status', currentAgent);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Approval request not found or expired' }));
      }
      return;
    }

    // 4. Gemini Quick Chat
    if (url.pathname === '/api/gemini/chat' && req.method === 'POST') {
      const { messages, model, fileData, apiKey } = await parseJsonBody();
      if (!Array.isArray(messages) || messages.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Messages array required' }));
        return;
      }

      const effectiveKey = apiKey || inMemoryApiKey;
      const lastUserMsg = messages[messages.length - 1]?.content || '';
      db.addChatMessage('user', lastUserMsg);

      const reply = await chatWithGemini({
        messages,
        apiKey: effectiveKey,
        model: resolveCloudModel(model || activeSelectedModel || GEMINI_DEFAULT_MODEL),
        fileData
      });

      db.addChatMessage('assistant', reply);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply }));
      return;
    }

    // 4b. Gemini Streaming Quick Chat (Server-Sent Events)
    if (url.pathname === '/api/gemini/chat-stream' && req.method === 'POST') {
      const { messages, model, fileData, apiKey } = await parseJsonBody();
      if (!Array.isArray(messages) || messages.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Messages array required' }));
        return;
      }

      const effectiveKey = apiKey || inMemoryApiKey;
      const lastUserMsg = messages[messages.length - 1]?.content || '';
      db.addChatMessage('user', lastUserMsg);

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      });

      let fullReply = '';
      try {
        const stream = chatStreamWithGemini({
          messages,
          apiKey: effectiveKey,
          model: resolveCloudModel(model || activeSelectedModel || GEMINI_DEFAULT_MODEL),
          fileData
        });

        for await (const chunk of stream) {
          fullReply += chunk;
          res.write(`data: ${JSON.stringify({ chunk, fullReply })}\n\n`);
        }

        db.addChatMessage('assistant', fullReply);
        res.write(`data: ${JSON.stringify({ done: true, fullReply })}\n\n`);
        res.end();
      } catch (err) {
        console.error('Chat stream error:', err.message);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      }
      return;
    }

    // 4c. Autonomous AI Coding Agent Runner (Multi-file code editing & tools)
    if (url.pathname === '/api/agent/run' && req.method === 'POST') {
      const { prompt, history, model, apiKey, workspaceDir } = await parseJsonBody();
      if (!prompt) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Prompt is required' }));
        return;
      }

      if (workspaceDir) {
        setWorkspaceDir(workspaceDir);
      }

      const effectiveKey = apiKey || inMemoryApiKey;
      db.addChatMessage('user', prompt);

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      });

      try {
        currentAgent.name = 'Loly-Agent';
        currentAgent.status = 'working';
        currentAgent.tickerText = `Coding Agent: ${prompt.slice(0, 35)}...`;
        broadcast('agent_status', currentAgent);

        const result = await runCodingAgent({
          prompt,
          history: Array.isArray(history) ? history : [],
          apiKey: effectiveKey,
          model: resolveCloudModel(model || activeSelectedModel || GEMINI_DEFAULT_MODEL),
          onStep: (step) => {
            // Stream each tool step to client in real-time
            res.write(`data: ${JSON.stringify({ step })}\n\n`);
            if (step.type === 'tool_call') {
              broadcast('agent_activity', {
                agent: 'Loly-Agent',
                action: step.name,
                target: JSON.stringify(step.args)
              });
            }
          }
        });

        db.addChatMessage('assistant', result.reply);
        currentAgent.status = 'success';
        currentAgent.tickerText = 'All coding tasks completed!';
        broadcast('agent_status', currentAgent);

        res.write(`data: ${JSON.stringify({ done: true, reply: result.reply, toolExecutions: result.toolExecutions })}\n\n`);
        res.end();
      } catch (err) {
        console.error('Agent execution error:', err);
        currentAgent.status = 'error';
        currentAgent.tickerText = `Error: ${err.message}`;
        broadcast('agent_status', currentAgent);

        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      }
      return;
    }

    // 4d-0. Folder browser for the workspace picker (directories only)
    if (url.pathname === '/api/fs/list' && req.method === 'GET') {
      const rawPath = (url.searchParams.get('path') || '').trim();
      const showHidden = url.searchParams.get('hidden') === '1';
      let target = rawPath || getWorkspaceDir() || os.homedir();
      if (target === '~' || target.startsWith('~/')) {
        target = path.join(os.homedir(), target.slice(1));
      }
      target = path.resolve(target);
      try {
        if (!fs.statSync(target).isDirectory()) target = path.dirname(target);
        const dirents = fs.readdirSync(target, { withFileTypes: true });
        const MAX_ENTRIES = 1000;
        const entries = [];
        for (const d of dirents) {
          if (!showHidden && d.name.startsWith('.')) continue;
          let isDir = d.isDirectory();
          if (!isDir && d.isSymbolicLink()) {
            try { isDir = fs.statSync(path.join(target, d.name)).isDirectory(); } catch { isDir = false; }
          }
          if (isDir) entries.push({ name: d.name, path: path.join(target, d.name) });
        }
        entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        const parent = path.dirname(target);
        const markers = ['.git', 'package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod', 'manage.py']
          .filter((m) => fs.existsSync(path.join(target, m)));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          path: target,
          parent: parent === target ? null : parent,
          home: os.homedir(),
          sep: path.sep,
          markers,
          truncated: entries.length > MAX_ENTRIES,
          entries: entries.slice(0, MAX_ENTRIES)
        }));
      } catch (err) {
        res.writeHead(err.code === 'ENOENT' ? 404 : 403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.code === 'ENOENT' ? 'Folder does not exist' : 'Cannot open this folder (permission denied)' }));
      }
      return;
    }

    // 4d. Workspace Directory Information & Management
    if (url.pathname === '/api/agent/workspace' && req.method === 'GET') {
      const active = getWorkspaceDir() || process.cwd();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        workspace: active,
        workspaceDir: active,
        cwd: process.cwd()
      }));
      return;
    }

    if (url.pathname === '/api/agent/workspace' && req.method === 'POST') {
      const body = await parseJsonBody();
      const workspaceDir = body.workspaceDir || body.path || body.dir;
      if (!workspaceDir || typeof workspaceDir !== 'string') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Workspace path must be a non-empty string' }));
        return;
      }
      let target = workspaceDir.trim();
      if (target.startsWith('~')) {
        target = path.join(os.homedir(), target.slice(1));
      } else if (!path.isAbsolute(target)) {
        target = path.resolve(getWorkspaceDir() || process.cwd(), target);
      }
      const updated = setWorkspaceDir(target);
      if (updated) {
        for (const s of sessions.values()) {
          s.cwd = updated;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, workspace: updated, workspaceDir: updated }));
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Directory "${workspaceDir}" does not exist or is not accessible` }));
      }
      return;
    }

    // 5. Gemini Models List (Live from API or Curated Fallback)
    if (url.pathname === '/api/gemini/models' && req.method === 'GET') {
      const effectiveKey = inMemoryApiKey || process.env.GEMINI_API_KEY;
      try {
        const models = await listGeminiModels(effectiveKey);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          models,
          currentModel: activeSelectedModel,
          hasApiKey: Boolean(effectiveKey)
        }));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          models: SUPPORTED_GEMINI_MODELS,
          currentModel: activeSelectedModel,
          hasApiKey: Boolean(effectiveKey),
          fallback: true
        }));
      }
      return;
    }

    // 6. Set Active Model Preference
    if (url.pathname === '/api/gemini/model' && req.method === 'POST') {
      const { model } = await parseJsonBody();
      if (typeof model === 'string' && model.trim()) {
        activeSelectedModel = model.trim();
        db.setSetting('selected_model', activeSelectedModel);
        broadcast('model_changed', { model: activeSelectedModel });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, model: activeSelectedModel }));
        return;
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Model identifier required' }));
      return;
    }

    // 7. Gemini Safety Verification for Agent Action
    if (url.pathname === '/api/gemini/review-action' && req.method === 'POST') {
      const { approvalId, apiKey, model } = await parseJsonBody();
      const pending = pendingApprovals.get(approvalId);
      if (!pending) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Approval request not found' }));
        return;
      }

      const review = await verifyAgentAction({
        actionType: pending.data.actionType,
        target: pending.data.target,
        details: pending.data.details,
        apiKey: apiKey || inMemoryApiKey,
        model: model || activeSelectedModel || GEMINI_DEFAULT_MODEL
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ review }));
      return;
    }

    // 8. Get/Set API Key Configuration & Island Preferences
    if (url.pathname === '/api/config' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        hasApiKey: Boolean(inMemoryApiKey),
        maskedKey: inMemoryApiKey ? `${inMemoryApiKey.slice(0, 4)}...${inMemoryApiKey.slice(-4)}` : '',
        activeModel: activeSelectedModel,
        autohideSeconds: db.getSetting('autohide_seconds') !== null ? Number(db.getSetting('autohide_seconds')) : 30,
        voiceWakeEnabled: db.getSetting('voice_wake_enabled') !== 'false'
      }));
      return;
    }

    if (url.pathname === '/api/config' && req.method === 'POST') {
      const { apiKey, autohideSeconds, voiceWakeEnabled } = await parseJsonBody();
      if (typeof apiKey === 'string') {
        inMemoryApiKey = apiKey.trim();
        db.setSetting('gemini_api_key', inMemoryApiKey);
        broadcast('config_updated', { hasApiKey: Boolean(inMemoryApiKey) });
      }
      if (typeof autohideSeconds !== 'undefined') {
        db.setSetting('autohide_seconds', Number(autohideSeconds));
      }
      if (typeof voiceWakeEnabled !== 'undefined') {
        db.setSetting('voice_wake_enabled', Boolean(voiceWakeEnabled));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        hasApiKey: Boolean(inMemoryApiKey),
        autohideSeconds: db.getSetting('autohide_seconds') !== null ? Number(db.getSetting('autohide_seconds')) : 30,
        voiceWakeEnabled: db.getSetting('voice_wake_enabled') !== 'false'
      }));
      return;
    }

    // 7. Launch App Route (Works in browser or standalone)
    if (url.pathname === '/api/launch-app' && req.method === 'POST') {
      const { appName } = await parseJsonBody();
      const isWin = process.platform === 'win32';
      let cmd = '';
      if (appName === 'terminal') {
        cmd = isWin ? 'start cmd.exe' : 'x-terminal-emulator || gnome-terminal || konsole || xterm &';
      } else if (appName === 'vscode') {
        cmd = 'code . &';
      } else if (appName === 'browser') {
        cmd = isWin ? 'start https://google.com' : 'xdg-open https://google.com &';
      } else if (appName === 'files') {
        cmd = isWin ? 'explorer .' : 'xdg-open . &';
      }
      if (cmd) {
        import('node:child_process').then(({ exec }) => {
          exec(cmd);
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, appName }));
        return;
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unknown app identifier' }));
      return;
    }

    // Dynamic Island Window Resize Fallback Route
    if (url.pathname === '/api/resize-island' && req.method === 'POST') {
      const { expanded } = await parseJsonBody();
      if (globalThis.__lolyResizeIsland) {
        globalThis.__lolyResizeIsland(Boolean(expanded));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, expanded: Boolean(expanded) }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, note: 'Not running inside Electron' }));
      return;
    }

    // 8. Weather Route (Fetches current weather or provides fallback)
    if (url.pathname === '/api/weather' && req.method === 'GET') {
      const city = url.searchParams.get('city') || '';
      try {
        const query = city ? encodeURIComponent(city) : '';
        const fetchUrl = `https://wttr.in/${query}?format=j1`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const weatherRes = await fetch(fetchUrl, {
          signal: controller.signal,
          headers: { 'User-Agent': 'curl/7.68.0' }
        });
        clearTimeout(timeout);
        if (weatherRes.ok) {
          const wData = await weatherRes.json();
          const current = wData.current_condition?.[0] || {};
          const area = wData.nearest_area?.[0]?.areaName?.[0]?.value || city || 'Local Area';
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            city: area,
            tempC: current.temp_C || '22',
            desc: current.weatherDesc?.[0]?.value || 'Pleasant',
            humidity: current.humidity || '45'
          }));
          return;
        }
      } catch (_) {}

      // Fallback pleasant defaults
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        city: city || 'Current Location',
        tempC: '22',
        desc: 'Clear & Mild',
        humidity: '48'
      }));
      return;
    }

    // 9. Stats & History
    if (url.pathname === '/api/history' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        stats: db.getStats(),
        recentEvents: db.getRecentEvents(50),
        chatHistory: db.getRecentChat(30)
      }));
      return;
    }

    // 8. Static File Serving (public directory)
    if (req.method === 'GET' || req.method === 'HEAD') {
      let reqPath = url.pathname === '/' ? '/index.html' : url.pathname;
      const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
      const publicDir = path.resolve(getPublicDir());
      const filePath = path.resolve(publicDir, safePath.startsWith(path.sep) ? safePath.slice(1) : safePath);

      // Verify boundary
      if (!filePath.startsWith(publicDir)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Access denied');
        return;
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        res.writeHead(200, {
          'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        if (req.method === 'HEAD') {
          res.end();
          return;
        }
        fs.readFile(filePath, (readErr, data) => {
          if (readErr) {
            console.error('Error reading file:', filePath, readErr);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error reading asset');
            return;
          }
          res.end(data);
        });
        return;
      }
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (err) {
    console.error('API Error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
  }
});

// Setup Unix Domain Socket Server for standard Coucou hooks
function setupUnixSocketServer() {
  if (process.platform !== 'win32') {
    try {
      if (fs.existsSync(SOCKET_PATH)) {
        fs.unlinkSync(SOCKET_PATH);
      }
    } catch (_) {}
  }

  const socketServer = net.createServer((client) => {
    let buffer = '';
    client.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const payload = JSON.parse(line);
          const { approvalPromise } = ingestEvent(payload, true);
          if (approvalPromise) {
            approvalPromise.then((decision) => {
              client.write(JSON.stringify({ decision }) + '\n');
            });
          } else {
            client.write(JSON.stringify({ status: 'ok' }) + '\n');
          }
        } catch (err) {
          client.write(JSON.stringify({ error: 'invalid_json' }) + '\n');
        }
      }
    });
  });

  socketServer.on('error', (err) => {
    console.warn(`[Socket Server Warning]: ${err.message}. HTTP endpoints remain fully operational.`);
  });

  socketServer.listen(SOCKET_PATH, () => {
    console.log(`[Socket Server] IPC Listening at: ${SOCKET_PATH}`);
  });

  const cleanup = () => {
    try {
      if (process.platform !== 'win32' && fs.existsSync(SOCKET_PATH)) {
        fs.unlinkSync(SOCKET_PATH);
      }
    } catch (_) {}
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

// Start HTTP Server
let serverStartedPromise = null;
export function startServer() {
  if (serverStartedPromise) return serverStartedPromise;
  serverStartedPromise = new Promise((resolve) => {
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[Loly Server] Port ${PORT} already active. Reusing running daemon instance.`);
        resolve({ port: PORT, host: HOST, reused: true });
      } else {
        console.error('[Loly Server Error]:', err);
        resolve({ port: PORT, host: HOST, error: err });
      }
    });

    server.listen(PORT, HOST, () => {
      console.log(`=======================================================`);
      console.log(`  Loly - AI Coding Agent Desktop Companion & Island   `);
      console.log(`  HTTP Web Server: http://${HOST}:${PORT}              `);
      console.log(`=======================================================`);
      setupUnixSocketServer();
      resolve({ port: PORT, host: HOST, reused: false });
    });
  });
  return serverStartedPromise;
}

// Auto-start for daemon and direct CLI usage
startServer();
