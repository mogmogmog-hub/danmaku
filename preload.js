const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  previewMonitor: (index) => ipcRenderer.send('preview-monitor', index),
  selectMonitor: (index) => ipcRenderer.send('monitor-selected', index),

  saveComment: (data) => ipcRenderer.send('comment-received', data),

  // ★ コメント履歴読み込み
  loadHistory: () => ipcRenderer.invoke('load-history')
});
