// Hidroket GP Online — istemci
(() => {
"use strict";
/* =========================================================
   SABİTLER VE YARDIMCILAR
   ========================================================= */
const W = 384, H = 216, HY = 74, F = 192, CAMH = 15, CAMD = 34;
const PITCH = Math.atan2(CAMH, CAMD);
const TS = 2048, TW = 56, LAPS = 3, TAU = Math.PI * 2, PW = W * 4;
const M = window.HGP_MODELS, VW = 16 / M.L;
const SN = 48, SS = 1.5, SW_ = 96, SH_ = 64, SOX = 48, SOY = 46;

const $ = id => document.getElementById(id);
const cv = $('game');
const ctx = cv.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const params = new URLSearchParams(location.search);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const sq = x => x * x;
const wrapA = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; }
function sprite(rows, pal, mirror) {
  const wMax = Math.max(...rows.map(r => r.length));
  rows = rows.map(r => mirror ? r.padStart(wMax, '.') : r.padEnd(wMax, '.'));
  if (mirror) rows = rows.map(r => r + [...r].reverse().join(''));
  const [c, g] = mk(rows[0].length, rows.length);
  rows.forEach((r, y) => [...r].forEach((ch, x) => { const col = pal[ch]; if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } }));
  return c;
}
const GL = {
  A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',F:'111100110100100',
  G:'011100101101011',H:'101101111101101',I:'111010010010111',K:'101101110101101',L:'100100100100111',M:'101111111101101',
  N:'110101101101101',O:'010101101101010',P:'110101110100100',R:'110101110101101',S:'011100010001110',T:'111010010010010',
  U:'101101101101111',V:'101101101101010',Y:'101101010010010',Z:'111001010100111',' ':'000000000000000'
};
function tiny(g, str, x, y, col, s = 1) { g.fillStyle = col; [...str].forEach((ch, i) => { const gl = GL[ch] || GL[' ']; for (let k = 0; k < 15; k++) if (gl[k] === '1') g.fillRect(x + (i * 4 + k % 3) * s, y + Math.floor(k / 3) * s, s, s); }); }
function txt(s, x, y, color, size = 8, align = 'left', shadow = true) {
  ctx.font = size + 'px "Press Start 2P", monospace'; ctx.textAlign = align; ctx.textBaseline = 'top';
  if (shadow) { ctx.fillStyle = '#000'; ctx.fillText(s, x + 1, y + 1); }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}
const fmt = t => { if (!t && t !== 0) return '--:--.-'; const m = Math.floor(t / 60), s = t - m * 60; return String(m).padStart(2, '0') + ':' + s.toFixed(1).padStart(4, '0'); };
const fmt2 = t => { const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + s.toFixed(2).padStart(5, '0'); };

/* =========================================================
   LOGO (gerçek logo, logo.js içinden)
   ========================================================= */
const loadImg = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
function tint(img, col) { const [c, g] = mk(img.width, img.height); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); return c; }
function scaled(img, w) {
  let src = img, sw = img.width, sh = img.height;
  while (sw / 2 >= w) { const [t, tg2] = mk(Math.round(sw / 2), Math.round(sh / 2)); tg2.imageSmoothingEnabled = true; tg2.drawImage(src, 0, 0, t.width, t.height); src = t; sw = t.width; sh = t.height; }
  const h = Math.max(1, Math.round(img.height * w / img.width)); const [c, g] = mk(w, h); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, w, h); return c;
}
const LOGO = {};
function logoBadge(g, x, y) {   // 76 x 15 beyaz rozet
  g.fillStyle = '#f4f6f8'; g.fillRect(x, y, 78, 15);
  g.drawImage(LOGO.emB18, x + 3, y + 1); g.drawImage(LOGO.wdB52, x + 23, y + 4);
}

/* =========================================================
   ARAÇLAR
   ========================================================= */
const CARS = [
  { key: 'turaz', name: 'TUR-AZ', num: '36', trait: 'Dengeli', col: '#2a94d8', s: { top: .75, acc: .7, turn: .7, grip: .7 } },
  { key: 'pars', name: 'PARS', num: '616', trait: 'Son sürat', col: '#d0262f', s: { top: 1, acc: .6, turn: .55, grip: .6 } },
  { key: 'ucube', name: 'UCUBE', num: '7', trait: 'Patlayıcı ivme', col: '#f08a1c', s: { top: .6, acc: .95, turn: .7, grip: .6 } },
  { key: 'heli', name: 'HELIANTHUS', num: '304', trait: 'Viraj ustası', col: '#c5cbd1', s: { top: .62, acc: .55, turn: .95, grip: .95 } }
];
const CARK = Object.fromEntries(CARS.map(c => [c.key, c]));
let selCar = CARK[store.get('hgp-car', 'turaz')] ? store.get('hgp-car', 'turaz') : 'turaz';

/* =========================================================
   VARLIKLAR (init içinde kurulur)
   ========================================================= */
let workshop, workshopEmpty, imgPine, imgPine2, imgAutumn, imgTires, imgBanner, imgStand, imgGantry, imgH2;
let track, NS, SX, SY, TX, TY, KV, GRAV, WS_I, WS, ST_I, STAND, tc, tex, MIPS, mip, OUTCOL, SKID, pano, minimap, mmScale;
const RNX = i => -TY[i], RNY = i => TX[i];
const objs = [], grid = new Map(), GC = 64, pickups = [];
const MM = 78;

function pine(g, x, base, h, dark, light) {
  for (let y = 0; y < h; y++) {
    const tier = (y % Math.max(4, h / 4 | 0)) / Math.max(4, h / 4 | 0);
    const w = Math.round((y / h) * h * 0.28 * (0.6 + 0.4 * tier)) + 1;
    g.fillStyle = dark; g.fillRect(x - w, base - h + y, w * 2 + 1, 1);
    g.fillStyle = light; g.fillRect(x - w, base - h + y, Math.max(1, w * 0.6 | 0), 1);
  }
  g.fillStyle = '#5a3a1e'; g.fillRect(x - 1, base, 2, 3);
}
function makeWorkshop(withCar) {
  const [c, g] = mk(192, 100);
  g.strokeStyle = '#e4eaef'; g.lineWidth = 2; g.beginPath(); g.ellipse(100, 62, 94, 54, 0, Math.PI, TAU); g.stroke();
  g.strokeStyle = '#cdd6de'; g.lineWidth = 1; g.beginPath(); g.ellipse(100, 62, 88, 48, 0, Math.PI, TAU); g.stroke();
  for (let a = 0.1; a < 1; a += 0.075) { const ang = Math.PI + a * Math.PI; g.fillStyle = '#d5dde4'; g.fillRect(100 + Math.cos(ang) * 91 | 0, 62 + Math.sin(ang) * 51 | 0, 1, 3); }
  pine(g, 10, 72, 46, '#1b5233', '#2b7247'); pine(g, 22, 76, 36, '#1f5a37', '#2f7d4b');
  pine(g, 178, 74, 50, '#1b5233', '#2b7247'); pine(g, 164, 70, 30, '#1f5a37', '#2f7d4b');
  g.fillStyle = '#6d5a3a'; g.fillRect(36, 40, 2, 34);
  g.fillStyle = '#4c7a3c'; for (let i = 0; i < 40; i++) g.fillRect(28 + (i * 37 % 18), 22 + (i * 23 % 20), 3, 2);
  const roofY = x => Math.round(x < 97 ? 44 - (x - 22) / 75 * 13 : 31 + (x - 97) / 75 * 13);
  for (let x = 22; x <= 172; x++) { const y = roofY(x); g.fillStyle = x % 3 ? '#b4bbc3' : '#98a0a9'; g.fillRect(x, y, 1, 47 - y); }
  g.fillStyle = '#7d858e'; g.fillRect(20, 46, 154, 2);
  g.fillStyle = '#eef0f2'; g.fillRect(26, 48, 142, 40);
  g.fillStyle = '#dce0e4'; for (let x = 30; x < 168; x += 10) g.fillRect(x, 48, 1, 40);
  g.fillStyle = '#cfd3d6'; g.fillRect(26, 84, 142, 4);
  g.fillStyle = '#262b32'; g.fillRect(70, 55, 54, 33);
  g.fillStyle = '#3a414b'; g.fillRect(74, 61, 12, 1); g.fillRect(74, 67, 12, 1); g.fillRect(108, 62, 12, 1); g.fillRect(110, 58, 3, 4); g.fillRect(76, 58, 4, 3);
  g.fillStyle = '#9aa3ad'; g.fillRect(69, 54, 56, 1); g.fillRect(69, 54, 1, 34); g.fillRect(124, 54, 1, 34);
  // tabela: gerçek logo
  g.fillStyle = '#f4f6f8'; g.fillRect(70, 47, 54, 8); g.drawImage(LOGO.wdB44, 75, 49);
  g.fillStyle = '#ffffff'; g.fillRect(142, 51, 22, 16); g.drawImage(LOGO.emB18, 144, 53);
  g.fillStyle = '#c3c9cf'; g.fillRect(130, 62, 10, 26); g.fillStyle = '#8a929b'; g.fillRect(137, 74, 2, 2);
  g.fillStyle = '#33414d'; g.fillRect(38, 58, 18, 10); g.fillStyle = '#a9b4be'; g.fillRect(46, 58, 1, 10); g.fillRect(38, 62, 18, 1);
  g.fillStyle = '#9b9a92'; g.fillRect(0, 88, 192, 12);
  g.fillStyle = '#8c8b83'; for (let x = 0; x < 192; x += 6) g.fillRect(x, 88, 1, 12); g.fillRect(0, 94, 192, 1);
  g.fillStyle = '#8a7a5c'; g.fillRect(0, 92, 40, 8); g.fillRect(150, 94, 42, 6);
  g.fillStyle = '#d8dde1'; g.fillRect(2, 74, 22, 14); g.fillStyle = '#5d6d7a'; g.fillRect(4, 70, 14, 8); g.fillStyle = '#b6bcc2'; g.fillRect(8, 78, 10, 10);
  g.fillStyle = '#e8742a'; g.fillRect(17, 78, 8, 11); g.fillStyle = '#222'; g.fillRect(16, 77, 10, 2);
  g.fillStyle = '#8a6a44'; g.fillRect(150, 82, 30, 2); g.fillRect(152, 84, 1, 6); g.fillRect(177, 84, 1, 6);
  g.fillStyle = '#3fae49'; g.fillRect(146, 88, 38, 2); g.fillRect(146, 84, 1, 6); g.fillRect(183, 84, 1, 6);
  if (withCar) M.renderCar(g, CARK.turaz.model, -Math.PI / 2 + 0.45, 0.85, 97, 96, PITCH, 'rgba(10,14,20,.6)');
  return c;
}
function buildArt() {
  workshop = makeWorkshop(true); workshopEmpty = makeWorkshop(false);
  imgPine = (() => { const [c, g] = mk(18, 36); pine(g, 9, 33, 32, '#1b5a33', '#2e8049'); return c; })();
  imgPine2 = (() => { const [c, g] = mk(18, 36); pine(g, 9, 33, 26, '#22633a', '#38904f'); return c; })();
  imgAutumn = (() => { const [c, g] = mk(22, 28); const r = rng(5); g.fillStyle = '#6b4a2a'; g.fillRect(10, 14, 2, 14);
    for (let i = 0; i < 90; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 9; g.fillStyle = r() < 0.3 ? '#c99a22' : r() < 0.5 ? '#f0cf45' : '#e2b72f'; g.fillRect(11 + Math.cos(a) * d | 0, 10 + Math.sin(a) * d * 0.85 | 0, 2, 2); } return c; })();
  imgTires = sprite(["..kkkkkk..", ".kwwwwwwk.", "kkkkkkkkkk", ".kkkkkkkk.", "kkkkkkkkkk", ".kwwwwwwk.", "kkkkkkkkkk", ".kkkkkkkk."], { k: '#1c1c1c', w: '#e8e8e8' });
  imgBanner = (() => { const [c, g] = mk(64, 26); g.fillStyle = '#6d7680'; g.fillRect(3, 14, 2, 12); g.fillRect(59, 14, 2, 12);
    g.fillStyle = '#f4f6f8'; g.fillRect(0, 0, 64, 16); g.drawImage(LOGO.emB18, 3, 2); g.drawImage(LOGO.wdB38, 23, 5); g.fillStyle = '#2a94d8'; g.fillRect(0, 15, 64, 1); return c; })();
  imgStand = (() => { const [c, g] = mk(90, 40); const r = rng(9);
    g.fillStyle = '#8f98a2'; g.fillRect(0, 4, 90, 3); g.fillStyle = '#c5ccd3'; g.fillRect(2, 7, 1, 33); g.fillRect(87, 7, 1, 33);
    for (let row = 0; row < 6; row++) { g.fillStyle = row % 2 ? '#a9b1ba' : '#9aa3ad'; g.fillRect(4, 10 + row * 4, 82, 4);
      for (let x = 5; x < 85; x += 2) if (r() < 0.8) { g.fillStyle = ['#ff5a4e', '#2b9be0', '#ffd84a', '#f4f6f8', '#5fd16b', '#222', '#f08a1c'][r() * 7 | 0]; g.fillRect(x, 10 + row * 4, 1, 2); g.fillStyle = '#e8c4a0'; g.fillRect(x, 9 + row * 4, 1, 1); } }
    g.fillStyle = '#10304a'; g.fillRect(4, 34, 82, 6); g.drawImage(LOGO.wdW30, 26, 35); tiny(g, 'GP', 58, 35, '#ffd84a'); return c; })();
  imgGantry = (() => { const [c, g] = mk(96, 52); g.fillStyle = '#c3ccd4'; g.fillRect(2, 10, 5, 42); g.fillRect(89, 10, 5, 42);
    g.fillStyle = '#10304a'; g.fillRect(0, 2, 96, 16); g.fillStyle = '#2a94d8'; g.fillRect(0, 17, 96, 1);
    g.drawImage(LOGO.emW18, 6, 4); g.drawImage(LOGO.wdW52, 27, 6); tiny(g, 'GP', 82, 7, '#ffd84a'); return c; })();
  imgH2 = sprite(["..kkkk..", ".cccccc.", ".cwccwc.", ".cwccwc.", ".cwwwwc.", ".cwccwc.", ".cwccwc.", ".cccccc.", ".CCCCCC.", "..CCCC.."], { c: '#3fd0f0', C: '#1f8fb8', w: '#ffffff', k: '#5a5a5a' });
}

/* ---------------- pist ---------------- */
const CP = [[500,1650],[900,1700],[1300,1700],[1620,1620],[1780,1420],[1760,1180],[1560,1080],[1320,1120],[1140,1040],
  [1120,860],[1300,760],[1600,720],[1780,560],[1740,330],[1480,250],[1100,300],[850,420],[700,620],[820,820],[760,1000],
  [520,1080],[330,1000],[260,1200],[300,1450]];
const SPACING = 6;
function buildTrack() {
  const raw = [], n = CP.length;
  for (let i = 0; i < n; i++) {
    const p0 = CP[(i - 1 + n) % n], p1 = CP[i], p2 = CP[(i + 1) % n], p3 = CP[(i + 2) % n];
    for (let t = 0; t < 1; t += 1 / 60) {
      const t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      raw.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  const pts = [raw[0]]; let carry = 0;
  for (let i = 1; i <= raw.length; i++) {
    const a = raw[i - 1], b = raw[i % raw.length]; let seg = Math.hypot(b[0] - a[0], b[1] - a[1]), pos = 0;
    while (carry + (seg - pos) >= SPACING) { pos += SPACING - carry; carry = 0; const t = pos / seg; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    carry += seg - pos;
  }
  if (Math.hypot(pts[pts.length - 1][0] - pts[0][0], pts[pts.length - 1][1] - pts[0][1]) < SPACING * 0.5) pts.pop();
  let s0 = 0, bd = 1e18; pts.forEach((p, i) => { const d = sq(p[0] - 880) + sq(p[1] - 1700); if (d < bd) { bd = d; s0 = i; } });
  const P = pts.slice(s0).concat(pts.slice(0, s0));
  NS = P.length;
  SX = new Float32Array(NS); SY = new Float32Array(NS); TX = new Float32Array(NS); TY = new Float32Array(NS); KV = new Float32Array(NS); GRAV = new Uint8Array(NS);
  for (let i = 0; i < NS; i++) { SX[i] = P[i][0]; SY[i] = P[i][1]; }
  for (let i = 0; i < NS; i++) { const a = P[(i - 1 + NS) % NS], b = P[(i + 1) % NS]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); TX[i] = (b[0] - a[0]) / l; TY[i] = (b[1] - a[1]) / l; }
  const Kr = new Float32Array(NS);
  for (let i = 0; i < NS; i++) { const a = (i - 4 + NS) % NS, b = (i + 4) % NS; Kr[i] = wrapA(Math.atan2(TY[b], TX[b]) - Math.atan2(TY[a], TX[a])) / (8 * SPACING); }
  for (let i = 0; i < NS; i++) { let s = 0; for (let k = -4; k <= 4; k++) s += Kr[(i + k + NS) % NS]; KV[i] = s / 9; }
  for (let i = 0; i < NS; i++) { let m = 0; for (let k = -8; k <= 8; k++) m = Math.max(m, Math.abs(KV[(i + k + NS) % NS])); GRAV[i] = m > 0.0062 ? 1 : 0; }
  WS_I = Math.round(NS * 0.06) % NS;
  WS = { x: SX[WS_I] + RNX(WS_I) * (TW / 2 + 78), y: SY[WS_I] + RNY(WS_I) * (TW / 2 + 78) };
  ST_I = (NS - 18) % NS;
  STAND = { x: SX[ST_I] - RNX(ST_I) * (TW / 2 + 40), y: SY[ST_I] - RNY(ST_I) * (TW / 2 + 40) };
}
const gridPos = slot => { const i = (NS - 6 - slot * 4 + NS) % NS, lat = (slot % 2 ? 1 : -1) * TW * 0.22; return { i, x: SX[i] + RNX(i) * lat + TX[i] * 4, y: SY[i] + RNY(i) * lat + TY[i] * 4, a: Math.atan2(TY[i], TX[i]) }; };
const ABGR = (r, g, b) => (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
function buildTexture() {
  let tg; [tc, tg] = mk(TS, TS);
  const r = rng(11);
  tg.fillStyle = '#3e9a39'; tg.fillRect(0, 0, TS, TS);
  tg.fillStyle = '#46a540';
  for (let i = -TS; i < TS * 2; i += 96) { tg.beginPath(); tg.moveTo(i, 0); tg.lineTo(i + 48, 0); tg.lineTo(i + 48 - TS, TS); tg.lineTo(i - TS, TS); tg.fill(); }
  for (let i = 0; i < 26000; i++) { tg.fillStyle = r() < 0.5 ? '#358a32' : '#52b04a'; tg.fillRect(r() * TS | 0, r() * TS | 0, 2, 1); }
  for (let i = 0; i < 1600; i++) { tg.fillStyle = r() < 0.5 ? '#ffe36a' : '#ffffff'; tg.fillRect(r() * TS | 0, r() * TS | 0, 1, 1); }
  const path = () => { tg.beginPath(); for (let i = 0; i <= NS; i++) { const k = i % NS; i ? tg.lineTo(SX[k], SY[k]) : tg.moveTo(SX[k], SY[k]); } tg.closePath(); };
  for (let i = 0; i < NS; i++) if (GRAV[i]) { const side = -Math.sign(KV[i]) || 1; tg.fillStyle = '#d6c48d'; tg.beginPath(); tg.arc(SX[i] + RNX(i) * side * (TW / 2 + 20), SY[i] + RNY(i) * side * (TW / 2 + 20), 25, 0, TAU); tg.fill(); }
  for (let i = 0; i < 9000; i++) { const k = r() * NS | 0; if (!GRAV[k]) continue; const side = -Math.sign(KV[k]) || 1, d = TW / 2 + 4 + r() * 40, l = (r() - 0.5) * 12;
    tg.fillStyle = r() < 0.5 ? '#bfae78' : '#e6d6a2'; tg.fillRect(SX[k] + RNX(k) * side * d + TX[k] * l | 0, SY[k] + RNY(k) * side * d + TY[k] * l | 0, 1, 1); }
  tg.save(); tg.translate(WS.x, WS.y); tg.rotate(Math.atan2(TY[WS_I], TX[WS_I]));
  tg.fillStyle = '#c4a79a'; tg.fillRect(-70, -50, 140, 70);
  tg.fillStyle = '#b19385'; for (let x = -70; x < 70; x += 6) tg.fillRect(x, -50, 1, 70); for (let y = -50; y < 20; y += 6) tg.fillRect(-70, y, 140, 1);
  tg.fillStyle = '#9b9a92'; tg.fillRect(-60, -10, 120, 30); tg.restore();
  tg.lineJoin = 'round'; tg.lineCap = 'round';
  path(); tg.lineWidth = TW + 10; tg.strokeStyle = '#f2f2f2'; tg.stroke();
  tg.setLineDash([9, 9]); tg.strokeStyle = '#d22f2a'; tg.stroke(); tg.setLineDash([]);
  path(); tg.lineWidth = TW; tg.strokeStyle = '#5d6168'; tg.stroke();
  tg.lineWidth = TW - 5; tg.strokeStyle = '#e9e9e9'; tg.stroke();
  tg.lineWidth = TW - 7; tg.strokeStyle = '#5d6168'; tg.stroke();
  tg.lineWidth = 12; tg.strokeStyle = 'rgba(70,72,78,.45)'; tg.stroke();
  for (let i = 0; i < 60000; i++) { const k = r() * NS | 0, d = (r() - 0.5) * (TW - 9), l = (r() - 0.5) * SPACING;
    tg.fillStyle = r() < 0.5 ? '#555960' : '#686c73'; tg.fillRect(SX[k] + RNX(k) * d + TX[k] * l | 0, SY[k] + RNY(k) * d + TY[k] * l | 0, 1, 1); }
  tg.save(); tg.translate(SX[0], SY[0]); tg.rotate(Math.atan2(TY[0], TX[0]));
  for (let x = 0; x < 8; x += 4) for (let y = -TW / 2 + 3; y < TW / 2 - 3; y += 4) { tg.fillStyle = ((x + y) / 4 & 1) ? '#111' : '#f4f4f4'; tg.fillRect(x - 4, y, 4, 4); }
  tg.restore();
  for (let p = 0; p < 8; p++) { const gp = gridPos(p); tg.save(); tg.translate(gp.x - TX[gp.i] * 4, gp.y - TY[gp.i] * 4); tg.rotate(gp.a);
    tg.fillStyle = '#e9e9e9'; tg.fillRect(4, -5, 1, 10); tg.fillRect(1, -5, 3, 1); tg.fillRect(1, 4, 3, 1); tg.restore(); }
  // asfaltta logo
  for (const wi of [30 % NS, Math.round(NS * .5)]) { tg.save(); tg.translate(SX[wi], SY[wi]); tg.rotate(Math.atan2(TX[wi], -TY[wi]));
    tg.globalAlpha = .85; tg.drawImage(LOGO.wdW52, -26, -4); tg.globalAlpha = 1; tg.restore(); }
  tex = new Uint32Array(tg.getImageData(0, 0, TS, TS).data.buffer);
  MIPS = TS / 4;
  const [mc, mg] = mk(MIPS, MIPS); mg.imageSmoothingEnabled = true; mg.imageSmoothingQuality = 'high'; mg.drawImage(tc, 0, 0, MIPS, MIPS);
  mip = new Uint32Array(mg.getImageData(0, 0, MIPS, MIPS).data.buffer);
  OUTCOL = ABGR(0x3e, 0x9a, 0x39); SKID = ABGR(0x3a, 0x3c, 0x41);
}
function buildPano() {
  const [c, g] = mk(PW, HY + 1); const r = rng(3);
  const sky = ['#3a78cc', '#4382d1', '#4d8dd6', '#5898db', '#64a3e0', '#71ade4', '#7fb8e8', '#8ec2ec', '#9ecbef', '#acd3f1'];
  const bh = Math.ceil((HY + 1) / sky.length);
  sky.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * bh, PW, bh); });
  for (let k = 0; k < 9; k++) { const cx = r() * PW, cy = 8 + r() * 26, w = 20 + r() * 40;
    for (let i = 0; i < 22; i++) { g.fillStyle = i % 4 ? '#f4f8fb' : '#dfe9f1'; const a = r() * TAU, d = r(); g.fillRect((cx + Math.cos(a) * w * d * 0.6) % PW | 0, cy + Math.sin(a) * 5 * d | 0, 8, 3); } }
  for (let x = 0; x < PW; x++) { const a = x / PW * TAU; const h = Math.round(16 + 7 * Math.sin(a * 3) + 5 * Math.sin(a * 7 + 1) + 2 * Math.sin(a * 17));
    g.fillStyle = '#a99d62'; g.fillRect(x, HY - h, 1, h + 1); g.fillStyle = '#c4b87d'; g.fillRect(x, HY - h, 1, 1); }
  for (let k = 0; k < 7; k++) { const bx = (200 + k * 190 + r() * 60) % PW, bw = 18 + r() * 26 | 0, bhh = 10 + r() * 14 | 0;
    if (Math.abs(bx - 640) < 120) continue;
    g.fillStyle = '#c9d0d6'; g.fillRect(bx, HY - bhh, bw, bhh); g.fillStyle = '#7f95a8';
    for (let y = HY - bhh + 2; y < HY - 2; y += 3) for (let x = bx + 2; x < bx + bw - 2; x += 3) g.fillRect(x, y, 1, 1); }
  g.imageSmoothingEnabled = true; g.drawImage(workshop, 640 - 72, HY - 72, 144, 75); g.imageSmoothingEnabled = false;
  for (let x = 0; x < PW; x += 5 + (r() * 6 | 0)) { if (x > 560 && x < 720) continue; const h = 6 + r() * 12 | 0, w = Math.ceil(h * 0.3);
    for (let y = 0; y < h; y++) { const ww = Math.round(y / h * w); g.fillStyle = '#1d5534'; g.fillRect(x - ww, HY - h + y + 1, ww * 2 + 1, 1); } }
  pano = c;
}
function addObj(o) { objs.push(o); if (o.r) { const k = (o.x / GC | 0) + ',' + (o.y / GC | 0); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(o); } }
function buildObjects() {
  const r = rng(21);
  const farFromTrack = (x, y, m) => { for (let i = 0; i < NS; i += 3) { const d = sq(x - SX[i]) + sq(y - SY[i]); const lim = TW / 2 + m + (GRAV[i] ? 46 : 0); if (d < lim * lim) return false; } return true; };
  for (let t = 0; t < 900 && objs.length < 260; t++) {
    const x = 60 + r() * (TS - 120), y = 60 + r() * (TS - 120);
    if (Math.hypot(x - WS.x, y - WS.y) < 110 || Math.hypot(x - STAND.x, y - STAND.y) < 70) continue;
    if (!farFromTrack(x, y, 26)) continue;
    const k = r(); addObj(k < 0.45 ? { x, y, img: imgPine, ww: 24, r: 4 } : k < 0.75 ? { x, y, img: imgPine2, ww: 20, r: 4 } : { x, y, img: imgAutumn, ww: 28, r: 4 });
  }
  for (let i = 0; i < NS; i += 7) if (GRAV[i] && GRAV[(i + 7) % NS]) { const side = -Math.sign(KV[i]) || 1, d = TW / 2 + 47;
    addObj({ x: SX[i] + RNX(i) * side * d, y: SY[i] + RNY(i) * side * d, img: imgTires, ww: 9, r: 4 }); }
  for (let i = 40; i < NS; i += Math.floor(NS / 9)) { const side = (i / 7 | 0) % 2 ? 1 : -1; const d = TW / 2 + 16;
    if (GRAV[i] && side === -Math.sign(KV[i])) continue;
    addObj({ x: SX[i] + RNX(i) * side * d, y: SY[i] + RNY(i) * side * d, img: imgBanner, ww: 30, r: 3 }); }
  addObj({ x: WS.x, y: WS.y, img: workshop, ww: 96, r: 34 });
  addObj({ x: STAND.x, y: STAND.y, img: imgStand, ww: 80, r: 26 });
  addObj({ x: SX[0], y: SY[0], img: imgGantry, ww: TW + 16 });
  for (let k = 0; k < 9; k++) { const i = Math.floor((k + 0.4) * NS / 9) % NS, lat = ((k * 37) % 7 / 6 - 0.5) * TW * 0.6;
    pickups.push({ x: SX[i] + RNX(i) * lat, y: SY[i] + RNY(i) * lat, on: true, t: 0 }); }
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < NS; i++) { x0 = Math.min(x0, SX[i]); y0 = Math.min(y0, SY[i]); x1 = Math.max(x1, SX[i]); y1 = Math.max(y1, SY[i]); }
  const s = (MM - 10) / Math.max(x1 - x0, y1 - y0); mmScale = { s, x0: x0 - (MM / s - (x1 - x0)) / 2, y0: y0 - (MM / s - (y1 - y0)) / 2 };
  const [c, g] = mk(MM, MM); g.fillStyle = 'rgba(6,18,30,.78)'; g.fillRect(0, 0, MM, MM);
  g.strokeStyle = '#e6eef5'; g.lineWidth = 2; g.lineJoin = 'round'; g.beginPath();
  for (let i = 0; i <= NS; i += 4) { const k = i % NS; const x = (SX[k] - mmScale.x0) * mmScale.s, y = (SY[k] - mmScale.y0) * mmScale.s; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.closePath(); g.stroke(); const sx = (SX[0] - mmScale.x0) * mmScale.s, sy = (SY[0] - mmScale.y0) * mmScale.s; g.fillStyle = '#ffd84a'; g.fillRect(sx - 1, sy - 2, 2, 4);
  minimap = c;
}
function buildCars() {
  for (const c of CARS) {
    c.model = M.buildModel(c.key);
    c.sheet = [];
    for (let k = 0; k < SN; k++) {
      const [sc, sg] = mk(SW_, SH_);
      M.renderCar(sg, c.model, Math.PI / 2 - k * TAU / SN, SS, SOX, SOY, PITCH);
      c.sheet.push(sc);
    }
  }
}

/* =========================================================
   FİZİK
   ========================================================= */
const SURF = { road: { top: 1, drag: 0.15, grip: 1 }, curb: { top: 0.96, drag: 0.22, grip: 0.92 }, grass: { top: 0.55, drag: 1.0, grip: 0.68 }, gravel: { top: 0.38, drag: 2.2, grip: 0.5 } };
const SURFS = ['road', 'curb', 'grass', 'gravel'];
const statsOf = s => ({ top: 230 + 90 * s.top, acc: 110 + 130 * s.acc, turn: 2.1 + 1.3 * s.turn, grip: 4.5 + 7 * s.grip });
function makeCar(def, slot, kind) {
  const gp = gridPos(slot);
  return { def, kind, stats: statsOf(def.s), x: gp.x, y: gp.y, a: gp.a, vx: 0, vy: 0, av: 0, idx: gp.i, lap: -1, maxLap: -1, lapStart: 0, laps: [], bestLap: 0,
    finished: false, fin: 0, total: 0, turbo: 25, turboOn: false, lane: (Math.random() - 0.5) * 0.4, laneT: 1 + Math.random() * 2, surf: 'road', slip: 0,
    skill: 0.96 + Math.random() * 0.05, hitT: 0, buf: [], vf: 0, f: gp.i / NS, name: def.name, id: 0, seen: 0 };
}
const speedF = c => c.kind === 'remote' ? c.vf : c.vx * Math.cos(c.a) + c.vy * Math.sin(c.a);
function stepCar(c, inp, dt) {
  const st = c.stats, fx = Math.cos(c.a), fy = Math.sin(c.a), rxv = -fy, ryv = fx;
  let vf = c.vx * fx + c.vy * fy, vl = c.vx * rxv + c.vy * ryv;
  const sf = SURF[c.surf];
  let top = st.top * sf.top, acc = st.acc;
  if (c.turboOn) { top *= 1.35; acc *= 1.8; }
  if (inp.thr > 0.05) { if (vf < top) vf += acc * inp.thr * dt * (1 - Math.max(0, vf) / top * 0.6); }
  else if (inp.thr < -0.05) { if (vf > 8) vf -= 280 * -inp.thr * dt; else vf = Math.max(-70, vf - 100 * -inp.thr * dt); }
  vf -= vf * sf.drag * dt + Math.sign(vf) * Math.min(Math.abs(vf), 14 * dt);
  if (vf > top) vf -= (vf - top) * 2.2 * dt;
  const spd = Math.abs(vf);
  const steerEff = Math.min(1, spd / 45) * (1 - 0.32 * Math.min(1, spd / st.top));
  c.av = inp.steer * st.turn * steerEff * (vf < -2 ? -1 : 1);
  c.a = wrapA(c.a + c.av * dt);
  const grip = st.grip * sf.grip * (c.turboOn ? 0.85 : 1) * (inp.thr > 0.5 && Math.abs(inp.steer) > 0.6 && spd > st.top * 0.7 ? 0.6 : 1);
  vl *= Math.exp(-grip * dt);
  c.vx = fx * vf + rxv * vl; c.vy = fy * vf + ryv * vl;
  c.x += c.vx * dt; c.y += c.vy * dt;
  if (c.x < 20 || c.x > TS - 20) { c.x = clamp(c.x, 20, TS - 20); c.vx *= -0.3; }
  if (c.y < 20 || c.y > TS - 20) { c.y = clamp(c.y, 20, TS - 20); c.vy *= -0.3; }
  c.slip = Math.abs(vl);
}
function nearest(c, full) {
  let best = 1e18, bi = c.idx;
  if (full) { for (let i = 0; i < NS; i++) { const d = sq(c.x - SX[i]) + sq(c.y - SY[i]); if (d < best) { best = d; bi = i; } } }
  else for (let o = -28; o <= 28; o++) { const i = (c.idx + o + NS) % NS; const d = sq(c.x - SX[i]) + sq(c.y - SY[i]); if (d < best) { best = d; bi = i; } }
  return { i: bi, d2: best };
}
function trackUpdate(c, laps) {
  let n = nearest(c, false);
  if (n.d2 > 220 * 220) n = nearest(c, true);
  const prev = c.idx; c.idx = n.i; c.f = c.idx / NS;
  const lat = (c.x - SX[c.idx]) * RNX(c.idx) + (c.y - SY[c.idx]) * RNY(c.idx);
  const d = Math.abs(lat);
  c.surf = d < TW / 2 ? 'road' : d < TW / 2 + 5 ? 'curb' : (GRAV[c.idx] && Math.sign(lat) === -Math.sign(KV[c.idx]) && d < TW / 2 + 44) ? 'gravel' : 'grass';
  if (!laps) return;
  const diff = c.idx - prev;
  if (diff < -NS / 2) { c.lap++; if (c.lap > c.maxLap) { c.maxLap = c.lap; onCross(c); } }
  else if (diff > NS / 2) c.lap--;
}
const progOf = c => c.lap + c.f;
function aiDrive(c, dt, ref) {
  const vf = speedF(c);
  c.laneT -= dt; if (c.laneT <= 0) { c.lane = (Math.random() - 0.5) * 0.5; c.laneT = 2 + Math.random() * 3; }
  const look = 8 + Math.floor(Math.max(0, vf) / 22), i = (c.idx + look) % NS;
  const tx = SX[i] + RNX(i) * c.lane * TW * 0.5, ty = SY[i] + RNY(i) * c.lane * TW * 0.5;
  const diff = wrapA(Math.atan2(ty - c.y, tx - c.x) - c.a);
  let km = 0; for (let k = 4; k < 44; k += 3) km = Math.max(km, Math.abs(KV[(c.idx + k) % NS]));
  let skill = 0.86;
  if (c.kind === 'ai' && ref) { const gap = progOf(ref) - progOf(c); skill = clamp(0.94 + gap * 0.3, 0.84, 1.07) * c.skill; }
  const target = c.stats.top * clamp(1.15 - km * 52, 0.42, 1) * skill;
  return { steer: clamp(diff * 3, -1, 1), thr: vf < target ? 1 : vf > target * 1.08 ? -0.6 : 0.15, turbo: c.turbo > 50 && km < 0.003 && vf > target * 0.8 };
}
function collide(list) {
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (a.kind === 'remote' && b.kind === 'remote') continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = 10;
    if (!(d > 0 && d < m)) continue;
    const nx = dx / d, ny = dy / d, push = m - d;
    const aFix = a.kind === 'remote', bFix = b.kind === 'remote';
    const wa = aFix ? 0 : bFix ? 1 : .5, wb = bFix ? 0 : aFix ? 1 : .5;
    a.x -= nx * push * wa; a.y -= ny * push * wa; b.x += nx * push * wb; b.y += ny * push * wb;
    const avx = aFix ? Math.cos(a.a) * a.vf : a.vx, avy = aFix ? Math.sin(a.a) * a.vf : a.vy;
    const bvx = bFix ? Math.cos(b.a) * b.vf : b.vx, bvy = bFix ? Math.sin(b.a) * b.vf : b.vy;
    const rel = (bvx - avx) * nx + (bvy - avy) * ny;
    if (rel < 0) { const imp = -rel * 0.75;
      if (!aFix) { a.vx -= nx * imp * wa * 2; a.vy -= ny * imp * wa * 2; }
      if (!bFix) { b.vx += nx * imp * wb * 2; b.vy += ny * imp * wb * 2; }
      if ((a === me || b === me) && imp > 30) { shake = 0.2; sfx('bump'); } }
  }
  for (const c of list) {
    if (c.kind === 'remote') continue;
    const gx = c.x / GC | 0, gy = c.y / GC | 0;
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const l = grid.get((gx + ox) + ',' + (gy + oy)); if (!l) continue;
      for (const o of l) { const dx = c.x - o.x, dy = c.y - o.y, d = Math.hypot(dx, dy), m = o.r + 4;
        if (d < m && d > 0) { c.x = o.x + dx / d * m; c.y = o.y + dy / d * m; const vn = c.vx * dx / d + c.vy * dy / d;
          if (vn < 0) { c.vx -= dx / d * vn * 1.4; c.vy -= dy / d * vn * 1.4; c.vx *= 0.55; c.vy *= 0.55;
            if (c === me && c.hitT <= 0) { shake = 0.3; sfx('crash'); c.hitT = 0.4; } } } }
    }
  }
}

/* =========================================================
   OYUN DURUMU
   ========================================================= */
// state: boot | menu | room | count | race | finish | results | paused
let state = 'boot', mode = null, prevState = 'race';
let cars = [], me = null, demo = null;
const spec = new Map();          // izlenen (izleyici modunda) uzak araçlar
let countT = 0, raceT = 0, finishT = 0, finishOrder = 0, graceEnd = 0, lastLight = -1, results = null;
let camA = 0, camX = 0, camY = 0, shake = 0, gT = 0, msg = '', msgT = 0, msgCol = '#ffd84a';
const particles = [], feed = [];
let myId = 0, room = null, board = { laps: [], races: [] }, sendT = 0;

function flash(t, col = '#ffd84a') { msg = t; msgT = 2.2; msgCol = col; }
function pushFeed(t, col = '#e6eef5') { feed.push({ t, col, life: 5 }); if (feed.length > 4) feed.shift(); }
function playerName() { return ($('name').value || '').trim().slice(0, 14); }

function resetPickups() { pickups.forEach(p => { p.on = true; p.t = 0; }); }
function startPractice() {
  initAudio(); mode = 'practice';
  const others = CARS.filter(c => c.key !== selCar);
  cars = others.map((def, i) => makeCar(def, i, 'ai'));
  me = makeCar(CARK[selCar], 3, 'me'); me.name = playerName() || 'SEN';
  cars.push(me);
  me.bestStored = store.get('hgp-best-' + selCar, 0);
  beginCount();
}
function beginCount() {
  resetPickups(); particles.length = 0; finishOrder = 0; raceT = 0; countT = 0; graceEnd = 0; msg = ''; msgT = 0; results = null; feed.length = 0;
  camA = me.a; state = 'count'; lastLight = -1; showScreen(null);
}
function enterOnlineRace(gridIds) {
  mode = 'online'; spec.clear();
  cars = []; me = null;
  gridIds.forEach((id, slot) => {
    const info = room && room.players.find(p => p.id === id); if (!info) return;
    const c = makeCar(CARK[info.car] || CARS[0], slot, id === myId ? 'me' : 'remote');
    c.id = id; c.name = info.name; cars.push(c); if (id === myId) me = c;
  });
  if (!me) return;
  me.bestStored = 0;
  beginCount();
}
let goAt = 0;
function goRace() { state = 'race'; raceT = 0; goAt = performance.now(); cars.forEach(c => c.lapStart = 0); sfx('go'); if (tilt.on) tiltCal(); }
function onCross(c) {
  if (c.finished) return;
  if (c.lap >= 1) {
    const lt = raceT - c.lapStart; c.laps.push(lt);
    if (!c.bestLap || lt < c.bestLap) c.bestLap = lt;
    if (c === me) {
      if (mode === 'online') send({ type: 'lap', n: c.lap, time: +lt.toFixed(3), total: +raceT.toFixed(3) });
      else if (!me.bestStored || lt < me.bestStored) { me.bestStored = lt; store.set('hgp-best-' + selCar, lt); flash('REKOR TUR!'); }
      flash('TUR ' + c.lap + '  ' + fmt2(lt), '#ffffff');
      sfx('lap');
    }
  }
  c.lapStart = raceT;
  if (c === me && c.lap === LAPS - 1) setTimeout(() => flash('SON TUR!'), 900);
  if (mode === 'practice' && c.lap >= LAPS && !c.finished) {
    c.finished = true; c.fin = ++finishOrder; c.total = raceT;
    if (c === me) { state = 'finish'; finishT = 0; sfx('go'); }
  }
}
function standings() {
  return [...cars].sort((a, b) => (b.finished - a.finished) || (a.finished ? a.total - b.total : progOf(b) - progOf(a)));
}

/* ---------------- uzak araçların yumuşatılması ---------------- */
const INTERP = 110;
function pushRemote(c, d, now) {
  // d: [x, y, a, vf, turbo, f, surf, lapLocal, serverLap, fin]
  c.buf.push({ t: now, x: d[0], y: d[1], a: d[2], v: d[3], tb: d[4], f: d[5], s: d[6], lap: d[7] });
  if (c.buf.length > 30) c.buf.shift();
  c.seen = now;
}
function updRemote(c, now) {
  const b = c.buf; if (!b.length) return;
  const rt = now - INTERP;
  while (b.length > 2 && b[1].t <= rt) b.shift();
  const s0 = b[0], s1 = b[1] || b[0];
  const t = s1.t > s0.t ? clamp((rt - s0.t) / (s1.t - s0.t), 0, 1.6) : 0;
  c.x = s0.x + (s1.x - s0.x) * t; c.y = s0.y + (s1.y - s0.y) * t; c.a = wrapA(s0.a + wrapA(s1.a - s0.a) * t);
  c.vf = s1.v; c.turboOn = !!s1.tb; c.f = s1.f; c.surf = SURFS[s1.s | 0] || 'road'; c.lap = s1.lap;
  c.idx = clamp(Math.round(c.f * NS), 0, NS - 1);
}

/* ---------------- ana güncelleme ---------------- */
function update(dt) {
  gT += dt;
  const now = performance.now();
  joyMenuNav();
  for (const f of feed) f.life -= dt; while (feed.length && feed[0].life <= 0) feed.shift();
  if (state === 'boot') return;
  if (state === 'menu' || state === 'room') { updateAttract(dt, now); updateEngine(); return; }
  if (state === 'paused') return;
  if (state === 'count') {
    countT += dt; const L = Math.min(5, Math.floor(countT / 0.62));
    if (L !== lastLight && countT < 3.3) { lastLight = L; if (L > 0) sfx('beep'); }
    if (mode === 'practice' && countT >= 3.3) goRace();
    if (mode === 'online' && countT > 8) goRace();      // 'go' mesajı kaybolursa
  }
  const racing = state === 'race' || state === 'finish' || state === 'results';
  for (const c of cars) {
    if (c.kind === 'remote') { updRemote(c, now); continue; }
    let inp = { steer: 0, thr: 0, turbo: false };
    if (racing) inp = (c.kind === 'ai' || c.finished || BOT) ? aiDrive(c, dt, me) : readInput();
    c.turboOn = !!inp.turbo && c.turbo > 0 && speedF(c) > 20;
    if (c.turboOn) { c.turbo = Math.max(0, c.turbo - 30 * dt); if (c === me && !me.wasTurbo) sfx('turbo'); }
    if (c === me) me.wasTurbo = c.turboOn;
    stepCar(c, inp, dt);
    trackUpdate(c, true);
    c.hitT -= dt;
    const sp = Math.abs(speedF(c));
    if ((c.slip > 38 && (c.surf === 'road' || c.surf === 'curb')) || (sp > 60 && (c.surf === 'grass' || c.surf === 'gravel'))) {
      const fx = Math.cos(c.a), fy = Math.sin(c.a), bx = c.x - fx * 6, by = c.y - fy * 6;
      if (Math.random() < 0.6) particles.push({ x: bx + (Math.random() - .5) * 6, y: by + (Math.random() - .5) * 6, life: 0.7, max: 0.7,
        col: c.surf === 'gravel' ? '#d8c690' : c.surf === 'grass' ? '#6b8f3a' : '#d9dde2' });
      if (c.surf === 'road' && c.slip > 38) for (const s of [-3, 3]) { const px = bx + -fy * s | 0, py = by + fx * s | 0; if (px > 0 && py > 0 && px < TS && py < TS) tex[py * TS + px] = SKID; }
    }
  }
  for (const c of cars) if (c.turboOn && Math.random() < 0.5) particles.push({ x: c.x - Math.cos(c.a) * 9, y: c.y - Math.sin(c.a) * 9, life: 0.3, max: 0.3, col: '#ffb03b' });
  collide(cars);
  for (const p of pickups) {
    if (!p.on) { p.t -= dt; if (p.t <= 0) p.on = true; continue; }
    for (const c of cars) if (sq(c.x - p.x) + sq(c.y - p.y) < 100) {
      p.on = false; p.t = 7;
      if (c.kind !== 'remote') { c.turbo = Math.min(100, c.turbo + 45); if (c === me) { sfx('pick'); flash('+H2 TURBO', '#3fd0f0'); } }
      break;
    }
  }
  stepParticles(dt);
  if (racing) raceT = mode === 'online' ? (now - goAt) / 1000 : raceT + dt;
  if (state === 'finish') { finishT += dt; if (mode === 'practice' && finishT > 2.5) { results = practiceResults(); state = 'results'; } }
  if (mode === 'online' && me && (state === 'count' || racing)) {
    sendT -= dt;
    if (sendT <= 0) { sendT = 0.05;
      send({ type: 's', d: [+me.x.toFixed(1), +me.y.toFixed(1), +me.a.toFixed(3), +speedF(me).toFixed(1), me.turboOn ? 1 : 0, +me.f.toFixed(4), SURFS.indexOf(me.surf), me.lap] }); }
  }
  shake = Math.max(0, shake - dt); msgT = Math.max(0, msgT - dt);
  followCam(me, dt);
  updateEngine();
}
function stepParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) { particles[i].life -= dt; if (particles[i].life <= 0) particles.splice(i, 1); }
  if (particles.length > 260) particles.splice(0, particles.length - 260);
}
function followCam(c, dt) {
  camA = wrapA(camA + wrapA(c.a - camA) * Math.min(1, dt * 5));
  camX = c.x - Math.cos(camA) * CAMD; camY = c.y - Math.sin(camA) * CAMD;
}
function updateAttract(dt, now) {
  // yarış sürüyorsa canlı izle, yoksa seçtiğin araba tek başına tur atsın
  let live = null;
  for (const [id, c] of spec) { if (now - c.seen > 3000) { spec.delete(id); continue; } updRemote(c, now); if (!live || progOf(c) > progOf(live)) live = c; }
  if (live) { followCam(live, dt); return; }
  if (!demo || demo.def.key !== selCar) { const keep = demo; demo = makeCar(CARK[selCar], 0, 'ai'); if (keep) Object.assign(demo, { x: keep.x, y: keep.y, a: keep.a, vx: keep.vx, vy: keep.vy, idx: keep.idx }); else camA = demo.a; }
  const inp = aiDrive(demo, dt, null); demo.turboOn = false;
  stepCar(demo, inp, dt); trackUpdate(demo, false); collide([demo]);
  stepParticles(dt);
  followCam(demo, dt);
}
function practiceResults() {
  return standings().map(c => ({ name: c === me ? (playerName() || 'SEN') : c.def.name, car: c.def.key, finished: c.finished, total: c.total, best: c.bestLap, me: c === me }));
}

/* =========================================================
   ÇİZİM
   ========================================================= */
let ground, g32, haze;
function drawGround() {
  const fx = Math.cos(camA), fy = Math.sin(camA), rx = -fy, ry = fx;
  for (let row = 1; row < H - HY; row++) {
    const dist = CAMH * F / row, sc = dist / F;
    let wx = camX + fx * dist - rx * sc * W / 2, wy = camY + fy * dist - ry * sc * W / 2;
    const dx = rx * sc, dy = ry * sc;
    let o = row * W;
    if (dist > 420) {
      let mx = wx / 4, my = wy / 4; const mdx = dx / 4, mdy = dy / 4;
      for (let x = 0; x < W; x++) { const tx = mx | 0, ty = my | 0; g32[o++] = (tx >= 0 && ty >= 0 && tx < MIPS && ty < MIPS) ? mip[ty * MIPS + tx] : OUTCOL; mx += mdx; my += mdy; }
    } else {
      for (let x = 0; x < W; x++) { const tx = wx | 0, ty = wy | 0; g32[o++] = (tx >= 0 && ty >= 0 && tx < TS && ty < TS) ? tex[ty * TS + tx] : OUTCOL; wx += dx; wy += dy; }
    }
  }
  for (let x = 0; x < W; x++) g32[x] = g32[W + x];
  ctx.putImageData(ground, 0, HY);
  ctx.fillStyle = haze; ctx.fillRect(0, HY, W, 46);
}
function proj(x, y) {
  const fx = Math.cos(camA), fy = Math.sin(camA);
  const dx = x - camX, dy = y - camY, depth = dx * fx + dy * fy;
  if (depth < 5) return null;
  const lat = dx * -fy + dy * fx, k = F / depth;
  return { sx: W / 2 + lat * k, gy: HY + CAMH * k, k, depth };
}
function drawWorld(list, target) {
  const off = ((camA / TAU * PW) % PW + PW) % PW;
  ctx.drawImage(pano, -Math.round(off), 0); ctx.drawImage(pano, PW - Math.round(off), 0);
  drawGround();
  const items = [];
  for (const o of objs) { const p = proj(o.x, o.y); if (!p || p.depth > 1500) continue; const w = o.ww * p.k; if (p.sx + w < -20 || p.sx - w > W + 20) continue; items.push({ p, o, t: 0 }); }
  for (const pk of pickups) if (pk.on) { const p = proj(pk.x, pk.y); if (p && p.depth < 700) items.push({ p, o: pk, t: 1 }); }
  for (const pa of particles) { const p = proj(pa.x, pa.y); if (p && p.depth < 500) items.push({ p, o: pa, t: 2 }); }
  for (const c of list) { if (c === target) continue; const p = proj(c.x, c.y); if (p && p.depth < 1200) items.push({ p, o: c, t: 3 }); }
  if (target) { const p = proj(target.x, target.y) || { depth: CAMD, sx: W / 2, gy: HY + CAMH * F / CAMD, k: F / CAMD }; items.push({ p, o: target, t: 4 }); }
  items.sort((a, b) => b.p.depth - a.p.depth);
  for (const it of items) {
    const { p, o } = it;
    if (it.t === 0) {
      const dw = o.ww * p.k, dh = dw * o.img.height / o.img.width;
      ctx.drawImage(o.img, Math.round(p.sx - dw / 2), Math.round(p.gy - dh), Math.max(1, Math.round(dw)), Math.max(1, Math.round(dh)));
    } else if (it.t === 1) {
      const dw = 6 * p.k, dh = dw * 10 / 8, bob = (Math.sin(gT * 4 + o.x) * 1.5 + 3) * p.k;
      ctx.fillStyle = 'rgba(63,208,240,.25)'; ctx.fillRect(Math.round(p.sx - dw * 0.8), Math.round(p.gy - dh - bob - dw * 0.3), Math.round(dw * 1.6), Math.round(dh + dw * 0.6));
      ctx.drawImage(imgH2, Math.round(p.sx - dw / 2), Math.round(p.gy - dh - bob), Math.max(1, Math.round(dw)), Math.max(1, Math.round(dh)));
    } else if (it.t === 2) {
      const a = o.life / o.max, s = clamp(Math.round((3 + (1 - a) * 5) * p.k * 0.6), 1, 9);
      ctx.globalAlpha = a * 0.8; ctx.fillStyle = o.col; ctx.fillRect(Math.round(p.sx - s / 2), Math.round(p.gy - s - (1 - a) * 4 * p.k), s, s); ctx.globalAlpha = 1;
    } else if (it.t === 3) {
      const los = Math.atan2(o.y - camY, o.x - camX);
      const k = ((Math.round(wrapA(o.a - los) / TAU * SN) % SN) + SN) % SN;
      const ds = p.k * VW / SS;
      { const rel = wrapA(o.a - los), sw = (3.4 + 4.6 * Math.abs(Math.sin(rel))) * p.k; ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(Math.round(p.sx - sw), Math.round(p.gy - p.k * 0.5), Math.round(sw * 2), Math.max(1, Math.round(p.k * 1))); }
      ctx.drawImage(o.def.sheet[k], Math.round(p.sx - SOX * ds), Math.round(p.gy - SOY * ds), Math.round(SW_ * ds), Math.round(SH_ * ds));
      if (o.turboOn) for (let i = 0; i < 3; i++) { ctx.fillStyle = i % 2 ? '#ffd84a' : '#ff7a1a'; ctx.fillRect(Math.round(p.sx - 2 + Math.random() * 4), Math.round(p.gy - 3 - Math.random() * 3), 2, 2); }
      if (p.depth < 240) { const tag = o.kind === 'ai' ? o.def.name : o.name; txt(tag, p.sx, p.gy - 22 * p.k * VW * 3 / 3 - 12, o.def.col, 8, 'center'); }
    } else {
      const s = p.k * VW, phi = wrapA(o.a - camA);
      const bounce = (o.surf === 'grass' || o.surf === 'gravel') && Math.abs(speedF(o)) > 30 ? Math.round(Math.random() * 2) : 0;
      { const sw = (3.6 + 4.6 * Math.abs(Math.sin(phi))) * p.k; ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(Math.round(p.sx - sw), Math.round(p.gy - 2), Math.round(sw * 2), 4); }
      M.renderCar(ctx, o.def.model, Math.PI / 2 - phi, s, p.sx, p.gy - bounce, PITCH);
      if (o.turboOn) for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#ffd84a' : '#ff7a1a'; ctx.fillRect(Math.round(p.sx - 7 + Math.random() * 14), Math.round(p.gy - 12 + Math.random() * 8), 3, 3); }
    }
  }
}
function panel(x, y, w, h) { ctx.fillStyle = 'rgba(6,18,30,.88)'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#2a94d8'; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2); }
function hud() {
  logoBadge(ctx, 4, 4);
  if (state === 'results') { drawResults(); return; }
  const st = standings(), pos = st.indexOf(me) + 1;
  txt(String(pos), 6, 24, '#ffffff', 16); txt('/' + cars.length, 24, 32, '#9ecbef', 8);
  txt('TUR ' + clamp(me.lap + 1, 1, LAPS) + '/' + LAPS, W / 2, 5, '#ffffff', 8, 'center');
  txt(fmt(state === 'count' ? 0 : raceT), W / 2, 16, '#ffd84a', 8, 'center');
  const kmh = Math.round(Math.abs(speedF(me)) * 0.22);
  txt(String(kmh), W - 46, 6, '#ffffff', 16, 'right'); txt('KM/H', W - 6, 14, '#9ecbef', 8, 'right');
  const rec = mode === 'online' ? (board.laps[0] && board.laps[0].time) : me.bestStored;
  txt('REKOR ' + (rec ? fmt(rec) : '--:--.-'), W - 6, 28, '#c3ccd4', 8, 'right');
  if (me.bestLap) txt('SENİN ' + fmt(me.bestLap), W - 6, 38, '#9ecbef', 8, 'right');
  const mob = coarse;   // telefonda alt köşeler dokunmatik tuşlara ayrılır
  const tbx = mob ? W / 2 - 50 : 6, tby = mob ? 30 : H - 27;
  if (!mob) txt('TURBO', tbx, tby, '#9ecbef');
  txt('H2', tbx, tby + 12 - (mob ? 1 : 0), '#3fd0f0'); ctx.fillStyle = '#000'; ctx.fillRect(tbx + 22, tby + 11, 72, 10); ctx.fillStyle = '#20313f'; ctx.fillRect(tbx + 23, tby + 12, 70, 8);
  ctx.fillStyle = me.turboOn ? (Math.floor(gT * 10) % 2 ? '#ffd84a' : '#ff7a1a') : '#3fd0f0'; ctx.fillRect(tbx + 23, tby + 12, Math.round(me.turbo * 0.7), 8);
  const mx = W - MM - 4, my = mob ? 48 : H - MM - 4; ctx.drawImage(minimap, mx, my);
  for (const c of cars) { const x = mx + (c.x - mmScale.x0) * mmScale.s, y = my + (c.y - mmScale.y0) * mmScale.s, s = c === me ? 3 : 2;
    ctx.fillStyle = '#000'; ctx.fillRect(Math.round(x) - s + 1 - 1, Math.round(y) - s + 1 - 1, s + 2, s + 2); ctx.fillStyle = c.def.col; ctx.fillRect(Math.round(x) - s + 1, Math.round(y) - s + 1, s, s); }
  st.forEach((c, i) => { const y = 50 + i * 10; ctx.fillStyle = c.def.col; ctx.fillRect(6, y + 1, 4, 6);
    const nm = (c.kind === 'ai' ? c.def.name : c.name).toLocaleUpperCase('tr').slice(0, 10);
    txt((i + 1) + ' ' + nm, 13, y, c === me ? '#ffd84a' : c.finished ? '#5fd16b' : '#e6eef5', 8); });
  feed.forEach((f, i) => { ctx.globalAlpha = Math.min(1, f.life); if (mob) txt(f.t, W / 2, 84 + i * 10, f.col, 8, 'center'); else txt(f.t, W - 6, 52 + i * 10, f.col, 8, 'right'); ctx.globalAlpha = 1; });
  const dot = Math.cos(me.a) * TX[me.idx] + Math.sin(me.a) * TY[me.idx];
  if (state === 'race' && dot < -0.35 && Math.abs(speedF(me)) > 15 && Math.floor(gT * 3) % 2) txt('TERS YÖN!', W / 2, 60, '#ff6a5e', 16, 'center');
  if (msgT > 0) txt(msg, W / 2, 40, msgCol, 8, 'center');
  if (graceEnd && state === 'race') { const left = Math.max(0, Math.ceil((graceEnd - performance.now()) / 1000)); txt('BİTİŞE ' + left + ' SN', W / 2, mob ? 54 : 28, '#ff6a5e', 8, 'center'); }
  if (state === 'count' || (state === 'race' && raceT < 1)) lights();
  if (state === 'paused') { panel(92, 80, 200, 50); txt('DURAKLATILDI', W / 2, 92, '#ffffff', 8, 'center'); txt('Esc: devam', W / 2, 110, '#9ecbef', 8, 'center'); }
  if (state === 'finish') { txt('FİNİŞ!', W / 2, 70, '#ffd84a', 16, 'center'); if (mode === 'online') txt('Diğerleri bekleniyor…', W / 2, 92, '#c3ccd4', 8, 'center'); }
}
function lights() {
  const L = state === 'count' ? Math.min(5, Math.floor(countT / 0.62)) : 0, go = state === 'race';
  const x0 = W / 2 - 50; ctx.fillStyle = '#0b0b0b'; ctx.fillRect(x0 - 4, 30, 108, 22);
  for (let i = 0; i < 5; i++) { ctx.fillStyle = go ? '#5fd16b' : i < L ? '#ff3b30' : '#3a1010'; ctx.fillRect(x0 + i * 21, 34, 15, 14); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x0 + i * 21 + 2, 36, 4, 3); }
  if (go) txt('BAŞLA!', W / 2, 58, '#5fd16b', 16, 'center');
}
function drawResults() {
  const rows = results || [];
  const h = 64 + rows.length * 14; const y0 = Math.max(4, (H - h) / 2 | 0);
  panel(40, y0, 304, h);
  txt('YARIŞ SONUCU', W / 2, y0 + 10, '#ffd84a', 16, 'center');
  rows.forEach((r, i) => {
    const y = y0 + 34 + i * 14, c = CARK[r.car] || CARS[0], mine = r.me || r.id === myId;
    ctx.fillStyle = c.col; ctx.fillRect(52, y, 6, 8);
    txt((i + 1) + '. ' + String(r.name).toLocaleUpperCase('tr').slice(0, 12), 63, y, mine ? '#ffd84a' : '#ffffff', 8);
    txt(r.best ? fmt(r.best) : '', 262, y, '#8fa8bd', 8, 'right');
    txt(r.finished ? fmt(r.total) : 'BİTİREMEDİ', 334, y, r.finished ? '#c3ccd4' : '#ff6a5e', 8, 'right');
  });
  const msgTxt = mode === 'online' ? 'Lobiye dönülüyor…' : 'ENTER / BUTON: MENÜ';
  if (Math.floor(gT * 2) % 2) txt(msgTxt, W / 2, y0 + h - 16, '#9ecbef', 8, 'center');
}
function drawAttractHUD() {
  logoBadge(ctx, 4, 4);
  if (spec.size) { ctx.fillStyle = '#d22f2a'; ctx.fillRect(4, 22, 60, 12); txt('CANLI', 34, 24, '#ffffff', 8, 'center', false); }
}
function render() {
  if (state === 'boot') { ctx.fillStyle = '#0a1f33'; ctx.fillRect(0, 0, W, H); txt('YÜKLENİYOR…', W / 2, H / 2 - 4, '#e6eef5', 8, 'center'); return; }
  ctx.save();
  if (shake > 0 && !reduced) ctx.translate(Math.round((Math.random() - .5) * 4), Math.round((Math.random() - .5) * 3));
  if (state === 'menu' || state === 'room') {
    const list = spec.size ? [...spec.values()] : [demo];
    let target = demo; if (spec.size) target = list.reduce((a, b) => progOf(b) > progOf(a) ? b : a);
    drawWorld(list, target); ctx.restore(); drawAttractHUD(); return;
  }
  drawWorld(cars, me);
  ctx.restore();
  hud();
}

/* =========================================================
   LOBİ ARAYÜZÜ
   ========================================================= */
const pickers = [];
function buildPicker(el) {
  const btns = CARS.map(c => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'carbtn'; b.dataset.car = c.key;
    const cc = document.createElement('canvas'); cc.width = 96; cc.height = 48;
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = c.name; nm.style.color = '';
    const tr = document.createElement('span'); tr.className = 'tr'; tr.textContent = c.trait + (c.num ? ' · #' + c.num : '');
    b.append(cc, nm, tr);
    b.addEventListener('click', () => chooseCar(c.key));
    el.appendChild(b);
    return { b, cc, g: cc.getContext('2d'), key: c.key, yaw: -Math.PI / 2 + .7 };
  });
  pickers.push(...btns);
}
function chooseCar(key) {
  if (!CARK[key]) return;
  selCar = key; store.set('hgp-car', key); sfx('beep');
  if (room && state === 'room') send({ type: 'car', car: key });
  syncPickers();
}
function syncPickers() { for (const p of pickers) { p.b.setAttribute('aria-pressed', String(p.key === selCar)); drawPreview(p, true); } }
function drawPreview(p, force) {
  const on = p.key === selCar;
  if (!on && !force) return;
  if (on) p.yaw += 0.025;
  const g = p.g; g.imageSmoothingEnabled = false; g.clearRect(0, 0, 96, 48);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(18, 38, 60, 4);
  M.renderCar(g, CARK[p.key].model, on ? p.yaw : -Math.PI / 2 + .7, 1.35, 48, 38, .5);
}
function showScreen(which) {
  $('scrEntry').hidden = which !== 'entry';
  $('scrRoom').hidden = which !== 'room';
  $('overlay').hidden = !which;
}
function renderRoom() {
  if (!room) return;
  $('roomCode').textContent = room.code;
  const ul = $('plist'); ul.textContent = '';
  for (const p of room.players) {
    const li = document.createElement('li');
    const sw = document.createElement('span'); sw.className = 'sw'; sw.style.background = (CARK[p.car] || CARS[0]).col;
    const pn = document.createElement('span'); pn.className = 'pn'; pn.textContent = p.name + ' · ' + (CARK[p.car] || CARS[0]).name;
    li.append(sw, pn);
    if (p.id === room.host) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = 'SAHİP'; li.append(t); }
    if (p.id === myId) { const t = document.createElement('span'); t.className = 'tag you'; t.textContent = 'SEN'; li.append(t); }
    ul.append(li);
  }
  $('pcount').textContent = '(' + room.players.length + '/8)';
  const host = room.players.find(p => p.id === room.host), isHost = room.host === myId;
  const live = room.phase !== 'lobby';
  $('btnStart').hidden = !isHost; $('btnStart').disabled = live;
  $('roomNote').textContent = live ? (room.phase === 'results' ? 'Sonuçlar gösteriliyor, birazdan lobiye dönülecek.' : 'Yarış sürüyor, canlı izliyorsun. Bir sonraki yarışa katılacaksın.')
    : isHost ? (room.players.length < 2 ? 'Tek başına da başlatabilirsin; arkadaşların sonraki yarışa katılır.' : 'Herkes hazırsa başlat.') : 'Oda sahibinin (' + (host ? host.name : '…') + ') başlatması bekleniyor.';
}
let lbTab = 'laps';
function renderBoard() {
  const list = (board[lbTab] || []).slice(0, 10), tb = $('lb').tBodies[0]; tb.textContent = '';
  const mine = playerName().toLocaleLowerCase('tr');
  list.forEach((r, i) => {
    const tr = document.createElement('tr'); if (i < 3) tr.className = 'top' + (i + 1); if (mine && r.name.toLocaleLowerCase('tr') === mine) tr.classList.add('me');
    const c = CARK[r.car] || CARS[0];
    const td = (t, cls) => { const d = document.createElement('td'); if (cls) d.className = cls; d.textContent = t; return d; };
    const carTd = td(''); const sw = document.createElement('span'); sw.className = 'sw'; sw.style.background = c.col; carTd.append(sw, document.createTextNode(c.name));
    tr.append(td(String(i + 1), 'r'), td(r.name), carTd, td(fmt2(r.time), 't'));
    tb.append(tr);
  });
  $('lbEmpty').hidden = list.length > 0;
}
$('tabLap').onclick = () => { lbTab = 'laps'; $('tabLap').setAttribute('aria-selected', 'true'); $('tabRace').setAttribute('aria-selected', 'false'); renderBoard(); };
$('tabRace').onclick = () => { lbTab = 'races'; $('tabRace').setAttribute('aria-selected', 'true'); $('tabLap').setAttribute('aria-selected', 'false'); renderBoard(); };

function needName(errEl) {
  const n = playerName();
  if (!n) { errEl.textContent = 'Önce pilot adını yaz.'; $('name').focus(); return null; }
  store.set('hgp-name', n); return n;
}
function needNet(errEl) {
  if (!net.ok) { errEl.textContent = location.protocol === 'file:' ? 'Dosya olarak açtın, online oynamak için sunucu adresinden gir. Antrenman çalışır.' : 'Sunucuya bağlı değilsin. Birkaç saniye bekle ya da antrenman yap.'; return false; }
  return true;
}
$('btnQuick').onclick = () => { initAudio(); const e = $('entryErr'); e.textContent = ''; const n = needName(e); if (!n || !needNet(e)) return; send({ type: 'quick', name: n, car: selCar }); };
$('btnCreate').onclick = () => { initAudio(); const e = $('entryErr'); e.textContent = ''; const n = needName(e); if (!n || !needNet(e)) return; send({ type: 'create', name: n, car: selCar }); };
$('btnJoin').onclick = () => { initAudio(); const e = $('entryErr'); e.textContent = ''; const n = needName(e); if (!n || !needNet(e)) return;
  const code = $('code').value.trim().toUpperCase(); if (code.length !== 4) { e.textContent = 'Oda kodu 4 harf olmalı.'; $('code').focus(); return; }
  send({ type: 'join', code, name: n, car: selCar }); };
$('btnPractice').onclick = () => { if (state === 'boot') return; store.set('hgp-name', playerName()); startPractice(); };
$('btnStart').onclick = () => { initAudio(); send({ type: 'start' }); };
$('btnLeave').onclick = () => { send({ type: 'leave' }); };
$('btnCopyLink').onclick = async () => {
  const link = location.origin + location.pathname + '?oda=' + (room ? room.code : ''), b = $('btnCopyLink');
  try { await navigator.clipboard.writeText(link); b.textContent = 'KOPYALANDI'; } catch (e) { $('shareNote').textContent = link; b.textContent = 'LİNK AŞAĞIDA'; }
  setTimeout(() => b.textContent = 'LİNKİ KOPYALA', 1600);
};
$('name').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('btnQuick').click(); } });
$('name').addEventListener('input', () => { $('entryErr').textContent = ''; renderBoard(); });
$('code').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('btnJoin').click(); } });
$('code').addEventListener('input', () => { $('code').value = $('code').value.toUpperCase().replace(/[^A-ZÇĞİÖŞÜ]/g, '').slice(0, 4); });

/* =========================================================
   AĞ
   ========================================================= */
const net = { ws: null, ok: false, retry: 0, wakeTimer: 0 };
function setNet(s, t) { $('netStatus').dataset.s = s; $('netText').textContent = t; }
function send(o) { if (net.ok && net.ws && net.ws.readyState === 1) net.ws.send(JSON.stringify(o)); }
function connect() {
  if (location.protocol === 'file:') { setNet('bad', 'Çevrimdışı: dosya olarak açıldı. Antrenman çalışır.'); return; }
  setNet('wait', 'Sunucuya bağlanılıyor…');
  clearTimeout(net.wakeTimer);
  net.wakeTimer = setTimeout(() => { if (!net.ok) setNet('wait', 'Sunucu uyanıyor olabilir, ilk açılışta 1 dakikaya kadar sürebilir…'); }, 5000);
  let ws;
  try { ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'); } catch (e) { setNet('bad', 'Bağlantı kurulamadı.'); return; }
  net.ws = ws;
  ws.onopen = () => { net.ok = true; net.retry = 0; clearTimeout(net.wakeTimer); setNet('ok', 'Sunucuya bağlı.'); send({ type: 'hello', name: playerName(), car: selCar }); };
  ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (_) { return; } onMsg(m); };
  ws.onclose = () => {
    const wasOnline = net.ok; net.ok = false; room = null; myId = 0; spec.clear();
    if (mode === 'online' && state !== 'menu') { mode = null; cars = []; me = null; state = 'menu'; showScreen('entry'); $('entryErr').textContent = 'Sunucu bağlantısı koptu. Yeniden bağlanınca tekrar katılabilirsin.'; }
    else if (state === 'room') { state = 'menu'; showScreen('entry'); }
    setNet('bad', wasOnline ? 'Bağlantı koptu, yeniden deneniyor…' : 'Sunucuya ulaşılamadı, yeniden deneniyor…');
    setTimeout(connect, Math.min(8000, 1000 * Math.pow(2, net.retry++)));
  };
}
const nameOf = id => { const c = cars.find(c => c.id === id); if (c) return c.name; const p = room && room.players.find(p => p.id === id); return p ? p.name : '?'; };
function onMsg(m) {
  const now = performance.now();
  switch (m.type) {
    case 'welcome': myId = m.id; if (m.board) { board = m.board; renderBoard(); }
      if (params.get('oda') && !room) $('code').value = params.get('oda').toUpperCase().slice(0, 4);
      break;
    case 'joined': mode = 'online'; state = 'room'; showScreen('room'); $('roomErr').textContent = '';
      try { history.replaceState(null, '', location.pathname + '?oda=' + m.code); } catch (e) {}
      break;
    case 'room': room = m; renderRoom();
      if (m.phase === 'lobby' && (state === 'results' || state === 'finish' || state === 'race' || state === 'count')) { cars = []; me = null; graceEnd = 0; state = 'room'; showScreen('room'); }
      break;
    case 'leftRoom': room = null; mode = null; spec.clear(); state = 'menu'; showScreen('entry'); try { history.replaceState(null, '', location.pathname); } catch (e) {} break;
    case 'error': ($('scrRoom').hidden ? $('entryErr') : $('roomErr')).textContent = m.msg; break;
    case 'count': if (m.grid.includes(myId)) enterOnlineRace(m.grid); break;
    case 'go': if (mode === 'online' && state === 'count') goRace(); break;
    case 'S':
      for (const d of m.p) {
        const id = d[0]; if (id === myId) continue;
        const rest = d.slice(1);
        if (state === 'count' || state === 'race' || state === 'finish' || state === 'results') {
          const c = cars.find(c => c.id === id); if (c) { pushRemote(c, rest, now); c.finished = !!rest[9] || c.finished; }
        } else if (state === 'menu' || state === 'room') {
          let c = spec.get(id);
          if (!c) { const info = room && room.players.find(p => p.id === id); c = makeCar(CARK[info ? info.car : 'turaz'] || CARS[0], 0, 'remote'); c.id = id; c.name = info ? info.name : '?'; spec.set(id, c); }
          pushRemote(c, rest, now);
        }
      }
      break;
    case 'lap':
      if (m.id !== myId && state !== 'menu' && state !== 'room') pushFeed(nameOf(m.id).toLocaleUpperCase('tr').slice(0, 10) + ' TUR ' + m.n, '#9ecbef');
      break;
    case 'lapRejected':
      if (me && !me.finished) { me.lap = me.maxLap = m.n - 1; me.laps.pop(); flash('TUR SAYILMADI: PİST KESİLDİ', '#ff6a5e'); }
      break;
    case 'finish': {
      const c = cars.find(c => c.id === m.id);
      if (c) { c.finished = true; c.total = m.total; c.fin = ++finishOrder; }
      if (m.id === myId && me) { state = 'finish'; finishT = 0; sfx('go'); }
      else if (c) pushFeed(c.name.toLocaleUpperCase('tr').slice(0, 10) + ' BİTİRDİ', '#5fd16b');
      break;
    }
    case 'grace': graceEnd = now + m.ms; break;
    case 'results':
      if (mode === 'online' && me) { results = m.rows; state = 'results'; graceEnd = 0; }
      break;
    case 'board': board = m.board; renderBoard(); break;
    case 'left': { const i = cars.findIndex(c => c.id === m.id); if (i >= 0 && cars[i] !== me) { pushFeed(cars[i].name.toLocaleUpperCase('tr').slice(0, 10) + ' AYRILDI', '#ff6a5e'); cars.splice(i, 1); } spec.delete(m.id); break; }
  }
}

/* =========================================================
   GİRDİ
   ========================================================= */
const BOT = params.has('bot');
const keys = {};
let lastInput = { steer: 0, thr: 0, turbo: false };
function confirmAction() {
  initAudio();
  if (state === 'room' && room && room.host === myId && room.phase === 'lobby') send({ type: 'start' });
  else if (state === 'results' && mode === 'practice') { mode = null; cars = []; me = null; state = 'menu'; showScreen('entry'); }
  else if (state === 'paused') state = prevState;
}
function togglePause() {
  if (mode !== 'practice') { if (state === 'race') flash('ONLINE YARIŞTA DURAKLATMA YOK', '#ff6a5e'); return; }
  if (state === 'race' || state === 'count' || state === 'finish') { prevState = state; state = 'paused'; } else if (state === 'paused') state = prevState;
}
addEventListener('keydown', e => {
  if (drawerOpen()) { if (e.key === 'Escape') closeDrawers(); return; }
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
  const k = e.key.toLowerCase();
  const inGame = state === 'race' || state === 'count' || state === 'finish' || state === 'paused';
  if (inGame && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (tag === 'button' && (k === 'enter' || k === ' ')) return;
  if (!e.repeat) {
    if (k === 'enter') confirmAction();
    if (k === 'escape' || k === 'p') togglePause();
    if ((state === 'menu' || state === 'room') && (k === 'arrowleft' || k === 'arrowright')) {
      const i = CARS.findIndex(c => c.key === selCar); chooseCar(CARS[(i + (k === 'arrowright' ? 1 : 3)) % 4].key);
    }
  }
  keys[k] = true;
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
cv.addEventListener('pointerdown', () => { initAudio(); if (state === 'results' || state === 'paused') confirmAction(); });
// dokunmatik tuşlar
for (const b of document.querySelectorAll('#touch button')) {
  const k = b.dataset.k;
  const on = e => { e.preventDefault(); keys[k] = true; b.classList.add('on'); initAudio(); };
  const off = e => { e.preventDefault(); keys[k] = false; b.classList.remove('on'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
}
const clamp1 = v => clamp(v, -1, 1);
function readInput() {
  const kS = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0);
  const kT = (keys.arrowup || keys.w ? 1 : 0) - (keys.arrowdown || keys.s ? 1 : 0);
  const tS = (coarse && ctlMode === 'tilt' && tilt.on) ? tilt.steer : 0;
  lastInput = { steer: clamp1(kS + tS + (joy.ok ? joy.x : 0)), thr: clamp1(kT + (joy.ok ? joy.y : 0)), turbo: !!(keys[' '] || keys.shift || (joy.ok && joy.b)) };
  return lastInput;
}
let navLatch = false;
function joyMenuNav() {
  if (!joy.ok || (state !== 'menu' && state !== 'room')) { navLatch = false; return; }
  if (!navLatch && Math.abs(joy.x) > 0.6) { const i = CARS.findIndex(c => c.key === selCar); chooseCar(CARS[(i + (joy.x > 0 ? 1 : 3)) % 4].key); navLatch = true; }
  if (Math.abs(joy.x) < 0.3) navLatch = false;
}

/* =========================================================
   WEB SERIAL (Arduino joystick)
   ========================================================= */
const joy = { x: 0, y: 0, b: 0, rawX: null, rawY: null, ok: false };
const cal = { cx: 512, cy: 512 };
let calib = { n: 0, sx: 0, sy: 0, active: false };
let port = null, reader = null, pipeDone = null, lines = 0, rate = 0;
const invX = $('invX'), invY = $('invY');
invX.checked = store.get('h36-invX', false); invY.checked = store.get('h36-invY', false);
invX.onchange = () => store.set('h36-invX', invX.checked); invY.onchange = () => store.set('h36-invY', invY.checked);
function setStatus(s, text) { $('status').dataset.s = s; $('statusText').textContent = text; }
const DZ = 0.12;
function norm(v, c) { const d = v - c, r = d >= 0 ? 1023 - c : c; const n = r ? d / r : 0, a = Math.abs(n); if (a < DZ) return 0; return clamp1(Math.sign(n) * (a - DZ) / (1 - DZ)); }
function handleLine(line) {
  const nums = line.match(/-?\d+/g); if (!nums || nums.length < 2) return;
  const x = +nums[0], y = +nums[1], b = nums.length > 2 ? (+nums[2] ? 1 : 0) : 0;
  lines++; joy.rawX = x; joy.rawY = y;
  if (calib.active) { calib.sx += x; calib.sy += y; calib.n++; if (calib.n >= 15) { cal.cx = calib.sx / calib.n; cal.cy = calib.sy / calib.n; calib.active = false; joy.ok = true; setStatus('ok', 'Bağlı. Joystick merkezi ayarlandı, oynamaya hazır.'); } return; }
  joy.x = norm(x, cal.cx) * (invX.checked ? -1 : 1); joy.y = -norm(y, cal.cy) * (invY.checked ? -1 : 1);
  if (b && !joy.b && state !== 'race' && state !== 'finish') confirmAction();
  joy.b = b;
}
function startCalib() { calib = { n: 0, sx: 0, sy: 0, active: true }; }
async function connectSerial() {
  initAudio();
  if (port) { await disconnectSerial(); return; }
  if (!('serial' in navigator)) { setStatus('bad', window.isSecureContext ? 'Bu tarayıcı Web Serial desteklemiyor. Chrome veya Edge kullan.' : 'Web Serial sadece https adreste ya da localhost\'ta çalışır.'); return; }
  let p;
  try { p = await navigator.serial.requestPort(); }
  catch (e) { if (e && e.name === 'NotFoundError') setStatus('idle', 'Port seçilmedi. Listede Arduino Nano (CH340 / USB Serial) olan portu seç.'); else setStatus('bad', 'Seri port izni verilmedi.'); return; }
  try { await p.open({ baudRate: +$('baud').value }); }
  catch (e) { setStatus('bad', 'Port açılamadı. Arduino IDE Seri Port Ekranı açıksa kapat ve tekrar dene.'); return; }
  port = p; $('connectBtn').textContent = 'BAĞLANTIYI KES'; setStatus('wait', 'Bağlandı. Joystick’e dokunma, merkez ölçülüyor…'); startCalib(); readLoop();
}
async function readLoop() {
  const dec = new TextDecoderStream(); pipeDone = port.readable.pipeTo(dec.writable).catch(() => {}); reader = dec.readable.getReader(); let buf = '';
  try { while (true) { const { value, done } = await reader.read(); if (done) break; buf += value; let i; while ((i = buf.indexOf('\n')) >= 0) { handleLine(buf.slice(0, i)); buf = buf.slice(i + 1); } if (buf.length > 256) buf = ''; } } catch (e) { }
  try { reader.releaseLock(); } catch (e) { }
  if (port) { await closePort(); setStatus('bad', 'Bağlantı koptu. Kabloyu kontrol edip tekrar bağlan.'); }
}
async function closePort() { const p = port; port = null; joy.ok = false; joy.x = joy.y = 0; try { await pipeDone; } catch (e) { } try { await p.close(); } catch (e) { } $('connectBtn').textContent = "ARDUINO'YU BAĞLA"; }
async function disconnectSerial() { const r = reader, p = port; port = null; try { await r.cancel(); } catch (e) { } port = p; await closePort(); setStatus('idle', 'Bağlantı kesildi.'); }
$('connectBtn').onclick = connectSerial;
$('calBtn').onclick = () => { if (!port) { setStatus('idle', 'Önce Arduino’yu bağla.'); return; } setStatus('wait', 'Merkez ölçülüyor, joystick’i bırak…'); startCalib(); };
setInterval(() => { rate = lines; lines = 0; }, 1000);
const jv = $('joyviz').getContext('2d');
function drawJoy() {
  jv.fillStyle = '#0a1f33'; jv.fillRect(0, 0, 48, 48); jv.fillStyle = '#1f4466'; jv.fillRect(23, 4, 2, 40); jv.fillRect(4, 23, 40, 2);
  jv.strokeStyle = '#1f4466'; jv.strokeRect(4.5, 4.5, 39, 39);
  const sx = joy.ok ? joy.x : lastInput.steer, sy = joy.ok ? joy.y : lastInput.thr;
  const x = Math.round(24 + sx * 18), y = Math.round(24 - sy * 18); jv.fillStyle = joy.b ? '#ffb03b' : '#2b9be0'; jv.fillRect(x - 3, y - 3, 6, 6);
  $('rx').textContent = joy.rawX ?? '—'; $('ry').textContent = joy.rawY ?? '—'; $('rb').textContent = joy.rawX === null ? '—' : (joy.b ? 'BASILI' : 'serbest'); $('rate').textContent = rate + '/sn';
}

/* =========================================================
   SES
   ========================================================= */
let ac = null, eng = null, eng2 = null, engGain = null, muted = store.get('hgp-mute', false);
function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    engGain = ac.createGain(); engGain.gain.value = 0; engGain.connect(ac.destination);
    eng = ac.createOscillator(); eng.type = 'square'; eng.frequency.value = 50; eng.connect(engGain); eng.start();
    eng2 = ac.createOscillator(); eng2.type = 'triangle'; eng2.frequency.value = 100; eng2.connect(engGain); eng2.start();
  } catch (e) { ac = null; }
}
function sfx(type) {
  if (!ac || muted) return;
  const t = ac.currentTime;
  if (type === 'turbo' || type === 'crash' || type === 'bump') {
    const len = type === 'turbo' ? 0.5 : 0.25, buf = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    f.type = type === 'turbo' ? 'bandpass' : 'lowpass'; f.frequency.value = type === 'turbo' ? 1200 : 500;
    g.gain.value = type === 'bump' ? 0.05 : 0.09; src.buffer = buf; src.connect(f).connect(g).connect(ac.destination); src.start(t); return;
  }
  const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; let dur = 0.18;
  if (type === 'pick') { o.frequency.setValueAtTime(660, t); o.frequency.setValueAtTime(990, t + 0.06); }
  else if (type === 'beep') o.frequency.setValueAtTime(440, t);
  else if (type === 'go') { o.frequency.setValueAtTime(880, t); dur = 0.4; }
  else if (type === 'lap') { o.frequency.setValueAtTime(523, t); o.frequency.setValueAtTime(659, t + 0.08); o.frequency.setValueAtTime(784, t + 0.16); dur = 0.3; }
  g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
}
function updateEngine() {
  if (!ac) return;
  const c = (state === 'menu' || state === 'room') ? null : me;
  const on = !muted && c && state !== 'paused' && state !== 'results';
  const r = c ? Math.abs(speedF(c)) / c.stats.top : 0;
  engGain.gain.setTargetAtTime(on ? 0.018 + (c.turboOn ? 0.01 : 0) : 0, ac.currentTime, 0.05);
  eng.frequency.setTargetAtTime(46 + r * 120 + (c && c.turboOn ? 30 : 0), ac.currentTime, 0.05);
  eng2.frequency.setTargetAtTime(92 + r * 240, ac.currentTime, 0.05);
}
const muteSync = () => { $('muteBtn').setAttribute('aria-pressed', String(muted)); $('muteBtn').title = muted ? 'Ses kapalı' : 'Ses açık'; $('muteBtn').style.opacity = muted ? .5 : 1; };
muteSync();
$('muteBtn').onclick = () => { initAudio(); muted = !muted; store.set('hgp-mute', muted); muteSync(); if (muted && engGain) engGain.gain.value = 0; };

/* =========================================================
   TAM EKRAN, YATAY KİLİT, ÇEKMECELER, TELEFON KONTROLLERİ
   ========================================================= */
const docEl = document.documentElement;
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
const canFS = !!(docEl.requestFullscreen || docEl.webkitRequestFullscreen);
let fsUserExited = false, fsWanted = false;
function enterFS() {
  if (!canFS || fsEl()) return;
  fsWanted = true;
  try {
    const r = docEl.requestFullscreen ? docEl.requestFullscreen({ navigationUI: 'hide' }) : docEl.webkitRequestFullscreen();
    if (r && r.then) r.then(lockLandscape).catch(() => {}); else lockLandscape();
  } catch (e) { }
}
function exitFS() { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { } }
function lockLandscape() { try { if (coarse && screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) { } }
const onFsChange = () => { if (!fsEl() && fsWanted) fsUserExited = true; $('fsBtn').setAttribute('aria-pressed', String(!!fsEl())); };
document.addEventListener('fullscreenchange', onFsChange); document.addEventListener('webkitfullscreenchange', onFsChange);
$('fsBtn').onclick = () => { if (fsEl()) { exitFS(); } else { fsUserExited = false; enterFS(); } };
if (!canFS) $('fsBtn').hidden = true;
// ilk dokunuşta/tıkta otomatik tam ekran (tarayıcılar kullanıcı hareketi olmadan izin vermez)
function firstGesture(e) {
  if (e && e.target && e.target.closest && e.target.closest('#fsBtn')) return;
  if (!fsUserExited) enterFS();
  if (ctlMode === 'tilt' && !tilt.on) enableTilt().then(ok => { if (!ok) setCtl('buttons'); });
}
addEventListener('pointerdown', firstGesture, true);
addEventListener('keydown', e => { if (e.key !== 'Escape' && e.key !== 'F11') firstGesture(e); }, true);

// çekmeceler
const drawers = { board: $('drawerBoard'), set: $('drawerSet') };
const openDrawer = k => { for (const d of Object.values(drawers)) d.hidden = true; drawers[k].hidden = false; const b = drawers[k].querySelector('[data-close]'); if (b) b.focus(); };
const closeDrawers = () => { for (const d of Object.values(drawers)) d.hidden = true; };
const drawerOpen = () => Object.values(drawers).some(d => !d.hidden);
$('boardBtn').onclick = () => openDrawer('board');
$('setBtn').onclick = () => openDrawer('set');
for (const d of Object.values(drawers)) {
  d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) closeDrawers(); });
}

// telefon: tuşlar ya da eğerek sürüş
let ctlMode = store.get('hgp-ctl', 'buttons');
const tilt = { on: false, ang: 0, a0: null, steer: 0 };
const tiltInv = $('tiltInv'); tiltInv.checked = store.get('hgp-tiltinv', false);
tiltInv.onchange = () => store.set('hgp-tiltinv', tiltInv.checked);
function onMotion(e) {
  const g = e.accelerationIncludingGravity; if (!g || g.x == null) return;
  const ang = Math.atan2(g.x, g.y);
  tilt.ang = ang; if (tilt.a0 === null) tilt.a0 = ang;
  let d = wrapA(ang - tilt.a0); if (Math.abs(d) < 0.05) d = 0;
  tilt.steer = clamp(d / 0.42, -1, 1) * (tiltInv.checked ? -1 : 1);
}
async function enableTilt() {
  if (tilt.on) return true;
  try {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      const r = await DeviceMotionEvent.requestPermission(); if (r !== 'granted') throw new Error('izin yok');
    }
    addEventListener('devicemotion', onMotion); tilt.on = true; tilt.a0 = null; return true;
  } catch (e) { $('tiltNote').textContent = 'Eğim sensörüne izin verilmedi. Tuşlarla oynayabilirsin.'; return false; }
}
const tiltCal = () => { tilt.a0 = tilt.ang; tilt.steer = 0; };
function ctlUI(m) {
  $('ctlBtns').setAttribute('aria-pressed', String(m === 'buttons')); $('ctlTilt').setAttribute('aria-pressed', String(m === 'tilt'));
  $('tSteer').hidden = m === 'tilt'; $('tTilt').hidden = m !== 'tilt';
}
async function setCtl(m) {
  if (m === 'tilt' && !(await enableTilt())) m = 'buttons';
  ctlMode = m; store.set('hgp-ctl', m); ctlUI(m);
  if (m === 'tilt') tiltCal();
}
$('ctlBtns').onclick = () => setCtl('buttons');
$('ctlTilt').onclick = () => setCtl('tilt');
$('tCal').addEventListener('pointerdown', e => { e.preventDefault(); tiltCal(); });
ctlUI(ctlMode);

// her karede arayüz görünürlüğü
const raceUI = () => state === 'race' || state === 'count' || state === 'finish' || state === 'paused';
function uiTick() {
  const portrait = innerHeight > innerWidth;
  $('touch').hidden = !(coarse && raceUI());
  $('rotate').hidden = !(coarse && portrait && raceUI());
  $('tools').hidden = !(state === 'menu' || state === 'room' || state === 'boot' || state === 'results' || state === 'paused');
}

/* =========================================================
   BAŞLAT
   ========================================================= */
let last = performance.now();
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  update(dt); render(); drawJoy();
  if (state === 'menu' || state === 'room') for (const p of pickers) drawPreview(p, false);
  uiTick();
  requestAnimationFrame(frame);
}
async function init() {
  $('name').value = store.get('hgp-name', '') || params.get('name') || '';
  showScreen(null);
  requestAnimationFrame(frame);
  const [em, wd] = await Promise.all([loadImg(window.HGP_LOGO.emblem), loadImg(window.HGP_LOGO.word)]);
  $('brandEm').src = window.HGP_LOGO.emblem; $('brandWord').src = window.HGP_LOGO.word;
  const emB = tint(em, '#0b0b0b'), emW = tint(em, '#ffffff'), wdB = tint(wd, '#0b0b0b'), wdW = tint(wd, '#ffffff');
  Object.assign(LOGO, { emB18: scaled(emB, 17), emW18: scaled(emW, 18), wdB52: scaled(wdB, 50), wdB44: scaled(wdB, 44), wdB38: scaled(wdB, 38), wdW52: scaled(wdW, 52), wdW30: scaled(wdW, 30) });
  if (document.fonts && document.fonts.load) await Promise.race([document.fonts.load('8px "Press Start 2P"').catch(() => {}), new Promise(r => setTimeout(r, 1500))]);
  await new Promise(r => setTimeout(r, 30));
  buildCars();
  buildArt(); buildTrack(); buildTexture(); buildPano(); buildObjects();
  ground = ctx.createImageData(W, H - HY); g32 = new Uint32Array(ground.data.buffer);
  haze = ctx.createLinearGradient(0, HY, 0, HY + 46); haze.addColorStop(0, 'rgba(172,211,241,.85)'); haze.addColorStop(1, 'rgba(172,211,241,0)');
  buildPicker($('carsEntry')); buildPicker($('carsRoom')); syncPickers();
  renderBoard();
  state = 'menu'; showScreen('entry');
  connect();
}
window.__hgp = { get state() { return state; }, get room() { return room; }, get me() { return me; }, get cars() { return cars; }, get board() { return board; }, get myId() { return myId; }, send, chooseCar };
init();
})();
