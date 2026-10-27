// folder-picker.js — In-app directory browser (server-backed via /api/fs/list).
// Browsers cannot expose absolute paths from native dialogs, so we browse the host filesystem instead.
import { icon } from './ui-icons.js';

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function iconButton(name, title, extraClass = '') {
  const btn = h('button', `fp-icon-btn ${extraClass}`.trim());
  btn.type = 'button';
  btn.title = title;
  btn.setAttribute('aria-label', title);
  btn.innerHTML = icon(name, 15);
  return btn;
}

export function openFolderPicker({ startPath = '', title = 'Choose workspace folder' } = {}) {
  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement;
    let current = null;
    let showHidden = false;
    let requestId = 0;
    let settled = false;

    const overlay = h('div', 'fp-overlay');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', title);

    const panel = h('div', 'fp-panel');

    // Header
    const header = h('div', 'fp-header');
    const headTitle = h('div', 'fp-title');
    const headIcon = h('span', 'fp-title-icon');
    headIcon.innerHTML = icon('folder', 16);
    headTitle.append(headIcon, h('span', null, title));
    const btnClose = iconButton('x', 'Close (Esc)');
    header.append(headTitle, btnClose);

    // Toolbar
    const toolbar = h('div', 'fp-toolbar');
    const btnUp = iconButton('arrowUp', 'Parent folder');
    const btnHome = iconButton('house', 'Home folder');
    const pathInput = h('input', 'fp-path-input');
    pathInput.type = 'text';
    pathInput.spellcheck = false;
    pathInput.autocomplete = 'off';
    pathInput.setAttribute('aria-label', 'Current folder path (press Enter to go)');
    const btnHidden = iconButton('eyeOff', 'Show hidden folders');
    toolbar.append(btnUp, btnHome, pathInput, btnHidden);

    // Breadcrumbs
    const crumbs = h('div', 'fp-crumbs');

    // List
    const list = h('div', 'fp-list');
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', 'Subfolders');

    // Footer
    const footer = h('div', 'fp-footer');
    const meta = h('div', 'fp-meta');
    const actions = h('div', 'fp-actions');
    const btnCancel = h('button', 'fp-btn fp-btn-ghost', 'Cancel');
    btnCancel.type = 'button';
    const btnSelect = h('button', 'fp-btn fp-btn-primary', 'Select this folder');
    btnSelect.type = 'button';
    btnSelect.disabled = true;
    actions.append(btnCancel, btnSelect);
    footer.append(meta, actions);

    panel.append(header, toolbar, crumbs, list, footer);
    overlay.append(panel);
    document.body.append(overlay);
    requestAnimationFrame(() => overlay.classList.add('is-open'));

    function finish(value) {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKey, true);
      overlay.classList.remove('is-open');
      setTimeout(() => overlay.remove(), 160);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        try { previouslyFocused.focus(); } catch { /* element gone */ }
      }
      resolve(value);
    }

    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        finish(null);
      }
    }
    document.addEventListener('keydown', onKey, true);

    function renderCrumbs(sep) {
      crumbs.replaceChildren();
      const isWin = sep === '\\';
      const parts = current.path.split(isWin ? /\\+/ : /\/+/).filter(Boolean);
      const rootLabel = isWin ? (parts.shift() || '') : '/';
      const rootPath = isWin ? `${rootLabel}\\` : '/';
      const rootBtn = h('button', 'fp-crumb', rootLabel);
      rootBtn.type = 'button';
      if (!parts.length) rootBtn.classList.add('is-current');
      rootBtn.addEventListener('click', () => load(rootPath));
      crumbs.append(rootBtn);

      let acc = rootPath;
      parts.forEach((part, i) => {
        acc = acc.endsWith(sep) ? `${acc}${part}` : `${acc}${sep}${part}`;
        const target = acc;
        const chev = h('span', 'fp-crumb-sep');
        chev.innerHTML = icon('chevronRight', 11);
        const b = h('button', 'fp-crumb', part);
        b.type = 'button';
        if (i === parts.length - 1) b.classList.add('is-current');
        b.addEventListener('click', () => load(target));
        crumbs.append(chev, b);
      });
      crumbs.scrollLeft = crumbs.scrollWidth;
    }

    function renderList(data) {
      list.replaceChildren();
      if (!data.entries.length) {
        const empty = h('div', 'fp-empty');
        const ico = h('div', 'fp-empty-icon');
        ico.innerHTML = icon('folder', 22);
        empty.append(ico, h('div', 'fp-empty-title', 'No subfolders here'));
        empty.append(h('div', 'fp-empty-sub', 'You can still select this folder as your workspace.'));
        list.append(empty);
        return;
      }
      for (const entry of data.entries) {
        const row = h('button', 'fp-row');
        row.type = 'button';
        row.setAttribute('role', 'option');
        const ico = h('span', 'fp-row-icon');
        ico.innerHTML = icon('folder', 16);
        const name = h('span', 'fp-row-name', entry.name);
        const chev = h('span', 'fp-row-chev');
        chev.innerHTML = icon('chevronRight', 14);
        row.append(ico, name, chev);
        row.addEventListener('click', () => load(entry.path));
        list.append(row);
      }
      if (data.truncated) {
        list.append(h('div', 'fp-truncated', 'Showing the first 1000 folders. Type a path above to go deeper.'));
      }
    }

    function setLoading() {
      list.replaceChildren();
      const skel = h('div', 'fp-skeletons');
      for (let i = 0; i < 6; i++) skel.append(h('div', 'fp-skeleton'));
      list.append(skel);
      btnSelect.disabled = true;
    }

    function showError(message) {
      list.replaceChildren();
      const err = h('div', 'fp-error');
      err.setAttribute('role', 'alert');
      err.append(h('div', 'fp-error-title', 'Cannot open folder'), h('div', 'fp-error-sub', message));
      list.append(err);
    }

    async function load(targetPath) {
      const myId = ++requestId;
      setLoading();
      try {
        const qs = new URLSearchParams({ path: targetPath || '', hidden: showHidden ? '1' : '0' });
        const res = await fetch(`/api/fs/list?${qs}`);
        const data = await res.json().catch(() => ({}));
        if (myId !== requestId) return;
        if (!res.ok) {
          showError(data.error || `Request failed (${res.status})`);
          if (current) {
            pathInput.value = current.path;
            btnSelect.disabled = false;
          }
          return;
        }
        current = data;
        pathInput.value = data.path;
        btnUp.disabled = !data.parent;
        btnSelect.disabled = false;
        const markerText = data.markers.length ? `Project detected: ${data.markers.join(', ')}` : `${data.entries.length} subfolder${data.entries.length === 1 ? '' : 's'}`;
        meta.textContent = markerText;
        renderCrumbs(data.sep);
        renderList(data);
        list.scrollTop = 0;
      } catch (err) {
        if (myId !== requestId) return;
        showError(err.message || 'Network error');
      }
    }

    btnClose.addEventListener('click', () => finish(null));
    btnCancel.addEventListener('click', () => finish(null));
    btnSelect.addEventListener('click', () => { if (current) finish(current.path); });
    btnUp.addEventListener('click', () => { if (current?.parent) load(current.parent); });
    btnHome.addEventListener('click', () => load(current?.home || '~'));
    btnHidden.addEventListener('click', () => {
      showHidden = !showHidden;
      btnHidden.innerHTML = icon(showHidden ? 'eye' : 'eyeOff', 15);
      btnHidden.title = showHidden ? 'Hide hidden folders' : 'Show hidden folders';
      btnHidden.classList.toggle('is-active', showHidden);
      load(current?.path || '');
    });
    pathInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        load(pathInput.value.trim());
      }
    });
    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay) finish(null);
    });

    load(startPath);
    setTimeout(() => btnSelect.focus({ preventScroll: true }), 60);
  });
}
