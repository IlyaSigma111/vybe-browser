const { app, BrowserWindow, ipcMain, session, Menu, shell, dialog, clipboard, Notification, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

Menu.setApplicationMenu(null);

const userData = app.getPath('userData');
const historyFile = path.join(userData, 'history.json');
const bookmarksFile = path.join(userData, 'bookmarks.json');
const settingsFile = path.join(userData, 'settings.json');
const extensionsDir = path.join(userData, 'extensions');

let mainWindow;
let currentView = null;
let findOverlay = null;

const defaultSettings = {
  homepage: 'about:blank',
  searchEngine: 'https://www.google.com/search?q=%s',
  newTabUrl: 'about:blank',
  fontSize: 14,
  smoothScroll: true,
  javascript: true,
  images: true,
  cookies: true,
  doNotTrack: false,
};

function loadJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function saveJson(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

function getSettings() { return { ...defaultSettings, ...loadJson(settingsFile, {}) }; }
function saveSettings(s) { saveJson(settingsFile, s); }
function getHistory() { return loadJson(historyFile, []); }
function saveHistory(h) { saveJson(historyFile, h.slice(-1000)); }
function getBookmarks() { return loadJson(bookmarksFile, []); }
function saveBookmarks(b) { saveJson(bookmarksFile, b); }

// ═══════════════════════════════════════
//  WINDOW
// ═══════════════════════════════════════

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 500,
    minHeight: 350,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#1e1e2e',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      spellcheck: true,
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => { mainWindow = null; currentView = null; });
  mainWindow.on('resize', () => resizeView());

  // Load extensions
  loadExtensions();
}

function resizeView() {
  if (!currentView || !mainWindow) return;
  const [w, h] = mainWindow.getSize();
  currentView.setBounds({ x: 0, y: getTopOffset(), width: w, height: h - getTopOffset() - 26 });
}

function getTopOffset() {
  let h = 36; // titlebar
  h += 42; // navbar
  const settings = getSettings();
  return h;
}

// ═══════════════════════════════════════
//  BROWSER VIEW
// ═══════════════════════════════════════

function createBrowserView(url) {
  if (currentView) {
    try { mainWindow.removeBrowserView(currentView); } catch {}
    try { currentView.webContents.close(); } catch {}
  }

  const settings = getSettings();

  currentView = new (require('electron').BrowserView)({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      scrollBounce: true,
      smoothScrolling: settings.smoothScroll,
      javascript: settings.javascript,
      images: settings.images,
      spellcheck: true,
      backgroundThrottling: false,
      enableWebSQL: false,
      partition: 'persist:main',
    }
  });

  currentView.setBackgroundColor('#1e1e2e');
  resizeView();

  // ── Navigation events ──
  currentView.webContents.on('did-navigate', (e, u) => {
    const info = getViewInfo();
    mainWindow.webContents.send('nav:update', info);
    addHistory(u, info.title);
    updateSSL(u);
  });

  currentView.webContents.on('did-navigate-in-page', (e, u, isMainFrame) => {
    if (isMainFrame) {
      const info = getViewInfo();
      mainWindow.webContents.send('nav:update', info);
    }
  });

  currentView.webContents.on('page-title-updated', (e, title) => {
    mainWindow.webContents.send('nav:title', title);
  });

  currentView.webContents.on('did-fail-load', (e, code, desc) => {
    if (code === -3 || code === -27) return;
    mainWindow.webContents.send('nav:error', { code, desc });
  });

  currentView.webContents.on('did-start-loading', () => {
    mainWindow.webContents.send('nav:loading', true);
  });

  currentView.webContents.on('did-stop-loading', () => {
    mainWindow.webContents.send('nav:loading', false);
  });

  // ── SSL ──
  function updateSSL(u) {
    const isSecure = u.startsWith('https://');
    mainWindow.webContents.send('nav:ssl', { url: u, secure: isSecure });
  }

  // ── Open new windows → same view ──
  currentView.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) currentView.webContents.loadURL(url);
    return { action: 'deny' };
  });

  // ── Downloads ──
  currentView.webContents.session.on('will-download', (event, item) => {
    const fileName = item.getFilename();
    const savePath = path.join(app.getPath('downloads'), fileName);
    item.setSavePath(savePath);

    const id = Date.now();
    mainWindow.webContents.send('download:start', { id, fileName, totalBytes: item.getTotalBytes(), savePath });

    item.on('done', (e, state) => {
      mainWindow.webContents.send('download:done', { id, fileName, state, savePath });
      if (state === 'completed' && !mainWindow.isDestroyed()) {
        new Notification({ title: 'Download complete', body: fileName }).show();
      }
    });

    item.on('updated', (e, state) => {
      if (state === 'progressing' && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download:progress', {
          id, received: item.getReceivedBytes(), total: item.getTotalBytes()
        });
      }
    });
  });

  // ── Context menu ──
  currentView.webContents.on('context-menu', (e, params) => {
    const menuItems = [];

    if (params.selectionText) {
      menuItems.push({ label: `Search "${params.selectionText.slice(0, 40)}"`, click: () => {
        currentView.webContents.loadURL(resolveUrl(params.selectionText));
      }});
      menuItems.push({ label: 'Copy', role: 'copy' });
      menuItems.push({ type: 'separator' });
    }

    if (params.mediaType === 'image') {
      menuItems.push({ label: 'Open image in new tab', click: () => {
        currentView.webContents.loadURL(params.srcURL);
      }});
      menuItems.push({ label: 'Save image as...', click: async () => {
        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, { defaultPath: params.srcURL.split('/').pop() });
        if (!canceled) {
          const resp = await fetch(params.srcURL);
          const buf = Buffer.from(await resp.arrayBuffer());
          fs.writeFileSync(filePath, buf);
        }
      }});
      menuItems.push({ label: 'Copy image URL', click: () => clipboard.writeText(params.srcURL) });
      menuItems.push({ type: 'separator' });
    }

    if (params.linkURL) {
      menuItems.push({ label: 'Open link in new tab', click: () => {
        currentView.webContents.loadURL(params.linkURL);
      }});
      menuItems.push({ label: 'Copy link address', click: () => clipboard.writeText(params.linkURL) });
      menuItems.push({ type: 'separator' });
    }

    if (params.isEditable) {
      menuItems.push({ label: 'Undo', role: 'undo' });
      menuItems.push({ label: 'Redo', role: 'redo' });
      menuItems.push({ type: 'separator' });
      menuItems.push({ label: 'Cut', role: 'cut' });
      menuItems.push({ label: 'Copy', role: 'copy' });
      menuItems.push({ label: 'Paste', role: 'paste' });
      menuItems.push({ label: 'Select All', role: 'selectAll' });
      menuItems.push({ type: 'separator' });
    }

    menuItems.push({ label: 'Back', click: () => currentView.webContents.goBack(), enabled: currentView.webContents.canGoBack() });
    menuItems.push({ label: 'Forward', click: () => currentView.webContents.goForward(), enabled: currentView.webContents.canGoForward() });
    menuItems.push({ label: 'Reload', click: () => currentView.webContents.reload() });
    menuItems.push({ type: 'separator' });
    menuItems.push({ label: 'Save page as...', click: () => {
      mainWindow.webContents.send('browser:save-page');
    }});
    menuItems.push({ label: 'Print...', click: () => currentView.webContents.print({}) });
    menuItems.push({ type: 'separator' });
    menuItems.push({ label: 'View page source', click: () => {
      currentView.webContents.executeJavaScript('document.documentElement.outerHTML').then(html => {
        const w = new BrowserWindow({ width: 900, height: 600, parent: mainWindow });
        w.loadURL('data:text/html,' + encodeURIComponent(`<pre style="white-space:pre-wrap;word-wrap:break-word;font:14px monospace;padding:20px;background:#1e1e2e;color:#cdd6f4;">${html.replace(/</g,'&lt;')}</pre>`));
      });
    }});
    menuItems.push({ label: 'Inspect element', click: () => {
      currentView.webContents.inspectElement(params.x, params.y);
    }});

    Menu.buildFromTemplate(menuItems).popup({ window: mainWindow });
  });

  // ── Permissions ──
  currentView.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'geolocation', 'notifications', 'fullscreen', 'clipboard-read', 'clipboard-sanitized-write'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  mainWindow.addBrowserView(currentView);

  if (url && url !== 'about:blank') {
    currentView.webContents.loadURL(url);
  }

  return currentView;
}

function resolveUrl(input) {
  let url = input.trim();
  if (/^https?:\/\//i.test(url)) return url;
  if (/^file:\/\//i.test(url)) return url;
  if (/^data:/i.test(url)) return url;
  if (/^localhost(:\d+)?/i.test(url)) return 'http://' + url;
  if (/^[\w-]+(\.[\w-]+)+/.test(url) && !url.includes(' ')) return 'https://' + url;
  const settings = getSettings();
  return settings.searchEngine.replace('%s', encodeURIComponent(url));
}

function getViewInfo() {
  if (!currentView) return null;
  return {
    url: currentView.webContents.getURL(),
    title: currentView.webContents.getTitle(),
    canGoBack: currentView.webContents.canGoBack(),
    canGoForward: currentView.webContents.canGoForward(),
    isLoading: currentView.webContents.isLoading(),
  };
}

function addHistory(url, title) {
  if (!url || url.startsWith('about:') || url.startsWith('data:')) return;
  const h = getHistory();
  // Deduplicate consecutive
  const last = h[h.length - 1];
  if (last && last.url === url) { last.title = title || last.title; last.time = Date.now(); }
  else h.push({ url, title: title || url, time: Date.now() });
  saveHistory(h);
}

// ═══════════════════════════════════════
//  EXTENSIONS
// ═══════════════════════════════════════

function loadExtensions() {
  if (!fs.existsSync(extensionsDir)) fs.mkdirSync(extensionsDir, { recursive: true });
  const dirs = fs.readdirSync(extensionsDir).filter(d => {
    const manifest = path.join(extensionsDir, d, 'manifest.json');
    return fs.existsSync(manifest);
  });
  dirs.forEach(d => {
    try {
      const extPath = path.join(extensionsDir, d);
      session.defaultSession.loadExtension(extPath, { allowFileAccess: true })
        .then(ext => console.log(`Loaded extension: ${ext.name}`))
        .catch(err => console.error(`Failed to load extension ${d}:`, err.message));
    } catch {}
  });
}

// ═══════════════════════════════════════
//  IPC HANDLERS
// ═══════════════════════════════════════

// Window
ipcMain.on('win:minimize', () => mainWindow?.minimize());
ipcMain.on('win:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize(); else mainWindow?.maximize();
});
ipcMain.on('win:close', () => mainWindow?.close());
ipcMain.handle('win:is-maximized', () => mainWindow?.isMaximized() ?? false);

// Browser
ipcMain.handle('browser:create', (e, url) => { createBrowserView(url); return getViewInfo(); });
ipcMain.handle('browser:navigate', (e, url) => {
  if (!currentView) { createBrowserView(url); return getViewInfo(); }
  currentView.webContents.loadURL(url);
  return getViewInfo();
});
ipcMain.handle('browser:back', () => { if (currentView?.webContents.canGoBack()) currentView.webContents.goBack(); return getViewInfo(); });
ipcMain.handle('browser:forward', () => { if (currentView?.webContents.canGoForward()) currentView.webContents.goForward(); return getViewInfo(); });
ipcMain.handle('browser:reload', () => { currentView?.webContents.reload(); return getViewInfo(); });
ipcMain.handle('browser:hard-reload', () => { currentView?.webContents.reloadIgnoringCache(); return getViewInfo(); });
ipcMain.handle('browser:stop', () => { currentView?.webContents.stop(); });
ipcMain.handle('browser:home', () => { const s = getSettings(); currentView?.webContents.loadURL(s.homepage); });
ipcMain.handle('browser:info', () => getViewInfo());
ipcMain.handle('browser:execute', (e, code) => currentView?.webContents.executeJavaScript(code));
ipcMain.handle('browser:zoom-in', async () => { if (!currentView) return 0; const l = currentView.webContents.getZoomLevel(); currentView.webContents.setZoomLevel(l + 0.5); return currentView.webContents.getZoomLevel(); });
ipcMain.handle('browser:zoom-out', async () => { if (!currentView) return 0; const l = currentView.webContents.getZoomLevel(); currentView.webContents.setZoomLevel(l - 0.5); return currentView.webContents.getZoomLevel(); });
ipcMain.handle('browser:zoom-reset', async () => { if (!currentView) return 0; currentView.webContents.setZoomLevel(0); return 0; });
ipcMain.handle('browser:print', () => currentView?.webContents.print({}));
ipcMain.handle('browser:pdf', async () => {
  if (!currentView) return null;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, { defaultPath: 'page.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (!canceled) { const data = await currentView.webContents.printToPDF({}); fs.writeFileSync(filePath, data); return filePath; }
  return null;
});
ipcMain.handle('browser:devtools', () => { currentView?.webContents.toggleDevTools(); });
ipcMain.handle('browser:find', (e, text, options) => { if (currentView) currentView.webContents.findInPage(text, options); });
ipcMain.handle('browser:find-stop', () => { if (currentView) currentView.webContents.stopFindInPage('keepSelection'); });
ipcMain.handle('browser:find-next', (e, text) => { if (currentView) currentView.webContents.findInPage(text, { forward: true }); });
ipcMain.handle('browser:find-prev', (e, text) => { if (currentView) currentView.webContents.findInPage(text, { forward: false }); });
ipcMain.handle('browser:save-page', async () => {
  if (!currentView) return;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, { defaultPath: 'page.html', filters: [{ name: 'HTML', extensions: ['html'] }] });
  if (!canceled) {
    const html = await currentView.webContents.executeJavaScript('document.documentElement.outerHTML');
    fs.writeFileSync(filePath, html);
  }
});

// History
ipcMain.handle('history:get', (e, limit) => getHistory().reverse().slice(0, limit || 200));
ipcMain.handle('history:clear', () => { saveHistory([]); return true; });
ipcMain.handle('history:search', (e, query) => {
  const h = getHistory();
  if (!query) return h.reverse().slice(0, 100);
  return h.filter(x => (x.title + x.url).toLowerCase().includes(query.toLowerCase())).reverse().slice(0, 100);
});

// Bookmarks
ipcMain.handle('bookmarks:get', () => getBookmarks());
ipcMain.handle('bookmarks:add', (e, data) => { const b = getBookmarks(); b.push({ ...data, time: Date.now() }); saveBookmarks(b); return b; });
ipcMain.handle('bookmarks:remove', (e, url) => { const b = getBookmarks().filter(x => x.url !== url); saveBookmarks(b); return b; });
ipcMain.handle('bookmarks:has', (e, url) => getBookmarks().some(x => x.url === url));

// Settings
ipcMain.handle('settings:get', () => getSettings());
ipcMain.handle('settings:save', (e, s) => { saveSettings(s); return true; });

// Cookies
ipcMain.handle('cookies:get', async (e, filter) => {
  return await currentView?.webContents.session.cookies.get(filter || {});
});
ipcMain.handle('cookies:remove', async (e, url, name) => {
  await currentView?.webContents.session.cookies.remove(url, name);
  return true;
});
ipcMain.handle('cookies:clear', async () => {
  await currentView?.webContents.session.clearStorageData({ storages: ['cookies'] });
  return true;
});

// Extensions
ipcMain.handle('extensions:list', () => {
  if (!fs.existsSync(extensionsDir)) return [];
  return fs.readdirSync(extensionsDir).filter(d => {
    return fs.existsSync(path.join(extensionsDir, d, 'manifest.json'));
  }).map(d => {
    const manifest = loadJson(path.join(extensionsDir, d, 'manifest.json'), {});
    return { id: d, name: manifest.name || d, version: manifest.version || '0.0.0', description: manifest.description || '' };
  });
});

ipcMain.handle('extensions:load', async (e, extPath) => {
  try {
    const ext = await session.defaultSession.loadExtension(extPath, { allowFileAccess: true });
    return { success: true, name: ext.name };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('extensions:install-folder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select extension folder'
  });
  if (!canceled && filePaths[0]) {
    const src = filePaths[0];
    const name = path.basename(src);
    const dest = path.join(extensionsDir, name);
    if (!fs.existsSync(extensionsDir)) fs.mkdirSync(extensionsDir, { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
    try {
      const ext = await session.defaultSession.loadExtension(dest, { allowFileAccess: true });
      return { success: true, name: ext.name };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'Cancelled' };
});

// ═══════════════════════════════════════
//  APP READY
// ═══════════════════════════════════════

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
