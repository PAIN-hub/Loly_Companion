// Google Gemini API integration using native fetch
export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';

export const SUPPORTED_GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast, Recommended)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Deep Reasoning & Coding)' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' }
];

export async function listGeminiModels(apiKey) {
  return SUPPORTED_GEMINI_MODELS;
}

export const LOLY_SYSTEM_INSTRUCTION = `You are Loly, a charming anime desktop companion and AI assistant sitting right on the user's screen notch.
PERSONALITY GUIDELINES:
- Talk short and concise! Keep replies strictly to 1 or 2 brief sentences (maximum 25-30 words).
- Be witty, cheerful, and direct.
- Never write long explanations or fluff unless the user specifically commands you to write extensive code or a long guide.
- Act like an intelligent, lively companion who values the user's focus and screen real estate.`;

export function resolveCloudModel(model) {
  if (!model || model === 'chrome-builtin-auto' || model === 'chrome-builtin-only' || model.startsWith('chrome-')) {
    return GEMINI_DEFAULT_MODEL;
  }
  return model;
}

export async function chatWithGemini({
  messages,
  systemInstruction = LOLY_SYSTEM_INSTRUCTION,
  apiKey,
  model = GEMINI_DEFAULT_MODEL,
  fileData = null
}) {
  const activeKey = apiKey || process.env.GEMINI_API_KEY;
  if (!activeKey) {
    throw new Error('Gemini API key is not configured. Set GEMINI_API_KEY environment variable or enter it in Settings.');
  }

  const effectiveModel = resolveCloudModel(model);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(effectiveModel)}:generateContent?key=${encodeURIComponent(activeKey)}`;

  // Convert messages to Gemini format
  const contents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  // If there's an attached file in the latest user message
  if (fileData && contents.length > 0) {
    const lastContent = contents[contents.length - 1];
    if (lastContent.role === 'user') {
      lastContent.parts.unshift({
        inlineData: {
          mimeType: fileData.mimeType || 'text/plain',
          data: fileData.base64
        }
      });
    }
  }

  const body = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024
    },
    systemInstruction: {
      parts: [{ text: systemInstruction || LOLY_SYSTEM_INSTRUCTION }]
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    let parsedErr = errText;
    try {
      const errJson = JSON.parse(errText);
      parsedErr = errJson.error?.message || errText;
    } catch (_) {}
    throw new Error(`Gemini API Error (${response.status}): ${parsedErr}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return 'No response received.';
  }
  return text;
}

export async function* chatStreamWithGemini({
  messages,
  systemInstruction = LOLY_SYSTEM_INSTRUCTION,
  apiKey,
  model = GEMINI_DEFAULT_MODEL,
  fileData = null
}) {
  const activeKey = apiKey || process.env.GEMINI_API_KEY;
  if (!activeKey) {
    throw new Error('Gemini API key is not configured.');
  }

  const effectiveModel = resolveCloudModel(model);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(effectiveModel)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(activeKey)}`;

  const contents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  if (fileData && contents.length > 0) {
    const lastContent = contents[contents.length - 1];
    if (lastContent.role === 'user') {
      lastContent.parts.unshift({
        inlineData: {
          mimeType: fileData.mimeType || 'text/plain',
          data: fileData.base64
        }
      });
    }
  }

  const body = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024
    },
    systemInstruction: {
      parts: [{ text: systemInstruction || LOLY_SYSTEM_INSTRUCTION }]
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    let parsedErr = errText;
    try {
      const errJson = JSON.parse(errText);
      parsedErr = errJson.error?.message || errText;
    } catch (_) {}
    throw new Error(`Gemini API Error (${response.status}): ${parsedErr}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // save remaining partial chunk

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr || jsonStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          yield text;
        }
      } catch (_) {}
    }
  }
}

export async function verifyAgentAction({
  actionType,
  target,
  details = '',
  apiKey,
  model = GEMINI_DEFAULT_MODEL
}) {
  const systemInstruction = `You are an AI Security and Safety Reviewer for AI coding agents (Claude Code, Gemini CLI, Antigravity, etc.).
Your job is to provide a very concise, objective assessment of a pending tool execution before the human approves it.
Keep it strictly under 3 sentences:
1. Risk Level (LOW, MEDIUM, HIGH) with the immediate impact.
2. Safe or Potentially Destructive?
3. Recommended Decision: ALLOW or DENY (and if allow, any caution).`;

  const prompt = `Pending Agent Action:
- Action Type: ${actionType}
- Target/Command: ${target}
- Additional Context/Details: ${details || 'None provided'}

Please evaluate this action for safety.`;

  return await chatWithGemini({
    messages: [{ role: 'user', content: prompt }],
    systemInstruction,
    apiKey,
    model
  });
}
