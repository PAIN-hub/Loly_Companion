// OpenAI via the Responses API
import { readSSE, ensureOk, withTimeout } from './sse.js';
import { TOOL, SYSTEM_PROMPT, assertModelId, agentAsText, toolAsText, parseArgs } from './tool.js';

const ROOT = 'https://api.openai.com/v1';
const headers = (apiKey) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` });

const toInput = (history) =>
  history.flatMap((t) => {
    if (t.role === 'user') return [{ role: 'user', content: t.text }];
    if (t.role === 'agent') {
      return t.provider === 'openai' && t.raw ? t.raw : [{ role: 'assistant', content: agentAsText(t) }];
    }
    if (t.provider === 'openai') {
      return t.results.map((r) => ({ type: 'function_call_output', call_id: r.id, output: JSON.stringify(r.result) }));
    }
    return [{ role: 'user', content: toolAsText(t) }];
  });

export async function streamTurn({ apiKey, model, history, onText, signal }) {
  const res = await ensureOk(await fetch(`${ROOT}/responses`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({
      model: assertModelId(model),
      instructions: SYSTEM_PROMPT,
      input: toInput(history),
      tools: [{
        type: 'function',
        name: TOOL.name,
        description: TOOL.description,
        parameters: { ...TOOL.schema, additionalProperties: false },
        strict: false
      }],
      stream: true
    }),
    signal: withTimeout(signal, 180000)
  }));

  const items = [];
  let finalOutput = null;
  let text = '';
  for await (const e of readSSE(res)) {
    switch (e.type) {
      case 'response.output_text.delta':
        text += e.delta;
        onText?.(e.delta);
        break;
      case 'response.output_item.done':
        items[e.output_index] = e.item;
        break;
      case 'response.completed':
        finalOutput = e.response?.output ?? null;
        break;
      case 'response.failed':
        throw new Error(e.response?.error?.message || 'Response failed');
      case 'response.incomplete':
        throw new Error(`Response incomplete: ${e.response?.incomplete_details?.reason ?? 'unknown'} — try raising limits or a different model.`);
      case 'error':
        throw new Error(e.message || 'Stream error');
      default:
    }
  }

  const raw = (finalOutput?.length ? finalOutput : items).filter(Boolean);
  if (!raw.length) throw new Error('Empty response from OpenAI API.');

  return {
    raw,
    text,
    calls: raw.filter((i) => i.type === 'function_call').map((i) => ({ id: i.call_id, name: i.name, args: parseArgs(i.arguments) }))
  };
}

export async function listModels({ apiKey, signal }) {
  const res = await ensureOk(await fetch(`${ROOT}/models`, { headers: headers(apiKey), signal: withTimeout(signal, 20000) }));
  return ((await res.json()).data ?? [])
    .map((m) => m.id)
    .filter((id) => /^(gpt|o\d|codex|chatgpt)/i.test(id) && !/embed|whisper|tts|dall|image|moderation|audio|realtime|transcribe|search/i.test(id))
    .sort();
}
