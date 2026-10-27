// loly-agent.js — Unified Gen-v5 Agent Engine for Loly Companion
// Multi-provider streaming (Gemini, Claude, OpenAI), stateful PWD shell runner,
// interactive command permissions, and secret redaction.

import { streamTurn, listModels, PROVIDERS } from './providers.js';
import { TOOL_NAME, clampTimeoutSec, redactSecrets } from './tool.js';
import { InputHistory } from './input-history.js';
import { Transcript } from './transcript.js';
import { createCodeBlock, renderInline } from './render.js';

const SETTINGS_KEY = 'loly.settings.v1';
const KEYS_KEY = 'loly.keys.v1';
const MAX_OUTPUT_CHARS = 4000;
const RISKY = /\b(rm\s+-\w*[rf]|sudo|mkfs|dd\s+if=|chmod\s+-R|chown\s+-R|shutdown|reboot|kill\s+-9)\b|\|\s*(ba)?sh\b|>\s*\/dev\//i;

const DEFAULT_MODELS = {
  chrome: 'gemini-nano',
  gemini: 'gemini-3.5-flash',
  anthropic: 'claude-3-7-sonnet-20250219',
  openai: 'gpt-4o'
};

/* ---------- Storage & Settings ---------- */
const area = (kind) => { try { return window[kind]; } catch { return null; } };
const readStorage = (kind, key) => { try { return JSON.parse(area(kind)?.getItem(key) ?? 'null'); } catch { return null; } };
const writeStorage = (kind, key, v) => { try { area(kind)?.setItem(key, JSON.stringify(v)); } catch { /* blocked */ } };
const dropStorage = (kind, key) => { try { area(kind)?.removeItem(key); } catch { /* blocked */ } };

const ids = Object.keys(PROVIDERS);
const perProvider = (src, max) =>
  Object.fromEntries(ids.map((id) => [id, typeof src?.[id] === 'string' ? src[id].trim().slice(0, max) : (DEFAULT_MODELS[id] || '')]));
const perProviderKeys = (src, max) =>
  Object.fromEntries(ids.map((id) => [id, typeof src?.[id] === 'string' ? src[id].trim().slice(0, max) : '']));
const clamp = (n, lo, hi, d) => (Number.isFinite(+n) ? Math.min(hi, Math.max(lo, Math.round(+n))) : d);

export function sanitizeSettings(input) {
  const { settings, keys } = input && typeof input === 'object' ? input : {};
  const rawProvider = settings?.provider;
  const provider = Object.hasOwn(PROVIDERS, rawProvider) ? rawProvider : 'gemini';
  const models = perProvider(settings?.models, 120);

  // Set default Gemini model if missing or invalid
  if (!models.gemini || models.gemini === 'gemini') {
    models.gemini = 'gemini-3.5-flash';
  }
  if (!models.chrome) {
    models.chrome = 'gemini-nano';
  }

  return {
    settings: {
      provider,
      models,
      maxTokens: clamp(settings?.maxTokens, 256, 64000, 4096),
      maxSteps: clamp(settings?.maxSteps, 1, 12, 6),
      timeoutSec: clampTimeoutSec(settings?.timeoutSec),
      remember: settings?.remember === true
    },
    keys: perProviderKeys(keys, 400)
  };
}

let state = sanitizeSettings({
  settings: readStorage('localStorage', SETTINGS_KEY),
  keys: readStorage('localStorage', KEYS_KEY) ?? readStorage('sessionStorage', KEYS_KEY)
});

// Fallback to legacy GEMINI_API_KEY if not yet set in new keys structure
if (!state.keys.gemini) {
  const legacyKey = localStorage.getItem('loly_gemini_key') || sessionStorage.getItem('loly_gemini_key');
  if (legacyKey) state.keys.gemini = legacyKey.trim();
}

export const getAgentState = () => structuredClone(state);

function persistKeys() {
  const [keep, other] = state.settings.remember ? ['localStorage', 'sessionStorage'] : ['sessionStorage', 'localStorage'];
  writeStorage(keep, KEYS_KEY, state.keys);
  dropStorage(other, KEYS_KEY);
}

export function commitAgentSettings(next) {
  state = sanitizeSettings(next);
  writeStorage('localStorage', SETTINGS_KEY, state.settings);
  persistKeys();
}

export function clearAgentKeys() {
  state.keys = perProviderKeys({}, 0);
  dropStorage('localStorage', KEYS_KEY);
  dropStorage('sessionStorage', KEYS_KEY);
}

export function setActiveProviderAndModel(provider, model) {
  if (Object.hasOwn(PROVIDERS, provider)) {
    state.settings.provider = provider;
    if (model) {
      state.settings.models[provider] = model;
    }
    commitAgentSettings(state);
    return getAgentConfig();
  }
  return null;
}

export function getAgentConfig() {
  const { settings, keys } = state;
  const p = settings.provider || 'gemini';
  const pMeta = PROVIDERS[p] || PROVIDERS.gemini;
  let model = settings.models[p] || DEFAULT_MODELS[p] || '';
  if (p === 'gemini' && !model) {
    model = 'gemini-3.5-flash';
  }
  const requiresKey = pMeta.requiresKey !== false;
  return {
    provider: p,
    label: pMeta.label,
    model,
    apiKey: requiresKey ? (keys[p] || '') : 'on-device-no-key-needed',
    requiresKey,
    maxTokens: settings.maxTokens,
    maxSteps: settings.maxSteps,
    timeoutSec: settings.timeoutSec
  };
}

/* ---------- Transcript & History ---------- */
export const transcript = new Transcript();
export const inputHistory = new InputHistory({
  storage: (() => { try { return window.sessionStorage; } catch { return null; } })()
});
const agentHistory = [];
const stats = { commands: 0, redactions: 0 };
export const bridge = { token: null, cwd: '', online: false };

let currentController = null;
let currentResolvePermission = null;

/* ---------- Shell Bridge Client ---------- */
export async function ensureBridgeSession(force = false) {
  if (bridge.token && !force) return bridge;
  try {
    const res = await fetch('/api/session');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const s = await res.json();
    Object.assign(bridge, { token: s.token, cwd: s.cwd, online: true });
    return bridge;
  } catch (err) {
    Object.assign(bridge, { token: null, online: false });
    throw new Error(`Shell Bridge unreachable (${err.message}) — is Loly server active?`);
  }
}

async function runLocalCommand(command, timeoutSec, signal) {
  for (let attempt = 0; attempt < 2; attempt++) {
    await ensureBridgeSession();
    let res;
    try {
      res = await fetch('/api/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Loly-Token': bridge.token,
          'X-Nexus-Token': bridge.token
        },
        body: JSON.stringify({ command, timeoutMs: timeoutSec * 1000 }),
        signal
      });
    } catch (err) {
      if (err?.name !== 'AbortError') bridge.online = false;
      throw err;
    }
    if (res.status === 401 && attempt === 0) {
      bridge.token = null;
      continue;
    }
    if (res.status === 409) throw new Error('Bridge is still busy executing a previous command.');
    if (!res.ok) throw new Error(`Bridge error: HTTP ${res.status}`);
    const out = await res.json();
    if (typeof out.cwd === 'string') bridge.cwd = out.cwd;
    return out;
  }
  throw new Error('Bridge session expired.');
}

const combineOutput = ({ stdout, stderr }) =>
  [stdout, stderr && (stdout ? `[stderr]\n${stderr}` : stderr)].filter(Boolean).join('\n') || '(no output)';

const clip = (s) => (s.length > MAX_OUTPUT_CHARS ? `${s.slice(0, MAX_OUTPUT_CHARS)}\n…[truncated]` : s);

/* ---------- Interactive Permission Gate ---------- */
function requestCommandPermission({ command, reason, timeoutSec, cwd }, streamEl, signal) {
  return new Promise((resolve) => {
    currentResolvePermission = resolve;
    const risky = RISKY.test(command);
    const card = document.createElement('div');
    card.className = `perm-card${risky ? ' is-risky' : ''}`;

    const title = document.createElement('div');
    title.className = 'perm-title';
    title.textContent = `${risky ? 'High Risk Action • ' : ''}Permission Required: ${reason}`;

    const meta = document.createElement('div');
    meta.className = 'perm-meta';
    meta.textContent = `${cwd || '(workspace)'} • timeout ${timeoutSec}s`;

    const code = createCodeBlock('bash', command).root;

    const actions = document.createElement('div');
    actions.className = 'perm-actions';

    const approveBtn = document.createElement('button');
    approveBtn.type = 'button';
    approveBtn.className = 'btn-perm-approve';
    approveBtn.textContent = 'Approve & Run';

    const denyBtn = document.createElement('button');
    denyBtn.type = 'button';
    denyBtn.className = 'btn-perm-deny';
    denyBtn.textContent = 'Deny';

    // Show notch quick action buttons
    const pillQuickActions = document.getElementById('pillQuickActions');
    if (pillQuickActions) pillQuickActions.style.display = 'flex';

    let settled = false;
    const finalize = (approved, label) => {
      if (settled) return;
      settled = true;
      currentResolvePermission = null;
      signal.removeEventListener('abort', onAbort);
      if (pillQuickActions) pillQuickActions.style.display = 'none';
      card.classList.add(approved ? 'is-approved' : 'is-denied');
      title.textContent = label;
      actions.remove();
      resolve(approved);
    };

    const onAbort = () => finalize(false, 'Cancelled by user');
    signal.addEventListener('abort', onAbort, { once: true });

    approveBtn.addEventListener('click', () => finalize(true, 'Approved by user'), { once: true });
    denyBtn.addEventListener('click', () => finalize(false, 'Denied by user'), { once: true });

    actions.append(approveBtn, denyBtn);
    card.append(title, meta, code, actions);
    streamEl.appendChild(card);
    streamEl.scrollTop = streamEl.scrollHeight;
  });
}

export function resolveCurrentPendingPermission(decision) {
  if (currentResolvePermission) {
    currentResolvePermission(decision === 'allow' || decision === true);
  }
}

/* ---------- Tool Call Runner ---------- */
async function runToolCall({ id, name, args }, cfg, streamEl, signal) {
  const done = (result) => ({ id, name, result });
  if (signal.aborted) return done({ error: 'Cancelled by user.' });
  if (name !== TOOL_NAME) return done({ error: `Unknown tool: ${name}` });

  const command = String(args?.command ?? '').trim();
  if (!command) return done({ error: 'Empty command.' });
  const timeoutSec = clampTimeoutSec(args.timeout_seconds, cfg.timeoutSec);
  const reason = args.reason || 'Run shell command';

  const approved = await requestCommandPermission({ command, reason, timeoutSec, cwd: bridge.cwd }, streamEl, signal);
  transcript.add('command', { command, reason, timeoutSec, cwd: bridge.cwd, status: approved ? 'approved' : signal.aborted ? 'cancelled' : 'denied' });
  if (!approved) {
    return done({ error: signal.aborted ? 'Cancelled by user.' : 'User explicitly denied permission to execute this command.' });
  }

  const r = await runLocalCommand(command, timeoutSec, signal);
  const red = redactSecrets(clip(combineOutput(r)), [cfg.apiKey]);
  const redactions = (r.redactions ?? 0) + red.count;
  stats.commands++;
  stats.redactions += redactions;

  // Append Tool Output Bubble
  const outWrap = document.createElement('div');
  outWrap.className = 'tool-step-item';
  outWrap.style.margin = '6px 0';

  const badge = document.createElement('div');
  badge.className = 'tool-step-badge';
  badge.innerHTML = `
    <span class="tool-output-chip ${r.exitCode === 0 ? 'is-ok' : 'is-warn'}">exit ${r.exitCode}</span>
    <span style="font-family: var(--font-mono); font-size: 11px; margin-left: 6px;">${r.cwd || bridge.cwd}</span>
    ${redactions > 0 ? `<span class="tool-output-chip is-warn" style="margin-left: 6px;">${redactions} secret(s) masked</span>` : ''}
  `;

  outWrap.appendChild(badge);
  outWrap.appendChild(createCodeBlock('output', red.text).root);
  streamEl.appendChild(outWrap);
  streamEl.scrollTop = streamEl.scrollHeight;

  transcript.add('output', { exitCode: r.exitCode, output: red.text, cwd: r.cwd });
  return done({ exitCode: r.exitCode, output: red.text, cwd: r.cwd });
}

/* ---------- Main Autonomous Agent Loop ---------- */
export async function runLolyAgentLoop({
  prompt,
  streamEl,
  callbacks = {},
  signal
}) {
  const cfg = getAgentConfig();
  if (cfg.requiresKey && !cfg.apiKey) {
    throw new Error(`API key for provider "${cfg.label}" is missing. Open Settings to configure it.`);
  }

  agentHistory.push({ role: 'user', text: prompt });
  transcript.add('user', { text: prompt });

  await ensureBridgeSession().catch(() => { });

  for (let step = 0; step < cfg.maxSteps; step++) {
    if (signal.aborted) break;

    callbacks.onStartStep?.(step);

    // Create Loly response bubble for this turn
    const bubble = callbacks.createLolyBubble?.();
    const textEl = bubble ? bubble.textEl : null;
    let accumulatedText = '';

    if (textEl) {
      textEl.innerHTML = `
        <div class="agent-thinking-bubble" style="margin: 0; padding: 2px 4px; border: none; background: transparent;">
          <span class="thinking-dot"></span>
          <span class="thinking-dot"></span>
          <span class="thinking-dot"></span>
          <span style="font-size: 11.5px; opacity: 0.75; margin-left: 5px;">Thinking...</span>
        </div>
      `;
      streamEl.scrollTop = streamEl.scrollHeight;
    }

    const onTextDelta = (delta) => {
      accumulatedText += delta;
      if (textEl) {
        textEl.replaceChildren();
        renderInline(textEl, accumulatedText);
        streamEl.scrollTop = streamEl.scrollHeight;
      }
      callbacks.onText?.(delta, accumulatedText);
    };

    let turn;
    try {
      turn = await streamTurn(cfg.provider, {
        apiKey: cfg.apiKey,
        model: cfg.model,
        maxTokens: cfg.maxTokens,
        history: agentHistory,
        onText: onTextDelta,
        signal
      });
    } catch (err) {
      if (textEl && accumulatedText) {
        textEl.replaceChildren();
        renderInline(textEl, accumulatedText);
      }
      if (signal.aborted) {
        agentHistory.push({ role: 'agent', provider: cfg.provider, text: accumulatedText ? `${accumulatedText}\n[stopped by user]` : '[stopped by user]', calls: [], raw: null });
      }
      throw err;
    }

    if (textEl && turn.text) {
      textEl.replaceChildren();
      renderInline(textEl, turn.text);
    }
    agentHistory.push({ role: 'agent', provider: cfg.provider, ...turn });
    if (turn.text) {
      transcript.add('agent', { text: turn.text });
      callbacks.onAgentText?.(turn.text);
    }

    // If no tool calls, task is finished
    if (!turn.calls || !turn.calls.length) {
      callbacks.onComplete?.(turn.text);
      return turn.text;
    }

    // Execute tool calls with permission checks
    callbacks.onWaitingApproval?.();
    const results = [];
    try {
      for (const call of turn.calls) {
        results.push(await runToolCall(call, cfg, streamEl, signal));
      }
    } finally {
      for (const call of turn.calls.slice(results.length)) {
        results.push({ id: call.id, name: call.name, result: { error: 'Cancelled by user.' } });
      }
      agentHistory.push({ role: 'tool', provider: cfg.provider, results });
    }
  }

  callbacks.onStepLimit?.();
}

/* ---------- Session Export ---------- */
function downloadBlob(name, mime, content) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportAgentSession(format = 'md') {
  if (!transcript.size) return false;
  const cfg = getAgentConfig();
  const meta = { provider: cfg.label, model: cfg.model };
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  if (format === 'json') downloadBlob(`loly-session-${stamp}.json`, 'application/json', transcript.toJSON(meta));
  else downloadBlob(`loly-session-${stamp}.md`, 'text/markdown', transcript.toMarkdown(meta));
  return true;
}

export function clearAgentSession() {
  agentHistory.length = 0;
  transcript.clear();
  Object.assign(stats, { commands: 0, redactions: 0 });
}

/** Restores a saved conversation ({role:'user'|'loly', text}[]) as model context + transcript. */
export function loadAgentHistory(messages = []) {
  clearAgentSession();
  for (const m of messages) {
    if (!m || typeof m.text !== 'string' || !m.text) continue;
    if (m.role === 'user') {
      agentHistory.push({ role: 'user', text: m.text });
      transcript.add('user', { text: m.text });
    } else {
      agentHistory.push({ role: 'agent', provider: 'history', text: m.text, calls: [], raw: null });
      transcript.add('agent', { text: m.text });
    }
  }
}

/* ---------- Stop Controller ---------- */
export function setStopController(ctl) {
  currentController = ctl;
}
export function abortCurrentAgent() {
  if (currentController) {
    currentController.abort();
    currentController = null;
  }
}
