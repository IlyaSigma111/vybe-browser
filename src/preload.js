const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vybe', {
  // Window
  minimize: () => ipcRenderer.send('win:minimize'),
  maximize: () => ipcRenderer.send('win:maximize'),
  close: () => ipcRenderer.send('win:close'),
  isMaximized: () => ipcRenderer.invoke('win:is-maximized'),

  // Browser
  createView: (url) => ipcRenderer.invoke('browser:create', url),
  navigate: (url) => ipcRenderer.invoke('browser:navigate', url),
  back: () => ipcRenderer.invoke('browser:back'),
  forward: () => ipcRenderer.invoke('browser:forward'),
  reload: () => ipcRenderer.invoke('browser:reload'),
  hardReload: () => ipcRenderer.invoke('browser:hard-reload'),
  stop: () => ipcRenderer.invoke('browser:stop'),
  home: () => ipcRenderer.invoke('browser:home'),
  info: () => ipcRenderer.invoke('browser:info'),
  execute: (code) => ipcRenderer.invoke('browser:execute', code),
  zoomIn: () => ipcRenderer.invoke('browser:zoom-in'),
  zoomOut: () => ipcRenderer.invoke('browser:zoom-out'),
  zoomReset: () => ipcRenderer.invoke('browser:zoom-reset'),
  print: () => ipcRenderer.invoke('browser:print'),
  pdf: () => ipcRenderer.invoke('browser:pdf'),
  devtools: () => ipcRenderer.invoke('browser:devtools'),
  find: (text, opts) => ipcRenderer.invoke('browser:find', text, opts),
  findStop: () => ipcRenderer.invoke('browser:find-stop'),
  findNext: (text) => ipcRenderer.invoke('browser:find-next', text),
  findPrev: (text) => ipcRenderer.invoke('browser:find-prev', text),
  savePage: () => ipcRenderer.invoke('browser:save-page'),

  // History
  getHistory: (limit) => ipcRenderer.invoke('history:get', limit),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  searchHistory: (q) => ipcRenderer.invoke('history:search', q),

  // Bookmarks
  getBookmarks: () => ipcRenderer.invoke('bookmarks:get'),
  addBookmark: (data) => ipcRenderer.invoke('bookmarks:add', data),
  removeBookmark: (url) => ipcRenderer.invoke('bookmarks:remove', url),
  hasBookmark: (url) => ipcRenderer.invoke('bookmarks:has', url),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (s) => ipcRenderer.invoke('settings:save', s),

  // Cookies
  getCookies: (filter) => ipcRenderer.invoke('cookies:get', filter),
  removeCookie: (url, name) => ipcRenderer.invoke('cookies:remove', url, name),
  clearCookies: () => ipcRenderer.invoke('cookies:clear'),

  // Extensions
  getExtensions: () => ipcRenderer.invoke('extensions:list'),
  loadExtension: (path) => ipcRenderer.invoke('extensions:load', path),
  installExtension: () => ipcRenderer.invoke('extensions:install-folder'),

  // Events
  on: (channel, cb) => {
    const valid = ['nav:update', 'nav:title', 'nav:error', 'nav:loading', 'nav:ssl',
                   'download:start', 'download:progress', 'download:done',
                   'browser:save-page'];
    if (valid.includes(channel)) {
      ipcRenderer.on(channel, (_, data) => cb(data));
    }
  },

  off: (channel) => ipcRenderer.removeAllListeners(channel),

  platform: process.platform,
});
