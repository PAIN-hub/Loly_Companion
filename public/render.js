// render.js — safe Markdown-lite renderer, code blocks with copy button, typewriter stream.
// Everything is built with DOM APIs (textContent only) — zero innerHTML.
const SVG_NS = 'http://www.w3.org/2000/svg';

const SHAPES = {
  copy: [
    ['rect', { x: 9, y: 9, width: 13, height: 13, rx: 2 }],
    ['path', { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' }]
  ],
  check: [['polyline', { points: '20 6 9 17 4 12' }]],
  x: [['path', { d: 'M18 6 6 18M6 6l12 12' }]]
};

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

export const svgIcon = (name) => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  for (const [tag, attrs] of SHAPES[name] || []) {
    const s = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
    svg.append(s);
  }
  return svg;
};

/* ---------- Markdown-lite ---------- */

export function parseBlocks(src) {
  const blocks = [];
  let cur = null;
  for (const line of src.split('\n')) {
    const fence = /^\s*```([\w+#.-]*)\s*$/.exec(line);
    if (fence) {
      if (cur?.type === 'code') cur = null; // closing fence
      else {
        cur = { type: 'code', lang: fence[1], lines: [] };
        blocks.push(cur);
      }
      continue;
    }
    if (!cur) {
      cur = { type: 'text', lines: [] };
      blocks.push(cur);
    }
    cur.lines.push(line);
  }
  return blocks
    .map((b) => ({ type: b.type, lang: b.lang ?? '', text: b.lines.join('\n') }))
    .filter((b) => b.type === 'code' || b.text.trim() !== '')
    .map((b) => (b.type === 'text' ? { ...b, text: b.text.replace(/^\n+|\s+$/g, '') } : b));
}

const INLINE = /(`[^`\n]+`|\*\*[^*\n]+\*\*)/g;

export function renderInline(parent, text) {
  for (const tok of text.split(INLINE)) {
    if (!tok) continue;
    if (tok.length > 2 && tok.startsWith('`') && tok.endsWith('`')) parent.append(el('code', 'inline-code', tok.slice(1, -1)));
    else if (tok.length > 4 && tok.startsWith('**') && tok.endsWith('**')) parent.append(el('strong', null, tok.slice(2, -2)));
    else parent.append(document.createTextNode(tok));
  }
}

/* ---------- Code block + copy button ---------- */

export function createCodeBlock(lang = '', text = '') {
  const root = el('div', 'code-block');
  const head = el('div', 'code-head');
  const label = el('span', 'code-lang', lang || 'text');
  const btn = el('button', 'copy-btn');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Copy code');
  const pre = el('pre');
  const code = el('code', null, text);
  pre.append(code);

  let timer = 0;
  const show = (icon, caption, cls = '') => {
    btn.className = `copy-btn ${cls}`.trim();
    btn.replaceChildren(svgIcon(icon), el('span', null, caption));
  };
  show('copy', 'Copy');

  btn.addEventListener('click', async () => {
    clearTimeout(timer);
    try {
      await navigator.clipboard.writeText(code.textContent);
      show('check', 'Copied', 'is-ok');
    } catch {
      show('x', 'Failed', 'is-err');
    }
    timer = setTimeout(() => show('copy', 'Copy'), 1600);
  });

  head.append(label, btn);
  root.append(head, pre);

  return {
    root,
    setText(t) { if (code.textContent !== t) code.textContent = t; },
    setLang(l) { label.textContent = l || 'text'; }
  };
}

/* ---------- Incremental DOM patching ---------- */

export function patchBlocks(container, blocks, nodes) {
  blocks.forEach((b, i) => {
    let node = nodes[i];
    if (node && node.type !== b.type) {
      nodes.splice(i).forEach((n) => n.root.remove());
      node = undefined;
    }
    if (!node) {
      node = b.type === 'code'
        ? { type: 'code', ...createCodeBlock(b.lang) }
        : { type: 'text', root: el('div', 'md-text'), shown: null };
      nodes.push(node);
      container.append(node.root);
    }
    if (b.type === 'code') {
      node.setLang(b.lang);
      node.setText(b.text);
    } else if (node.shown !== b.text) {
      node.root.replaceChildren();
      renderInline(node.root, b.text);
      node.shown = b.text;
    }
  });
  nodes.splice(blocks.length).forEach((n) => n.root.remove());
}
