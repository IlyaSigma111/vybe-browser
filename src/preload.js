const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vybe', {
  // Window
  minimize: () => ipcRenderer.send('win:minimize'),
  maximize: () => ipcRenderer.send('win:maximize'),
  close: () => ipcRenderer.send('win:close'),

  // Browser
  createTab: (url) => ipcRenderer.invoke('browser:create', url),
  navigate: (url) => ipcRenderer.invoke('browser:navigate', url),
  back: () => ipcRenderer.invoke('browser:back'),
  forward: () => ipcRenderer.invoke('browser:forward'),
  reload: () => ipcRenderer.invoke('browser:reload'),
  hardReload: () => ipcRenderer.invoke('browser:hard-reload'),
  stop: () => ipcRenderer.invoke('browser:stop'),
  zoomIn: () => ipcRenderer.invoke('browser:zoom-in'),
  zoomOut: () => ipcRenderer.invoke('browser:zoom-out'),
  zoomReset: () => ipcRenderer.invoke('browser:zoom-reset'),
  getInfo: () => ipcRenderer.invoke('browser:info'),
  execute: (code) => ipcRenderer.invoke('browser:execute', code),
  print: () => ipcRenderer.invoke('browser:print'),
  pdf: () => ipcRenderer.invoke('browser:pdf'),
  viewSource: () => ipcRenderer.invoke('browser:view-source'),

  // History
  getHistory: () => ipcRenderer.invoke('history:get'),
  clearHistory: () => ipcRenderer.invoke('history:clear'),

  // Bookmarks
  getBookmarks: () => ipcRenderer.invoke('bookmarks:get'),
  addBookmark: (data) => ipcRenderer.invoke('bookmarks:add', data),
  removeBookmark: (url) => ipcRenderer.invoke('bookmarks:remove', url),

  // Events from main
  onNavUpdate: (cb) => ipcRenderer.on('nav:update', (_, data) => cb(data)),
  onNavTitle: (cb) => ipcRenderer.on('nav:title', (_, title) => cb(title)),
  onNavError: (cb) => ipcRenderer.on('nav:error', (_, err) => cb(err)),
  onDownloadStart: (cb) => ipcRenderer.on('download:start', (_, data) => cb(data)),
  onDownloadProgress: (cb) => ipcRenderer.on('download:progress', (_, data) => cb(data)),
  onDownloadDone: (cb) => ipcRenderer.on('download:done', (_, data) => cb(data)),
});
