import { readSSE, ensureOk, withTimeout } from './sse.js';
import { TOOL, SYSTEM_PROMPT, assertModelId, agentAsText, toolAsText, parseArgs } from './tool.js';

const ROOT = 'https://api.anthropic.com/v1';
const headers = (apiKey) => ({
  'content-type': 'application/json',
  'x-api-key': apiKey,
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true' // required for direct browser CORS
});

const toMessages = (history) =>
  history.map((t) => {
    if (t.role === 'user') return { role: 'user', content: t.text };
    if (t.role === 'agent') {
      return { role: 'assistant', content: t.provider === 'anthropic' && t.raw ? t.raw : agentAsText(t) };
    }
    if (t.provider === 'anthropic') {
      return {
        role: 'user',
        content: t.results.map((r) => ({
          type: 'tool_result',
          tool_use_id: r.id,
          content: JSON.stringify(r.result),
          ...(r.result?.error && { is_error: true })
        }))
      };
    }
    return { role: 'user', content: toolAsText(t) };
  });

export async function streamTurn({ apiKey, model, maxTokens, history, onText, signal }) {
  const res = await ensureOk(await fetch(`${ROOT}/messages`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({
      model: assertModelId(model),
      max_tokens: maxTokens,
      system: SYSTEM_PROMPT,
      messages: toMessages(history),
      tools: [{ name: TOOL.name, description: TOOL.description, input_schema: TOOL.schema }],
      stream: true
    }),
    signal: withTimeout(signal, 180000)
  }));

  const blocks = [];
  const json = {}; // partial tool-call JSON by block index
  for await (const e of readSSE(res)) {
    if (e.type === 'error') throw new Error(e.error?.message || 'Stream error');
    if (e.type === 'content_block_start') {
      const b = { ...e.content_block };
      if (b.type === 'text') b.text = '';
      blocks[e.index] = b;
      json[e.index] = '';
    } else if (e.type === 'content_block_delta') {
      const b = blocks[e.index];
      const d = e.delta;
      if (!b) continue;
      if (d.type === 'text_delta') { b.text += d.text; onText?.(d.text); }
      else if (d.type === 'input_json_delta') json[e.index] += d.partial_json;
      else if (d.type === 'thinking_delta') b.thinking += d.thinking;
      else if (d.type === 'signature_delta') b.signature = d.signature;
    } else if (e.type === 'content_block_stop') {
      const b = blocks[e.index];
      if (b?.type === 'tool_use') b.input = parseArgs(json[e.index]);
    }
  }

  const raw = blocks.filter((b) => b && (b.type !== 'text' || b.text));
  if (!raw.length) throw new Error('Empty response from Claude API.');

  return {
    raw,
    text: raw.filter((b) => b.type === 'text').map((b) => b.text).join(''),
    calls: raw.filter((b) => b.type === 'tool_use').map((b) => ({ id: b.id, name: b.name, args: b.input ?? {} }))
  };
}

export async function listModels({ apiKey, signal }) {
  const res = await ensureOk(await fetch(`${ROOT}/models?limit=1000`, { headers: headers(apiKey), signal: withTimeout(signal, 20000) }));
  return ((await res.json()).data ?? []).map((m) => m.id).sort();
}
