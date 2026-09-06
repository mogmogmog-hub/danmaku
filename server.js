const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const iconv = require('iconv-lite');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));
app.use(express.json());

/* ============================
   NGワード（環境変数から読み込み）
   ============================ */
function loadNGWords() {
  const env = process.env.NGWORDS;
  if (!env) return [];
  return env.split(",").map(w => w.trim()).filter(w => w !== "");
}

let ngWords = loadNGWords();
console.log("NGワード読み込み:", ngWords);

/* ============================
   WebSocket 接続
   ============================ */
wss.on('connection', ws => {
  console.log('client connected');
});

/* 全クライアントに送信 */
function broadcast(msg) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
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

  // ★ glow を追加
  const { text, color, size, speed, studentId, fixed, glow } = req.body;

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
    glow   // ★ 発光フラグを WebSocket に送る
  };

  // Render では CSV 保存しない（Electron 側で保存）
  if (!process.env.RENDER) {
    console.log("ローカル環境 → CSV 保存:", payload);
  }

  broadcast(JSON.stringify(payload));

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
   Render 用 PORT 対応
   ============================ */
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`HTTP/WebSocket server running on port ${PORT}`);
});
