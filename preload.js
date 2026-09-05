const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // モニター一覧を main.js に問い合わせる
  getDisplays: () => ipcRenderer.invoke('get-displays'),

  // 仮選択（選択中オーバーレイ表示）
  previewMonitor: (index) => ipcRenderer.send('preview-monitor', index),

  // 決定したモニターを main.js に送る
  selectMonitor: (index) => ipcRenderer.send('monitor-selected', index),

  // ★ WebSocket で受信したコメントを main.js に送る（CSV 保存用）
  saveComment: (data) => ipcRenderer.send('comment-received', data)
});
