// transcript.js — session log + Markdown / JSON export with secret redaction.
import { redactSecrets } from './tool.js';

const longestRun = (s, ch) => Math.max(0, ...(s.match(new RegExp(`${ch}+`, 'g')) ?? []).map((r) => r.length));
export const fence = (text) => '`'.repeat(Math.max(3, longestRun(text, '`') + 1));
const clean = (s) => redactSecrets(s ?? '').text;

export class Transcript {
  #items = [];

  add(type, data = {}) {
    this.#items.push({ ts: new Date().toISOString(), type, ...data });
  }

  clear() { this.#items = []; }
  get size() { return this.#items.length; }
  items() { return structuredClone(this.#items); }

  toJSON(meta = {}) {
    const items = this.items().map((i) => {
      const o = { ...i };
      for (const k of ['text', 'command', 'reason', 'output']) if (typeof o[k] === 'string') o[k] = clean(o[k]);
      return o;
    });
    return JSON.stringify({ app: 'loly-companion', exportedAt: new Date().toISOString(), provider: meta.provider ?? null, model: meta.model ?? null, items }, null, 2);
  }

  toMarkdown(meta = {}) {
    const out = ['# Loly Companion Session', '', `- Exported: ${new Date().toISOString()}`];
    if (meta.provider) out.push(`- Model: ${meta.provider}${meta.model ? ` · ${meta.model}` : ''}`);
    out.push('');

    for (const i of this.#items) {
      switch (i.type) {
        case 'user':
          out.push('## You', '', clean(i.text), '');
          break;
        case 'agent':
          out.push('## Loly', '', clean(i.text), '');
          break;
        case 'command': {
          const cmd = clean(i.command);
          const f = fence(cmd);
          out.push(`### Command — ${i.status ?? 'proposed'}`, '');
          if (i.reason) out.push(`_${clean(i.reason).replace(/\n/g, ' ')}_`, '');
          out.push(`${f}bash`, cmd, f, '');
          if (i.cwd || i.timeoutSec) out.push(`<sub>${[i.cwd && `cwd: ${clean(i.cwd)}`, i.timeoutSec && `timeout: ${i.timeoutSec}s`].filter(Boolean).join(' · ')}</sub>`, '');
          break;
        }
        case 'output': {
          const body = clean(i.output);
          const f = fence(body);
          out.push(`### Output — exit ${i.exitCode}${i.cwd ? ` · ${clean(i.cwd)}` : ''}`, '', `${f}text`, body, f, '');
          break;
        }
        case 'notice':
          out.push(`> ${clean(i.text).replace(/\n/g, '\n> ')}`, '');
          break;
        default:
      }
    }
    return `${out.join('\n').trimEnd()}\n`;
  }
}
