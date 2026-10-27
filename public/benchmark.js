// benchmark.js — One-click latency benchmark across every configured provider/model.
import { streamTurn, PROVIDERS } from './providers.js';
import { getAgentState } from './loly-agent.js';
import { icon } from './ui-icons.js';

const TIMEOUT_MS = 25000;
const PING_PROMPT = 'Reply with exactly one word: ok';
const GEMINI_SET = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.0-flash'];

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function buildTargets() {
  const { settings, keys } = getAgentState();
  const targets = [];
  for (const [id, meta] of Object.entries(PROVIDERS)) {
    const keyless = meta.requiresKey === false;
    if (!keyless && !keys[id]) continue;
    const configured = settings.models[id];
    const models = id === 'gemini'
      ? [...new Set([configured, ...GEMINI_SET].filter(Boolean))]
      : [configured].filter(Boolean);
    for (const model of models) {
      targets.push({
        key: `${id}:${model}`,
        provider: id,
        model,
        providerLabel: meta.label,
        apiKey: keyless ? 'on-device-no-key-needed' : keys[id]
      });
    }
  }
  return targets;
}

async function pingOne(target) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  const start = performance.now();
  let ttft = null;
  try {
    await streamTurn(target.provider, {
      apiKey: target.apiKey,
      model: target.model,
      maxTokens: 16,
      history: [{ role: 'user', text: PING_PROMPT }],
      onText: () => { if (ttft == null) ttft = performance.now() - start; },
      signal: ctl.signal
    });
    const total = performance.now() - start;
    return { ok: true, total, ttft: ttft ?? total };
  } catch (err) {
    const message = ctl.signal.aborted ? 'Timed out after 25s' : (err?.message || 'Request failed');
    return { ok: false, error: String(message).slice(0, 140) };
  } finally {
    clearTimeout(timer);
  }
}

const fmt = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`);

export function mountBenchmark(container) {
  if (!container) return null;
  container.replaceChildren();

  const card = h('section', 'bm-card');
  card.setAttribute('aria-label', 'Model speed benchmark');

  const head = h('div', 'bm-head');
  const titleWrap = h('div', 'bm-title-wrap');
  const ico = h('span', 'bm-icon');
  ico.innerHTML = icon('gauge', 18);
  const texts = h('div', 'bm-texts');
  texts.append(
    h('div', 'bm-title', 'Model speed benchmark'),
    h('div', 'bm-sub', 'Sends a tiny ping to every saved provider at once and ranks response time.')
  );
  titleWrap.append(ico, texts);
  const btnRun = h('button', 'bm-run');
  btnRun.type = 'button';
  btnRun.innerHTML = `${icon('zap', 13)}<span>Run benchmark</span>`;
  head.append(titleWrap, btnRun);

  const results = h('div', 'bm-results');
  results.setAttribute('aria-live', 'polite');
  const note = h('div', 'bm-note', 'Save your API keys first. Only providers with a saved key (and Chrome Nano) are tested.');

  card.append(head, results, note);
  container.append(card);

  let running = false;

  function renderRows(rows) {
    results.replaceChildren();
    const done = rows.filter((r) => r.result?.ok);
    const maxTotal = Math.max(1, ...done.map((r) => r.result.total));
    const fastest = done.length ? done.reduce((a, b) => (a.result.total <= b.result.total ? a : b)) : null;

    rows.forEach((row, index) => {
      const el = h('div', 'bm-row');
      const r = row.result;
      if (!r) el.classList.add('is-pending');
      if (r && !r.ok) el.classList.add('is-failed');
      if (fastest && row === fastest) el.classList.add('is-fastest');

      const rank = h('div', 'bm-rank', r?.ok ? String(index + 1) : '');
      const body = h('div', 'bm-body');
      const top = h('div', 'bm-row-top');
      const name = h('div', 'bm-name', row.model);
      const prov = h('div', 'bm-provider', row.providerLabel);
      const left = h('div', 'bm-left');
      left.append(name, prov);
      top.append(left);
      if (fastest && row === fastest) top.append(h('span', 'bm-tag', 'Fastest'));

      const track = h('div', 'bm-track');
      const fill = h('div', 'bm-fill');
      track.append(fill);
      const metrics = h('div', 'bm-metrics');

      if (!r) {
        metrics.textContent = 'Testing...';
      } else if (r.ok) {
        fill.style.width = `${Math.max(6, (r.total / maxTotal) * 100)}%`;
        metrics.textContent = `First token ${fmt(r.ttft)}  \u00b7  Total ${fmt(r.total)}`;
      } else {
        fill.style.width = '0%';
        metrics.textContent = r.error;
      }

      body.append(top, track, metrics);
      el.append(rank, body);
      results.append(el);
    });
  }

  btnRun.addEventListener('click', async () => {
    if (running) return;
    const targets = buildTargets();
    if (!targets.length) {
      results.replaceChildren();
      const empty = h('div', 'bm-empty', 'No providers configured yet. Save an API key (or select Chrome Nano) and try again.');
      results.append(empty);
      return;
    }
    running = true;
    btnRun.disabled = true;
    btnRun.querySelector('span').textContent = 'Running...';
    card.classList.add('is-running');

    const rows = targets.map((t) => ({ ...t, result: null }));
    renderRows(rows);

    await Promise.all(rows.map(async (row) => {
      row.result = await pingOne(row);
      renderRows(rows);
    }));

    rows.sort((a, b) => {
      if (a.result?.ok && b.result?.ok) return a.result.total - b.result.total;
      if (a.result?.ok) return -1;
      if (b.result?.ok) return 1;
      return 0;
    });
    renderRows(rows);

    running = false;
    btnRun.disabled = false;
    btnRun.querySelector('span').textContent = 'Run again';
    card.classList.remove('is-running');
  });

  return card;
}
