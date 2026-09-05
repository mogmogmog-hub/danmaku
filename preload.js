const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // モニター一覧を main.js に問い合わせる
  getDisplays: () => ipcRenderer.invoke('get-displays'),

  // 選択したモニターを main.js に送る
  selectMonitor: (index) => ipcRenderer.send('monitor-selected', index)
});
