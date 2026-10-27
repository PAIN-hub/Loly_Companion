import { readSSE, ensureOk, withTimeout } from './sse.js';
import { TOOL, SYSTEM_PROMPT, assertModelId, agentAsText, toolAsText } from './tool.js';

const ROOT = 'https://generativelanguage.googleapis.com/v1beta';
const headers = (apiKey) => ({ 'Content-Type': 'application/json', 'x-goog-api-key': apiKey });
const bareId = (m) => String(m).replace(/^models\//, '');

// Gemini's REST schema uses upper-case type names
const upperTypes = (s) =>
  Array.isArray(s) ? s.map(upperTypes)
    : s && typeof s === 'object'
      ? Object.fromEntries(Object.entries(s).map(([k, v]) => [k, k === 'type' && typeof v === 'string' ? v.toUpperCase() : upperTypes(v)]))
      : s;

const toContents = (history) =>
  history.map((t) => {
    if (t.role === 'user') return { role: 'user', parts: [{ text: t.text }] };
    if (t.role === 'agent') {
      return t.provider === 'gemini' && t.raw ? t.raw : { role: 'model', parts: [{ text: agentAsText(t) }] };
    }
    if (t.provider === 'gemini') {
      return {
        role: 'user',
        parts: t.results.map((r) => ({
          functionResponse: { ...(r.id && { id: r.id }), name: r.name, response: { result: r.result } }
        }))
      };
    }
    return { role: 'user', parts: [{ text: toolAsText(t) }] };
  });

export async function streamTurn({ apiKey, model, history, onText, signal }) {
  let rawId = bareId(model || 'gemini-3.5-flash');
  if (rawId === 'gemini') {
    rawId = 'gemini-3.5-flash';
  }
  const id = assertModelId(rawId);
  let res;
  try {
    res = await ensureOk(await fetch(`${ROOT}/models/${id}:streamGenerateContent?alt=sse`, {
      method: 'POST',
      headers: headers(apiKey),
      body: JSON.stringify({
        contents: toContents(history),
        tools: [{ functionDeclarations: [{ name: TOOL.name, description: TOOL.description, parameters: upperTypes(TOOL.schema) }] }],
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
      }),
      signal: withTimeout(signal, 180000)
    }));
  } catch (err) {
    // If the experimental/hypothetical model name is not yet available in the user's region/tier, gracefully fall back to gemini-2.0-flash
    if (err && (String(err).includes('404') || String(err).includes('not found') || String(err).includes('is not available'))) {
      const fallbackId = 'gemini-2.0-flash';
      res = await ensureOk(await fetch(`${ROOT}/models/${fallbackId}:streamGenerateContent?alt=sse`, {
        method: 'POST',
        headers: headers(apiKey),
        body: JSON.stringify({
          contents: toContents(history),
          tools: [{ functionDeclarations: [{ name: TOOL.name, description: TOOL.description, parameters: upperTypes(TOOL.schema) }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
        }),
        signal: withTimeout(signal, 180000)
      }));
    } else {
      throw err;
    }
  }

  const parts = [];
  for await (const chunk of readSSE(res)) {
    if (chunk.error) throw new Error(chunk.error.message || 'Stream error');
    for (const p of chunk.candidates?.[0]?.content?.parts ?? []) {
      const last = parts.at(-1);
      if (typeof p.text === 'string' && !p.thought) {
        if (last && typeof last.text === 'string' && !last.thought) {
          last.text += p.text;
          if (p.thoughtSignature) last.thoughtSignature = p.thoughtSignature;
        } else {
          parts.push({ ...p });
        }
        if (p.text) onText?.(p.text);
      } else {
        parts.push(p); // functionCall / thought parts are echoed back verbatim
      }
    }
  }
  if (!parts.length) throw new Error('Empty response from Gemini API.');

  return {
    raw: { role: 'model', parts },
    text: parts.filter((p) => typeof p.text === 'string' && !p.thought).map((p) => p.text).join(''),
    calls: parts.filter((p) => p.functionCall).map((p) => ({ id: p.functionCall.id, name: p.functionCall.name, args: p.functionCall.args ?? {} }))
  };
}

export async function listModels({ apiKey, signal }) {
  const ids = [];
  let pageToken = '';
  for (let page = 0; page < 5; page++) {
    const url = `${ROOT}/models?pageSize=200${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const data = await (await ensureOk(await fetch(url, { headers: headers(apiKey), signal: withTimeout(signal, 20000) }))).json();
    for (const m of data.models ?? []) {
      if (m.supportedGenerationMethods?.includes('generateContent') && !/embed|imagen|veo|tts|image|aqa|live|audio/i.test(m.name)) {
        ids.push(bareId(m.name));
      }
    }
    if (!(pageToken = data.nextPageToken)) break;
  }
  return ids.sort();
}
