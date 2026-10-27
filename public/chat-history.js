// chat-history.js — Persistent chat sessions (localStorage) + the history panel with rename/delete menus.
import { icon } from './ui-icons.js';

const STORAGE_KEY = 'loly.chats.v1';
const MAX_SESSIONS = 100;
const MAX_MESSAGES = 400;
const MAX_TEXT = 20000;

const uid = () => `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function readStorage() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!parsed || !Array.isArray(parsed.sessions)) return { activeId: null, sessions: [] };
    const sessions = parsed.sessions
      .filter((s) => s && typeof s.id === 'string' && Array.isArray(s.messages))
      .map((s) => ({
        id: s.id,
        title: String(s.title || 'New chat').slice(0, 80),
        createdAt: Number(s.createdAt) || Date.now(),
        updatedAt: Number(s.updatedAt) || Date.now(),
        messages: s.messages
          .filter((m) => m && (m.role === 'user' || m.role === 'loly') && typeof m.text === 'string')
          .map((m) => ({ role: m.role, text: m.text.slice(0, MAX_TEXT) }))
      }));
    const activeId = sessions.some((s) => s.id === parsed.activeId) ? parsed.activeId : null;
    return { activeId, sessions };
  } catch {
    return { activeId: null, sessions: [] };
  }
}

export class ChatStore {
  constructor() {
    const { activeId, sessions } = readStorage();
    this.activeId = activeId;
    this.sessions = sessions;
  }

  persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeId: this.activeId, sessions: this.sessions }));
    } catch { /* quota or blocked storage: keep in-memory only */ }
  }

  get(id) {
    return this.sessions.find((s) => s.id === id) || null;
  }

  get active() {
    return this.activeId ? this.get(this.activeId) : null;
  }

  list() {
    return [...this.sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  create() {
    const now = Date.now();
    const session = { id: uid(), title: 'New chat', createdAt: now, updatedAt: now, messages: [] };
    this.sessions.push(session);
    if (this.sessions.length > MAX_SESSIONS) {
      const oldest = this.list().slice(MAX_SESSIONS).map((s) => s.id);
      this.sessions = this.sessions.filter((s) => !oldest.includes(s.id));
    }
    this.activeId = session.id;
    this.persist();
    return session;
  }

  ensureActive() {
    return this.active || this.create();
  }

  setActive(id) {
    this.activeId = this.get(id) ? id : null;
    this.persist();
  }

  clearActive() {
    this.activeId = null;
    this.persist();
  }

  append(id, role, text) {
    const session = this.get(id);
    if (!session || !text) return;
    session.messages.push({ role, text: String(text).slice(0, MAX_TEXT) });
    if (session.messages.length > MAX_MESSAGES) session.messages.splice(0, session.messages.length - MAX_MESSAGES);
    session.updatedAt = Date.now();
    if (role === 'user' && session.title === 'New chat') {
      session.title = String(text).replace(/\s+/g, ' ').trim().slice(0, 48) || 'New chat';
    }
    this.persist();
  }

  rename(id, title) {
    const session = this.get(id);
    const clean = String(title || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!session || !clean) return false;
    session.title = clean;
    this.persist();
    return true;
  }

  remove(id) {
    this.sessions = this.sessions.filter((s) => s.id !== id);
    if (this.activeId === id) this.activeId = null;
    this.persist();
  }
}

/* ---------- Panel UI ---------- */
function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function relTime(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function bucketOf(ts) {
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const day = 86400000;
  if (ts >= startToday.getTime()) return 'Today';
  if (ts >= startToday.getTime() - day) return 'Yesterday';
  if (ts >= startToday.getTime() - 6 * day) return 'Previous 7 days';
  return 'Older';
}

/**
 * Mounts the history panel into `container` (must be position: relative).
 * Returns { open, close, toggle, refresh, isOpen }.
 */
export function createHistoryPanel({ container, store, onSelect, onNew, onDeleted, onToggle, canSwitch }) {
  const panel = h('div', 'ch-panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Chat history');
  panel.hidden = true;

  const head = h('div', 'ch-head');
  const headTitle = h('div', 'ch-head-title');
  const headIcon = h('span', 'ch-head-icon');
  headIcon.innerHTML = icon('history', 14);
  headTitle.append(headIcon, h('span', null, 'Chat history'));
  const btnNew = h('button', 'ch-new-btn');
  btnNew.type = 'button';
  btnNew.innerHTML = `${icon('plus', 13)}<span>New chat</span>`;
  const btnClose = h('button', 'ch-icon-btn');
  btnClose.type = 'button';
  btnClose.title = 'Close history';
  btnClose.setAttribute('aria-label', 'Close history');
  btnClose.innerHTML = icon('x', 14);
  const headActions = h('div', 'ch-head-actions');
  headActions.append(btnNew, btnClose);
  head.append(headTitle, headActions);

  const searchWrap = h('label', 'ch-search');
  const searchIcon = h('span', 'ch-search-icon');
  searchIcon.innerHTML = icon('search', 13);
  const search = h('input', 'ch-search-input');
  search.type = 'search';
  search.placeholder = 'Search conversations';
  search.autocomplete = 'off';
  search.setAttribute('aria-label', 'Search conversations');
  searchWrap.append(searchIcon, search);

  const list = h('div', 'ch-list');
  panel.append(head, searchWrap, list);
  container.append(panel);

  let openMenuFor = null; // session id whose menu is open
  let renamingId = null;
  let confirmDeleteId = null;

  const isOpen = () => !panel.hidden;

  function closeMenus() {
    openMenuFor = null;
    confirmDeleteId = null;
    list.querySelectorAll('.ch-menu').forEach((m) => m.remove());
    list.querySelectorAll('.ch-more.is-open').forEach((b) => b.classList.remove('is-open'));
  }

  function startRename(session, titleEl) {
    closeMenus();
    renamingId = session.id;
    const input = h('input', 'ch-rename-input');
    input.type = 'text';
    input.value = session.title;
    input.maxLength = 80;
    input.setAttribute('aria-label', 'Rename conversation');
    titleEl.replaceChildren(input);
    input.focus();
    input.select();
    let done = false;
    const commit = (save) => {
      if (done) return;
      done = true;
      renamingId = null;
      if (save) store.rename(session.id, input.value);
      render();
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); commit(true); }
      if (e.key === 'Escape') { e.preventDefault(); commit(false); }
    });
    input.addEventListener('blur', () => commit(true));
    input.addEventListener('click', (e) => e.stopPropagation());
  }

  function buildMenu(session, titleEl) {
    const menu = h('div', 'ch-menu');
    menu.setAttribute('role', 'menu');
    const rename = h('button', 'ch-menu-item');
    rename.type = 'button';
    rename.setAttribute('role', 'menuitem');
    rename.innerHTML = `${icon('pencil', 13)}<span>Rename</span>`;
    rename.addEventListener('click', (e) => { e.stopPropagation(); startRename(session, titleEl); });

    const del = h('button', 'ch-menu-item ch-menu-danger');
    del.type = 'button';
    del.setAttribute('role', 'menuitem');
    const setDeleteLabel = () => {
      del.innerHTML = confirmDeleteId === session.id
        ? `${icon('check', 13)}<span>Confirm delete</span>`
        : `${icon('trash', 13)}<span>Delete</span>`;
      del.classList.toggle('is-confirming', confirmDeleteId === session.id);
    };
    setDeleteLabel();
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirmDeleteId !== session.id) {
        confirmDeleteId = session.id;
        setDeleteLabel();
        return;
      }
      const wasActive = store.activeId === session.id;
      store.remove(session.id);
      closeMenus();
      render();
      onDeleted?.(session.id, wasActive);
    });
    menu.append(rename, del);
    return menu;
  }

  function buildItem(session) {
    const item = h('div', 'ch-item');
    if (session.id === store.activeId) item.classList.add('is-active');

    const main = h('button', 'ch-item-main');
    main.type = 'button';
    const titleEl = h('div', 'ch-item-title', session.title);
    const metaEl = h('div', 'ch-item-meta', `${session.messages.length} message${session.messages.length === 1 ? '' : 's'}  \u00b7  ${relTime(session.updatedAt)}`);
    main.append(titleEl, metaEl);
    main.addEventListener('click', () => {
      if (renamingId) return;
      if (canSwitch && !canSwitch()) return;
      store.setActive(session.id);
      onSelect?.(session);
      close();
    });

    const more = h('button', 'ch-more');
    more.type = 'button';
    more.title = 'More options';
    more.setAttribute('aria-label', `Options for ${session.title}`);
    more.setAttribute('aria-haspopup', 'menu');
    more.innerHTML = icon('more', 16);
    more.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasOpen = openMenuFor === session.id;
      closeMenus();
      if (wasOpen) return;
      openMenuFor = session.id;
      more.classList.add('is-open');
      item.append(buildMenu(session, titleEl));
    });

    item.append(main, more);
    return item;
  }

  function render() {
    list.replaceChildren();
    const query = search.value.trim().toLowerCase();
    const sessions = store.list().filter((s) => s.messages.length > 0 || s.id === store.activeId)
      .filter((s) => !query || s.title.toLowerCase().includes(query));

    if (!sessions.length) {
      const empty = h('div', 'ch-empty');
      const ico = h('div', 'ch-empty-icon');
      ico.innerHTML = icon('message', 22);
      empty.append(ico, h('div', 'ch-empty-title', query ? 'No matches' : 'No conversations yet'));
      empty.append(h('div', 'ch-empty-sub', query ? 'Try a different search term.' : 'Your chats are saved here automatically.'));
      list.append(empty);
      return;
    }

    let lastBucket = '';
    for (const session of sessions) {
      const bucket = bucketOf(session.updatedAt);
      if (bucket !== lastBucket) {
        list.append(h('div', 'ch-group', bucket));
        lastBucket = bucket;
      }
      list.append(buildItem(session));
    }
  }

  function open() {
    panel.hidden = false;
    render();
    requestAnimationFrame(() => panel.classList.add('is-open'));
    onToggle?.(true);
  }
  function close() {
    closeMenus();
    panel.classList.remove('is-open');
    panel.hidden = true;
    search.value = '';
    onToggle?.(false);
  }
  function toggle() { isOpen() ? close() : open(); }

  btnClose.addEventListener('click', close);
  btnNew.addEventListener('click', () => {
    if (canSwitch && !canSwitch()) return;
    onNew?.();
    close();
  });
  search.addEventListener('input', () => { closeMenus(); render(); });
  panel.addEventListener('click', (e) => {
    if (!e.target.closest('.ch-menu') && !e.target.closest('.ch-more')) closeMenus();
  });
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (openMenuFor) closeMenus(); else close();
    }
  });

  return { open, close, toggle, refresh: () => { if (isOpen()) render(); }, isOpen };
}
