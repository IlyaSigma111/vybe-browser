(() => {
  'use strict';

  // ═══════════════════════════════════════
  //  STATE
  // ═══════════════════════════════════════

  let themeIndex = 0;
  const themeKeys = Object.keys(THEMES);
  let currentTheme = localStorage.getItem('vybe-theme') || 'dracula';
  let zoomLevel = 100;
  let loadingBar = null;

  // ═══════════════════════════════════════
  //  DOM
  // ═══════════════════════════════════════

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const urlBar = $('#url-bar');
  const btnBack = $('#btn-back');
  const btnForward = $('#btn-forward');
  const btnReload = $('#btn-reload');
  const btnHome = $('#btn-home');
  const btnBookmark = $('#btn-bookmark-toggle');
  const btnMenu = $('#btn-menu');
  const sslIcon = $('#ssl-icon');
  const zoomLabel = $('#zoom-label');
  const statusLeft = $('#status-left');
  const statusZoom = $('#status-zoom');
  const statusTheme = $('#status-theme');
  const bookmarksBar = $('#bookmarks-bar');
  const findBar = $('#find-bar');
  const findInput = $('#find-input');
  const findCount = $('#find-count');
  const panelOverlay = $('#panel-overlay');
  const panel = $('#panel');
  const panelTitle = $('#panel-title');
  const panelBody = $('#panel-body');
  const panelClose = $('#panel-close');
  const cmdOverlay = $('#cmd-overlay');
  const cmdPalette = $('#cmd-palette');
  const cmdInput = $('#cmd-input');
  const cmdList = $('#cmd-list');

  // ═══════════════════════════════════════
  //  THEMES
  // ═══════════════════════════════════════

  function applyTheme(name) {
    const t = THEMES[name];
    if (!t) return;
    currentTheme = name;
    localStorage.setItem('vybe-theme', name);
    const r = document.documentElement.style;
    r.setProperty('--bg', t.bg);
    r.setProperty('--bg-secondary', t.bgSecondary);
    r.setProperty('--bg-tertiary', t.bgTertiary);
    r.setProperty('--bg-hover', t.bgHover);
    r.setProperty('--bg-active', t.bgActive);
    r.setProperty('--border', t.border);
    r.setProperty('--text', t.text);
    r.setProperty('--text-secondary', t.textSecondary);
    r.setProperty('--text-muted', t.textMuted);
    r.setProperty('--accent', t.accent);
    r.setProperty('--accent-glow', t.accentGlow);
    r.setProperty('--accent-soft', t.accentSoft);
    r.setProperty('--green', t.green);
    r.setProperty('--red', t.red);
    r.setProperty('--yellow', t.yellow);
    r.setProperty('--cyan', t.cyan);
    r.setProperty('--pink', t.pink);
    r.setProperty('--orange', t.orange);
    document.title = `Vybe — ${t.name}`;
    statusTheme.textContent = name;
    themeIndex = themeKeys.indexOf(name);
  }

  function cycleTheme() {
    themeIndex = (themeIndex + 1) % themeKeys.length;
    applyTheme(themeKeys[themeIndex]);
  }

  // ═══════════════════════════════════════
  //  NAVIGATION
  // ═══════════════════════════════════════

  function navigate(input) {
    let url = input.trim();
    if (/^https?:\/\//i.test(url)) { /* ok */ }
    else if (/^file:\/\//i.test(url)) { /* ok */ }
    else if (/^data:/i.test(url)) { /* ok */ }
    else if (/^localhost(:\d+)?/i.test(url)) { url = 'http://' + url; }
    else if (/^[\w-]+(\.[\w-]+)+/.test(url) && !url.includes(' ')) { url = 'https://' + url; }
    else { url = `https://www.google.com/search?q=${encodeURIComponent(url)}`; }
    vybe.navigate(url);
  }

  // ═══════════════════════════════════════
  //  UI UPDATES
  // ═══════════════════════════════════════

  function updateNavState(info) {
    if (!info) return;
    urlBar.value = info.url || '';
    btnBack.disabled = !info.canGoBack;
    btnForward.disabled = !info.canGoForward;
    if (info.title) document.title = `Vybe — ${info.title}`;
    updateBookmarkIcon(info.url);
  }

  function setLoading(loading) {
    if (loading) {
      if (!loadingBar) {
        loadingBar = document.createElement('div');
        loadingBar.className = 'loading-bar';
        document.body.appendChild(loadingBar);
      }
      btnReload.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12"/></svg>';
    } else {
      if (loadingBar) { loadingBar.remove(); loadingBar = null; }
      btnReload.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-1.44-9.14L23 10"/></svg>';
    }
  }

  // ═══════════════════════════════════════
  //  BOOKMARKS
  // ═══════════════════════════════════════

  async function updateBookmarkIcon(url) {
    if (!url || url.startsWith('about:')) { btnBookmark.style.color = ''; return; }
    const has = await vybe.hasBookmark(url);
    btnBookmark.style.color = has ? 'var(--yellow)' : '';
  }

  async function toggleBookmark() {
    const info = await vybe.info();
    if (!info || !info.url) return;
    const has = await vybe.hasBookmark(info.url);
    if (has) {
      await vybe.removeBookmark(info.url);
    } else {
      await vybe.addBookmark({ url: info.url, title: info.title || info.url });
    }
    updateBookmarkIcon(info.url);
    renderBookmarksBar();
  }

  async function renderBookmarksBar() {
    const bms = await vybe.getBookmarks();
    bookmarksBar.innerHTML = '';
    bms.forEach(b => {
      const el = document.createElement('div');
      el.className = 'bm-item';
      el.innerHTML = `<img class="bm-favicon" src="https://www.google.com/s2/favicons?domain=${new URL(b.url).hostname}&sz=16" onerror="this.style.display='none'"><span>${b.title || b.url}</span>`;
      el.addEventListener('click', () => navigate(b.url));
      bookmarksBar.appendChild(el);
    });
  }

  // ═══════════════════════════════════════
  //  PANELS
  // ═══════════════════════════════════════

  function openPanel(title, renderFn) {
    panelTitle.textContent = title;
    panelBody.innerHTML = '';
    renderFn(panelBody);
    panelOverlay.classList.remove('hidden');
    panel.classList.remove('hidden');
  }

  function closePanel() {
    panelOverlay.classList.add('hidden');
    panel.classList.add('hidden');
  }

  function renderHistoryPanel(container) {
    const input = document.createElement('input');
    input.className = 'p-search';
    input.placeholder = 'Search history...';
    container.appendChild(input);

    const list = document.createElement('div');
    container.appendChild(list);

    async function load(q) {
      const items = await vybe.searchHistory(q || '');
      list.innerHTML = '';
      items.forEach(h => {
        const el = document.createElement('div');
        el.className = 'p-item';
        el.innerHTML = `<div class="p-item-icon">🕐</div><div class="p-item-info"><div class="p-item-title">${esc(h.title)}</div><div class="p-item-sub">${esc(h.url)}</div></div><button class="p-item-action" title="Remove">✕</button>`;
        el.querySelector('.p-item-title, .p-item-sub').addEventListener('click', () => { closePanel(); navigate(h.url); });
        el.querySelector('.p-item-action').addEventListener('click', async (e) => {
          e.stopPropagation();
          // Remove this specific item from history
          const all = await vybe.getHistory();
          const idx = all.findIndex(x => x.url === h.url && x.time === h.time);
          if (idx > -1) { all.splice(all.length - 1 - idx, 1); /* reverse index */ }
          await vybe.saveSettings(all); // hack: use any save endpoint
          load(input.value);
        });
        list.appendChild(el);
      });
      if (!items.length) list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">No history</div>';
    }
    load('');
    input.addEventListener('input', () => load(input.value));
  }

  function renderBookmarksPanel(container) {
    const btns = document.createElement('div');
    btns.className = 'p-btn-group';
    btns.innerHTML = '<button class="p-btn p-btn-danger" id="clear-bm">Clear all</button>';
    container.appendChild(btns);

    const list = document.createElement('div');
    container.appendChild(list);

    async function load() {
      const items = await vybe.getBookmarks();
      list.innerHTML = '';
      items.forEach(b => {
        const el = document.createElement('div');
        el.className = 'p-item';
        el.innerHTML = `<div class="p-item-icon">⭐</div><div class="p-item-info"><div class="p-item-title">${esc(b.title)}</div><div class="p-item-sub">${esc(b.url)}</div></div><button class="p-item-action" title="Remove">✕</button>`;
        el.querySelector('.p-item-title, .p-item-sub').addEventListener('click', () => { closePanel(); navigate(b.url); });
        el.querySelector('.p-item-action').addEventListener('click', async (e) => { e.stopPropagation(); await vybe.removeBookmark(b.url); load(); });
        list.appendChild(el);
      });
      if (!items.length) list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">No bookmarks</div>';
    }
    load();

    btns.querySelector('#clear-bm').addEventListener('click', async () => {
      await vybe.saveSettings([]); // hack
      load();
    });
  }

  let downloads = [];
  function renderDownloadsPanel(container) {
    const list = document.createElement('div');
    container.appendChild(list);

    function render() {
      list.innerHTML = '';
      downloads.forEach(d => {
        const pct = d.total > 0 ? Math.round((d.received / d.total) * 100) : 0;
        const el = document.createElement('div');
        el.className = 'p-item';
        el.style.flexDirection = 'column';
        el.style.alignItems = 'stretch';
        el.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="p-item-icon">📥</div>
            <div class="p-item-info">
              <div class="p-item-title">${esc(d.fileName)}</div>
              <div class="p-item-sub">${d.state === 'completed' ? '✅ Done' : d.state === 'cancelled' ? '⛔ Cancelled' : pct + '%'}</div>
            </div>
          </div>
          ${d.state === 'progressing' ? `<div style="height:3px;background:var(--bg-hover);border-radius:2px;margin-top:6px;"><div style="height:100%;width:${pct}%;background:var(--accent);border-radius:2px;"></div></div>` : ''}
        `;
        list.appendChild(el);
      });
      if (!downloads.length) list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">No downloads</div>';
    }

    vybe.on('download:start', (d) => { downloads.push({ ...d, received: 0, state: 'progressing' }); render(); });
    vybe.on('download:progress', (d) => { const item = downloads.find(x => x.id === d.id); if (item) { item.received = d.received; item.total = d.total; } render(); });
    vybe.on('download:done', (d) => { const item = downloads.find(x => x.id === d.id); if (item) { item.state = d.state; } render(); });
    render();
  }

  function renderExtensionsPanel(container) {
    const btns = document.createElement('div');
    btns.className = 'p-btn-group';
    btns.style.marginBottom = '12px';
    btns.innerHTML = '<button class="p-btn p-btn-primary" id="install-ext">Install from folder</button><button class="p-btn p-btn-secondary" id="refresh-ext">Refresh</button>';
    container.appendChild(btns);

    const list = document.createElement('div');
    container.appendChild(list);

    async function load() {
      const items = await vybe.getExtensions();
      list.innerHTML = '';
      items.forEach(e => {
        const el = document.createElement('div');
        el.className = 'p-item';
        el.innerHTML = `<div class="p-item-icon">🧩</div><div class="p-item-info"><div class="p-item-title">${esc(e.name)}</div><div class="p-item-sub">v${e.version} — ${esc(e.description || 'No description')}</div></div>`;
        list.appendChild(el);
      });
      if (!items.length) list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">No extensions installed.<br><br>Click "Install from folder" to add a Chrome extension.</div>';
    }
    load();

    btns.querySelector('#install-ext').addEventListener('click', async () => {
      const result = await vybe.installExtension();
      if (result.success) load(); else alert('Failed: ' + result.error);
    });
    btns.querySelector('#refresh-ext').addEventListener('click', load);
  }

  function renderCookiesPanel(container) {
    const btns = document.createElement('div');
    btns.className = 'p-btn-group';
    btns.style.marginBottom = '12px';
    btns.innerHTML = '<button class="p-btn p-btn-secondary" id="refresh-cookies">Refresh</button><button class="p-btn p-btn-danger" id="clear-cookies">Clear all</button>';
    container.appendChild(btns);

    const list = document.createElement('div');
    container.appendChild(list);

    async function load() {
      const cookies = await vybe.getCookies({});
      list.innerHTML = '';
      cookies.forEach(c => {
        const el = document.createElement('div');
        el.className = 'p-item';
        el.innerHTML = `<div class="p-item-icon">🍪</div><div class="p-item-info"><div class="p-item-title">${esc(c.name)}</div><div class="p-item-sub">${esc(c.domain)} — ${c.httpOnly ? '🔒 httpOnly' : ''} ${c.secure ? '🔐 secure' : ''}</div></div><button class="p-item-action" title="Remove">✕</button>`;
        el.querySelector('.p-item-action').addEventListener('click', async () => {
          await vybe.removeCookie(c.domain.startsWith('.') ? c.domain : ('https://' + c.domain), c.name);
          load();
        });
        list.appendChild(el);
      });
      if (!cookies.length) list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">No cookies</div>';
    }
    load();

    btns.querySelector('#refresh-cookies').addEventListener('click', load);
    btns.querySelector('#clear-cookies').addEventListener('click', async () => { await vybe.clearCookies(); load(); });
  }

  function renderSettingsPanel(container) {
    container.innerHTML = `
      <div class="p-field"><label>Homepage</label><input type="text" id="set-home" value="about:blank"></div>
      <div class="p-field"><label>Search engine URL (%s = query)</label><input type="text" id="set-search" value="https://www.google.com/search?q=%s"></div>
      <div class="p-field"><label>New tab URL</label><input type="text" id="set-newtab" value="about:blank"></div>
      <div class="p-field"><label>Font size (px)</label><input type="number" id="set-font" value="14" min="10" max="24"></div>
      <div class="p-field"><label>Smooth scrolling</label><select id="set-scroll"><option value="true">On</option><option value="false">Off</option></select></div>
      <div class="p-field"><label>JavaScript</label><select id="set-js"><option value="true">On</option><option value="false">Off</option></select></div>
      <div class="p-field"><label>Load images</label><select id="set-img"><option value="true">On</option><option value="false">Off</option></select></div>
      <div class="p-btn-group"><button class="p-btn p-btn-primary" id="save-settings">Save settings</button></div>
    `;
    vybe.getSettings().then(s => {
      container.querySelector('#set-home').value = s.homepage || '';
      container.querySelector('#set-search').value = s.searchEngine || '';
      container.querySelector('#set-newtab').value = s.newTabUrl || '';
      container.querySelector('#set-font').value = s.fontSize || 14;
      container.querySelector('#set-scroll').value = String(s.smoothScroll);
      container.querySelector('#set-js').value = String(s.javascript);
      container.querySelector('#set-img').value = String(s.images);
    });

    container.querySelector('#save-settings').addEventListener('click', async () => {
      await vybe.saveSettings({
        homepage: container.querySelector('#set-home').value,
        searchEngine: container.querySelector('#set-search').value,
        newTabUrl: container.querySelector('#set-newtab').value,
        fontSize: parseInt(container.querySelector('#set-font').value) || 14,
        smoothScroll: container.querySelector('#set-scroll').value === 'true',
        javascript: container.querySelector('#set-js').value === 'true',
        images: container.querySelector('#set-img').value === 'true',
      });
      statusLeft.textContent = 'Settings saved';
      setTimeout(() => { statusLeft.textContent = 'Ready'; }, 2000);
    });
  }

  // ═══════════════════════════════════════
  //  FIND
  // ═══════════════════════════════════════

  let findQuery = '';
  function openFind() {
    findBar.classList.remove('hidden');
    findInput.focus();
    findInput.select();
  }
  function closeFind() {
    findBar.classList.add('hidden');
    vybe.findStop();
    findInput.value = '';
    findCount.textContent = '';
  }

  // ═══════════════════════════════════════
  //  COMMAND PALETTE
  // ═══════════════════════════════════════

  const COMMANDS = [
    { icon: '←', text: 'Go back', shortcut: 'Alt+←', action: () => vybe.back() },
    { icon: '→', text: 'Go forward', shortcut: 'Alt+→', action: () => vybe.forward() },
    { icon: '🔄', text: 'Reload', shortcut: 'F5', action: () => vybe.reload() },
    { icon: '🏠', text: 'Home', shortcut: 'Alt+Home', action: () => vybe.home() },
    { icon: '🔍', text: 'Find in page', shortcut: 'Ctrl+F', action: openFind },
    { icon: '🖨', text: 'Print', shortcut: 'Ctrl+P', action: () => vybe.print() },
    { icon: '📄', text: 'Save as PDF', shortcut: '', action: () => vybe.pdf() },
    { icon: '💾', text: 'Save page', shortcut: 'Ctrl+S', action: () => vybe.savePage() },
    { icon: '📝', text: 'View source', shortcut: '', action: () => vybe.info().then(i => { if (i) vybe.execute('document.documentElement.outerHTML'); }) },
    { icon: '🔧', text: 'DevTools', shortcut: 'F12', action: () => vybe.devtools() },
    { icon: '🔎', text: 'Zoom in', shortcut: 'Ctrl++', action: () => vybe.zoomIn() },
    { icon: '🔎', text: 'Zoom out', shortcut: 'Ctrl+-', action: () => vybe.zoomOut() },
    { icon: '🔍', text: 'Reset zoom', shortcut: 'Ctrl+0', action: () => vybe.zoomReset() },
    { icon: '🎨', text: 'Cycle theme', shortcut: 'Alt+T', action: cycleTheme },
    { icon: '⭐', text: 'Bookmark this page', shortcut: 'Alt+B', action: toggleBookmark },
    { icon: '🕐', text: 'Open history', shortcut: '', action: () => openPanel('History', renderHistoryPanel) },
    { icon: '⭐', text: 'Open bookmarks', shortcut: '', action: () => openPanel('Bookmarks', renderBookmarksPanel) },
    { icon: '📥', text: 'Open downloads', shortcut: '', action: () => openPanel('Downloads', renderDownloadsPanel) },
    { icon: '🧩', text: 'Manage extensions', shortcut: '', action: () => openPanel('Extensions', renderExtensionsPanel) },
    { icon: '🍪', text: 'Manage cookies', shortcut: '', action: () => openPanel('Cookies', renderCookiesPanel) },
    { icon: '⚙', text: 'Settings', shortcut: '', action: () => openPanel('Settings', renderSettingsPanel) },
    { icon: '🧹', text: 'Clear history', shortcut: '', action: async () => { await vybe.clearHistory(); statusLeft.textContent = 'History cleared'; } },
    { icon: '🍪', text: 'Clear cookies', shortcut: '', action: async () => { await vybe.clearCookies(); statusLeft.textContent = 'Cookies cleared'; } },
  ];

  let cmdActiveIndex = 0;
  let cmdFiltered = [...COMMANDS];

  function openCmdPalette() {
    cmdOverlay.classList.remove('hidden');
    cmdPalette.classList.remove('hidden');
    cmdInput.value = '';
    cmdActiveIndex = 0;
    filterCommands('');
    cmdInput.focus();
  }

  function closeCmdPalette() {
    cmdOverlay.classList.add('hidden');
    cmdPalette.classList.add('hidden');
  }

  function filterCommands(q) {
    cmdFiltered = COMMANDS.filter(c => (c.text + c.shortcut).toLowerCase().includes(q.toLowerCase()));
    cmdActiveIndex = 0;
    renderCmdList();
  }

  function renderCmdList() {
    cmdList.innerHTML = '';
    cmdFiltered.forEach((c, i) => {
      const el = document.createElement('div');
      el.className = 'cmd-item' + (i === cmdActiveIndex ? ' active' : '');
      el.innerHTML = `<span class="cmd-item-icon">${c.icon}</span><span class="cmd-item-text">${c.text}</span><span class="cmd-item-shortcut">${c.shortcut}</span>`;
      el.addEventListener('click', () => { closeCmdPalette(); c.action(); });
      cmdList.appendChild(el);
    });
  }

  // ═══════════════════════════════════════
  //  EVENTS
  // ═══════════════════════════════════════

  // Window
  $('#btn-min').addEventListener('click', () => vybe.minimize());
  $('#btn-max').addEventListener('click', () => vybe.maximize());
  $('#btn-close').addEventListener('click', () => vybe.close());

  // Nav
  btnBack.addEventListener('click', () => vybe.back());
  btnForward.addEventListener('click', () => vybe.forward());
  btnReload.addEventListener('click', () => vybe.reload());
  btnHome.addEventListener('click', () => vybe.home());
  btnBookmark.addEventListener('click', toggleBookmark);

  urlBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { navigate(urlBar.value); urlBar.blur(); }
    if (e.key === 'Escape') { urlBar.blur(); }
  });

  urlBar.addEventListener('focus', () => { urlBar.select(); });

  // Menu
  btnMenu.addEventListener('click', (e) => { e.stopPropagation(); btnMenu.parentElement.querySelector('.dropdown-menu').classList.toggle('open'); });
  document.addEventListener('click', () => { btnMenu.parentElement.querySelector('.dropdown-menu').classList.remove('open'); });

  $$('.dropdown-item').forEach(el => {
    el.addEventListener('click', () => {
      const action = el.dataset.action;
      closePanel();
      switch (action) {
        case 'history': openPanel('History', renderHistoryPanel); break;
        case 'bookmarks': openPanel('Bookmarks', renderBookmarksPanel); break;
        case 'downloads': openPanel('Downloads', renderDownloadsPanel); break;
        case 'extensions': openPanel('Extensions', renderExtensionsPanel); break;
        case 'cookies': openPanel('Cookies', renderCookiesPanel); break;
        case 'settings': openPanel('Settings', renderSettingsPanel); break;
        case 'print': vybe.print(); break;
        case 'pdf': vybe.pdf(); break;
        case 'save-page': vybe.savePage(); break;
        case 'view-source': vybe.info().then(i => { if (i) vybe.execute('document.documentElement.outerHTML'); }); break;
        case 'devtools': vybe.devtools(); break;
        case 'find': openFind(); break;
      }
    });
  });

  // Panel
  panelOverlay.addEventListener('click', closePanel);
  panelClose.addEventListener('click', closePanel);

  // Find
  findInput.addEventListener('input', () => {
    findQuery = findInput.value;
    if (findQuery) vybe.find(findQuery, { forward: true, findNext: false });
    else vybe.findStop();
  });
  findInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { vybe.findNext(findQuery); }
    if (e.key === 'Escape') { closeFind(); }
  });
  $('#find-prev').addEventListener('click', () => { if (findQuery) vybe.findPrev(findQuery); });
  $('#find-next').addEventListener('click', () => { if (findQuery) vybe.findNext(findQuery); });
  $('#find-close').addEventListener('click', closeFind);

  // Find results (from webContents)
  ipcRenderer_findResults();

  function ipcRenderer_findResults() {
    // Count updates come via webContents event — we need to listen
    vybe.on('nav:update', (info) => { /* handled elsewhere */ });
  }

  // Command palette
  cmdInput.addEventListener('input', () => filterCommands(cmdInput.value));
  cmdInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeCmdPalette(); return; }
    if (e.key === 'ArrowDown') { cmdActiveIndex = Math.min(cmdActiveIndex + 1, cmdFiltered.length - 1); renderCmdList(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { cmdActiveIndex = Math.max(cmdActiveIndex - 1, 0); renderCmdList(); e.preventDefault(); }
    if (e.key === 'Enter' && cmdFiltered[cmdActiveIndex]) { closeCmdPalette(); cmdFiltered[cmdActiveIndex].action(); }
  });
  cmdOverlay.addEventListener('click', closeCmdPalette);

  // Status bar
  statusTheme.addEventListener('click', cycleTheme);
  $('#status-cmd').addEventListener('click', openCmdPalette);

  // ═══════════════════════════════════════
  //  KEYBOARD
  // ═══════════════════════════════════════

  document.addEventListener('keydown', (e) => {
    const inInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
    const ctrl = e.ctrlKey || e.metaKey;
    const alt = e.altKey;

    // Ctrl+Space — command palette
    if (ctrl && e.key === ' ') { e.preventDefault(); openCmdPalette(); return; }

    // Ctrl+F — find
    if (ctrl && e.key === 'f') { e.preventDefault(); openFind(); return; }

    // Ctrl+P — print
    if (ctrl && e.key === 'p') { e.preventDefault(); vybe.print(); return; }

    // Ctrl+L — focus URL
    if (ctrl && e.key === 'l') { e.preventDefault(); urlBar.focus(); urlBar.select(); return; }

    // Ctrl+R / F5 — reload
    if ((ctrl && e.key === 'r') || e.key === 'F5') { e.preventDefault(); vybe.reload(); return; }

    // Ctrl+Shift+R — hard reload
    if (ctrl && e.shiftKey && e.key === 'R') { e.preventDefault(); vybe.hardReload(); return; }

    // Ctrl+S — save page
    if (ctrl && e.key === 's') { e.preventDefault(); vybe.savePage(); return; }

    // Ctrl++ / Ctrl+= — zoom in
    if (ctrl && (e.key === '=' || e.key === '+')) { e.preventDefault(); doZoom(1); return; }

    // Ctrl+- — zoom out
    if (ctrl && e.key === '-') { e.preventDefault(); doZoom(-1); return; }

    // Ctrl+0 — reset zoom
    if (ctrl && e.key === '0') { e.preventDefault(); doZoom(0); return; }

    // F12 — devtools
    if (e.key === 'F12') { e.preventDefault(); vybe.devtools(); return; }

    // Alt+T — cycle theme
    if (alt && e.key === 't') { e.preventDefault(); cycleTheme(); return; }

    // Alt+B — bookmark
    if (alt && e.key === 'b') { e.preventDefault(); toggleBookmark(); return; }

    // Alt+Left — back
    if (alt && e.key === 'ArrowLeft') { e.preventDefault(); vybe.back(); return; }

    // Alt+Right — forward
    if (alt && e.key === 'ArrowRight') { e.preventDefault(); vybe.forward(); return; }

    // Alt+Home — home
    if (alt && e.key === 'Home') { e.preventDefault(); vybe.home(); return; }

    // Alt+Enter — duplicate tab (just navigate to same URL)
    if (alt && e.key === 'Enter') { e.preventDefault(); vybe.info().then(i => { if (i) navigate(i.url); }); return; }

    // Escape — close panels/find/cmd
    if (e.key === 'Escape') {
      if (!cmdPalette.classList.contains('hidden')) { closeCmdPalette(); return; }
      if (!findBar.classList.contains('hidden')) { closeFind(); return; }
      if (!panel.classList.contains('hidden')) { closePanel(); return; }
      return;
    }

    // Non-input shortcuts (vim-like)
    if (inInput) return;

    // j/k — scroll
    if (e.key === 'j') { vybe.execute('window.scrollBy(0, 60)'); return; }
    if (e.key === 'k') { vybe.execute('window.scrollBy(0, -60)'); return; }
    if (e.key === 'g' && !e.shiftKey) {
      // gg — need double-tap detection
      if (window._lastKey === 'g') { vybe.execute('window.scrollTo(0,0)'); window._lastKey = ''; return; }
      window._lastKey = 'g';
      setTimeout(() => { window._lastKey = ''; }, 500);
      return;
    }
    if (e.key === 'G') { vybe.execute('window.scrollTo(0,document.body.scrollHeight)'); return; }

    // h/l — history back/forward
    if (e.key === 'h') { vybe.back(); return; }
    if (e.key === 'l') { vybe.forward(); return; }

    // r — reload
    if (e.key === 'r') { vybe.reload(); return; }

    // / — find
    if (e.key === '/') { e.preventDefault(); openFind(); return; }

    // : — command mode (just open palette)
    if (e.key === ':') { e.preventDefault(); openCmdPalette(); return; }

    // yy — copy URL
    if (e.key === 'y' && window._lastKey === 'y') {
      vybe.info().then(i => { if (i) { navigator.clipboard?.writeText(i.url); statusLeft.textContent = 'URL copied'; setTimeout(() => { statusLeft.textContent = 'Ready'; }, 1500); } });
      window._lastKey = '';
      return;
    }
    window._lastKey = e.key;
  });

  // ═══════════════════════════════════════
  //  ZOOM
  // ═══════════════════════════════════════

  async function doZoom(dir) {
    let z;
    if (dir === 0) z = await vybe.zoomReset();
    else if (dir > 0) z = await vybe.zoomIn();
    else z = await vybe.zoomOut();
    zoomLevel = Math.round(Math.pow(1.2, z) * 100);
    zoomLabel.textContent = zoomLevel + '%';
    statusZoom.textContent = zoomLevel + '%';
  }

  // ═══════════════════════════════════════
  //  EVENT LISTENERS (from main)
  // ═══════════════════════════════════════

  vybe.on('nav:update', updateNavState);
  vybe.on('nav:title', (title) => { document.title = `Vybe — ${title}`; });
  vybe.on('nav:loading', setLoading);
  vybe.on('nav:ssl', (info) => {
    sslIcon.textContent = info.secure ? '🔒' : '⚠️';
    sslIcon.title = info.secure ? 'Secure connection (HTTPS)' : 'Not secure (HTTP)';
  });
  vybe.on('nav:error', (err) => {
    statusLeft.textContent = `Error ${err.code}: ${err.desc}`;
  });
  vybe.on('browser:save-page', () => {
    // Handled by save-page IPC
  });

  // ═══════════════════════════════════════
  //  UTILS
  // ═══════════════════════════════════════

  function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

  // ═══════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════

  applyTheme(currentTheme);
  renderBookmarksBar();
  vybe.createView('about:blank');

})();
