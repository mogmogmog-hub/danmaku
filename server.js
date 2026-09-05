const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));
app.use(express.json());

/* CSV 保存ファイル */
const csvFile = path.join(__dirname, 'comments.csv');

/* NGワードCSV */
const ngFile = path.join(__dirname, 'NGword.csv');

/* NGワード読み込み関数 */
function loadNGWords() {
  if (!fs.existsSync(ngFile)) return [];
  const raw = fs.readFileSync(ngFile, 'utf8');
  return raw.split(/\r?\n/).filter(w => w.trim() !== "");
}

/* NGワード保存関数 */
function saveNGWords(words) {
  const text = words.join("\n");
  fs.writeFileSync(ngFile, text, "utf8");
}

/* 起動時に NGワード読み込み */
let ngWords = loadNGWords();
console.log("NGワード読み込み:", ngWords);

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
    data.studentId || "",
    data.text.replace(/"/g, '""'),
    data.color || "",
    data.size || "",
    data.speed || "",
    data.fixed ? "true" : "false"
  ].join(",") + "\n";

  const encoded = iconv.encode(line, "Shift_JIS");
  fs.appendFileSync(csvFile, encoded);
}

/* WebSocket 接続 */
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

/* コメント受信 → NG判定 → WebSocket配信 + CSV保存 */
app.post('/comment', (req, res) => {

  /* ★ fixed を受け取るように修正 */
  const { text, color, size, speed, studentId, fixed } = req.body;

  if (!text || text.trim() === "") {
    return res.json({ ok: false });
  }

  const cleanText = text.trim();

  if (isNG(cleanText)) {
    console.log("NGワード検出 → 表示しません:", cleanText);
    return res.json({ ok: true, muted: true });
  }

  /* ★ fixed を payload に含める */
  const payload = {
    text: cleanText,
    color,
    size,
    speed,
    studentId,
    fixed   // ← これがないと固定表示は絶対に動かない
  };

  saveCommentCSV(payload);

  /* ★ WebSocket に fixed を送る */
  broadcast(JSON.stringify(payload));

  res.json({ ok: true });
});

/* ★ NGワード一覧取得 API */
app.get('/ngwords', (req, res) => {
  ngWords = loadNGWords();
  res.json({ words: ngWords });
});

/* ★ NGワード更新 API */
app.post('/ngwords', (req, res) => {
  const { words } = req.body;

  if (!Array.isArray(words)) {
    return res.json({ ok: false });
  }

  saveNGWords(words);
  ngWords = loadNGWords();

  console.log("NGワード更新:", ngWords);

  res.json({ ok: true });
});

/* ★ コメント履歴取得 API（Shift-JIS → UTF-8 変換対応） */
app.get('/history', (req, res) => {
  if (!fs.existsSync(csvFile)) {
    return res.json({ rows: [] });
  }

  const raw = fs.readFileSync(csvFile);
  const utf8Text = iconv.decode(raw, "Shift_JIS");

  const lines = utf8Text.split(/\r?\n/).filter(line => line.trim() !== "");

  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");

    rows.push({
      time: cols[0],
      studentId: cols[1],
      text: cols[2],
      color: cols[3],
      size: cols[4],
      speed: cols[5],
      fixed: cols[6] === "true"
    });
  }

  res.json({ rows });
});

/* ★ ログインAPI（学籍番号 + パスワード固定 8931） */
app.post('/login', (req, res) => {
  const { studentId, password } = req.body;

  if (!studentId || !password) {
    return res.json({ ok: false });
  }

  if (password === "8931") {
    return res.json({ ok: true });
  }

  res.json({ ok: false });
});

server.listen(3000, () => {
  console.log('HTTP/WebSocket server on http://localhost:3000');
});
