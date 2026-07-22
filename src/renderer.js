const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ═══════════════════════════════════════
//  STATE
// ═══════════════════════════════════════

const state = {
  mode: 'normal',
  currentUrl: '',
  currentTitle: '',
  canGoBack: false,
  canGoForward: false,
  gPending: false,
  gTimeout: null,
  yPending: false,
  yTimeout: null,
  commandHistory: [],
  commandIdx: -1,
  bookmarks: [],
  isViewReady: false,
};

const commands = {
  'back':      { desc: 'Go back',       fn: () => goBack() },
  'forward':   { desc: 'Go forward',    fn: () => goForward() },
  'reload':    { desc: 'Reload page',   fn: () => reloadPage() },
  'stop':      { desc: 'Stop loading',  fn: () => vybe.stop() },
  'open':      { desc: 'Open URL',      fn: (a) => navigateTo(a) },
  'help':      { desc: 'Show help',     fn: () => toggleHelp() },
  'theme':     { desc: 'Change theme',  fn: () => toggleThemePicker() },
  'zoomin':    { desc: 'Zoom in',       fn: () => zoomIn() },
  'zoomout':   { desc: 'Zoom out',      fn: () => zoomOut() },
  'zoomreset': { desc: 'Reset zoom',    fn: () => vybe.zoomReset() },
  'print':     { desc: 'Print page',    fn: () => vybe.print() },
  'pdf':       { desc: 'Save as PDF',   fn: () => vybe.pdf() },
  'source':    { desc: 'View source',   fn: () => viewSource() },
  'bookmark':  { desc: 'Add bookmark',  fn: () => addBookmark() },
  'history':   { desc: 'Show history',  fn: () => showHistory() },
  'bookmarks': { desc: 'Show bookmarks',fn: () => showBookmarks() },
  'clearhistory': { desc: 'Clear history', fn: () => clearHistory() },
};

// ═══════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════

function resolveUrl(input) {
  let url = input.trim();
  if (/^https?:\/\//i.test(url)) return url;
  if (/^file:\/\//i.test(url)) return url;
  if (/^localhost(:\d+)?/i.test(url)) return 'http://' + url;
  if (/^[\w-]+(\.[\w-]+)+/.test(url) && !url.includes(' ')) return 'https://' + url;
  return `https://www.google.com/search?q=${encodeURIComponent(url)}`;
}

function navigateTo(input) {
  if (!input) return;
  const url = resolveUrl(input);
  $('#start-page').classList.add('hidden');
  if (!state.isViewReady) {
    vybe.createTab(url);
    state.isViewReady = true;
  } else {
    vybe.navigate(url);
  }
  setStatus(`→ ${new URL(url).hostname}`);
}

function goBack() { vybe.back(); }
function goForward() { vybe.forward(); }
function reloadPage() { vybe.reload(); }

async function zoomIn() {
  const level = await vybe.zoomIn();
  setStatus(`Zoom: ${Math.round((2 ** level) * 100)}%`);
}

async function zoomOut() {
  const level = await vybe.zoomOut();
  setStatus(`Zoom: ${Math.round((2 ** level) * 100)}%`);
}

function viewSource() {
  vybe.viewSource().then(html => {
    if (html) {
      vybe.createTab('data:text/html,' + encodeURIComponent(html));
    }
  });
}

// ═══════════════════════════════════════
//  URL BAR
// ═══════════════════════════════════════

function updateUrlBar(url, title) {
  if (url) state.currentUrl = url;
  if (title) state.currentTitle = title;
  $('#url-bar').value = state.currentUrl;

  // Update page title
  document.title = state.currentTitle ? `${state.currentTitle} — vybe` : 'vybe';

  // Update nav buttons
  $('#btn-back').style.opacity = state.canGoBack ? '1' : '0.3';
  $('#btn-forward').style.opacity = state.canGoForward ? '1' : '0.3';
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
//  BOOKMARKS
// ═══════════════════════════════════════

async function addBookmark() {
  if (!state.currentUrl) return;
  const exists = state.bookmarks.some(b => b.url === state.currentUrl);
  if (exists) {
    state.bookmarks = await vybe.removeBookmark(state.currentUrl);
    setStatus('Bookmark removed');
  } else {
    state.bookmarks = await vybe.addBookmark({ url: state.currentUrl, title: state.currentTitle });
    setStatus('Bookmark added!');
  }
  renderBookmarksBar();
}

async function loadBookmarks() {
  state.bookmarks = await vybe.getBookmarks();
  renderBookmarksBar();
}

function renderBookmarksBar() {
  const bar = $('#bookmarks-bar');
  if (!bar) return;
  bar.innerHTML = '';
  state.bookmarks.slice(0, 15).forEach(b => {
    const el = document.createElement('div');
    el.className = 'bookmark-item';
    el.textContent = b.title || b.url;
    el.title = b.url;
    el.addEventListener('click', () => navigateTo(b.url));
    bar.appendChild(el);
  });
}

function showBookmarks() {
  if (state.bookmarks.length === 0) {
    setStatus('No bookmarks');
    return;
  }
  openCmd('/');
  const inp = $('#command-input');
  inp.value = '';
  inp.placeholder = `${state.bookmarks.length} bookmarks — type to filter...`;
  renderBookmarkSuggestions('');
}

function renderBookmarkSuggestions(query) {
  const c = $('#command-suggestions');
  c.innerHTML = '';
  const filtered = query
    ? state.bookmarks.filter(b => (b.title + b.url).toLowerCase().includes(query.toLowerCase()))
    : state.bookmarks;
  filtered.slice(0, 10).forEach(b => {
    const el = document.createElement('div');
    el.className = 'cmd-item';
    el.innerHTML = `<span class="cmd-item-name">${esc(b.title || b.url)}</span><span class="cmd-item-desc">${esc(b.url)}</span>`;
    el.addEventListener('click', () => { closeCmd(); navigateTo(b.url); });
    c.appendChild(el);
  });
}

// ═══════════════════════════════════════
//  HISTORY
// ═══════════════════════════════════════

async function showHistory() {
  const history = await vybe.getHistory();
  if (history.length === 0) { setStatus('No history'); return; }
  openCmd('/');
  const inp = $('#command-input');
  inp.value = '';
  inp.placeholder = `${history.length} entries — type to search...`;
  renderHistorySuggestions('');
}

function renderHistorySuggestions(query) {
  const c = $('#command-suggestions');
  c.innerHTML = '';
  vybe.getHistory().then(history => {
    const filtered = query
      ? history.filter(h => (h.title + h.url).toLowerCase().includes(query.toLowerCase()))
      : history;
    filtered.slice(0, 12).forEach(h => {
      const el = document.createElement('div');
      el.className = 'cmd-item';
      const time = new Date(h.time).toLocaleDateString();
      el.innerHTML = `<span class="cmd-item-name">${esc(h.title || h.url)}</span><span class="cmd-item-desc">${esc(time)}</span>`;
      el.addEventListener('click', () => { closeCmd(); navigateTo(h.url); });
      c.appendChild(el);
    });
  });
}

async function clearHistory() {
  await vybe.clearHistory();
  setStatus('History cleared');
}

// ═══════════════════════════════════════
//  SCROLL
// ═══════════════════════════════════════

function scrollBy(px) {
  vybe.execute(`window.scrollBy({top:${px},behavior:'smooth'})`);
}

function scrollToTop() {
  vybe.execute(`window.scrollTo({top:0,behavior:'smooth'})`);
  setStatus('Top');
}

function scrollToBottom() {
  vybe.execute(`window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'})`);
  setStatus('Bottom');
}

// ═══════════════════════════════════════
//  COMMAND MODE
// ═══════════════════════════════════════

function openCmd(prefix = ':') {
  $('#command-overlay').classList.remove('hidden');
  $('#command-prefix').textContent = prefix;
  const inp = $('#command-input');
  inp.value = '';
  inp.placeholder = prefix === ':' ? 'Command...' : 'Search or URL...';
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
  if (!query) {
    // Show all commands
    Object.entries(commands).forEach(([name, cmd]) => {
      const el = document.createElement('div');
      el.className = 'cmd-item';
      el.innerHTML = `<span class="cmd-item-name">${esc(name)}</span><span class="cmd-item-desc">${esc(cmd.desc)}</span>`;
      el.addEventListener('click', () => { closeCmd(); cmd.fn(''); });
      c.appendChild(el);
    });
    return;
  }
  Object.entries(commands)
    .filter(([n]) => n.startsWith(query.toLowerCase()))
    .slice(0, 8)
    .forEach(([name, cmd], i) => {
      const el = document.createElement('div');
      el.className = `cmd-item${i === 0 ? ' selected' : ''}`;
      el.innerHTML = `<span class="cmd-item-name">${esc(name)}</span><span class="cmd-item-desc">${esc(cmd.desc)}</span>`;
      el.addEventListener('click', () => { closeCmd(); cmd.fn(''); });
      c.appendChild(el);
    });
}

// ═══════════════════════════════════════
//  HELP
// ═══════════════════════════════════════

function toggleHelp() { $('#help-overlay').classList.toggle('hidden'); }

// ═══════════════════════════════════════
//  THEMES
// ═══════════════════════════════════════

function toggleThemePicker() {
  const overlay = $('#theme-overlay');
  if (overlay.classList.contains('hidden')) renderThemeGrid();
  overlay.classList.toggle('hidden');
}

function renderThemeGrid() {
  const grid = $('#theme-grid');
  grid.innerHTML = '';
  THEME_ORDER.forEach(key => {
    const t = THEMES[key];
    const card = document.createElement('div');
    card.className = `theme-card${key === currentTheme ? ' active' : ''}`;
    card.innerHTML = `
      <div class="theme-card-name">${t.name}</div>
      <div class="theme-card-colors">
        <div class="theme-dot" style="background:${t.bg}"></div>
        <div class="theme-dot" style="background:${t.accent}"></div>
        <div class="theme-dot" style="background:${t.green}"></div>
        <div class="theme-dot" style="background:${t.red}"></div>
        <div class="theme-dot" style="background:${t.cyan}"></div>
      </div>
    `;
    card.addEventListener('click', () => { setTheme(key); renderThemeGrid(); setStatus(`Theme: ${t.name}`); });
    grid.appendChild(card);
  });
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
    // Live search for bookmarks/history when in / mode
    if ($('#command-prefix').textContent === '/') {
      renderHistorySuggestions($('#command-input').value);
      renderBookmarkSuggestions($('#command-input').value);
    }
    return;
  }

  // ── Insert mode ──
  if (isInInput) {
    if (e.key === 'Escape') { e.preventDefault(); e.target.blur(); setMode('normal'); return; }
    if (e.key === 'Enter' && e.target.id === 'url-bar') {
      e.preventDefault();
      navigateTo(e.target.value);
      e.target.blur();
      setMode('normal');
      return;
    }
    if (e.key === 'Enter' && e.target.id === 'start-search-input') {
      e.preventDefault();
      navigateTo(e.target.value);
      return;
    }
    return;
  }

  // ── Ctrl combos ──
  if (e.ctrlKey) {
    if (e.key === 'r') { e.preventDefault(); reloadPage(); return; }
    if (e.key === 'd') { e.preventDefault(); scrollBy(window.innerHeight / 2); return; }
    if (e.key === 'u') { e.preventDefault(); scrollBy(-window.innerHeight / 2); return; }
    if (e.key === 'l') { e.preventDefault(); setMode('insert'); const b = $('#url-bar'); b.select(); b.focus(); return; }
    if (e.key === 'w') { e.preventDefault(); vybe.stop(); return; }
    if (e.key === 'p') { e.preventDefault(); vybe.print(); return; }
    if (e.key === 's') { e.preventDefault(); vybe.pdf(); return; }
    return;
  }

  // ── Alt combos ──
  if (e.altKey) {
    if (e.key === 't') { e.preventDefault(); toggleThemePicker(); return; }
    if (e.key === 'b') { e.preventDefault(); addBookmark(); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); goForward(); return; }
    return;
  }

  // ── g prefix ──
  if (state.gPending) {
    clearTimeout(state.gTimeout);
    state.gPending = false;
    if (e.key === 'g') { scrollToTop(); }
    return;
  }

  // Prevent defaults for nav keys
  const nav = ['o','O','r','j','k','h','l','t',':','?','/'];
  if (nav.includes(e.key)) e.preventDefault();

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
      setMode('insert');
      setTimeout(() => { const b = $('#url-bar'); b.value = ''; b.focus(); }, 10);
      break;

    case 'i':
      setMode('insert');
      break;

    case ':': openCmd(':'); break;
    case '/': openCmd('/'); break;
    case '?': toggleHelp(); break;

    case 'Escape':
      $('#help-overlay').classList.add('hidden');
      $('#theme-overlay').classList.add('hidden');
      closeCmd();
      setStatus('');
      break;

    case 'h': goBack(); setStatus('← Back'); break;
    case 'l': goForward(); setStatus('→ Forward'); break;
    case 'r': reloadPage(); setStatus('↻ Reloaded'); break;
    case 'j': scrollBy(60); break;
    case 'k': scrollBy(-60); break;
    case 'G': scrollToBottom(); break;
    case 'J': vybe.zoomOut(); break;
    case 'K': vybe.zoomIn(); break;
    case 'y': handleY(); break;
    case 'p':
      setMode('insert');
      navigator.clipboard.readText().then(t => { const b = $('#url-bar'); b.value = t; b.focus(); }).catch(() => {});
      break;
    case 'F5': reloadPage(); break;
    case 'F11':
      e.preventDefault();
      // Toggle fullscreen would go here
      break;
  }
});

function handleY() {
  if (state.yPending) {
    clearTimeout(state.yTimeout);
    state.yPending = false;
    if (state.currentUrl) {
      navigator.clipboard.writeText(state.currentUrl);
      setStatus('URL copied!');
    }
    return;
  }
  state.yPending = true;
  state.yTimeout = setTimeout(() => { state.yPending = false; }, 400);
}

// ═══════════════════════════════════════
//  EVENTS
// ═══════════════════════════════════════

// Window controls
$('#btn-minimize')?.addEventListener('click', () => vybe.minimize());
$('#btn-maximize')?.addEventListener('click', () => vybe.maximize());
$('#btn-close')?.addEventListener('click', () => vybe.close());

// Nav buttons
$('#btn-back')?.addEventListener('click', goBack);
$('#btn-forward')?.addEventListener('click', goForward);
$('#btn-reload')?.addEventListener('click', reloadPage);

// Command input
$('#command-input')?.addEventListener('input', e => {
  if ($('#command-prefix').textContent === '/') {
    renderHistorySuggestions(e.target.value);
    renderBookmarkSuggestions(e.target.value);
  } else {
    renderSuggestions(e.target.value);
  }
});

// Overlays
$('#help-close')?.addEventListener('click', toggleHelp);
$('#help-overlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) toggleHelp(); });
$('#theme-close')?.addEventListener('click', toggleThemePicker);
$('#theme-overlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) toggleThemePicker(); });

// Start page
$('#start-search-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); navigateTo(e.target.value); }
});

// ═══════════════════════════════════════
//  LISTENERS FROM MAIN
// ═══════════════════════════════════════

if (window.vybe) {
  vybe.onNavUpdate(({ url, title, canGoBack, canGoForward }) => {
    state.canGoBack = canGoBack;
    state.canGoForward = canGoForward;
    updateUrlBar(url, title);
  });

  vybe.onNavTitle((title) => {
    updateUrlBar(null, title);
  });

  vybe.onNavError(({ code, desc }) => {
    setStatus(`Error ${code}: ${desc}`);
  });

  vybe.onDownloadStart(({ fileName, totalBytes }) => {
    const size = totalBytes > 1048576 ? `${(totalBytes / 1048576).toFixed(1)} MB` : `${(totalBytes / 1024).toFixed(0)} KB`;
    setStatus(`Downloading: ${fileName} (${size})`);
  });

  vybe.onDownloadDone(({ fileName, state }) => {
    setStatus(state === 'completed' ? `Downloaded: ${fileName}` : `Failed: ${fileName}`);
  });
}

// ═══════════════════════════════════════
//  UTIL
// ═══════════════════════════════════════

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// ═══════════════════════════════════════
//  INIT
// ═══════════════════════════════════════

initThemes();
loadBookmarks();
setMode('normal');
setTimeout(() => {
  $('#start-search-input')?.focus();
}, 100);
setStatus('? help · Alt+t themes · Alt+b bookmark · Ctrl+l URL bar');
