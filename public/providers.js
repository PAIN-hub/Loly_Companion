// providers.js — registry. Each adapter exports streamTurn() and listModels().
import * as chrome from './provider-chrome.js';
import * as gemini from './provider-gemini.js';
import * as anthropic from './provider-anthropic.js';
import * as openai from './provider-openai.js';

export const PROVIDERS = {
  chrome: { label: 'Chrome Nano (On-Device)', keyHint: 'On-device AI (No API key needed)', requiresKey: false, adapter: chrome },
  gemini: { label: 'Google Gemini', keyHint: 'Gemini API key (AIzaSy…)', requiresKey: true, adapter: gemini },
  anthropic: { label: 'Anthropic Claude', keyHint: 'Anthropic API key (sk-ant-…)', requiresKey: true, adapter: anthropic },
  openai: { label: 'OpenAI / Codex', keyHint: 'OpenAI API key (sk-…)', requiresKey: true, adapter: openai }
};

const adapterOf = (id) => {
  if (!Object.hasOwn(PROVIDERS, id)) throw new Error(`Unknown provider: ${id}`);
  return PROVIDERS[id].adapter;
};

export const streamTurn = (id, opts) => adapterOf(id).streamTurn(opts);
export const listModels = (id, opts) => adapterOf(id).listModels(opts);
