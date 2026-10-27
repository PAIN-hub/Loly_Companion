// input-history.js — shell-style Up/Down recall for prompt box.
export class InputHistory {
  #entries = [];
  #cursor = null;
  #draft = '';
  #storage;
  #key;
  #max;

  constructor({ storage = null, key = 'loly.inputHistory.v1', max = 100 } = {}) {
    this.#storage = storage;
    this.#key = key;
    this.#max = max;
    try {
      const saved = JSON.parse(storage?.getItem(key) ?? '[]');
      if (Array.isArray(saved)) this.#entries = saved.filter((s) => typeof s === 'string' && s.length <= 2000).slice(-max);
    } catch { /* corrupt or blocked storage */ }
  }

  get entries() { return [...this.#entries]; }

  push(text) {
    const t = String(text ?? '').trim();
    this.reset();
    if (!t || t === this.#entries.at(-1)) return;
    this.#entries.push(t.slice(0, 2000));
    if (this.#entries.length > this.#max) this.#entries.splice(0, this.#entries.length - this.#max);
    try { this.#storage?.setItem(this.#key, JSON.stringify(this.#entries)); } catch { /* storage blocked */ }
  }

  prev(current = '') {
    if (!this.#entries.length) return null;
    if (this.#cursor === null) {
      this.#draft = current;
      this.#cursor = this.#entries.length;
    }
    if (this.#cursor > 0) this.#cursor--;
    return this.#entries[this.#cursor];
  }

  next() {
    if (this.#cursor === null) return null;
    if (this.#cursor < this.#entries.length - 1) return this.#entries[++this.#cursor];
    this.#cursor = null;
    return this.#draft;
  }

  reset() { this.#cursor = null; this.#draft = ''; }
}
