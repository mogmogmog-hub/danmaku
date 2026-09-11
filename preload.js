const { contextBridge, ipcRenderer } = require('electron');

// ★ Render を起こすための ping（13分ごと）
setInterval(() => {
  const pingUrl = process.env.PING_URL;   // ★ 環境変数から取得

  fetch(pingUrl)
    .then(() => console.log("Render ping OK"))
    .catch(() => console.log("Render ping failed"));
}, 13 * 60 * 1000); // 13分

contextBridge.exposeInMainWorld('electronAPI', {
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  previewMonitor: (index) => ipcRenderer.send('preview-monitor', index),
  selectMonitor: (index) => ipcRenderer.send('monitor-selected', index),

  saveComment: (data) => ipcRenderer.send('comment-received', data),

  // コメント履歴読み込み
  loadHistory: () => ipcRenderer.invoke('load-history'),

  // ★ WebSocket URL / TOKEN / PING を環境変数から取得
  getWSUrl: () => process.env.WS_URL,
  getWSToken: () => process.env.WS_TOKEN,
  getPingUrl: () => process.env.PING_URL
});
