const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ═══════════════════════════════════════
//  STATE
// ═══════════════════════════════════════

const state = {
  mode: 'normal',
  tabs: [],
  activeTab: null,
  tabCounter: 0,
  gPending: false,
  gTimeout: null,
  yPending: false,
  yTimeout: null,
  commandHistory: [],
  commandIdx: -1,
};

const commands = {
  'close':    { desc: 'Close tab',       fn: () => closeTab(state.activeTab) },
  'quit':     { desc: 'Close tab',       fn: () => closeTab(state.activeTab) },
  'q':        { desc: 'Close tab',       fn: () => closeTab(state.activeTab) },
  'tabclose': { desc: 'Close tab',       fn: () => closeTab(state.activeTab) },
  'new':      { desc: 'New tab',         fn: () => createTab() },
  'tabnew':   { desc: 'New tab',         fn: () => createTab() },
  'open':     { desc: 'Open URL',        fn: (a) => navigateTo(a) },
  'back':     { desc: 'Go back',         fn: () => goBack() },
  'forward':  { desc: 'Go forward',      fn: () => goForward() },
  'reload':   { desc: 'Reload page',     fn: () => reloadPage() },
  'stop':     { desc: 'Stop loading',    fn: () => {} },
  'help':     { desc: 'Show help',       fn: () => toggleHelp() },
  'copy':     { desc: 'Copy URL',        fn: () => copyUrl() },
  'zoomin':   { desc: 'Zoom in',         fn: () => zoom(0.1) },
  'zoomout':  { desc: 'Zoom out',        fn: () => zoom(-0.1) },
  'zoomreset':{ desc: 'Reset zoom',      fn: () => zoom(0, true) },
};

// ═══════════════════════════════════════
//  TABS
// ═══════════════════════════════════════

function createTab(url = null) {
  state.tabCounter++;
  const id = state.tabCounter;
  state.tabs.push({ id, url, title: 'New Tab' });
  setActiveTab(id);
  renderTabs();
  if (url) navigateTo(url);
}

function closeTab(id) {
  const idx = state.tabs.findIndex(t => t.id === id);
  if (idx === -1) return;
  state.tabs.splice(idx, 1);
  if (state.tabs.length === 0) { createTab(); return; }
  setActiveTab(state.tabs[Math.min(idx, state.tabs.length - 1)].id);
  renderTabs();
  loadActiveTab();
}

function setActiveTab(id) {
  state.activeTab = id;
  const tab = getActiveTab();
  if (!tab) return;
  tab.url ? showBrowser(tab.url) : showStartPage();
  updateUrlBar();
  renderTabs();
}

function getActiveTab() {
  return state.tabs.find(t => t.id === state.activeTab);
}

function renderTabs() {
  const el = $('#tabs');
  el.innerHTML = '';
  state.tabs.forEach(tab => {
    const div = document.createElement('div');
    div.className = `tab${tab.id === state.activeTab ? ' active' : ''}`;
    div.innerHTML = `<span class="tab-title">${esc(tab.title)}</span><button class="tab-close">✕</button>`;
    div.addEventListener('click', e => {
      if (e.target.classList.contains('tab-close')) return;
      setActiveTab(tab.id);
    });
    div.querySelector('.tab-close').addEventListener('click', e => {
      e.stopPropagation();
      closeTab(tab.id);
    });
    el.appendChild(div);
  });
}

// ═══════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════

function navigateTo(input) {
  if (!input) return;
  let url = input.trim();
  if (/^https?:\/\//i.test(url)) { /* ok */ }
  else if (/^file:\/\//i.test(url)) { /* ok */ }
  else if (/^localhost(:\d+)?/i.test(url)) { url = 'http://' + url; }
  else if (/^[\w-]+(\.[\w-]+)+/.test(url) && !url.includes(' ')) { url = 'https://' + url; }
  else { url = `https://www.google.com/search?q=${encodeURIComponent(url)}`; }

  const tab = getActiveTab();
  if (tab) {
    tab.url = url;
    try { tab.title = new URL(url).hostname; } catch(e) {}
    renderTabs();
  }
  showBrowser(url);
  updateUrlBar();
}

function goBack() {
  const wv = $('#browser-webview');
  try { wv.goBack(); } catch(e) {}
}

function goForward() {
  const wv = $('#browser-webview');
  try { wv.goForward(); } catch(e) {}
}

function reloadPage() {
  const wv = $('#browser-webview');
  try { wv.reload(); } catch(e) {}
}

function copyUrl() {
  const tab = getActiveTab();
  if (tab?.url) {
    navigator.clipboard.writeText(tab.url);
    setStatus('URL copied!');
  }
}

function zoom(delta, reset = false) {
  const wv = $('#browser-webview');
  try {
    if (reset) wv.setZoom(1.0);
    else wv.getZoom().then(z => wv.setZoom(z + delta));
  } catch(e) {}
}

// ═══════════════════════════════════════
//  VIEWS
// ═══════════════════════════════════════

function showBrowser(url) {
  $('#start-page').classList.add('hidden');
  $('#browser-frame-wrapper').classList.remove('hidden');
  const wv = $('#browser-webview');
  if (wv.getAttribute('data-current-url') !== url) {
    wv.src = url;
    wv.setAttribute('data-current-url', url);
  }
}

function showStartPage() {
  $('#start-page').classList.remove('hidden');
  $('#browser-frame-wrapper').classList.add('hidden');
  setTimeout(() => $('#start-search-input').focus(), 50);
}

function updateUrlBar() {
  const tab = getActiveTab();
  $('#url-bar').value = tab?.url || '';
}

// ═══════════════════════════════════════
//  MODES
// ═══════════════════════════════════════

function setMode(mode) {
  state.mode = mode;
  const ind = $('#mode-indicator');
  ind.className = '';
  ind.textContent = mode.toUpperCase();
  if (mode === 'insert') ind.classList.add('insert');
  if (mode === 'command') ind.classList.add('command');
}

// ═══════════════════════════════════════
//  STATUS
// ═══════════════════════════════════════

let statusTimer;
function setStatus(msg) {
  clearTimeout(statusTimer);
  $('#status-message').textContent = msg;
  statusTimer = setTimeout(() => { $('#status-message').textContent = ''; }, 3000);
}

// ═══════════════════════════════════════
//  COMMAND MODE
// ═══════════════════════════════════════

function openCmd(prefix = ':') {
  $('#command-overlay').classList.remove('hidden');
  $('#command-prefix').textContent = prefix;
  const inp = $('#command-input');
  inp.value = '';
  inp.placeholder = prefix === ':' ? 'Command...' : 'Search...';
  setMode('command');
  inp.focus();
  renderSuggestions('');
}

function closeCmd() {
  $('#command-overlay').classList.add('hidden');
  $('#command-input').value = '';
  $('#command-suggestions').innerHTML = '';
  setMode('normal');
}

function execCmd(raw) {
  const input = raw.trim();
  if (!input) return;
  state.commandHistory.push(input);
  state.commandIdx = state.commandHistory.length;

  if (input.startsWith('/')) {
    navigateTo(`https://www.google.com/search?q=${encodeURIComponent(input.slice(1))}`);
  } else if (input.startsWith(':')) {
    const cmd = input.slice(1).trim();
    const [name, ...args] = cmd.split(/\s+/);
    const handler = commands[name?.toLowerCase()];
    if (handler) handler.fn(args.join(' '));
    else if (name) setStatus(`Unknown: ${name}`);
  } else {
    navigateTo(input);
  }
  closeCmd();
}

function renderSuggestions(query) {
  const c = $('#command-suggestions');
  c.innerHTML = '';
  if (!query) return;
  Object.entries(commands)
    .filter(([n]) => n.startsWith(query.toLowerCase()))
    .slice(0, 8)
    .forEach(([name, cmd], i) => {
      const el = document.createElement('div');
      el.className = `cmd-item${i === 0 ? ' selected' : ''}`;
      el.innerHTML = `<span class="cmd-item-name">${esc(name)}</span><span class="cmd-item-desc">${esc(cmd.desc)}</span>`;
      el.addEventListener('click', () => { $('#command-input').value = name + ' '; renderSuggestions(name); });
      c.appendChild(el);
    });
}

// ═══════════════════════════════════════
//  HELP
// ═══════════════════════════════════════

function toggleHelp() {
  $('#help-overlay').classList.toggle('hidden');
}

// ═══════════════════════════════════════
//  SCROLL
// ═══════════════════════════════════════

function scrollBy(px) {
  try {
    const wv = $('#browser-webview');
    wv.executeJavaScript(`window.scrollBy({top:${px},behavior:'smooth'})`);
  } catch(e) {}
}

function scrollToTop() {
  try {
    $('#browser-webview').executeJavaScript(`window.scrollTo({top:0,behavior:'smooth'})`);
  } catch(e) {}
}

function scrollToBottom() {
  try {
    $('#browser-webview').executeJavaScript(`window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'})`);
  } catch(e) {}
}

// ═══════════════════════════════════════
//  KEYBOARD
// ═══════════════════════════════════════

const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA']);

document.addEventListener('keydown', (e) => {
  const isInInput = INPUT_TAGS.has(e.target.tagName);

  // ── Command mode ──
  if (state.mode === 'command') {
    if (e.key === 'Escape') { e.preventDefault(); closeCmd(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      execCmd($('#command-prefix').textContent + $('#command-input').value);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const sel = $('.cmd-item.selected');
      if (sel?.nextElementSibling) { sel.classList.remove('selected'); sel.nextElementSibling.classList.add('selected'); }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const sel = $('.cmd-item.selected');
      if (sel?.previousElementSibling) { sel.classList.remove('selected'); sel.previousElementSibling.classList.add('selected'); }
      return;
    }
    return;
  }

  // ── Insert mode ──
  if (isInInput) {
    if (e.key === 'Escape') { e.preventDefault(); e.target.blur(); setMode('normal'); return; }
    if (e.key === 'Enter' && e.target.id === 'url-bar') {
      e.preventDefault(); navigateTo(e.target.value); e.target.blur(); setMode('normal'); return;
    }
    if (e.key === 'Enter' && e.target.id === 'start-search-input') {
      e.preventDefault(); navigateTo(e.target.value); return;
    }
    return;
  }

  // ── Ctrl combos ──
  if (e.ctrlKey) {
    if (e.key === 'r') { e.preventDefault(); reloadPage(); return; }
    if (e.key === 'd') { e.preventDefault(); scrollBy(window.innerHeight / 2); return; }
    if (e.key === 'u') { e.preventDefault(); scrollBy(-window.innerHeight / 2); return; }
    return;
  }

  // ── g prefix ──
  if (state.gPending) {
    clearTimeout(state.gTimeout);
    state.gPending = false;
    if (e.key === 'g') { scrollToTop(); setStatus('Top'); }
    return;
  }

  // ── Normal keys ──
  const nav = ['o','O','r','j','k','h','l','t','q','J','K','g','G',':','?'];
  if (nav.includes(e.key) || (e.key >= '1' && e.key <= '9')) e.preventDefault();

  switch(e.key) {
    case 'g':
      state.gPending = true;
      state.gTimeout = setTimeout(() => {
        state.gPending = false;
        setMode('insert');
        const b = $('#url-bar'); b.value = 'g'; b.focus();
      }, 500);
      return;

    case 'o':
      setMode('insert');
      const b1 = $('#url-bar'); b1.value = ''; b1.focus();
      break;

    case 'O':
      createTab();
      setMode('insert');
      setTimeout(() => { const b = $('#url-bar'); b.value = ''; b.focus(); }, 10);
      break;

    case 'i':
      setMode('insert');
      try { $('#browser-webview').focus(); } catch(e) {}
      break;

    case ':': openCmd(':'); break;
    case '/': openCmd('/'); break;
    case '?': toggleHelp(); break;

    case 'Escape':
      $('#help-overlay').classList.add('hidden');
      closeCmd();
      setStatus('');
      break;

    case 'h': goBack(); setStatus('← Back'); break;
    case 'l': goForward(); setStatus('→ Forward'); break;
    case 'r': reloadPage(); setStatus('↻ Reloaded'); break;
    case 'j': scrollBy(60); break;
    case 'k': scrollBy(-60); break;
    case 'G': scrollToBottom(); setStatus('Bottom'); break;
    case 't': createTab(); setStatus('New tab'); break;
    case 'q': case 'x': closeTab(state.activeTab); break;
    case 'J': navigateTab(1); break;
    case 'K': navigateTab(-1); break;
    case 'y': handleY(); break;
    case 'p':
      setMode('insert');
      navigator.clipboard.readText().then(t => { const b = $('#url-bar'); b.value = t; b.focus(); }).catch(() => {});
      break;
    case '1': case '2': case '3': case '4': case '5':
    case '6': case '7': case '8': case '9':
      goToTab(parseInt(e.key));
      break;
  }
});

function handleY() {
  if (state.yPending) { clearTimeout(state.yTimeout); state.yPending = false; copyUrl(); return; }
  state.yPending = true;
  state.yTimeout = setTimeout(() => { state.yPending = false; }, 400);
}

function navigateTab(dir) {
  const idx = state.tabs.findIndex(t => t.id === state.activeTab);
  const ni = (idx + dir + state.tabs.length) % state.tabs.length;
  setActiveTab(state.tabs[ni].id);
  loadActiveTab();
}

function goToTab(n) {
  if (n <= state.tabs.length) { setActiveTab(state.tabs[n - 1].id); loadActiveTab(); }
}

function loadActiveTab() {
  const tab = getActiveTab();
  tab?.url ? showBrowser(tab.url) : showStartPage();
  updateUrlBar();
}

// ═══════════════════════════════════════
//  EVENTS
// ═══════════════════════════════════════

$('#btn-minimize')?.addEventListener('click', () => { try { window.__TAURI__.window.getCurrentWindow().minimize(); } catch(e) {} });
$('#btn-maximize')?.addEventListener('click', () => { try { window.__TAURI__.window.getCurrentWindow().toggleMaximize(); } catch(e) {} });
$('#btn-close')?.addEventListener('click', () => { try { window.__TAURI__.window.getCurrentWindow().close(); } catch(e) {} });

$('#btn-back')?.addEventListener('click', goBack);
$('#btn-forward')?.addEventListener('click', goForward);
$('#btn-reload')?.addEventListener('click', reloadPage);
$('#btn-new-tab')?.addEventListener('click', () => createTab());

$('#command-input')?.addEventListener('input', e => renderSuggestions(e.target.value));
$('#help-close')?.addEventListener('click', toggleHelp);
$('#help-overlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) toggleHelp(); });

$('#start-search-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); navigateTo(e.target.value); }
});

// Webview title update
$('#browser-webview')?.addEventListener('page-title-updated', e => {
  const tab = getActiveTab();
  if (tab) { tab.title = e.title || tab.title; renderTabs(); }
});

$('#browser-webview')?.addEventListener('did-navigate', e => {
  const tab = getActiveTab();
  if (tab) { tab.url = e.url; updateUrlBar(); }
});

// ═══════════════════════════════════════
//  UTIL
// ═══════════════════════════════════════

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// ═══════════════════════════════════════
//  INIT
// ═══════════════════════════════════════

createTab();
setMode('normal');
setStatus('Welcome to Vybe — press ? for help');
