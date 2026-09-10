const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const iconv = require('iconv-lite');

const app = express();
const server = http.createServer(app);

/* ============================
   WebSocket サーバー（認証付き）
   ============================ */
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));
app.use(express.json());

/* ============================
   NGワード（環境変数から読み込み）
   NGWORDS と NGWORDS2 の両方を使う
   ============================ */
function loadNGWords() {
  const env1 = process.env.NGWORDS || "";
  const env2 = process.env.NGWORDS2 || "";

  const list1 = env1.split(",").map(w => w.trim()).filter(w => w !== "");
  const list2 = env2.split(",").map(w => w.trim()).filter(w => w !== "");

  return [...list1, ...list2];
}

let ngWords = loadNGWords();
console.log("NGワード読み込み:", ngWords);

/* ============================
   WebSocket 接続（token + roomId 認証）
   ============================ */

const VIEWER_TOKEN = process.env.VIEWER_TOKEN || "default-viewer-token";

wss.on('connection', (ws, req) => {

  const params = new URLSearchParams(req.url.replace("/?", ""));
  const token = params.get("token");
  const roomId = params.get("roomId");

  // 認証失敗 → 接続拒否
  if (token !== VIEWER_TOKEN) {
    console.log("❌ WebSocket 認証失敗");
    ws.close();
    return;
  }

  ws.roomId = roomId || "default";
  console.log(`✅ WebSocket 接続: roomId=${ws.roomId}`);
});

/* ============================
   roomId ごとに送信
   ============================ */
function broadcast(msg, roomId) {
  wss.clients.forEach(client => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.roomId === roomId
    ) {
      client.send(msg);
    }
  });
}

/* NGワード判定 */
function isNG(text) {
  return ngWords.some(ng => text.includes(ng));
}

/* ============================
   コメント受信 → NG判定 → WebSocket配信
   ============================ */
app.post('/comment', (req, res) => {

  const { text, color, size, speed, studentId, fixed, roomId } = req.body;

  if (!text || text.trim() === "") {
    return res.json({ ok: false });
  }

  const cleanText = text.trim();

  if (isNG(cleanText)) {
    console.log("NGワード検出 → 表示しません:", cleanText);
    return res.json({ ok: true, muted: true });
  }

  const payload = {
    text: cleanText,
    color,
    size,
    speed,
    studentId,
    fixed,
    roomId
  };

  // ★ Render では CSV 保存しない（ローカル Electron のみ保存）
  if (!process.env.RENDER) {
    console.log("ローカル環境 → CSV 保存:", payload);
  }

  // ★ roomId のクライアントだけに送信
  broadcast(JSON.stringify(payload), roomId);

  res.json({ ok: true });
});

/* ============================
   NGワード一覧取得 API
   ============================ */
app.get('/ngwords', (req, res) => {
  ngWords = loadNGWords();
  res.json({ words: ngWords });
});

/* ============================
   ログインAPI（学籍番号 + パスワード）
   ============================ */
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || "defaultpass";

app.post('/login', (req, res) => {
  const { studentId, password } = req.body;

  if (!studentId || !password) {
    return res.json({ ok: false });
  }

  if (password === LOGIN_PASSWORD) {
    return res.json({ ok: true });
  }

  res.json({ ok: false });
});

/* ============================
   Render スリープ防止用 ping API
   ============================ */
app.get('/ping', (req, res) => {
  res.json({ ok: true });
});

/* ============================
   Render 用 PORT 対応
   ============================ */
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`HTTP/WebSocket server running on port ${PORT}`);
});
