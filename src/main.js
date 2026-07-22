const { app, BrowserWindow, ipcMain, session, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const historyFile = path.join(app.getPath('userData'), 'history.json');
const bookmarksFile = path.join(app.getPath('userData'), 'bookmarks.json');

// Kill the menu bar completely
Menu.setApplicationMenu(null);

function loadHistory() {
  try { return JSON.parse(fs.readFileSync(historyFile, 'utf8')); } catch { return []; }
}
function saveHistory(h) { fs.writeFileSync(historyFile, JSON.stringify(h.slice(-500), null, 2)); }

function loadBookmarks() {
  try { return JSON.parse(fs.readFileSync(bookmarksFile, 'utf8')); } catch { return []; }
}
function saveBookmarks(b) { fs.writeFileSync(bookmarksFile, JSON.stringify(b, null, 2)); }

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#1e1e2e',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      webviewTag: false,
      scrollBounce: true,
      smoothScrolling: true,
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ═══════════════════════════════════════
//  IPC — Window controls
// ═══════════════════════════════════════

ipcMain.on('win:minimize', () => mainWindow?.minimize());
ipcMain.on('win:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('win:close', () => mainWindow?.close());

// ═══════════════════════════════════════
//  IPC — Navigation (via BrowserView)
// ═══════════════════════════════════════

let currentView = null;
const viewBounds = { x: 0, y: 0, width: 1200, height: 700 };

function createBrowserView(url) {
  if (currentView) {
    mainWindow.removeBrowserView(currentView);
    currentView.webContents.close();
  }

  currentView = new (require('electron').BrowserView)({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      scrollBounce: true,
      smoothScrolling: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: true,
      backgroundThrottling: false,
    }
  });

  currentView.setBackgroundColor('#1e1e2e');

  // Update bounds
  const [w, h] = mainWindow.getSize();
  currentView.setBounds({ x: 0, y: 112, width: w, height: h - 112 });

  // Navigation events
  currentView.webContents.on('did-navigate', (e, url) => {
    mainWindow.webContents.send('nav:update', {
      url,
      title: currentView.webContents.getTitle(),
      canGoBack: currentView.webContents.canGoBack(),
      canGoForward: currentView.webContents.canGoForward(),
    });
    addHistory(url, currentView.webContents.getTitle());
  });

  currentView.webContents.on('did-navigate-in-page', (e, url, isMainFrame) => {
    if (isMainFrame) {
      mainWindow.webContents.send('nav:update', {
        url,
        title: currentView.webContents.getTitle(),
        canGoBack: currentView.webContents.canGoBack(),
        canGoForward: currentView.webContents.canGoForward(),
      });
    }
  });

  currentView.webContents.on('page-title-updated', (e, title) => {
    mainWindow.webContents.send('nav:title', title);
  });

  currentView.webContents.on('did-fail-load', (e, code, desc) => {
    if (code === -3) return; // aborted
    mainWindow.webContents.send('nav:error', { code, desc });
  });

  // Open new windows in same view
  currentView.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      currentView.webContents.loadURL(url);
    }
    return { action: 'deny' };
  });

  // Download handler
  currentView.webContents.session.on('will-download', (event, item) => {
    const fileName = item.getFilename();
    const savePath = path.join(app.getPath('downloads'), fileName);
    item.setSavePath(savePath);

    mainWindow.webContents.send('download:start', {
      fileName,
      totalBytes: item.getTotalBytes(),
      savePath,
    });

    item.on('done', (e, state) => {
      mainWindow.webContents.send('download:done', { fileName, state });
      if (state === 'completed') {
        shell.showItemInFolder(savePath);
      }
    });

    item.on('updated', (e, state) => {
      if (state === 'progressing') {
        mainWindow.webContents.send('download:progress', {
          fileName,
          received: item.getReceivedBytes(),
          total: item.getTotalBytes(),
        });
      }
    });
  });

  mainWindow.addBrowserView(currentView);

  if (url) {
    currentView.webContents.loadURL(url);
  }

  return currentView;
}

function navigateCurrentView(url) {
  if (!currentView) {
    createBrowserView(url);
    return;
  }
  currentView.webContents.loadURL(url);
}

// Resize view on window resize
mainWindow?.on('resize', () => {
  if (!currentView || !mainWindow) return;
  const [w, h] = mainWindow.getSize();
  currentView.setBounds({ x: 0, y: 112, width: w, height: h - 112 });
});

// ═══════════════════════════════════════
//  IPC — Browser commands
// ═══════════════════════════════════════

ipcMain.handle('browser:create', (e, url) => {
  createBrowserView(url);
  return true;
});

ipcMain.handle('browser:navigate', (e, url) => {
  navigateCurrentView(url);
  return true;
});

ipcMain.handle('browser:back', () => {
  if (currentView?.webContents.canGoBack()) currentView.webContents.goBack();
});

ipcMain.handle('browser:forward', () => {
  if (currentView?.webContents.canGoForward()) currentView.webContents.goForward();
});

ipcMain.handle('browser:reload', () => {
  currentView?.webContents.reload();
});

ipcMain.handle('browser:hard-reload', () => {
  currentView?.webContents.reloadIgnoringCache();
});

ipcMain.handle('browser:stop', () => {
  currentView?.webContents.stop();
});

ipcMain.handle('browser:zoom-in', async () => {
  if (!currentView) return 1;
  const level = currentView.webContents.getZoomLevel();
  currentView.webContents.setZoomLevel(level + 0.5);
  return currentView.webContents.getZoomLevel();
});

ipcMain.handle('browser:zoom-out', async () => {
  if (!currentView) return 1;
  const level = currentView.webContents.getZoomLevel();
  currentView.webContents.setZoomLevel(level - 0.5);
  return currentView.webContents.getZoomLevel();
});

ipcMain.handle('browser:zoom-reset', async () => {
  if (!currentView) return 1;
  currentView.webContents.setZoomLevel(0);
  return 0;
});

ipcMain.handle('browser:info', () => {
  if (!currentView) return null;
  return {
    url: currentView.webContents.getURL(),
    title: currentView.webContents.getTitle(),
    canGoBack: currentView.webContents.canGoBack(),
    canGoForward: currentView.webContents.canGoForward(),
  };
});

ipcMain.handle('browser:execute', (e, code) => {
  if (!currentView) return null;
  return currentView.webContents.executeJavaScript(code);
});

ipcMain.handle('browser:pdf', async () => {
  if (!currentView) return null;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'page.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (!canceled) {
    const data = await currentView.webContents.printToPDF({});
    fs.writeFileSync(filePath, data);
    return filePath;
  }
  return null;
});

ipcMain.handle('browser:print', () => {
  currentView?.webContents.print({});
});

ipcMain.handle('browser:view-source', () => {
  if (!currentView) return null;
  return currentView.webContents.executeJavaScript('document.documentElement.outerHTML');
});

// ═══════════════════════════════════════
//  IPC — History
// ═══════════════════════════════════════

function addHistory(url, title) {
  if (!url || url.startsWith('about:') || url.startsWith('data:')) return;
  const h = loadHistory();
  h.push({ url, title: title || url, time: Date.now() });
  saveHistory(h);
}

ipcMain.handle('history:get', () => loadHistory().reverse().slice(0, 200));
ipcMain.handle('history:clear', () => { saveHistory([]); return true; });

// ═══════════════════════════════════════
//  IPC — Bookmarks
// ═══════════════════════════════════════

ipcMain.handle('bookmarks:get', () => loadBookmarks());

ipcMain.handle('bookmarks:add', (e, { url, title }) => {
  const b = loadBookmarks();
  b.push({ url, title, time: Date.now() });
  saveBookmarks(b);
  return b;
});

ipcMain.handle('bookmarks:remove', (e, url) => {
  let b = loadBookmarks();
  b = b.filter(x => x.url !== url);
  saveBookmarks(b);
  return b;
});

// ═══════════════════════════════════════
//  Resize handler
// ═══════════════════════════════════════

app.on('browser-window-focus', () => {
  if (mainWindow) {
    const resize = () => {
      if (!currentView) return;
      const [w, h] = mainWindow.getSize();
      currentView.setBounds({ x: 0, y: 112, width: w, height: h - 112 });
    };
    mainWindow.removeListener('resize', resize);
    mainWindow.on('resize', resize);
  }
});
