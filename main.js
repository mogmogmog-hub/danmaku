const { app, BrowserWindow, screen, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const iconv = require('iconv-lite');

let selectWindow;     // モニター選択ウィンドウ
let overlayWindow;    // 弾幕表示ウィンドウ
let previewWindow;    // 「選択中」オーバーレイ

/* ============================
   CSV 保存ファイル（ローカル専用）
   ============================ */
const csvFile = path.join(__dirname, 'comments.csv');

/* 初回ヘッダー書き込み（Shift-JIS） */
if (!fs.existsSync(csvFile)) {
  const header = iconv.encode("time,studentId,text,color,size,speed,fixed\n", "Shift_JIS");
  fs.writeFileSync(csvFile, header);
}

/* コメントを CSV に保存（Shift-JIS） */
function saveCommentCSV(data) {
  const jpTime = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

  const line = [
    jpTime,
    data.studentId || "",                 // ★ 学籍番号を追加
    data.text.replace(/"/g, '""'),
    data.color || "",
    data.size || "",
    data.speed || "",
    data.fixed ? "true" : "false"
  ].join(",") + "\n";

  const encoded = iconv.encode(line, "Shift_JIS");
  fs.appendFileSync(csvFile, encoded);
}

/* ============================
   CSV 読み込み（履歴表示用）
   ============================ */
function loadHistoryCSV() {
  if (!fs.existsSync(csvFile)) return [];

  const raw = fs.readFileSync(csvFile);
  const utf8Text = iconv.decode(raw, "Shift_JIS");

  const lines = utf8Text.split(/\r?\n/).filter(line => line.trim() !== "");

  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");

    rows.push({
      time: cols[0],
      studentId: cols[1],                 // ★ 学籍番号を読み込み
      text: cols[2],
      color: cols[3],
      size: cols[4],
      speed: cols[5],
      fixed: cols[6] === "true"
    });
  }

  return rows;
}

/* ============================
   コメント履歴ウィンドウ
   ============================ */
function createHistoryWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('history.html');
}

/* ============================
   モニター選択ウィンドウ
   ============================ */
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

/* ============================
   「選択中」オーバーレイ表示
   ============================ */
function showPreviewOverlay(displayIndex) {
  const displays = screen.getAllDisplays();
  const target = displays[displayIndex];

  if (previewWindow) {
    previewWindow.close();
  }

  previewWindow = new BrowserWindow({
    x: target.bounds.x,
    y: target.bounds.y,
    width: target.bounds.width,
    height: target.bounds.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    focusable: false,
    hasShadow: false,
  });

  previewWindow.setIgnoreMouseEvents(true);

  const html = `
    <body style="margin:0; background:rgba(0,0,0,0.3);
                 display:flex; justify-content:center; align-items:center;">
      <div style="font-size:80px; color:white; font-weight:bold;">
        選択中
      </div>
    </body>
  `;

  previewWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

/* ============================
   弾幕オーバーレイウィンドウ
   ============================ */
function createOverlayWindow(displayIndex) {
  const displays = screen.getAllDisplays();
  const target = displays[displayIndex];

  if (previewWindow) {
    previewWindow.close();
    previewWindow = null;
  }

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
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.loadFile('overlay.html');
}

/* ============================
   アプリ起動時
   ============================ */
app.whenReady().then(() => {

  /* ★ メニュー追加 */
  const menu = Menu.buildFromTemplate([
    {
      label: 'メニュー',
      submenu: [
        {
          label: 'コメント履歴を開く',
          click: () => {
            createHistoryWindow();
          }
        },
        {
          label: 'モニター選択画面を開く', 
          click: () => {
            createSelectWindow();
          }
        },
        { type: 'separator' },
        { role: 'quit', label: '終了' }
      ]
    }
  ]);

  Menu.setApplicationMenu(menu);

  createSelectWindow();
});

/* ============================
   IPC: モニター選択プレビュー
   ============================ */
ipcMain.on('preview-monitor', (event, index) => {
  showPreviewOverlay(index);
});

/* ============================
   IPC: モニター選択決定
   ============================ */
ipcMain.on('monitor-selected', (event, index) => {
  createOverlayWindow(index);
  selectWindow.close();
});

/* ============================
   IPC: モニター一覧取得
   ============================ */
ipcMain.handle('get-displays', () => {
  return screen.getAllDisplays();
});

/* ============================
   IPC: コメント受信 → CSV 保存
   ============================ */
ipcMain.on('comment-received', (event, data) => {
  saveCommentCSV(data);
});

/* ============================
   IPC: コメント履歴読み込み
   ============================ */
ipcMain.handle('load-history', () => {
  return loadHistoryCSV();
});
