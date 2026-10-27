// tool.js — provider-neutral tool definition, prompts, timeouts, secret redaction, shared helpers.
// Pure ES module (no DOM): imported by the browser UI and by server.js.
export const TOOL_NAME = 'execute_shell_command';

export const MIN_TIMEOUT_SEC = 1;
export const MAX_TIMEOUT_SEC = 120;
export const DEFAULT_TIMEOUT_SEC = 10;

export const clampTimeoutSec = (value, fallback = DEFAULT_TIMEOUT_SEC) => {
  const n = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(n)) return fallback;
  return Math.min(MAX_TIMEOUT_SEC, Math.max(MIN_TIMEOUT_SEC, Math.round(n)));
};

export const TOOL = {
  name: TOOL_NAME,
  description:
    'Executes a bash command in the user workspace and returns stdout, stderr, exitCode and the new working directory. ' +
    'The working directory persists between calls (cd works); shell variables do not.',
  schema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Exact bash command to run (e.g., "df -h", "ls -la", "npm test")' },
      reason: { type: 'string', description: 'Concise explanation of why this command is required' },
      timeout_seconds: {
        type: 'number',
        description: `Optional max run time in seconds (${MIN_TIMEOUT_SEC}-${MAX_TIMEOUT_SEC}). Defaults to user setting; raise for slow operations like builds or installs.`
      }
    },
    required: ['command', 'reason']
  }
};

export const SYSTEM_PROMPT =
  'You are Loly, an autonomous AI desktop companion and coding agent. Use execute_shell_command to inspect the system, manage files, or fulfill development tasks. Keep commands non-interactive. ' +
  'Commands share a persistent working directory, so `cd` carries over to the next command; shell variables do not. ' +
  'Secrets in command output are redacted as [REDACTED] — never try to work around that. ' +
  'Format replies in concise Markdown; put code and command output in fenced code blocks with a language tag.';

// Model IDs end up in URLs/bodies: allow-list the charset
export function assertModelId(id) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9._:-]{1,120}$/.test(id)) {
    throw new Error('Invalid or missing model ID — choose one in Settings.');
  }
  return id;
}

// Text fallbacks, used when history was produced by a different provider
export const agentAsText = (t) =>
  [t.text, ...(t.calls ?? []).map((c) => `[ran] ${c.args?.command ?? ''}`)].filter(Boolean).join('\n') || '(no output)';

export const toolAsText = (t) =>
  `TOOL_RESULT:\n${JSON.stringify(t.results.map(({ name, result }) => ({ name, result })))}`;

export const parseArgs = (json) => {
  try { return JSON.parse(json || '{}'); } catch { throw new Error('Tool call arguments were cut off — raise "Max output tokens" in Settings.'); }
};

/* ---------- Secret redaction ---------- */

const REDACTED = '[REDACTED]';
const SKIP_VALUE = /^\[REDACTED|^(?:Bearer|Basic)$|^\d{1,6}$/i; // already redacted, auth scheme word, short number

// Quantifiers on prefixes are bounded ({0,40}) so hostile output cannot cause quadratic backtracking.
const RULES = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g, () => '[REDACTED PRIVATE KEY]'],
  [/\b([a-z][a-z0-9+.-]{0,20}:\/\/[^/\s:@]{1,100}:)[^/\s@]{1,200}@/gi, (_, head) => `${head}${REDACTED}@`],
  [/\b(?:sk|rk)[-_](?:ant-|proj-|live_|test_)?[A-Za-z0-9_-]{16,}/g, () => REDACTED],
  [/\bAIza[0-9A-Za-z_-]{30,}/g, () => REDACTED],
  [/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/g, () => REDACTED],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/g, () => REDACTED],
  [/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, () => REDACTED],
  [/\bnpm_[A-Za-z0-9]{30,}/g, () => REDACTED],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, () => REDACTED],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, () => `Bearer ${REDACTED}`],
  [/\bAuthorization:\s*Basic\s+[A-Za-z0-9+/=]{8,}/gi, () => `Authorization: Basic ${REDACTED}`],
  [
    /\b([\w.-]{0,40}?(?:password|passwd|secret|token|api[_-]?key|apikey|access[_-]?key|private[_-]?key|credentials?|authorization)[\w.-]{0,40})(["']?\s*[=:]\s*)(["']?)([^\s"'&;,]{4,})/gi,
    (_, key, sep, quote, value) => (SKIP_VALUE.test(value) ? undefined : `${key}${sep}${quote}${REDACTED}`)
  ]
];

/**
 * Masks well-known token formats, key=value secrets, URL credentials and private keys.
 * `extra` = literal secrets to mask too (e.g. user API keys).
 * @returns {{text:string, count:number}}
 */
export function redactSecrets(input, extra = []) {
  let text = String(input ?? '');
  let count = 0;

  for (const secret of extra) {
    if (typeof secret !== 'string' || secret.length < 8 || !text.includes(secret)) continue;
    const parts = text.split(secret);
    count += parts.length - 1;
    text = parts.join(REDACTED);
  }

  for (const [re, fn] of RULES) {
    text = text.replace(re, (...m) => {
      const out = fn(...m);
      if (out === undefined) return m[0];
      count++;
      return out;
    });
  }
  return { text, count };
}
