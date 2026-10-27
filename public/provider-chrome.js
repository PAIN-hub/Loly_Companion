// provider-chrome.js — Adapter for Chrome Built-in AI (Prompt API / Gemini Nano)
import { TOOL, SYSTEM_PROMPT } from './tool.js';

let cachedSession = null;

export async function getChromeAiSession() {
  const aiObj = window.ai || (typeof ai !== 'undefined' ? ai : null);
  if (aiObj && aiObj.languageModel) {
    const caps = await aiObj.languageModel.capabilities?.().catch(() => null);
    if (!caps || (caps.available !== 'readily' && caps.available !== 'after-download')) {
      throw new Error('Chrome Built-in AI (Prompt API / Gemini Nano) is not enabled. Go to chrome://flags/#prompt-api-for-gemini-nano to enable it.');
    }
    if (!cachedSession) {
      cachedSession = await aiObj.languageModel.create({
        systemPrompt: `${SYSTEM_PROMPT}\n\nYou have access to the shell command tool "${TOOL.name}". When you need to inspect files or run commands, format your tool call as:\n\`\`\`tool:execute_shell_command\n{"command": "<bash command>", "reason": "<short explanation>"}\n\`\`\``
      });
    }
    return cachedSession;
  }

  if (typeof LanguageModel !== 'undefined' && typeof LanguageModel.create === 'function') {
    if (!cachedSession) {
      cachedSession = await LanguageModel.create({
        systemPrompt: SYSTEM_PROMPT
      });
    }
    return cachedSession;
  }

  throw new Error('Chrome Built-in AI (Prompt API / Gemini Nano) is not supported in this runtime. Enable chrome://flags/#prompt-api-for-gemini-nano or switch to Google Gemini in Settings.');
}

export async function listModels() {
  return ['gemini-nano', 'prompt-api'];
}

export async function streamTurn({ model, history, onText, signal }) {
  const session = await getChromeAiSession();

  // Convert history into conversational context for Chrome Nano
  const conversation = history.map(t => {
    if (t.role === 'user') return `User: ${t.text}`;
    if (t.role === 'agent') return `Assistant: ${t.text || ''}`;
    if (t.role === 'tool') {
      const out = (t.results || []).map(r => `Tool Output (${r.name}):\n${JSON.stringify(r.result)}`).join('\n');
      return out;
    }
    return '';
  }).filter(Boolean).join('\n\n');

  let fullText = '';
  if (typeof session.promptStreaming === 'function') {
    const stream = session.promptStreaming(conversation, { signal });
    for await (const chunk of stream) {
      if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');
      const delta = chunk.slice(fullText.length);
      fullText = chunk;
      if (delta) onText?.(delta);
    }
  } else {
    fullText = await session.prompt(conversation, { signal });
    if (fullText) onText?.(fullText);
  }

  // Parse any execute_shell_command tool invocations
  const calls = [];
  const toolRegex = /```(?:tool:)?execute_shell_command\s*([\s\S]*?)```/gi;
  let match;
  while ((match = toolRegex.exec(fullText)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.command) {
        calls.push({
          id: 'chrome_call_' + Math.random().toString(36).slice(2, 9),
          name: 'execute_shell_command',
          args: parsed
        });
      }
    } catch (_) {}
  }

  return {
    text: fullText,
    calls,
    raw: null
  };
}
