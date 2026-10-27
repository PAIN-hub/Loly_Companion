// sse.js — shared fetch/SSE helpers.
const parseEvent = (raw) => {
  const data = raw
    .split('\n')
    .filter((l) => l.startsWith('data:'))
    .map((l) => l.slice(5).trimStart())
    .join('\n');
  return !data || data === '[DONE]' ? undefined : JSON.parse(data);
};

/** Yields parsed JSON payloads from a text/event-stream response. */
export async function* readSSE(res) {
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value.replace(/\r\n/g, '\n');
      let i;
      while ((i = buf.indexOf('\n\n')) !== -1) {
        const evt = parseEvent(buf.slice(0, i));
        buf = buf.slice(i + 2);
        if (evt !== undefined) yield evt;
      }
    }
    if (buf.trim()) {
      const evt = parseEvent(buf);
      if (evt !== undefined) yield evt;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

export async function ensureOk(res) {
  if (res.ok) return res;
  const body = await res.json().catch(() => ({}));
  throw new Error(body?.error?.message || body?.message || `HTTP ${res.status}`);
}

/** Combine user Stop signal with a hard timeout. */
export const withTimeout = (signal, ms) =>
  signal ? AbortSignal.any([signal, AbortSignal.timeout(ms)]) : AbortSignal.timeout(ms);
