// Hidroket GP — çok oyunculu yarış sunucusu
// Çalıştır:  node server.js   (varsayılan port 3000) — hiçbir paket gerekmez
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { EventEmitter } = require("events");

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC = path.join(__dirname, "public");
const DATA_FILE = path.join(__dirname, "data", "leaderboard.json");
const UPSTASH_URL = (process.env.UPSTASH_REDIS_REST_URL || "").trim().replace(/\/+$/, "").replace(/^"|"$/g, "");
const UPSTASH_TOKEN = (process.env.UPSTASH_REDIS_REST_TOKEN || "").trim().replace(/^"|"$/g, "");
const LB_KEY = "hidroket-gp-leaderboard";

const TRACKS = ["istanbul", "monaco", "spa", "monza", "baku", "silverstone", "podyum"];
const MIN_LAP = { istanbul: 12, monaco: 10, spa: 14, monza: 11, baku: 12, silverstone: 12, podyum: 11 };   // saniye: bundan hızlı tur imkânsız
const CFG_DEF = { track: "istanbul", laps: 3, items: 1, obst: 1, catchup: 1, collide: 1 };
function cleanCfg(c) {
  c = c || {}; const n = (v, lo, hi, d) => Number.isInteger(v) && v >= lo && v <= hi ? v : d;
  return { track: TRACKS.includes(c.track) || c.track === "random" ? c.track : CFG_DEF.track, laps: n(c.laps, 1, 10, 3),
    items: n(c.items, 0, 2, 1), obst: n(c.obst, 0, 3, 1), catchup: n(c.catchup, 0, 1, 1), collide: n(c.collide, 0, 1, 1) };
}
const MAX_PLAYERS = 8;
const FINISH_GRACE = 30000;    // ilk araç bitirince diğerlerine kalan süre (ms)
const RACE_TIMEOUT = 6 * 60000;
const CARS = ["turaz", "pars", "ucube", "heli", "hk1", "halis"];
const TICK = 50;               // durum yayını (ms)

/* ---------------- statik dosyalar ---------------- */
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".json": "application/json", ".ico": "image/x-icon", ".ino": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/healthz") { res.writeHead(200, { "content-type": "text/plain" }); return res.end("ok"); }
  if (url.pathname === "/api/leaderboard") { res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); return res.end(JSON.stringify(board)); }
  let p = decodeURIComponent(url.pathname);
  if (p === "/") p = "/index.html";
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }); return res.end("Bulunamadı"); }
    res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream", "cache-control": p.endsWith(".html") ? "no-cache" : "public, max-age=300" });
    res.end(buf);
  });
});

/* ---------------- skor tablosu ---------------- */
let board = { tracks: {} };
let saveTimer = null;
async function loadBoard() {
  try {
    if (UPSTASH_URL) {
      const r = await fetch(UPSTASH_URL + "/get/" + LB_KEY, { headers: { Authorization: "Bearer " + UPSTASH_TOKEN } });
      const j = await r.json();
      if (j && j.result) board = JSON.parse(j.result);
      console.log("Skor tablosu Upstash'ten yüklendi.");
    } else if (fs.existsSync(DATA_FILE)) {
      board = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      console.log("Skor tablosu dosyadan yüklendi.");
    }
  } catch (e) { console.warn("Skor tablosu yüklenemedi:", e.message); }
  if (!board || typeof board.tracks !== "object") board = { tracks: {} };   // eski kampüs pistinin kayıtları bırakılır
  for (const t of TRACKS) { const b = board.tracks[t] = board.tracks[t] || {}; b.laps = Array.isArray(b.laps) ? b.laps : []; b.races = Array.isArray(b.races) ? b.races : []; }
}
function saveBoard() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const body = JSON.stringify(board);
    try {
      if (UPSTASH_URL) {
        await fetch(UPSTASH_URL + "/set/" + LB_KEY, { method: "POST", headers: { Authorization: "Bearer " + UPSTASH_TOKEN }, body });
      } else {
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
        fs.writeFileSync(DATA_FILE, body);
      }
    } catch (e) { console.warn("Skor tablosu kaydedilemedi:", e.message); }
  }, 1000);
}
function addRecord(list, entry, max = 50) {
  const key = entry.name.toLocaleLowerCase("tr") + "|" + entry.car;
  const i = list.findIndex(e => e.name.toLocaleLowerCase("tr") + "|" + e.car === key);
  if (i >= 0) { if (list[i].time <= entry.time) return false; list.splice(i, 1); }
  list.push(entry); list.sort((a, b) => a.time - b.time);
  if (list.length > max) list.length = max;
  return list.indexOf(entry) >= 0;
}

/* ---------------- odalar ---------------- */
const rooms = new Map();
let nextId = 1;
const CODE_CHARS = "ABCDEFGHJKLMNPRSTUVYZ";
function newCode() { let c; do { c = ""; for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.random() * CODE_CHARS.length | 0]; } while (rooms.has(c)); return c; }
function cleanName(n) {
  n = String(n || "").replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 14);
  return n || "Pilot";
}
function send(ws, msg) { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }
function broadcast(room, msg) { const s = JSON.stringify(msg); for (const p of room.players.values()) if (p.ws.readyState === 1) p.ws.send(s); }
function roomInfo(room) {
  return { type: "room", code: room.code, host: room.host, phase: room.phase, cfg: room.cfg,
    players: [...room.players.values()].map(p => ({ id: p.id, name: p.name, car: p.car, racing: p.racing, finished: p.finished })) };
}
function pushRoom(room) { broadcast(room, roomInfo(room)); }
function makeRoom() { const room = { code: newCode(), host: 0, players: new Map(), phase: "lobby", raceStart: 0, firstFinish: 0, timers: [], cfg: Object.assign({}, CFG_DEF), race: null, hz: 0 }; rooms.set(room.code, room); return room; }
function clearTimers(room) { room.timers.forEach(clearTimeout); room.timers = []; }
function joinRoom(p, room) {
  leaveRoom(p);
  if (room.players.size >= MAX_PLAYERS) return send(p.ws, { type: "error", msg: "Oda dolu (en fazla " + MAX_PLAYERS + " kişi)." });
  room.players.set(p.id, p); p.room = room; p.racing = false; p.finished = false;
  if (!room.host) room.host = p.id;
  send(p.ws, { type: "joined", code: room.code });
  pushRoom(room);
}
function leaveRoom(p) {
  const room = p.room; if (!room) return;
  room.players.delete(p.id); p.room = null;
  if (room.players.size === 0) { clearTimers(room); rooms.delete(room.code); return; }
  if (room.host === p.id) room.host = room.players.keys().next().value;
  broadcast(room, { type: "left", id: p.id });
  pushRoom(room);
  if (room.phase === "race") checkRaceEnd(room);
}
function startRace(room) {
  clearTimers(room);
  const order = [...room.players.values()].sort(() => Math.random() - .5);
  order.forEach((p, i) => Object.assign(p, { racing: true, finished: false, lap: 0, sect: 0, lapStart: 0, best: 0, total: 0, laps: [], f: 0, st: null, slot: i, lastAct: 0 }));
  const cfg = Object.assign({}, room.cfg);
  if (cfg.track === "random") cfg.track = TRACKS[Math.random() * TRACKS.length | 0];
  room.race = cfg;
  room.phase = "count";
  broadcast(room, { type: "count", ms: 3600, grid: order.map(p => p.id), cfg, seed: (Math.random() * 1e9) | 0 });
  pushRoom(room);
  room.timers.push(setTimeout(() => {
    room.phase = "race"; room.raceStart = Date.now(); room.firstFinish = 0;
    broadcast(room, { type: "go" }); pushRoom(room);
    room.timers.push(setTimeout(() => endRace(room), RACE_TIMEOUT));
  }, 3600));
}
function checkRaceEnd(room) {
  const racers = [...room.players.values()].filter(p => p.racing);
  if (racers.length === 0 || racers.every(p => p.finished)) endRace(room);
}
function endRace(room) {
  if (room.phase !== "race" && room.phase !== "count") return;
  clearTimers(room);
  room.phase = "results";
  const rows = [...room.players.values()].filter(p => p.racing).map(p => ({ id: p.id, name: p.name, car: p.car, finished: p.finished, total: p.total, best: p.best, lap: p.lap, f: p.f }))
    .sort((a, b) => (b.finished - a.finished) || (a.finished ? a.total - b.total : (b.lap + b.f) - (a.lap + a.f)));
  broadcast(room, { type: "results", rows });
  broadcast(room, { type: "board", board });
  pushRoom(room);
  room.timers.push(setTimeout(() => {
    room.phase = "lobby";
    for (const p of room.players.values()) { p.racing = false; p.finished = false; }
    pushRoom(room);
  }, 12000));
}

/* ---------------- tur doğrulama ----------------
   İstemci kendi aracını sürer; sunucu sektörleri sırayla geçtiğini ve
   tur süresinin makul olduğunu kontrol eder. */
const SECTORS = [[.22, .38], [.47, .63], [.72, .88]];
function trackSectors(p) {
  if (p.sect < 3) { const [a, b] = SECTORS[p.sect]; if (p.f >= a && p.f <= b) p.sect++; }
}
function onLap(p, m) {
  const room = p.room; if (!room || room.phase !== "race" || !p.racing || p.finished) return;
  const n = m.n | 0, time = +m.time, total = +m.total;
  const elapsed = (Date.now() - room.raceStart) / 1000;
  const rc = room.race || CFG_DEF, tb = board.tracks[rc.track];
  if (n !== p.lap + 1 || p.sect < 3 || !(time >= (MIN_LAP[rc.track] || 10)) || !(total >= elapsed - 2.5) || total > elapsed + 1) {
    send(p.ws, { type: "lapRejected", n }); return;
  }
  p.lap = n; p.sect = 0; p.laps.push(time); p.total = total;
  if (!p.best || time < p.best) p.best = time;
  let rec = addRecord(tb.laps, { name: p.name, car: p.car, obst: rc.obst, time: +time.toFixed(3), date: Date.now() });
  broadcast(room, { type: "lap", id: p.id, n, time });
  if (n >= rc.laps) {
    p.finished = true;
    if (rc.laps === 3) rec = addRecord(tb.races, { name: p.name, car: p.car, obst: rc.obst, time: +total.toFixed(3), date: Date.now() }) || rec;
    broadcast(room, { type: "finish", id: p.id, total });
    if (!room.firstFinish) { room.firstFinish = Date.now(); room.timers.push(setTimeout(() => endRace(room), FINISH_GRACE)); broadcast(room, { type: "grace", ms: FINISH_GRACE }); }
    checkRaceEnd(room);
  }
  if (rec) { saveBoard(); broadcast(room, { type: "board", board }); }
}

/* ---------------- WebSocket (bağımlılıksız, RFC 6455) ---------------- */
const MAX_FRAME = 4096;
const clients = new Set();
class Sock extends EventEmitter {
  constructor(socket) {
    super(); this.socket = socket; this.readyState = 1; this.buf = Buffer.alloc(0); this.frags = []; this.fragLen = 0;
    socket.setNoDelay(true);
    socket.on("data", d => this._data(d));
    socket.on("close", () => this._closed());
    socket.on("error", () => this._closed());
  }
  _data(d) {
    this.buf = this.buf.length ? Buffer.concat([this.buf, d]) : d;
    while (this.readyState === 1) {
      if (this.buf.length < 2) return;
      const b0 = this.buf[0], b1 = this.buf[1], fin = b0 & 0x80, op = b0 & 0x0f, masked = b1 & 0x80;
      let len = b1 & 0x7f, off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { return this.terminate(); }
      if (!masked || len > MAX_FRAME) return this.terminate();      // istemci çerçeveleri maskeli olmalı
      if (this.buf.length < off + 4 + len) return;
      const mask = this.buf.subarray(off, off + 4), payload = Buffer.from(this.buf.subarray(off + 4, off + 4 + len));
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
      this.buf = this.buf.subarray(off + 4 + len);
      if (op === 0x8) { this.close(); return; }
      if (op === 0x9) { this._frame(0xA, payload); continue; }
      if (op === 0xA) { this.emit("pong"); continue; }
      if (op === 0x0 || op === 0x1 || op === 0x2) {
        this.frags.push(payload); this.fragLen += payload.length;
        if (this.fragLen > MAX_FRAME) return this.terminate();
        if (fin) { const msg = Buffer.concat(this.frags).toString("utf8"); this.frags = []; this.fragLen = 0; this.emit("message", msg); }
      }
    }
  }
  _frame(op, data) {
    if (this.readyState !== 1) return;
    if (this.socket.writableLength > 1 << 20) return this.terminate();   // çok yavaş istemci
    const len = data.length; let h;
    if (len < 126) h = Buffer.from([0x80 | op, len]);
    else if (len < 65536) { h = Buffer.alloc(4); h[0] = 0x80 | op; h[1] = 126; h.writeUInt16BE(len, 2); }
    else { h = Buffer.alloc(10); h[0] = 0x80 | op; h[1] = 127; h.writeUInt32BE(0, 2); h.writeUInt32BE(len, 6); }
    this.socket.write(Buffer.concat([h, data]));
  }
  send(str) { this._frame(0x1, Buffer.from(str, "utf8")); }
  ping() { this._frame(0x9, Buffer.alloc(0)); }
  close() { if (this.readyState !== 1) return; this._frame(0x8, Buffer.alloc(0)); this.readyState = 2; this.socket.end(); this._closed(); }
  terminate() { this.socket.destroy(); this._closed(); }
  _closed() { if (this.readyState === 3) return; this.readyState = 3; clients.delete(this); this.emit("close"); }
}
server.on("upgrade", (req, socket) => {
  const url = new URL(req.url, "http://x"), key = req.headers["sec-websocket-key"];
  if (url.pathname !== "/ws" || String(req.headers.upgrade).toLowerCase() !== "websocket" || !key) { socket.destroy(); return; }
  const accept = crypto.createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + accept + "\r\n\r\n");
  const ws = new Sock(socket); clients.add(ws); onConnection(ws);
});
function onConnection(ws) {
  const p = { id: nextId++, ws, name: "Pilot", car: "turaz", room: null, racing: false, finished: false, f: 0, st: null, msgs: 0, alive: true };
  send(ws, { type: "welcome", id: p.id, board });
  ws.on("message", raw => {
    if (++p.msgs > 80) return;            // saniyede en fazla ~80 mesaj
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m.type !== "string") return;
    switch (m.type) {
      case "hello": p.name = cleanName(m.name); if (CARS.includes(m.car)) p.car = m.car; break;
      case "create": { p.name = cleanName(m.name); if (CARS.includes(m.car)) p.car = m.car; joinRoom(p, makeRoom()); break; }
      case "join": {
        p.name = cleanName(m.name); if (CARS.includes(m.car)) p.car = m.car;
        const room = rooms.get(String(m.code || "").toUpperCase().trim());
        if (!room) return send(ws, { type: "error", msg: "Bu kodla bir oda yok. Kodu kontrol et." });
        joinRoom(p, room); break;
      }
      case "quick": {
        p.name = cleanName(m.name); if (CARS.includes(m.car)) p.car = m.car;
        let room = [...rooms.values()].find(r => r.phase === "lobby" && r.players.size < MAX_PLAYERS);
        joinRoom(p, room || makeRoom()); break;
      }
      case "car": if (CARS.includes(m.car) && p.room && !p.racing) { p.car = m.car; pushRoom(p.room); } break;
      case "leave": leaveRoom(p); send(ws, { type: "leftRoom" }); break;
      case "start": if (p.room && p.room.host === p.id && p.room.phase === "lobby") startRace(p.room); break;
      case "s": {   // sürüş durumu
        if (!p.room || !p.racing || !Array.isArray(m.d) || m.d.length < 7) return;
        const d = m.d.map(Number); if (d.some(v => !Number.isFinite(v))) return;
        p.f = Math.min(1, Math.max(0, d[5])); p.st = d;
        if (p.room.phase === "race") trackSectors(p);
        break;
      }
      case "lap": onLap(p, m); break;
      case "cfg": if (p.room && p.room.host === p.id && p.room.phase === "lobby") { p.room.cfg = cleanCfg(m.cfg); pushRoom(p.room); } break;
      case "drop": case "zap": {   // eşya: yağ lekesi bırak / şimşek
        const room = p.room; if (!room || room.phase !== "race" || !p.racing) return;
        const now = Date.now(); if (now - (p.lastAct || 0) < 800) return; p.lastAct = now;
        if (m.type === "drop") { const x = +m.x, y = +m.y; if (!Number.isFinite(x) || !Number.isFinite(y)) return; broadcast(room, { type: "drop", id: ++room.hz, x, y, owner: p.id }); }
        else { const pr = +m.p; if (!Number.isFinite(pr)) return; broadcast(room, { type: "zap", id: p.id, p: pr }); }
        break;
      }
      case "hazHit": if (p.room && Number.isInteger(m.id)) broadcast(p.room, { type: "hazGone", id: m.id }); break;
    }
  });
  ws.on("close", () => leaveRoom(p));
}
setInterval(() => {
  for (const room of rooms.values()) for (const p of room.players.values()) p.msgs = 0;
}, 1000);
setInterval(() => {   // durum yayını
  for (const room of rooms.values()) {
    if (room.phase !== "race" && room.phase !== "count" && room.phase !== "results") continue;
    const list = [];
    for (const p of room.players.values()) if (p.racing && p.st) list.push([p.id, ...p.st, p.lap, p.finished ? 1 : 0]);
    if (list.length) broadcast(room, { type: "S", p: list });
  }
}, TICK);
setInterval(() => {   // ölü bağlantıları temizle
  for (const ws of clients) { if (ws._dead) { ws.terminate(); continue; } ws._dead = true; ws.ping(); ws.once("pong", () => { ws._dead = false; }); }
}, 30000);

loadBoard().then(() => server.listen(PORT, () => {
  console.log("Hidroket GP sunucusu çalışıyor: http://localhost:" + PORT);
  console.log(UPSTASH_URL ? "Skor tablosu: Upstash (kalıcı)" : "Skor tablosu: data/leaderboard.json");
}));
