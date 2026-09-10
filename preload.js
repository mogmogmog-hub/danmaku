const { contextBridge, ipcRenderer } = require('electron');

// ★ Render を起こすための ping（13分ごと）
setInterval(() => {
  fetch("https://danmaku-server.onrender.com/ping")
    .then(() => console.log("Render ping OK"))
    .catch(() => console.log("Render ping failed"));
}, 13 * 60 * 1000); // 13分

contextBridge.exposeInMainWorld('electronAPI', {

  /* ================================
     モニター関連
     ================================ */
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  previewMonitor: (index) => ipcRenderer.send('preview-monitor', index),
  selectMonitor: (index) => ipcRenderer.send('monitor-selected', index),

  /* ================================
     コメント保存
     ================================ */
  saveComment: (data) => ipcRenderer.send('comment-received', data),

  /* ================================
     コメント履歴読み込み
     ================================ */
  loadHistory: () => ipcRenderer.invoke('load-history'),

  /* ================================
     WebSocket URL / TOKEN / ROOMID
     （main.js から値を受け取る）
     ================================ */
  getWSUrl: () => ipcRenderer.invoke('get-ws-url'),
  getWSToken: () => ipcRenderer.invoke('get-ws-token'),
  getRoomId: () => ipcRenderer.invoke('get-room-id')
});
