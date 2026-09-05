const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const iconv = require('iconv-lite');

let selectWindow;   // モニター選択ウィンドウ
let overlayWindow;  // 弾幕表示ウィンドウ

/* CSV 保存ファイル */
const csvFile = path.join(__dirname, 'comments.csv');

/* 初回ヘッダー書き込み（Shift-JIS） */
if (!fs.existsSync(csvFile)) {
  const header = iconv.encode("time,text,color,size,speed\n", "Shift_JIS");
  fs.writeFileSync(csvFile, header);
}

/* コメントを CSV に保存（Shift-JIS） */
function saveCommentCSV(data) {
  const line = [
    new Date().toISOString(),
    data.text.replace(/"/g, '""'),  // CSVエスケープ
    data.color || "",
    data.size || "",
    data.speed || ""
  ].join(",") + "\n";

  const encoded = iconv.encode(line, "Shift_JIS");
  fs.appendFileSync(csvFile, encoded);
}

/* モニター選択ウィンドウ */
function createSelectWindow() {
  selectWindow = new BrowserWindow({
    width: 600,
    height: 600,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  selectWindow.loadFile('monitor-select.html');
}

/* オーバーレイウィンドウ（弾幕表示） */
function createOverlayWindow(displayIndex) {
  const displays = screen.getAllDisplays();
  const target = displays[displayIndex];

  overlayWindow = new BrowserWindow({
    x: target.bounds.x,
    y: target.bounds.y,
    width: target.bounds.width,
    height: target.bounds.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.loadFile('overlay.html');
}

app.whenReady().then(() => {
  createSelectWindow();
});

/* モニター選択 UI からの通知 */
ipcMain.on('monitor-selected', (event, index) => {
  createOverlayWindow(index);
  selectWindow.close();
});

/* renderer → main にモニター一覧を要求する IPC */
ipcMain.handle('get-displays', () => {
  return screen.getAllDisplays();
});

/* コメント受信（WebSocket サーバー側で呼ぶ想定） */
ipcMain.on('comment-received', (event, data) => {
  saveCommentCSV(data);  // ★ CSV 保存
});
