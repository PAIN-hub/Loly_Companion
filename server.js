import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import {
  chatWithGemini,
  chatStreamWithGemini,
  verifyAgentAction,
  listGeminiModels,
  SUPPORTED_GEMINI_MODELS,
  GEMINI_DEFAULT_MODEL
} from './gemini.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4141;
const HOST = '127.0.0.1';
const SOCKET_PATH = process.platform === 'win32' ? '\\\\.\\pipe\\coucou' : '/tmp/coucou.sock';

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
        model: model || activeSelectedModel || GEMINI_DEFAULT_MODEL,
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
          model: model || activeSelectedModel || GEMINI_DEFAULT_MODEL,
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

    // 8. Get/Set API Key Configuration
    if (url.pathname === '/api/config' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        hasApiKey: Boolean(inMemoryApiKey),
        maskedKey: inMemoryApiKey ? `${inMemoryApiKey.slice(0, 4)}...${inMemoryApiKey.slice(-4)}` : '',
        activeModel: activeSelectedModel
      }));
      return;
    }

    if (url.pathname === '/api/config' && req.method === 'POST') {
      const { apiKey } = await parseJsonBody();
      if (typeof apiKey === 'string') {
        inMemoryApiKey = apiKey.trim();
        db.setSetting('gemini_api_key', inMemoryApiKey);
        broadcast('config_updated', { hasApiKey: Boolean(inMemoryApiKey) });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, hasApiKey: Boolean(inMemoryApiKey) }));
        return;
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid apiKey parameter' }));
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
      const filePath = path.join(__dirname, 'public', safePath);

      // Verify boundary
      if (!filePath.startsWith(path.join(__dirname, 'public'))) {
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
        fs.createReadStream(filePath).pipe(res);
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
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[Loly Server] Port ${PORT} already active. Reusing running daemon instance.`);
  } else {
    console.error('[Loly Server Error]:', err);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(`  Loly - AI Coding Agent Desktop Companion & Island   `);
  console.log(`  HTTP Web Server: http://${HOST}:${PORT}              `);
  console.log(`=======================================================`);
  setupUnixSocketServer();
});
