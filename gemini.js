// Google Gemini API integration using native fetch
const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';

export async function chatWithGemini({
  messages,
  systemInstruction,
  apiKey,
  model = GEMINI_DEFAULT_MODEL,
  fileData = null
}) {
  const activeKey = apiKey || process.env.GEMINI_API_KEY;
  if (!activeKey) {
    throw new Error('Gemini API key is not configured. Set GEMINI_API_KEY environment variable or enter it in Settings.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(activeKey)}`;

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
      maxOutputTokens: 2048
    }
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

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
    return 'No response text received from Gemini.';
  }
  return text;
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
