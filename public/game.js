// Hidroket GP Online — istemci
(() => {
"use strict";
/* =========================================================
   SABİTLER VE YARDIMCILAR
   ========================================================= */
const W = 384, H = 216, HY = 74, F = 192, CAMH = 15, CAMD = 34;
const PITCH = Math.atan2(CAMH, CAMD);
const TS = 2048, TAU = Math.PI * 2, PW = W * 4;
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
  { key: 'heli', name: 'HELIANTHUS', num: '304', trait: 'Viraj ustası', col: '#c5cbd1', s: { top: .62, acc: .55, turn: .95, grip: .95 } },
  // gücü birkaç saniyede bir rastgele değişir; ortalamada dengeli
  { key: 'hk1', name: 'HİDROKET-1', num: '3', trait: 'Gizemli güç', col: '#ff7b00', myst: true, s: { top: .72, acc: .68, turn: .66, grip: .66 } },
  // normalde en yavaş, turboda en hızlı
  { key: 'halis', name: "HALİS'İN SCOOTERI", short: 'HALİS', trait: 'Turbo canavarı', col: '#2f4fd8', tb: [1.9, 2.5], regen: 8, s: { top: .4, acc: .62, turn: .95, grip: .85 } }
];
const cname = d => d.short || d.name;
// Gizemli güç kademeleri: [çarpan, yazı, renk, olasılık]
const MYST = [[1.38, 'AŞIRI GÜÇ!', '#c792ea', .15], [1.16, 'GÜÇ ARTTI', '#5fd16b', .25], [1, 'NORMAL', '#e6eef5', .28], [.84, 'GÜÇ DÜŞTÜ', '#ffb03b', .2], [.68, 'GÜÇ ÇEKİLDİ', '#ff6a5e', .12]];
function rollMyst(c) {
  let x = Math.random(), t = MYST[2];
  for (const m of MYST) { x -= m[3]; if (x <= 0) { t = m; break; } }
  c.mmT = t[0]; c.mTier = t; c.mT = 3.5 + Math.random() * 3.5;
  if (c === me) { flash('GİZEMLİ GÜÇ: ' + t[1], t[2]); sfx(t[0] > 1 ? 'box' : 'beep'); }
}
const CARK = Object.fromEntries(CARS.map(c => [c.key, c]));
let selCar = CARK[store.get('hgp-car', 'turaz')] ? store.get('hgp-car', 'turaz') : 'turaz';

/* =========================================================
   VARLIKLAR
   ========================================================= */
let workshop, workshopEmpty, imgPine, imgPine2, imgAutumn, imgTires, imgBanner, imgStand, imgGantry, imgH2;
let imgBox, imgCone, imgBarrel, imgOil, imgPalm, imgCypress, imgPoplar, imgYacht, imgDarkPine;
const BUILDINGS = [], ICONS = {};
let NS, SX, SY, SZ, TX, TY, KV, GRAV, WS_I, WS, ST_I, STAND, tc, tex, MIPS, mip, OUTCOL, SKID, pano, minimap, mmScale;
let TW = 56, TK = null, TH = null;
const RNX = i => -TY[i], RNY = i => TX[i];
const objs = [], grid = new Map(), GC = 64, pickups = [], boxes = [], obst = [], haz = [];
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
  g.fillStyle = '#f4f6f8'; g.fillRect(70, 47, 54, 8); g.drawImage(LOGO.wdB44, 75, 49);
  g.fillStyle = '#ffffff'; g.fillRect(142, 51, 22, 16); g.drawImage(LOGO.emB18, 144, 53);
  g.fillStyle = '#c3c9cf'; g.fillRect(130, 62, 10, 26); g.fillStyle = '#8a929b'; g.fillRect(137, 74, 2, 2);
  g.fillStyle = '#33414d'; g.fillRect(38, 58, 18, 10); g.fillStyle = '#a9b4be'; g.fillRect(46, 58, 1, 10); g.fillRect(38, 62, 18, 1);
  g.fillStyle = '#9b9a92'; g.fillRect(0, 88, 192, 12);
  g.fillStyle = '#8c8b83'; for (let x = 0; x < 192; x += 6) g.fillRect(x, 88, 1, 12); g.fillRect(0, 94, 192, 1);
  g.fillStyle = '#d8dde1'; g.fillRect(2, 74, 22, 14); g.fillStyle = '#5d6d7a'; g.fillRect(4, 70, 14, 8); g.fillStyle = '#b6bcc2'; g.fillRect(8, 78, 10, 10);
  g.fillStyle = '#e8742a'; g.fillRect(17, 78, 8, 11); g.fillStyle = '#222'; g.fillRect(16, 77, 10, 2);
  g.fillStyle = '#8a6a44'; g.fillRect(150, 82, 30, 2); g.fillRect(152, 84, 1, 6); g.fillRect(177, 84, 1, 6);
  g.fillStyle = '#3fae49'; g.fillRect(146, 88, 38, 2); g.fillRect(146, 84, 1, 6); g.fillRect(183, 84, 1, 6);
  if (withCar) M.renderCar(g, CARK.turaz.model, -Math.PI / 2 + 0.45, 0.85, 97, 96, PITCH, 'rgba(10,14,20,.6)');
  return c;
}
function makeBuilding(r) {
  const w = 26 + (r() * 22 | 0), h = 34 + (r() * 46 | 0);
  const [c, g] = mk(w, h + 4);
  const walls = ['#efe4cf', '#e8c9a8', '#f2d6b8', '#f6f1e6', '#e2b48f', '#d9c7a3', '#f0d9c4'];
  const wall = walls[r() * walls.length | 0], shade = '#00000022';
  g.fillStyle = wall; g.fillRect(0, 4, w, h);
  g.fillStyle = shade; g.fillRect(w - 3, 4, 3, h);
  g.fillStyle = '#b55a3a'; g.fillRect(0, 0, w, 5); g.fillStyle = '#8e4128'; g.fillRect(0, 4, w, 1);
  const shut = r() < 0.5 ? '#4f7a54' : '#6d8a9e';
  for (let y = 9; y < h - 6; y += 8) for (let x = 3; x < w - 5; x += 6) {
    g.fillStyle = '#2b3440'; g.fillRect(x, y, 3, 4); g.fillStyle = shut; g.fillRect(x - 1, y, 1, 4); g.fillRect(x + 3, y, 1, 4);
    if (r() < 0.3) { g.fillStyle = '#ffffff55'; g.fillRect(x - 1, y + 4, 5, 1); }
  }
  g.fillStyle = '#7d6f5d'; g.fillRect(0, h, w, 4);
  g.fillStyle = '#3b3328'; g.fillRect((w / 2 | 0) - 2, h - 6, 4, 6);
  return c;
}
function buildArt() {
  workshop = makeWorkshop(true); workshopEmpty = makeWorkshop(false);
  imgPine = (() => { const [c, g] = mk(18, 36); pine(g, 9, 33, 32, '#1b5a33', '#2e8049'); return c; })();
  imgPine2 = (() => { const [c, g] = mk(18, 36); pine(g, 9, 33, 26, '#22633a', '#38904f'); return c; })();
  imgDarkPine = (() => { const [c, g] = mk(18, 40); pine(g, 9, 37, 36, '#123d25', '#1d5735'); return c; })();
  imgAutumn = (() => { const [c, g] = mk(22, 28); const r = rng(5); g.fillStyle = '#6b4a2a'; g.fillRect(10, 14, 2, 14);
    for (let i = 0; i < 90; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 9; g.fillStyle = r() < 0.3 ? '#c99a22' : r() < 0.5 ? '#f0cf45' : '#e2b72f'; g.fillRect(11 + Math.cos(a) * d | 0, 10 + Math.sin(a) * d * 0.85 | 0, 2, 2); } return c; })();
  imgCypress = (() => { const [c, g] = mk(10, 36); for (let y = 0; y < 32; y++) { const w = Math.round(Math.sin(Math.min(1, y / 26) * Math.PI * 0.55) * 4) + 1; g.fillStyle = '#1f4a2c'; g.fillRect(5 - w, y, w * 2, 1); g.fillStyle = '#2f6a3c'; g.fillRect(5 - w, y, Math.max(1, w - 1), 1); } g.fillStyle = '#5a3a1e'; g.fillRect(4, 32, 2, 4); return c; })();
  imgPoplar = (() => { const [c, g] = mk(12, 34); const r = rng(8); for (let i = 0; i < 70; i++) { const y = r() * 28, w = Math.sin(y / 28 * Math.PI) * 4.5; g.fillStyle = r() < .5 ? '#7a9a3a' : '#9ab84a'; g.fillRect(6 + (r() - .5) * 2 * w | 0, y | 0, 2, 2); } g.fillStyle = '#6b5a3a'; g.fillRect(5, 26, 2, 8); return c; })();
  imgPalm = (() => { const [c, g] = mk(26, 36); g.fillStyle = '#8a6a44'; for (let y = 10; y < 36; y++) g.fillRect(13 + Math.round(Math.sin(y / 9) * 2), y, 2, 1);
    g.fillStyle = '#2f7a3a'; for (const [dx, dy] of [[-11, 4], [11, 4], [-8, 9], [8, 9], [-4, -1], [4, -1], [0, 11]]) { for (let t = 0; t <= 1; t += 0.08) g.fillRect(13 + dx * t | 0, 10 + dy * t * t - 3 * t | 0, 2, 2); }
    g.fillStyle = '#3f9a4a'; g.fillRect(11, 8, 5, 3); return c; })();
  imgYacht = (() => { const [c, g] = mk(34, 18); g.fillStyle = '#f4f6f8'; g.beginPath(); g.moveTo(0, 11); g.lineTo(34, 11); g.lineTo(28, 17); g.lineTo(4, 17); g.fill();
    g.fillStyle = '#1d3d5a'; g.fillRect(4, 13, 26, 1); g.fillStyle = '#e8ecef'; g.fillRect(9, 6, 16, 5); g.fillStyle = '#2b3d4f'; g.fillRect(11, 7, 12, 2); g.fillStyle = '#9aa3ad'; g.fillRect(17, 0, 1, 6); return c; })();
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
  imgBox = sprite([
    "KKKKKKKKKKKK", "KBBBBBBBBBBK", "KBLWWWWWWLBK", "KBWWBBBBWWBK", "KBBBBBBBWWBK", "KBBBBBBWWBBK",
    "KBBBBBWWBBBK", "KBBBBBWWBBBK", "KBBBBBBBBBBK", "KBBBBBWWBBBK", "KBBBBBBBBBBK", "KKKKKKKKKKKK"],
    { K: '#0b2a44', B: '#2a94d8', L: '#79c8f2', W: '#ffffff' });
  imgCone = sprite(["...O", "..OO", "..ww", ".OOO", ".www", "OOOO", "kkkk"], { O: '#ff7a1a', w: '#ffffff', k: '#3a3a3a' }, true);
  imgBarrel = sprite([".rrrrrr.", "rrrrrrrr", "wwwwwwww", "rrrrrrrr", "rrrrrrrr", "wwwwwwww", "rrrrrrrr", ".RRRRRR."], { r: '#d8322a', R: '#9a1c16', w: '#f4f4f4' });
  imgOil = (() => { const [c, g] = mk(18, 6); g.fillStyle = '#111316'; g.beginPath(); g.ellipse(9, 3, 9, 3, 0, 0, TAU); g.fill(); g.fillStyle = '#3b3f6a'; g.fillRect(5, 2, 4, 1); g.fillStyle = '#5a3f6a'; g.fillRect(10, 3, 3, 1); return c; })();
  // eşya simgeleri (12x12)
  const ic = (rows, pal) => sprite(rows, pal);
  ICONS.turbo = ic(["....kk......", "...cccc.....", "...cwcc.....", "...cwcc.....", "...cwcc.....", "...cccc.....", "...cccc.....", "...CCCC.....", "....oo......", "...oyyo.....", "....oo......", "............"].map(r => r.replace(/\./g, '.')), { k: '#5a5a5a', c: '#3fd0f0', C: '#1f8fb8', w: '#fff', o: '#ff7a1a', y: '#ffd84a' });
  ICONS.super = ic(["....kk..y...", "...gggg.yy..", "...gwgg.....", "...gwgg..y..", "...gwgg.....", "...gggg.....", "...gggg.....", "...GGGG.....", "...oooo.....", "..oyyyyo....", "...oyyo.....", "....oo......"], { k: '#5a5a5a', g: '#ffd84a', G: '#c9a020', w: '#fff', o: '#ff7a1a', y: '#fff6b0' });
  ICONS.oil = ic(["......k.....", ".....kk.....", ".....kkk....", "....kkkk....", "...kkkkkk...", "...kkpkkk...", "..kkkpkkkk..", "..kkkkkkkk..", "..kkkkkkkk..", "...kkkkkk...", "....kkkk....", "............"], { k: '#16181c', p: '#6a5aa8' });
  ICONS.shield = ic(["............", "..bbbbbbbb..", "..bLLLLLLb..", "..bLwwwwLb..", "..bLwLLLLb..", "..bLLLLLLb..", "..bLLLLLLb..", "...bLLLLb...", "...bLLLLb...", "....bLLb....", ".....bb.....", "............"], { b: '#0b2a44', L: '#2a94d8', w: '#bfe9fb' });
  ICONS.zap = ic([".......yy...", "......yy....", ".....yy.....", "....yy......", "...yyyyyy...", "......yy....", ".....yy.....", "....yy......", "...yy.......", "..yy........", "..y.........", "............"], { y: '#ffd84a' });
  for (let i = 0; i < 10; i++) BUILDINGS.push(makeBuilding(rng(31 + i * 17)));
}

/* =========================================================
   PİSTLER
   ========================================================= */
const TRACKS = {
  istanbul: { name: 'İSTANBUL PARK', short: 'İSTANBUL', tw: 56, theme: 'istanbul',
    cp: [[1150,1760],[800,1760],[470,1730],[330,1600],[350,1430],[500,1340],[650,1280],[700,1140],[600,1010],[430,930],
      [330,760],[380,560],[560,400],[820,320],[1080,340],[1260,470],[1300,660],[1200,820],[1150,980],[1290,1080],
      [1500,1030],[1680,920],[1820,1000],[1840,1220],[1720,1380],[1560,1430],[1480,1560],[1360,1700]],
    h: [34,34,28,8,4,10,22,30,26,18,12,16,26,34,40,44,40,30,22,16,22,34,46,48,42,36,34,34] },
  monaco: { name: 'MONAKO', short: 'MONAKO', tw: 44, theme: 'monaco',
    cp: [[950,1500],[660,1500],[450,1470],[370,1320],[420,1120],[500,920],[470,720],[540,540],[740,470],[900,560],
      [1010,710],[1150,660],[1220,530],[1320,590],[1270,740],[1390,880],[1620,900],[1820,980],[1860,1180],[1720,1270],
      [1640,1390],[1490,1430],[1400,1340],[1300,1430],[1190,1350],[1100,1440],[1050,1500]],
    h: [6,6,6,8,20,34,44,50,52,44,34,30,26,22,16,10,6,4,4,4,4,4,4,4,5,6,6] },
  spa: { name: 'SPA', short: 'SPA', tw: 58, theme: 'spa',
    cp: [[760,1680],[520,1720],[360,1650],[400,1530],[590,1470],[760,1370],[830,1240],[790,1110],[880,900],[1030,650],
      [1180,420],[1290,280],[1450,290],[1490,420],[1610,500],[1720,630],[1650,780],[1500,760],[1410,880],[1380,1030],
      [1460,1160],[1610,1210],[1740,1330],[1790,1510],[1690,1660],[1480,1740],[1200,1770],[1010,1740],[900,1700]],
    h: [44,44,42,30,16,6,30,46,56,66,74,80,80,70,60,52,44,38,28,20,14,10,8,10,18,28,36,42,44] },
  monza: { name: 'MONZA', short: 'MONZA', tw: 56, theme: 'monza',
    cp: [[250,1450],[250,1200],[250,950],[250,720],[267,620],[352,585],[381,520],[373,430],[417,300],[555,190],[758,140],[990,150],[1178,210],
      [1294,250],[1338,310],[1425,330],[1599,350],[1744,410],[1802,510],[1787,610],[1700,700],[1483,820],[1222,960],[990,1080],
      [874,1150],[801,1230],[714,1280],[656,1350],[642,1500],[642,1650],[613,1760],[468,1830],[308,1800],[257,1680]],
    h: [10,10,10,10,10,10,10,9,8,7,6,6,8,10,11,12,14,15,15,14,12,9,6,4,4,5,6,7,8,9,10,10,10,10] },
  baku: { name: 'BAKÜ', short: 'BAKÜ', tw: 44, theme: 'baku',
    cp: [[826,1650],[1166,1650],[1506,1650],[1737,1648],[1825,1613],[1846,1525],[1846,1300],[1832,1200],[1750,1175],[1574,1175],[1492,1163],
      [1465,1088],[1465,900],[1492,825],[1587,800],[1723,800],[1805,775],[1832,675],[1832,500],[1805,400],[1696,375],[1370,375],[1098,375],
      [962,350],[880,275],[798,263],[744,325],[662,350],[581,300],[499,213],[390,200],[282,225],[227,325],[214,550],[200,863],[227,1175],
      [309,1425],[445,1600],[608,1650]],
    h: [4,4,4,4,5,6,8,10,11,12,12,13,14,15,16,16,17,18,20,21,22,22,23,25,28,30,30,29,28,28,27,26,24,20,14,9,6,4,4] },
  silverstone: { name: 'SILVERSTONE', short: 'SILVERSTONE', tw: 56, theme: 'silverstone',
    cp: [[311,1685],[311,1461],[333,1304],[398,1214],[441,1125],[462,1046],[549,1013],[635,990],[657,923],[603,878],[527,834],[462,699],
      [419,542],[398,430],[333,363],[246,341],[214,262],[268,195],[365,184],[506,195],[776,206],[1046,218],[1218,251],[1316,330],
      [1370,408],[1456,442],[1521,520],[1542,610],[1607,677],[1672,856],[1715,1080],[1737,1304],[1737,1461],[1672,1550],[1542,1595],[1456,1640],
      [1262,1685],[992,1752],[830,1774],[743,1842],[635,1842],[462,1864],[344,1808]],
    h: [10,10,10,11,12,12,12,12,13,13,13,14,15,16,16,16,16,15,14,13,12,11,10,10,9,9,8,8,8,8,8,8,8,8,8,8,9,9,10,10,10,10,10] },
  podyum: { name: 'PODYUM PARK', short: 'PODYUM', tw: 42, theme: 'podyum',
    cp: [[597,1722],[1047,1722],[1422,1707],[1617,1617],[1647,1437],[1497,1347],[1272,1362],[1122,1272],[1137,1107],[1272,987],[1497,957],[1677,867],
      [1722,687],[1617,537],[1422,522],[1272,627],[1107,687],[942,597],[897,432],[777,327],[582,357],[447,507],[477,717],[627,837],
      [747,987],[657,1137],[447,1167],[327,1317],[357,1542],[447,1677]],
    h: [10,10,12,16,20,22,22,24,26,28,30,32,34,34,32,30,30,32,34,34,32,28,24,22,20,18,16,14,12,10] }
};
const TRACK_KEYS = ['istanbul', 'monaco', 'spa', 'monza', 'baku', 'silverstone', 'podyum'];
const SPACING = 6;
function centerline(cp, hs) {
  const raw = [], n = cp.length, hh = i => hs ? hs[(i + n) % n] : 0;
  for (let i = 0; i < n; i++) {
    const p0 = cp[(i - 1 + n) % n], p1 = cp[i], p2 = cp[(i + 1) % n], p3 = cp[(i + 2) % n];
    for (let t = 0; t < 1; t += 1 / 60) {
      const t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      const s = t * t * (3 - 2 * t);   // yükseklik: aşırı salınım olmasın diye yumuşak geçiş
      raw.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), hh(i) + (hh(i + 1) - hh(i)) * s]);
    }
  }
  const pts = [raw[0]]; let carry = 0;
  for (let i = 1; i <= raw.length; i++) {
    const a = raw[i - 1], b = raw[i % raw.length]; let seg = Math.hypot(b[0] - a[0], b[1] - a[1]), pos = 0;
    while (carry + (seg - pos) >= SPACING) { pos += SPACING - carry; carry = 0; const t = pos / seg; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); }
    carry += seg - pos;
  }
  if (Math.hypot(pts[pts.length - 1][0] - pts[0][0], pts[pts.length - 1][1] - pts[0][1]) < SPACING * 0.5) pts.pop();
  return pts;   // cp[0]'dan başlar (başlangıç çizgisi)
}
function trackThumb(key, w, h) {
  const pts = centerline(TRACKS[key].cp);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const s = Math.min((w - 8) / (x1 - x0), (h - 8) / (y1 - y0)), ox = (w - (x1 - x0) * s) / 2, oy = (h - (y1 - y0) * s) / 2;
  const [c, g] = mk(w, h);
  g.strokeStyle = '#e6eef5'; g.lineWidth = 2; g.lineJoin = 'round'; g.beginPath();
  pts.forEach((p, i) => { const x = ox + (p[0] - x0) * s, y = oy + (p[1] - y0) * s; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.stroke();
  g.fillStyle = '#ffd84a'; g.fillRect(ox + (pts[0][0] - x0) * s - 2, oy + (pts[0][1] - y0) * s - 2, 4, 4);
  return c;
}

/* ---------------- temalar ---------------- */
const THEMES = {
  istanbul: {
    sky: ['#4a86cf', '#5d95d6', '#73a4db', '#8bb3dc', '#a5c0d8', '#c2cbcf', '#dccfbb', '#eccfa4', '#f3c98e', '#f6c37f'],
    haze: 'rgba(240,206,160,', out: [0xb0, 0xa5, 0x5c],
    ground(g, r) {
      g.fillStyle = '#b0a55c'; g.fillRect(0, 0, TS, TS);
      g.fillStyle = '#b9ae66'; for (let i = -TS; i < TS * 2; i += 110) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 55, 0); g.lineTo(i + 55 - TS, TS); g.lineTo(i - TS, TS); g.fill(); }
      for (let i = 0; i < 30000; i++) { g.fillStyle = r() < 0.5 ? '#9f9550' : '#c4b874'; g.fillRect(r() * TS | 0, r() * TS | 0, 2, 1); }
      for (let i = 0; i < 900; i++) { g.fillStyle = r() < .5 ? '#8a8a3a' : '#d8d08a'; g.fillRect(r() * TS | 0, r() * TS | 0, 3, 2); }
    },
    runoff: { col: '#686c72', dot: ['#5f6369', '#73777d'], band: '#2a62b8', surf: 'runoff' }
  },
  monaco: {
    sky: ['#1d6fd6', '#2a7ddc', '#3a8ae0', '#4c98e4', '#5fa6e8', '#73b3ec', '#8ac1f0', '#a2cff3', '#badcf6', '#cfe7f8'],
    haze: 'rgba(205,231,248,', out: [0xb8, 0xb1, 0xa3], walls: true,
    ground(g, r) {
      g.fillStyle = '#b8b1a3'; g.fillRect(0, 0, TS, TS);
      for (let y = 0; y < TS; y += 8) for (let x = (y / 8 % 2) * 4; x < TS; x += 8) { g.fillStyle = r() < .5 ? '#b0a99b' : '#c1baac'; g.fillRect(x, y, 7, 7); }
      // liman
      g.fillStyle = '#7d7568'; g.fillRect(0, 1592, TS, 10);
      g.fillStyle = '#1f6fb2'; g.fillRect(0, 1602, TS, TS - 1602);
      for (let i = 0; i < 5000; i++) { g.fillStyle = r() < .6 ? '#2a7cc0' : '#9fd0f0'; g.fillRect(r() * TS | 0, 1606 + r() * (TS - 1606) | 0, 3, 1); }
      for (let i = 0; i < 26; i++) { const x = 80 + i * 75 + r() * 30, y = 1650 + r() * 300; g.fillStyle = '#f4f6f8'; g.fillRect(x, y, 22, 7); g.fillStyle = '#8a939c'; g.fillRect(x + 6, y + 2, 9, 3); }
      // yeşil adacıklar ve kumarhane bahçesi
      g.fillStyle = '#5f8f4a'; g.beginPath(); g.ellipse(760, 640, 70, 40, 0.3, 0, TAU); g.fill();
      g.fillStyle = '#d9c7a3'; g.fillRect(700, 600, 90, 30); g.fillStyle = '#b8a07a'; g.fillRect(700, 600, 90, 4);
    },
    runoff: null
  },
  spa: {
    sky: ['#6f7f94', '#7a899d', '#8592a5', '#909cad', '#9ba6b5', '#a6b0bd', '#b1bac5', '#bcc4cd', '#c6cdd4', '#cfd5da'],
    haze: 'rgba(200,207,214,', out: [0x2f, 0x7a, 0x34], rain: true,
    ground(g, r) {
      g.fillStyle = '#2f7a34'; g.fillRect(0, 0, TS, TS);
      g.fillStyle = '#378a3b'; for (let i = -TS; i < TS * 2; i += 90) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 45, 0); g.lineTo(i + 45 - TS, TS); g.lineTo(i - TS, TS); g.fill(); }
      for (let i = 0; i < 30000; i++) { g.fillStyle = r() < 0.5 ? '#286a2d' : '#3c9441'; g.fillRect(r() * TS | 0, r() * TS | 0, 2, 1); }
      for (let i = 0; i < 1200; i++) { g.fillStyle = '#1f4f28'; g.fillRect(r() * TS | 0, r() * TS | 0, 3, 3); }
    },
    runoff: { col: '#cbbd8a', dot: ['#bfae78', '#e0d2a0'], band: null, surf: 'gravel' }
  },
  monza: {   // kraliyet parkı: biçilmiş çim, ağaçlar, çakıl kaçış alanları
    sky: ['#3f8fe0', '#4b98e3', '#59a1e5', '#68aae7', '#79b4e9', '#8bbeea', '#9dc7ea', '#b0cfe8', '#c3d7e4', '#d4dddf'],
    haze: 'rgba(212,221,223,', out: [0x4f, 0x8f, 0x3a],
    ground(g, r) {
      g.fillStyle = '#4f8f3a'; g.fillRect(0, 0, TS, TS);
      g.fillStyle = '#58993f'; for (let x = 0; x < TS; x += 64) g.fillRect(x, 0, 32, TS);   // biçme şeritleri
      for (let i = 0; i < 30000; i++) { g.fillStyle = r() < 0.5 ? '#457f33' : '#62a446'; g.fillRect(r() * TS | 0, r() * TS | 0, 2, 1); }
      for (let i = 0; i < 700; i++) { g.fillStyle = r() < .6 ? '#3a6e2a' : '#c9c46a'; g.fillRect(r() * TS | 0, r() * TS | 0, 3, 2); }
      // eski eğimli pistin (sopraelevata) kalıntısı
      g.strokeStyle = '#8f9196'; g.lineWidth = 14; g.beginPath(); g.ellipse(1160, 560, 330, 150, -0.35, 0.3, 2.6); g.stroke();
      g.strokeStyle = '#a6a8ad'; g.lineWidth = 3; g.stroke();
    },
    runoff: { col: '#cbbd8a', dot: ['#bfae78', '#e0d2a0'], band: null, surf: 'gravel' }
  },
  baku: {    // şehir pisti: duvarlar, taş sokaklar, Hazar kıyısı
    sky: ['#3a6fb5', '#4a7cbb', '#5d89bf', '#7396c0', '#8ea2bd', '#aab0b6', '#c6b9a8', '#dbbd98', '#e8bb86', '#efb676'],
    haze: 'rgba(232,196,150,', out: [0xb3, 0xa0, 0x82], walls: true, seaY: 1760,
    ground(g, r) {
      g.fillStyle = '#b3a082'; g.fillRect(0, 0, TS, TS);
      for (let y = 0; y < TS; y += 6) for (let x = (y / 6 % 2) * 6; x < TS; x += 12) { g.fillStyle = r() < .5 ? '#a8957a' : '#bda98b'; g.fillRect(x, y, 11, 5); }
      // eski şehir surları (İçerişehir)
      g.fillStyle = '#8a7656'; g.fillRect(560, 420, 520, 14); g.fillRect(560, 420, 14, 260);
      for (let x = 560; x < 1080; x += 20) g.fillRect(x, 412, 10, 8);
      g.fillStyle = '#9c8866'; g.fillRect(600, 470, 440, 180);
      for (let i = 0; i < 160; i++) { g.fillStyle = r() < .5 ? '#c9b28c' : '#7f6b4d'; g.fillRect(610 + r() * 420 | 0, 480 + r() * 160 | 0, 8, 6); }
      // sahil bulvarı ve Hazar Denizi
      g.fillStyle = '#5f8f4a'; g.fillRect(0, 1700, TS, 50);
      g.fillStyle = '#7d7568'; g.fillRect(0, 1750, TS, 10);
      g.fillStyle = '#2a6f9a'; g.fillRect(0, 1760, TS, TS - 1760);
      for (let i = 0; i < 4000; i++) { g.fillStyle = r() < .6 ? '#347da8' : '#9fcbe0'; g.fillRect(r() * TS | 0, 1764 + r() * (TS - 1764) | 0, 3, 1); }
    },
    runoff: null
  }
};
THEMES.monaco.seaY = 1602;
THEMES.silverstone = {   // eski hava üssü: düz çayırlar, pist kalıntıları, mavi çizgili asfalt kaçış alanları
  sky: ['#6f8fb5', '#7c9abd', '#89a5c4', '#97b0ca', '#a5bbd0', '#b3c5d5', '#c0cfd9', '#cbd6dd', '#d5dde0', '#dde2e2'],
  haze: 'rgba(214,222,226,', out: [0x5a, 0x8f, 0x3e],
  ground(g, r) {
    g.fillStyle = '#5a8f3e'; g.fillRect(0, 0, TS, TS);
    g.fillStyle = '#62983f'; for (let y = 0; y < TS; y += 80) g.fillRect(0, y, TS, 40);
    for (let i = 0; i < 30000; i++) { g.fillStyle = r() < 0.5 ? '#507f37' : '#6aa24a'; g.fillRect(r() * TS | 0, r() * TS | 0, 2, 1); }
    // eski uçak pisti kalıntıları
    g.save(); g.translate(1000, 1050); g.rotate(-0.5); g.fillStyle = '#8b8e8f'; g.fillRect(-700, -22, 1400, 44); g.fillStyle = '#9da0a1'; for (let x = -690; x < 690; x += 40) g.fillRect(x, -1, 20, 2); g.restore();
    g.save(); g.translate(1000, 1050); g.rotate(0.9); g.fillStyle = '#878a8b'; g.fillRect(-600, -20, 1200, 40); g.restore();
  },
  runoff: { col: '#6a6f75', dot: ['#62676d', '#74797f'], band: '#2a62b8', surf: 'runoff' }
};
THEMES.podyum = {        // Bursa: yemyeşil yamaç, kavaklar, arkada karlı Uludağ
  sky: ['#2f7fd6', '#3c89da', '#4a93dd', '#5a9de0', '#6ba7e2', '#7db1e3', '#90bbe3', '#a3c5e2', '#b6cee0', '#c7d6de'],
  haze: 'rgba(199,214,222,', out: [0x58, 0x92, 0x3a],
  ground(g, r) {
    g.fillStyle = '#58923a'; g.fillRect(0, 0, TS, TS);
    g.fillStyle = '#5f9b3f'; for (let i = -TS; i < TS * 2; i += 100) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 50, 0); g.lineTo(i + 50 + TS * .4, TS); g.lineTo(i + TS * .4, TS); g.fill(); }
    for (let i = 0; i < 30000; i++) { g.fillStyle = r() < 0.5 ? '#4d8433' : '#6aa84a'; g.fillRect(r() * TS | 0, r() * TS | 0, 2, 1); }
    for (let i = 0; i < 500; i++) { g.fillStyle = r() < .5 ? '#e8e070' : '#f4f4f4'; g.fillRect(r() * TS | 0, r() * TS | 0, 2, 2); }   // kır çiçekleri
  },
  runoff: { col: '#cbbd8a', dot: ['#bfae78', '#e0d2a0'], band: null, surf: 'gravel' }
};


function useTrack(key) {
  if (!TRACKS[key]) key = 'istanbul';
  if (TK === key) return;
  TK = key; const T = TRACKS[key]; TH = THEMES[T.theme]; TW = T.tw;
  const P = centerline(T.cp, T.h);
  NS = P.length;
  SX = new Float32Array(NS); SY = new Float32Array(NS); SZ = new Float32Array(NS); TX = new Float32Array(NS); TY = new Float32Array(NS); KV = new Float32Array(NS); GRAV = new Uint8Array(NS);
  for (let i = 0; i < NS; i++) { SX[i] = P[i][0]; SY[i] = P[i][1]; SZ[i] = P[i][2] || 0; }
  for (let i = 0; i < NS; i++) { const a = P[(i - 1 + NS) % NS], b = P[(i + 1) % NS]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); TX[i] = (b[0] - a[0]) / l; TY[i] = (b[1] - a[1]) / l; }
  const Kr = new Float32Array(NS);
  for (let i = 0; i < NS; i++) { const a = (i - 4 + NS) % NS, b = (i + 4) % NS; Kr[i] = wrapA(Math.atan2(TY[b], TX[b]) - Math.atan2(TY[a], TX[a])) / (8 * SPACING); }
  for (let i = 0; i < NS; i++) { let s = 0; for (let k = -4; k <= 4; k++) s += Kr[(i + k + NS) % NS]; KV[i] = s / 9; }
  for (let i = 0; i < NS; i++) { let m = 0; for (let k = -8; k <= 8; k++) m = Math.max(m, Math.abs(KV[(i + k + NS) % NS])); GRAV[i] = m > 0.0062 ? 1 : 0; }
  // atölye (pit garajı) ve tribün yerini pistten uzak bir noktada bul
  const clearAt = (x, y, m) => { for (let i = 0; i < NS; i += 2) if (sq(x - SX[i]) + sq(y - SY[i]) < sq(TW / 2 + m)) return false; return x > 90 && y > 90 && x < TS - 90 && y < TS - 90; };
  WS = null;
  for (const off of [0.04, 0.08, 0.12, 0.92, 0.88, 0.16]) for (const side of [1, -1]) {
    if (WS) break; const i = Math.round(NS * off) % NS, d = TW / 2 + 78;
    const x = SX[i] + RNX(i) * side * d, y = SY[i] + RNY(i) * side * d;
    if (clearAt(x, y, 70) && !(TH.seaY && y > TH.seaY - 42)) { WS = { x, y }; WS_I = i; WS.side = side; }
  }
  if (!WS) { WS_I = 0; WS = { x: SX[0] + RNX(0) * (TW / 2 + 78), y: SY[0] + RNY(0) * (TW / 2 + 78), side: 1 }; }
  ST_I = (NS - 18) % NS;
  const ss = -(WS.side || 1);
  STAND = { x: SX[ST_I] + RNX(ST_I) * ss * (TW / 2 + 40), y: SY[ST_I] + RNY(ST_I) * ss * (TW / 2 + 40) };
  buildHeight(); buildTexture(); buildPano(); buildObjects();
  haze = ctx.createLinearGradient(0, HY, 0, HY + 46); haze.addColorStop(0, TH.haze + '.85)'); haze.addColorStop(1, TH.haze + '0)');
}
/* ---------------- arazi yüksekliği ----------------
   Pist yüksekliği kontrol noktalarından gelir; çevredeki arazi en yakın pist
   noktasının yüksekliğinden başlayıp uzaklaştıkça yumuşatılmış ortalamaya kayar. */
const HMR = 8, HMN = TS / HMR;
let HM = new Float32Array(HMN * HMN), HFAR = 0;
function buildHeight() {
  const N = HMN * HMN, near = new Float32Array(N), dist = new Float32Array(N);
  for (let cy = 0; cy < HMN; cy++) for (let cx = 0; cx < HMN; cx++) {
    const x = (cx + .5) * HMR, y = (cy + .5) * HMR; let best = 1e18, bi = 0;
    for (let i = 0; i < NS; i += 3) { const d = sq(x - SX[i]) + sq(y - SY[i]); if (d < best) { best = d; bi = i; } }
    near[cy * HMN + cx] = SZ[bi]; dist[cy * HMN + cx] = Math.sqrt(best);
  }
  // kutu bulanıklığı (3 tur ≈ gauss)
  let a = Float32Array.from(near), b = new Float32Array(N); const R = 12;
  for (let pass = 0; pass < 3; pass++) for (const horiz of [true, false]) {
    for (let j = 0; j < HMN; j++) { let acc = 0;
      const at = i => { i = clamp(i, 0, HMN - 1); return horiz ? a[j * HMN + i] : a[i * HMN + j]; };
      for (let i = -R; i <= R; i++) acc += at(i);
      for (let i = 0; i < HMN; i++) { (horiz ? (b[j * HMN + i] = acc / (2 * R + 1)) : (b[i * HMN + j] = acc / (2 * R + 1))); acc += at(i + R + 1) - at(i - R); } }
    [a, b] = [b, a]; }
  let sum = 0;
  for (let k = 0; k < N; k++) {
    const d = dist[k], w = clamp((d - TW / 2 - 14) / 190, 0, 1), sw = w * w * (3 - 2 * w);
    let h = near[k] * (1 - sw) + a[k] * sw;
    if (TH.seaY && (k / HMN | 0) * HMR > TH.seaY + 6) h = Math.min(h, -3);
    HM[k] = h; sum += a[k];
  }
  HFAR = sum / N;
}
function hAt(x, y) {
  let gx = x / HMR - .5, gy = y / HMR - .5;
  gx = gx < 0 ? 0 : gx > HMN - 1.001 ? HMN - 1.001 : gx; gy = gy < 0 ? 0 : gy > HMN - 1.001 ? HMN - 1.001 : gy;
  const ix = gx | 0, iy = gy | 0, fx = gx - ix, fy = gy - iy, k = iy * HMN + ix;
  return (HM[k] * (1 - fx) + HM[k + 1] * fx) * (1 - fy) + (HM[k + HMN] * (1 - fx) + HM[k + HMN + 1] * fx) * fy;
}
const gridPos = slot => { const i = (NS - 6 - slot * 4 + NS) % NS, lat = (slot % 2 ? 1 : -1) * TW * 0.22; return { i, x: SX[i] + RNX(i) * lat + TX[i] * 4, y: SY[i] + RNY(i) * lat + TY[i] * 4, a: Math.atan2(TY[i], TX[i]) }; };
const ABGR = (r, g, b) => (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
function buildTexture() {
  let tg; if (!tc) [tc, tg] = mk(TS, TS); else { tg = tc.getContext('2d'); tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalAlpha = 1; }
  const r = rng(11 + TK.length);
  TH.ground(tg, r);
  const path = () => { tg.beginPath(); for (let i = 0; i <= NS; i++) { const k = i % NS; i ? tg.lineTo(SX[k], SY[k]) : tg.moveTo(SX[k], SY[k]); } tg.closePath(); };
  // viraj dışı kaçış alanları
  if (TH.runoff) {
    const ro = TH.runoff;
    for (let i = 0; i < NS; i++) if (GRAV[i]) { const side = -Math.sign(KV[i]) || 1; tg.fillStyle = ro.col; tg.beginPath(); tg.arc(SX[i] + RNX(i) * side * (TW / 2 + 20), SY[i] + RNY(i) * side * (TW / 2 + 20), 25, 0, TAU); tg.fill(); }
    for (let i = 0; i < 9000; i++) { const k = r() * NS | 0; if (!GRAV[k]) continue; const side = -Math.sign(KV[k]) || 1, d = TW / 2 + 4 + r() * 40, l = (r() - 0.5) * 12;
      tg.fillStyle = ro.dot[r() < .5 ? 0 : 1]; tg.fillRect(SX[k] + RNX(k) * side * d + TX[k] * l | 0, SY[k] + RNY(k) * side * d + TY[k] * l | 0, 1, 1); }
    if (ro.band) for (let i = 0; i < NS; i += 2) if (GRAV[i]) { const side = -Math.sign(KV[i]) || 1;
      for (const d of [TW / 2 + 9, TW / 2 + 13]) { tg.fillStyle = ro.band; tg.fillRect(SX[i] + RNX(i) * side * d - 1 | 0, SY[i] + RNY(i) * side * d - 1 | 0, 3, 3); } }
  }
  // atölye önündeki parke alan
  tg.save(); tg.translate(WS.x, WS.y); tg.rotate(Math.atan2(TY[WS_I], TX[WS_I]));
  tg.fillStyle = '#c4a79a'; tg.fillRect(-70, -50, 140, 70);
  tg.fillStyle = '#b19385'; for (let x = -70; x < 70; x += 6) tg.fillRect(x, -50, 1, 70); for (let y = -50; y < 20; y += 6) tg.fillRect(-70, y, 140, 1);
  tg.fillStyle = '#9b9a92'; tg.fillRect(-60, -10, 120, 30); tg.restore();
  tg.lineJoin = 'round'; tg.lineCap = 'round';
  if (TH.walls) {   // şehir pisti: kaldırım + bariyer
    path(); tg.lineWidth = TW + 34; tg.strokeStyle = '#a49d90'; tg.stroke();
    path(); tg.lineWidth = TW + 16; tg.strokeStyle = '#d9dde1'; tg.stroke();
    path(); tg.lineWidth = TW + 13; tg.strokeStyle = '#8a9198'; tg.stroke();
  }
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
  for (const wi of [30 % NS, Math.round(NS * .5)]) { tg.save(); tg.translate(SX[wi], SY[wi]); tg.rotate(Math.atan2(TX[wi], -TY[wi]));
    tg.globalAlpha = .85; tg.drawImage(LOGO.wdW52, -26, -4); tg.globalAlpha = 1; tg.restore(); }
  tex = new Uint32Array(tg.getImageData(0, 0, TS, TS).data.buffer);
  MIPS = TS / 4;
  const [mc, mg] = mk(MIPS, MIPS); mg.imageSmoothingEnabled = true; mg.imageSmoothingQuality = 'high'; mg.drawImage(tc, 0, 0, MIPS, MIPS);
  mip = new Uint32Array(mg.getImageData(0, 0, MIPS, MIPS).data.buffer);
  OUTCOL = ABGR(...TH.out); SKID = ABGR(0x3a, 0x3c, 0x41);
}
function buildPano() {
  const [c, g] = mk(PW, HY + 1); const r = rng(3 + TK.length * 7);
  const sky = TH.sky, bh = Math.ceil((HY + 1) / sky.length);
  sky.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * bh, PW, bh); });
  const cloud = (cx, cy, w, cols) => { for (let i = 0; i < 26; i++) { g.fillStyle = cols[i % cols.length]; const a = r() * TAU, d = r(); g.fillRect((cx + Math.cos(a) * w * d * 0.6) % PW | 0, cy + Math.sin(a) * 5 * d | 0, 8, 3); } };
  if (TK === 'spa') {
    for (let k = 0; k < 22; k++) cloud(r() * PW, 4 + r() * 30, 40 + r() * 60, ['#9aa4b1', '#a7b0bc', '#8c97a5', '#b3bbc5']);
    for (let x = 0; x < PW; x++) { const a = x / PW * TAU; const h = Math.round(24 + 8 * Math.sin(a * 2 + 1) + 5 * Math.sin(a * 5) + 3 * Math.sin(a * 13));
      g.fillStyle = '#6d8576'; g.fillRect(x, HY - h, 1, h + 1); }
    for (let x = 0; x < PW; x += 3) { const a = x / PW * TAU; const h = Math.round(15 + 6 * Math.sin(a * 3) + 4 * Math.sin(a * 9 + 2)) + (r() * 4 | 0);
      g.fillStyle = '#2f5a3e'; g.fillRect(x, HY - h, 3, h + 1); g.fillStyle = '#26503a'; g.fillRect(x + 1, HY - h - 2, 1, 2); }
    g.fillStyle = 'rgba(200,207,214,.35)'; g.fillRect(0, HY - 12, PW, 12);
  } else if (TK === 'monaco') {
    for (let k = 0; k < 7; k++) cloud(r() * PW, 6 + r() * 20, 20 + r() * 30, ['#ffffff', '#eef6fc']);
    g.fillStyle = '#245f9e'; g.fillRect(0, HY - 9, PW, 10);
    for (let i = 0; i < 300; i++) { g.fillStyle = r() < .5 ? '#3a78b8' : '#cfe7f8'; g.fillRect(r() * PW | 0, HY - 9 + r() * 9 | 0, 2, 1); }
    for (const [x0, x1, top] of [[60, 520, 34], [760, 1280, 42], [1360, 1520, 26]]) {
      for (let x = x0; x < x1; x++) { const t = (x - x0) / (x1 - x0), h = Math.round(top * Math.sin(t * Math.PI) ** 0.7);
        g.fillStyle = '#7a8a5a'; g.fillRect(x, HY - 9 - h, 1, h); }
      for (let x = x0 + 4; x < x1 - 8;) { const t = (x - x0) / (x1 - x0), base = HY - 9 - Math.round(top * Math.sin(t * Math.PI) ** 0.7 * 0.6);
        const w = 6 + (r() * 10 | 0), h = 6 + (r() * 14 | 0);
        g.fillStyle = ['#efe4cf', '#e8c9a8', '#f6f1e6', '#e2b48f', '#d9c7a3'][r() * 5 | 0]; g.fillRect(x, base - h, w, h + 6);
        g.fillStyle = '#b55a3a'; g.fillRect(x, base - h, w, 1);
        g.fillStyle = '#5a6a78'; for (let yy = base - h + 3; yy < base; yy += 3) for (let xx = x + 1; xx < x + w - 1; xx += 2) g.fillRect(xx, yy, 1, 1);
        x += w + (r() * 3 | 0); }
    }
    for (let i = 0; i < 14; i++) { const x = r() * PW | 0; g.fillStyle = '#f4f6f8'; g.fillRect(x, HY - 4, 7, 2); g.fillRect(x + 3, HY - 8, 1, 4); }
  } else if (TK === 'monza') {
    for (let k = 0; k < 9; k++) cloud(r() * PW, 4 + r() * 22, 30 + r() * 40, ['#ffffff', '#eef4fa', '#dfe9f2']);
    // uzakta Alpler
    for (let x = 0; x < PW; x++) { const a = x / PW * TAU; const h = Math.round(30 + 9 * Math.sin(a * 4 + 0.6) + 6 * Math.sin(a * 11) + 3 * Math.abs(Math.sin(a * 23)));
      g.fillStyle = '#8ea7c4'; g.fillRect(x, HY - h, 1, h + 1);
      const sn = Math.max(0, h - 30); if (sn) { g.fillStyle = '#f2f6fa'; g.fillRect(x, HY - h, 1, Math.min(sn, 5)); } }
    g.fillStyle = 'rgba(212,221,223,.5)'; g.fillRect(0, HY - 20, PW, 20);
    // eski eğimli pist duvarı
    for (const [x0, x1] of [[120, 470], [880, 1230]]) {
      for (let x = x0; x < x1; x++) { const t = (x - x0) / (x1 - x0), h = Math.round(6 + 12 * Math.sin(t * Math.PI));
        g.fillStyle = '#9a9ca1'; g.fillRect(x, HY - h, 1, h); g.fillStyle = '#c4c6ca'; g.fillRect(x, HY - h, 1, 1); }
      for (let x = x0 + 10; x < x1 - 10; x += 22) { g.fillStyle = '#7d7f84'; g.fillRect(x, HY - 6, 2, 6); } }
    // yoğun park ağaçları
    for (let x = 0; x < PW; x += 2) { if (x > 560 && x < 720) continue; const a = x / PW * TAU; const h = Math.round(9 + 3 * Math.sin(a * 17) + 2 * Math.sin(a * 41)) + (r() * 3 | 0);
      g.fillStyle = r() < .5 ? '#2f6a2c' : '#3a7a32'; g.fillRect(x, HY - h, 2, h + 1); }
    // tribün
    g.fillStyle = '#c3ccd4'; g.fillRect(1290, HY - 18, 140, 18); g.fillStyle = '#d22f2a'; g.fillRect(1290, HY - 20, 140, 3);
    for (let y = HY - 15; y < HY - 2; y += 3) for (let x = 1293; x < 1427; x += 2) { g.fillStyle = ['#d22f2a', '#f4f4f4', '#2f9a4a', '#ffd84a'][r() * 4 | 0]; g.fillRect(x, y, 1, 1); }
  } else if (TK === 'baku') {
    for (let k = 0; k < 5; k++) cloud(r() * PW, 8 + r() * 18, 20 + r() * 30, ['#f6dcc0', '#efcfae']);
    for (let x = 0; x < PW; x++) { const a = x / PW * TAU; const h = Math.round(10 + 4 * Math.sin(a * 2 + 2) + 2 * Math.sin(a * 9));
      g.fillStyle = '#a99478'; g.fillRect(x, HY - h, 1, h + 1); }
    // Hazar kıyısı
    g.fillStyle = '#2f6f98'; g.fillRect(0, HY - 6, 520, 7); g.fillRect(1440, HY - 6, PW - 1440, 7);
    for (let i = 0; i < 160; i++) { g.fillStyle = r() < .5 ? '#4a88b0' : '#cfe3ee'; const x = r() < .5 ? r() * 520 : 1440 + r() * 96; g.fillRect(x | 0, HY - 6 + r() * 6 | 0, 2, 1); }
    // şehir
    for (let x = 740; x < 1430;) { const w = 6 + (r() * 9 | 0), h = 8 + (r() * 16 | 0);
      g.fillStyle = ['#d9c7a3', '#cbb48e', '#e4d6bb', '#b9a07a'][r() * 4 | 0]; g.fillRect(x, HY - h, w, h + 1);
      g.fillStyle = '#7b6a52'; for (let yy = HY - h + 3; yy < HY - 1; yy += 3) for (let xx = x + 1; xx < x + w - 1; xx += 2) g.fillRect(xx, yy, 1, 1);
      x += w + (r() * 2 | 0); }
    // Alev Kuleleri
    const flame = (cx, h, w) => {
      for (let y = 0; y < h; y++) { const t = y / h, ww = Math.max(1, Math.round(w * (1 - Math.pow(t, 1.8)))), lean = Math.round(t * t * 3);
        g.fillStyle = (y % 4 === 0 && t > 0.3) ? '#ff9a3a' : t > 0.85 ? '#ffb24a' : '#3f72aa'; g.fillRect(cx - ww + lean, HY - 18 - y, ww * 2, 1);
        g.fillStyle = '#7fb0dc'; g.fillRect(cx - ww + lean, HY - 18 - y, 1, 1); }
    };
    g.fillStyle = '#8f7f62'; for (let x = 1020; x < 1140; x++) { const h = Math.round(19 * Math.sin((x - 1020) / 120 * Math.PI) ** 0.5); g.fillRect(x, HY - h, 1, h); }
    flame(1058, 40, 8); flame(1078, 50, 9); flame(1098, 36, 7);
    // Kız Kulesi
    g.fillStyle = '#c9b48a'; g.fillRect(1230, HY - 30, 12, 30); g.fillStyle = '#a8935f'; g.fillRect(1242, HY - 24, 5, 24);
    for (let y = HY - 28; y < HY - 2; y += 4) { g.fillStyle = '#8a7650'; g.fillRect(1233, y, 6, 1); }
    g.fillStyle = '#8a7650'; for (let x = 1229; x < 1243; x += 3) g.fillRect(x, HY - 32, 2, 2);
  } else if (TK === 'silverstone') {
    for (let k = 0; k < 16; k++) cloud(r() * PW, 3 + r() * 26, 40 + r() * 60, ['#e9eef2', '#dfe6ec', '#cfd8e0', '#f4f6f8']);
    for (let x = 0; x < PW; x++) { const a = x / PW * TAU; const h = Math.round(7 + 2 * Math.sin(a * 5) + Math.sin(a * 13));
      g.fillStyle = '#5e7f52'; g.fillRect(x, HY - h, 1, h + 1); }
    // "Wing" pit binası: uzun beyaz yapı, kanat biçimli çatı
    g.fillStyle = '#e6eaee'; g.fillRect(860, HY - 16, 380, 16);
    g.fillStyle = '#b9c3cc'; for (let x = 864; x < 1236; x += 6) g.fillRect(x, HY - 12, 3, 7);
    for (let x = 850; x < 1250; x++) { const t = (x - 850) / 400, h = Math.round(4 + 5 * Math.sin(t * Math.PI)); g.fillStyle = '#f4f6f8'; g.fillRect(x, HY - 16 - h, 1, 2); }
    // tribünler ve çit ağaçları
    for (const x0 of [140, 1330]) { g.fillStyle = '#c3ccd4'; g.fillRect(x0, HY - 14, 150, 14); g.fillStyle = '#2a4a8a'; g.fillRect(x0, HY - 16, 150, 3);
      for (let y = HY - 11; y < HY - 2; y += 3) for (let x = x0 + 3; x < x0 + 147; x += 2) { g.fillStyle = ['#d22f2a', '#f4f4f4', '#2a62b8', '#ffd84a'][r() * 4 | 0]; g.fillRect(x, y, 1, 1); } }
    for (let x = 0; x < PW; x += 3) { if ((x > 560 && x < 720) || (x > 840 && x < 1260)) continue; const h = 5 + (r() * 6 | 0);
      g.fillStyle = r() < .5 ? '#2f5a2c' : '#3b6b34'; g.fillRect(x, HY - h, 3, h + 1); }
  } else if (TK === 'podyum') {
    for (let k = 0; k < 6; k++) cloud(r() * PW, 4 + r() * 16, 24 + r() * 30, ['#ffffff', '#eef4fa']);
    // Uludağ: geniş, karlı zirve
    for (let x = 0; x < PW; x++) { const t = (x - 960) / 520, a = x / PW * TAU;
      const peak = Math.max(0, 1 - t * t) * 46, ridge = 14 + 5 * Math.sin(a * 3 + .5) + 3 * Math.sin(a * 11);
      const h = Math.round(Math.max(peak + 10 + 3 * Math.sin(x * .05), ridge));
      g.fillStyle = '#6f86a0'; g.fillRect(x, HY - h, 1, h + 1);
      const snow = Math.round((h - 32) * .55 + 2.5 * Math.sin(x * .37) + 1.5 * Math.sin(x * .13)); if (snow > 0) { g.fillStyle = '#f2f6fa'; g.fillRect(x, HY - h, 1, snow); g.fillStyle = '#c9d4e0'; g.fillRect(x, HY - h + snow, 1, 1); } }
    g.fillStyle = 'rgba(199,214,222,.45)'; g.fillRect(0, HY - 16, PW, 16);
    // Bursa şehri
    for (let x = 760; x < 1420;) { const w = 5 + (r() * 8 | 0), h = 5 + (r() * 11 | 0);
      g.fillStyle = ['#e8dcc8', '#d9c7a3', '#f1ece2', '#c9b89a'][r() * 4 | 0]; g.fillRect(x, HY - h, w, h + 1);
      g.fillStyle = '#b55a3a'; g.fillRect(x, HY - h, w, 1); x += w + (r() * 3 | 0); }
    // Yeşil Türbe kubbesi
    g.fillStyle = '#2f8a5a'; g.beginPath(); g.arc(1180, HY - 13, 6, Math.PI, TAU); g.fill(); g.fillRect(1174, HY - 13, 12, 13);
    for (let x = 0; x < PW; x += 5 + (r() * 6 | 0)) { if ((x > 560 && x < 720) || (x > 750 && x < 1430)) continue; const h = 8 + r() * 10 | 0;
      g.fillStyle = '#3f6a2e'; g.fillRect(x, HY - h, 2, h); g.fillRect(x - 1, HY - h + 2, 4, h - 4); }
  } else {   // İstanbul
    for (let k = 0; k < 6; k++) cloud(r() * PW, 8 + r() * 20, 20 + r() * 40, ['#fbe9cf', '#f4dcbc']);
    for (let x = 0; x < PW; x++) { const a = x / PW * TAU; const h = Math.round(13 + 5 * Math.sin(a * 3) + 3 * Math.sin(a * 7 + 1));
      g.fillStyle = '#b29a62'; g.fillRect(x, HY - h, 1, h + 1); g.fillStyle = '#c8b27a'; g.fillRect(x, HY - h, 1, 1); }
    // şehir silüeti: kubbeler ve minareler
    const sil = '#7b8399';
    for (let x = 880; x < 1380; x += 2) { const h = 6 + (r() * 8 | 0); g.fillStyle = '#8e95a8'; g.fillRect(x, HY - 10 - h, 2, h); }
    const mosque = (cx, s) => {
      g.fillStyle = sil; g.fillRect(cx - 14 * s, HY - 18 * s, 28 * s, 8 * s);
      g.beginPath(); g.arc(cx, HY - 18 * s, 10 * s, Math.PI, TAU); g.fill();
      for (const dx of [-10, 10]) { g.beginPath(); g.arc(cx + dx * s, HY - 17 * s, 4 * s, Math.PI, TAU); g.fill(); }
      g.fillRect(cx - 0.5, HY - 31 * s, 1, 4 * s);
      for (const dx of [-20, 20, -26, 26]) { g.fillRect(cx + dx * s - 1, HY - 38 * s, 2, 28 * s); g.beginPath(); g.moveTo(cx + dx * s - 1.5, HY - 38 * s); g.lineTo(cx + dx * s, HY - 44 * s); g.lineTo(cx + dx * s + 1.5, HY - 38 * s); g.fill(); }
    };
    mosque(1000, 1); mosque(1180, 0.8); mosque(1300, 0.65);
    g.fillStyle = sil; g.fillRect(1090, HY - 34, 5, 24); g.beginPath(); g.moveTo(1088, HY - 34); g.lineTo(1092.5, HY - 41); g.lineTo(1097, HY - 34); g.fill();   // Galata
    for (let x = 0; x < PW; x += 9 + (r() * 9 | 0)) { if ((x > 560 && x < 720) || (x > 860 && x < 1400)) continue; const h = 7 + r() * 9 | 0;
      g.fillStyle = '#4c6a3a'; g.fillRect(x, HY - h, 2, h); g.fillRect(x - 1, HY - h + 2, 4, h - 4); }
  }
  g.imageSmoothingEnabled = true; g.drawImage(workshop, 640 - 72, HY - 72, 144, 75); g.imageSmoothingEnabled = false;
  if (!TH.walls && TK !== 'monza' && TK !== 'silverstone' && TK !== 'podyum') for (let x = 0; x < PW; x += 5 + (r() * 6 | 0)) { if (x > 560 && x < 720) continue; if (TK === 'istanbul' && x > 860 && x < 1400) continue;
    const h = 6 + r() * (TK === 'spa' ? 16 : 10) | 0, w = Math.ceil(h * 0.3);
    for (let y = 0; y < h; y++) { const ww = Math.round(y / h * w); g.fillStyle = TK === 'spa' ? '#173f27' : '#3d5a2e'; g.fillRect(x - ww, HY - h + y + 1, ww * 2 + 1, 1); } }
  pano = c;
}
function addObj(o) { objs.push(o); if (o.r) { const k = (o.x / GC | 0) + ',' + (o.y / GC | 0); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(o); } }
function buildObjects() {
  objs.length = 0; grid.clear(); pickups.length = 0;
  const r = rng(21 + TK.length * 13);
  const farFromTrack = (x, y, m) => { for (let i = 0; i < NS; i += 3) { const d = sq(x - SX[i]) + sq(y - SY[i]); const lim = TW / 2 + m + (GRAV[i] && TH.runoff ? 46 : 0); if (d < lim * lim) return false; } return true; };
  const awayFromBuildings = (x, y) => Math.hypot(x - WS.x, y - WS.y) > 110 && Math.hypot(x - STAND.x, y - STAND.y) > 70;
  if (TH.walls) {
    const palm = TK === 'baku' ? 0.3 : 0.22;
    for (let i = 0; i < NS; i += 6) for (const side of [-1, 1]) {
      const d = TW / 2 + 28 + r() * 10, x = SX[i] + RNX(i) * side * d, y = SY[i] + RNY(i) * side * d;
      if (y > TH.seaY - 32 || !awayFromBuildings(x, y) || !farFromTrack(x, y, 22)) continue;
      if (TK === 'baku' && x > 600 && x < 1040 && y > 440 && y < 660) continue;   // İçerişehir
      if (r() < palm) addObj({ x, y, img: imgPalm, ww: 22, r: 0 });
      else addObj({ x, y, img: BUILDINGS[r() * BUILDINGS.length | 0], ww: 30 + r() * 12, r: 0 });
    }
    for (let i = 0; i < (TK === 'baku' ? 14 : 40); i++) addObj({ x: 60 + r() * (TS - 120), y: TH.seaY + 58 + r() * (TS - TH.seaY - 90), img: imgYacht, ww: 26 + r() * 10, r: 0 });
  } else {
    const n = TK === 'spa' ? 420 : TK === 'monza' ? 360 : TK === 'podyum' ? 260 : TK === 'silverstone' ? 120 : 170;
    for (let t = 0; t < 2400 && objs.length < n; t++) {
      const x = 60 + r() * (TS - 120), y = 60 + r() * (TS - 120);
      if (!awayFromBuildings(x, y) || !farFromTrack(x, y, 26)) continue;
      const k = r();
      if (TK === 'spa') addObj(k < 0.6 ? { x, y, img: imgDarkPine, ww: 26, r: 4 } : k < 0.9 ? { x, y, img: imgPine, ww: 24, r: 4 } : { x, y, img: imgPine2, ww: 20, r: 4 });
      else if (TK === 'silverstone') addObj(k < 0.5 ? { x, y, img: imgAutumn, ww: 26, r: 4 } : { x, y, img: imgPine2, ww: 22, r: 4 });
      else if (TK === 'podyum') addObj(k < 0.5 ? { x, y, img: imgPoplar, ww: 16, r: 3 } : k < 0.8 ? { x, y, img: imgCypress, ww: 12, r: 3 } : { x, y, img: imgPine, ww: 22, r: 4 });
      else if (TK === 'monza') addObj(k < 0.4 ? { x, y, img: imgPine2, ww: 22, r: 4 } : k < 0.75 ? { x, y, img: imgPoplar, ww: 16, r: 3 } : { x, y, img: imgAutumn, ww: 26, r: 4 });
      else addObj(k < 0.45 ? { x, y, img: imgCypress, ww: 12, r: 3 } : k < 0.8 ? { x, y, img: imgPoplar, ww: 14, r: 3 } : { x, y, img: imgAutumn, ww: 24, r: 4 });
    }
    for (let i = 0; i < NS; i += 7) if (GRAV[i] && GRAV[(i + 7) % NS]) { const side = -Math.sign(KV[i]) || 1, d = TW / 2 + 47;
      addObj({ x: SX[i] + RNX(i) * side * d, y: SY[i] + RNY(i) * side * d, img: imgTires, ww: 9, r: 4 }); }
  }
  for (let i = 40; i < NS; i += Math.floor(NS / 10)) { const side = (i / 7 | 0) % 2 ? 1 : -1; const d = TW / 2 + (TH.walls ? 9 : 16);
    if (GRAV[i] && TH.runoff && side === -Math.sign(KV[i])) continue;
    const x = SX[i] + RNX(i) * side * d, y = SY[i] + RNY(i) * side * d; if (TH.seaY && y > TH.seaY - 32) continue;
    addObj({ x, y, img: imgBanner, ww: 30, r: TH.walls ? 0 : 3 }); }
  addObj({ x: WS.x, y: WS.y, img: workshop, ww: 96, r: 34 });
  addObj({ x: STAND.x, y: STAND.y, img: imgStand, ww: 80, r: 26 });
  addObj({ x: SX[0], y: SY[0], img: imgGantry, ww: TW + 16 });
  for (let k = 0; k < 12; k++) { const i = Math.floor((k + 0.4) * NS / 12) % NS, lat = ((k * 37) % 7 / 6 - 0.5) * TW * 0.6;
    pickups.push({ x: SX[i] + RNX(i) * lat, y: SY[i] + RNY(i) * lat, tk: new Map() }); }
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < NS; i++) { x0 = Math.min(x0, SX[i]); y0 = Math.min(y0, SY[i]); x1 = Math.max(x1, SX[i]); y1 = Math.max(y1, SY[i]); }
  const s = (MM - 10) / Math.max(x1 - x0, y1 - y0); mmScale = { s, x0: x0 - (MM / s - (x1 - x0)) / 2, y0: y0 - (MM / s - (y1 - y0)) / 2 };
  const [c, g] = mk(MM, MM); g.fillStyle = 'rgba(6,18,30,.78)'; g.fillRect(0, 0, MM, MM);
  g.strokeStyle = '#e6eef5'; g.lineWidth = 2; g.lineJoin = 'round'; g.beginPath();
  for (let i = 0; i <= NS; i += 4) { const k = i % NS; const x = (SX[k] - mmScale.x0) * mmScale.s, y = (SY[k] - mmScale.y0) * mmScale.s; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.closePath(); g.stroke(); const sx = (SX[0] - mmScale.x0) * mmScale.s, sy = (SY[0] - mmScale.y0) * mmScale.s; g.fillStyle = '#ffd84a'; g.fillRect(sx - 1, sy - 2, 2, 4);
  minimap = c;
  boxes.length = 0; obst.length = 0; haz.length = 0;
}
// yarış başında: eşya kutuları ve engeller (tohum herkes için aynı)
function placeRaceItems(cfg, seed) {
  boxes.length = 0; obst.length = 0; haz.length = 0;
  for (const p of pickups) p.tk.clear();
  const rows = [0, 5, 9][cfg.items | 0] || 0;
  const rowIdx = [];
  for (let k = 0; k < rows; k++) {
    const i = Math.floor((k + 0.7) * NS / rows) % NS; rowIdx.push(i);
    for (const f of [-0.36, -0.12, 0.12, 0.36]) boxes.push({ x: SX[i] + RNX(i) * f * TW, y: SY[i] + RNY(i) * f * TW, tk: new Map(), ph: Math.random() * 6 });
  }
  const r = rng((seed | 0) % 2147483646 + 1);
  let n = [0, 10, 18, 30][cfg.obst | 0] || 0; if (TH.walls) n = Math.round(n * 0.6);
  for (let k = 0, guard = 0; k < n && guard < 500; guard++) {
    const i = Math.floor(r() * NS);
    if (i < 40 || i > NS - 25) continue;
    if (rowIdx.some(ri => Math.abs(ri - i) < 8)) continue;
    if (obst.some(o => Math.abs(o.i - i) < 10)) continue;
    const t = r(), lat = (r() - 0.5) * (TW - 20);
    const at = l => ({ x: SX[i] + RNX(i) * l, y: SY[i] + RNY(i) * l });
    if (t < 0.45) { for (const dl of [-6, 0, 6]) obst.push({ i, k: 'cone', ...at(clamp(lat + dl, -TW / 2 + 5, TW / 2 - 5)), tk: new Map() }); }
    else if (t < 0.72) obst.push({ i, k: 'barrel', ...at(lat), r: 3.5 });
    else obst.push({ i, k: 'oil', ...at(lat) });
    k++;
  }
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
const SURF = { road: { top: 1, drag: 0.15, grip: 1 }, curb: { top: 0.96, drag: 0.22, grip: 0.92 }, grass: { top: 0.55, drag: 1.0, grip: 0.68 },
  gravel: { top: 0.38, drag: 2.2, grip: 0.5 }, runoff: { top: 0.9, drag: 0.32, grip: 0.9 }, wall: { top: 0.9, drag: 0.4, grip: 0.9 } };
const SURFS = ['road', 'curb', 'grass', 'gravel', 'runoff', 'wall'];
const TB_DEF = [1.35, 1.8];
const statsOf = s => ({ top: 230 + 90 * s.top, acc: 110 + 130 * s.acc, turn: 2.1 + 1.3 * s.turn, grip: 4.5 + 7 * s.grip });
function makeCar(def, slot, kind) {
  const gp = gridPos(slot);
  return { def, kind, stats: statsOf(def.s), x: gp.x, y: gp.y, a: gp.a, vx: 0, vy: 0, av: 0, idx: gp.i, lap: -1, maxLap: -1, lapStart: 0, laps: [], bestLap: 0,
    finished: false, fin: 0, total: 0, turbo: 25, turboOn: false, lane: (Math.random() - 0.5) * 0.4, laneT: 1 + Math.random() * 2, surf: 'road', slip: 0,
    skill: 0.96 + Math.random() * 0.05, hitT: 0, buf: [], vf: 0, f: gp.i / NS, name: def.name, id: 0, seen: 0,
    item: null, itemT: 0, boostT: 0, shieldT: 0, spinT: 0, spinDir: 1, zapT: 0, flags: 0, mm: 1, mmT: 1, mT: 2 + Math.random() * 3, mTier: null };
}
const speedF = c => c.kind === 'remote' ? c.vf : c.vx * Math.cos(c.a) + c.vy * Math.sin(c.a);
function stepCar(c, inp, dt) {
  const st = c.stats, fx = Math.cos(c.a), fy = Math.sin(c.a), rxv = -fy, ryv = fx;
  let vf = c.vx * fx + c.vy * fy, vl = c.vx * rxv + c.vy * ryv;
  const sf = SURF[c.surf] || SURF.road;
  let top = st.top * sf.top, acc = st.acc;
  const tb = c.def.tb || TB_DEF;
  if (c.turboOn) { top *= tb[0]; acc *= tb[1]; }
  if (c.def.myst) { top *= c.mm; acc *= c.mm; }
  if (c.zapT > 0) { top *= 0.55; acc *= 0.6; }
  if (inp.thr > 0.05) { if (vf < top) vf += acc * inp.thr * dt * (1 - Math.max(0, vf) / top * 0.6); }
  else if (inp.thr < -0.05) { if (vf > 8) vf -= 280 * -inp.thr * dt; else vf = Math.max(-70, vf - 100 * -inp.thr * dt); }
  vf -= vf * sf.drag * dt + Math.sign(vf) * Math.min(Math.abs(vf), 14 * dt);
  vf -= 170 * (hAt(c.x + fx * 8, c.y + fy * 8) - hAt(c.x - fx * 8, c.y - fy * 8)) / 16 * dt;   // yokuş yavaşlatır, iniş hızlandırır
  if (vf > top) vf -= (vf - top) * 2.2 * dt;
  const spd = Math.abs(vf);
  const steerEff = Math.min(1, spd / 45) * (1 - 0.32 * Math.min(1, spd / st.top));
  // turboda hız %35 artıyor; direksiyon da güçlenmezse dönüş yarıçapı açılıp araç viraja giremiyordu
  c.av = inp.steer * st.turn * steerEff * (c.turboOn ? 1.3 : 1) * (vf < -2 ? -1 : 1);
  if (c.spinT > 0) c.av = c.spinDir * 9;
  c.a = wrapA(c.a + c.av * dt);
  let grip = st.grip * sf.grip * (!c.turboOn && inp.thr > 0.5 && Math.abs(inp.steer) > 0.6 && spd > st.top * 0.7 ? 0.6 : 1);
  if (c.spinT > 0) grip *= 0.25;
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
  let lat = (c.x - SX[c.idx]) * RNX(c.idx) + (c.y - SY[c.idx]) * RNY(c.idx);
  let d = Math.abs(lat);
  if (TH.walls && d > TW / 2 + 5) {     // Monako bariyeri
    const s = Math.sign(lat), lim = TW / 2 + 5, nx = RNX(c.idx) * s, ny = RNY(c.idx) * s;
    c.x -= nx * (d - lim); c.y -= ny * (d - lim);
    const vn = c.vx * nx + c.vy * ny;
    if (vn > 0) { c.vx -= nx * vn * 1.3; c.vy -= ny * vn * 1.3; c.vx *= 0.82; c.vy *= 0.82;
      if (c === me && vn > 40 && c.hitT <= 0) { shake = 0.25; sfx('bump'); c.hitT = 0.3; for (let k = 0; k < 4; k++) particles.push({ x: c.x + nx * 4, y: c.y + ny * 4, life: 0.35, max: 0.35, col: '#ffd84a' }); } }
    lat = s * lim; d = lim;
  }
  c.surf = d < TW / 2 ? 'road' : d < TW / 2 + 5 ? 'curb'
    : TH.walls ? 'wall'
    : (TH.runoff && GRAV[c.idx] && Math.sign(lat) === -Math.sign(KV[c.idx]) && d < TW / 2 + 44) ? TH.runoff.surf : 'grass';
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
  const cf = clamp(1.15 - km * 52, 0.42, 1);
  // düzlükte aracın o anki gerçek azami hızına (turbo, gizemli güç) kadar çıkar; virajda tabana göre yavaşlar
  const effTop = c.stats.top * (c.turboOn ? (c.def.tb || TB_DEF)[0] : 1) * (c.def.myst ? c.mm : 1);
  const target = (cf >= 1 ? Math.max(c.stats.top, effTop) : c.stats.top * cf) * skill;
  return { steer: clamp(diff * 3, -1, 1), thr: vf < target ? 1 : vf > target * 1.08 ? -0.6 : 0.15, turbo: c.def.regen ? (c.turbo > 8 && km < 0.007) : (c.turbo > 50 && km < 0.003 && vf > target * 0.8) };
}
function collide(list) {
  if (race.collide) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
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
    const solids = [];
    const gx = c.x / GC | 0, gy = c.y / GC | 0;
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) { const l = grid.get((gx + ox) + ',' + (gy + oy)); if (l) solids.push(...l); }
    for (const o of obst) if (o.k === 'barrel' && Math.abs(o.x - c.x) < 20 && Math.abs(o.y - c.y) < 20) solids.push(o);
    for (const o of solids) { const dx = c.x - o.x, dy = c.y - o.y, d = Math.hypot(dx, dy), m = o.r + 4;
      if (d < m && d > 0) { c.x = o.x + dx / d * m; c.y = o.y + dy / d * m; const vn = c.vx * dx / d + c.vy * dy / d;
        if (vn < 0) { c.vx -= dx / d * vn * 1.4; c.vy -= dy / d * vn * 1.4; const k = c.shieldT > 0 ? 0.85 : 0.55; c.vx *= k; c.vy *= k;
          if (c === me && c.hitT <= 0) { shake = 0.3; sfx('crash'); c.hitT = 0.4; } } } }
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
let camA = 0, camX = 0, camY = 0, shake = 0, gT = 0, msg = '', msgT = 0, msgCol = '#ffd84a', zapFlash = 0, hazSeq = 0;
const particles = [], feed = [];
let myId = 0, room = null, board = { tracks: {} }, sendT = 0;
const CFG_DEF = { track: 'istanbul', laps: 3, items: 1, obst: 1, catchup: 1, collide: 1 };
let pcfg = Object.assign({}, CFG_DEF, store.get('hgp-pcfg', {}));
let race = Object.assign({ seed: 1 }, CFG_DEF);

function flash(t, col = '#ffd84a') { msg = t; msgT = 2.2; msgCol = col; }
function pushFeed(t, col = '#e6eef5') { feed.push({ t, col, life: 5 }); if (feed.length > 4) feed.shift(); }
function playerName() { return ($('name').value || '').trim().slice(0, 14); }
const pickTrack = k => k === 'random' ? TRACK_KEYS[Math.random() * TRACK_KEYS.length | 0] : (TRACKS[k] ? k : 'istanbul');

function startPractice() {
  initAudio(); mode = 'practice';
  race = Object.assign({}, pcfg, { track: pickTrack(pcfg.track), seed: (Math.random() * 1e9) | 0 });
  useTrack(race.track);
  const others = CARS.filter(c => c.key !== selCar);
  cars = others.map((def, i) => makeCar(def, i, 'ai'));
  me = makeCar(CARK[selCar], 3, 'me'); me.name = playerName() || 'SEN';
  cars.push(me);
  me.bestStored = store.get('hgp-best-' + race.track + '-' + selCar, 0);
  beginCount();
}
function beginCount() {
  placeRaceItems(race, race.seed);
  particles.length = 0; finishOrder = 0; raceT = 0; countT = 0; graceEnd = 0; msg = ''; msgT = 0; results = null; feed.length = 0;
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
      else if (!me.bestStored || lt < me.bestStored) { me.bestStored = lt; store.set('hgp-best-' + race.track + '-' + selCar, lt); flash('REKOR TUR!'); }
      flash('TUR ' + c.lap + '  ' + fmt2(lt), '#ffffff');
      sfx('lap');
    }
  }
  c.lapStart = raceT;
  if (c === me && c.lap === race.laps - 1) setTimeout(() => flash('SON TUR!'), 900);
  if (mode === 'practice' && c.lap >= race.laps && !c.finished) {
    c.finished = true; c.fin = ++finishOrder; c.total = raceT;
    if (c === me) { state = 'finish'; finishT = 0; sfx('go'); }
  }
}
function standings() {
  return [...cars].sort((a, b) => (b.finished - a.finished) || (a.finished ? a.total - b.total : progOf(b) - progOf(a)));
}

/* ---------------- eşyalar ---------------- */
const ITEM_NAMES = { turbo: 'TURBO', super: 'SÜPER TURBO', oil: 'YAĞ LEKESİ', shield: 'KALKAN', zap: 'ŞİMŞEK' };
function rollItem(c) {
  const st = standings(), n = st.length, r = st.indexOf(c), f = n > 1 ? r / (n - 1) : 0.5;
  const w = race.catchup ? { turbo: 40 - 25 * f, super: 4 + 36 * f, oil: 28 - 22 * f, shield: 14, zap: f > 0.25 ? 26 * f : 0 }
                         : { turbo: 32, super: 10, oil: 24, shield: 16, zap: 10 };
  if (n < 2) w.zap = 0;
  let sum = 0; for (const k in w) sum += w[k];
  let x = Math.random() * sum;
  for (const k in w) { x -= w[k]; if (x <= 0) return k; }
  return 'turbo';
}
function useItem(c) {
  const it = c.item; if (!it || state !== 'race' || c.finished) return; c.item = null;
  if (it === 'turbo') c.turbo = Math.min(100, c.turbo + 50);
  else if (it === 'super') { c.turbo = 100; c.boostT = 1.8; }
  else if (it === 'shield') c.shieldT = 6;
  else if (it === 'oil') {
    const x = c.x - Math.cos(c.a) * 13, y = c.y - Math.sin(c.a) * 13;
    if (mode === 'online' && c === me) send({ type: 'drop', x: +x.toFixed(1), y: +y.toFixed(1) });
    else haz.push({ id: 'L' + (++hazSeq), x, y, owner: c, t0: performance.now() });
  } else if (it === 'zap') {
    const p = progOf(c);
    if (mode === 'online' && c === me) send({ type: 'zap', p: +p.toFixed(4) }); else applyZap(c, p);
    zapFlash = 0.25; sfx('zap');
  }
  if (c === me) { flash(ITEM_NAMES[it] + '!', '#3fd0f0'); if (it !== 'zap') sfx('pick'); }
}
function applyZap(from, p, name) {
  for (const c of cars) {
    if (c === from || c.kind === 'remote' || c.finished) continue;
    if (progOf(c) > p) {
      if (c.shieldT > 0) { if (c === me) flash('KALKAN KORUDU', '#3fd0f0'); continue; }
      c.zapT = 2.6; if (c === me) { flash('ŞİMŞEK ÇARPTI!' + (name ? ' (' + name + ')' : ''), '#ffd84a'); shake = 0.3; }
    }
  }
  zapFlash = 0.25;
}
function spinOut(c) {
  if (c.shieldT > 0) { if (c === me) flash('KALKAN KORUDU', '#3fd0f0'); return; }
  c.spinT = 0.9; c.spinDir = Math.random() < .5 ? -1 : 1; c.vx *= 0.55; c.vy *= 0.55;
  if (c === me) { flash('KAYDIN!', '#ff6a5e'); shake = 0.3; sfx('crash'); }
}
function removeHaz(id) { const i = haz.findIndex(h => h.id === id); if (i >= 0) haz.splice(i, 1); }
function interact(c, now) {
  for (const p of pickups) {
    if (p.tk.get(c) > now || sq(c.x - p.x) + sq(c.y - p.y) > 100) continue;
    p.tk.set(c, now + 4000); c.turbo = Math.min(100, c.turbo + 45);
    if (c === me) { sfx('pick'); flash('+H2 TURBO', '#3fd0f0'); }
  }
  for (const b of boxes) {
    if (b.tk.get(c) > now || sq(c.x - b.x) + sq(c.y - b.y) > 64) continue;
    b.tk.set(c, now + 2200);
    for (let k = 0; k < 6; k++) particles.push({ x: b.x, y: b.y, life: 0.4, max: 0.4, col: k % 2 ? '#79c8f2' : '#ffffff' });
    if (!c.item) { c.item = rollItem(c); c.itemT = 1 + Math.random() * 3; if (c === me) { sfx('box'); flash('EŞYA: ' + ITEM_NAMES[c.item], '#ffffff'); } }
  }
  for (const o of obst) {
    const d2 = sq(c.x - o.x) + sq(c.y - o.y);
    if (o.k === 'cone') {
      if (d2 > 36 || o.tk.get(c) > now) continue;
      o.tk.set(c, now + 12000);
      if (c.shieldT <= 0) { c.vx *= 0.6; c.vy *= 0.6; }
      for (let k = 0; k < 5; k++) particles.push({ x: o.x, y: o.y, life: 0.5, max: 0.5, col: k % 2 ? '#ff7a1a' : '#ffffff' });
      if (c === me) { shake = 0.2; sfx('bump'); }
    } else if (o.k === 'oil') {
      if (d2 > 40 || (c.oilT || 0) > now) continue;
      c.oilT = now + 1500; spinOut(c);
    }
  }
  for (let i = haz.length - 1; i >= 0; i--) {
    const h = haz[i];
    if (sq(c.x - h.x) + sq(c.y - h.y) > 49) continue;
    if ((h.owner === c || (c.id && h.owner === c.id)) && now - h.t0 < 2000) continue;
    spinOut(c); haz.splice(i, 1);
    if (mode === 'online' && c === me) send({ type: 'hazHit', id: h.id });
  }
}

/* ---------------- uzak araçların yumuşatılması ---------------- */
const INTERP = 110;
function pushRemote(c, d, now) {
  // d: [x, y, a, vf, flags, f, surf, lapLocal, serverLap, fin]
  c.buf.push({ t: now, x: d[0], y: d[1], a: d[2], v: d[3], fl: d[4] | 0, f: d[5], s: d[6], lap: d[7] });
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
  c.vf = s1.v; c.flags = s1.fl; c.turboOn = !!(s1.fl & 1); c.f = s1.f; c.surf = SURFS[s1.s | 0] || 'road'; c.lap = s1.lap;
  c.idx = clamp(Math.round(c.f * NS), 0, NS - 1);
}
const flagsOf = c => (c.turboOn ? 1 : 0) | (c.shieldT > 0 ? 2 : 0) | (c.spinT > 0 ? 4 : 0) | (c.zapT > 0 ? 8 : 0) | (c.mm > 1.08 ? 16 : 0) | (c.mm < .92 ? 32 : 0);

/* ---------------- ana güncelleme ---------------- */
function update(dt) {
  gT += dt;
  const now = performance.now();
  joyMenuNav();
  for (const f of feed) f.life -= dt; while (feed.length && feed[0].life <= 0) feed.shift();
  zapFlash = Math.max(0, zapFlash - dt);
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
    for (const k of ['boostT', 'shieldT', 'spinT', 'zapT']) if (c[k] > 0) c[k] = Math.max(0, c[k] - dt);
    if (c.def.myst) { if (state === 'race' && !c.finished) { c.mT -= dt; if (c.mT <= 0) rollMyst(c); } c.mm += (c.mmT - c.mm) * Math.min(1, dt * 2.5); }
    if (c.spinT > 0) inp = { steer: 0, thr: 0, turbo: false };
    c.turboOn = c.boostT > 0 || (!!inp.turbo && c.turbo > 0 && speedF(c) > 20);
    if (c.turboOn && c.boostT <= 0) { c.turbo = Math.max(0, c.turbo - 30 * dt); }
    else if (c.def.regen && state === 'race') c.turbo = Math.min(100, c.turbo + c.def.regen * dt);   // scooter bataryası kendini doldurur
    if (c === me && c.turboOn && !me.wasTurbo) sfx('turbo');
    if (c === me) me.wasTurbo = c.turboOn;
    if (racing && c.item && (c.kind === 'ai' || BOT)) { c.itemT -= dt; if (c.itemT <= 0 && state === 'race') useItem(c); }
    stepCar(c, inp, dt);
    trackUpdate(c, true);
    if (state === 'race' || state === 'finish') interact(c, now);
    c.hitT -= dt;
    const sp = Math.abs(speedF(c));
    if ((c.slip > 38 && (c.surf === 'road' || c.surf === 'curb')) || (sp > 60 && (c.surf === 'grass' || c.surf === 'gravel'))) {
      const fx = Math.cos(c.a), fy = Math.sin(c.a), bx = c.x - fx * 6, by = c.y - fy * 6;
      if (Math.random() < 0.6) particles.push({ x: bx + (Math.random() - .5) * 6, y: by + (Math.random() - .5) * 6, life: 0.7, max: 0.7,
        col: c.surf === 'gravel' ? '#d8c690' : c.surf === 'grass' ? (TK === 'istanbul' ? '#a8984a' : '#6b8f3a') : '#d9dde2' });
      if (c.surf === 'road' && c.slip > 38) for (const s of [-3, 3]) { const px = bx + -fy * s | 0, py = by + fx * s | 0; if (px > 0 && py > 0 && px < TS && py < TS) tex[py * TS + px] = SKID; }
    }
  }
  for (const c of cars) {
    const tb = c.kind === 'remote' ? !!(c.flags & 1) : c.turboOn;
    if (tb && Math.random() < 0.5) particles.push({ x: c.x - Math.cos(c.a) * 9, y: c.y - Math.sin(c.a) * 9, life: 0.3, max: 0.3, col: '#ffb03b' });
    const fl = c.kind === 'remote' ? c.flags : flagsOf(c);
    if ((fl & 16) && Math.random() < 0.6) particles.push({ x: c.x - Math.cos(c.a) * 8 + (Math.random() - .5) * 6, y: c.y - Math.sin(c.a) * 8 + (Math.random() - .5) * 6, life: 0.4, max: 0.4, col: Math.random() < .5 ? '#c792ea' : '#ffffff' });
    if ((fl & 32) && Math.random() < 0.35) particles.push({ x: c.x - Math.cos(c.a) * 8, y: c.y - Math.sin(c.a) * 8, life: 0.6, max: 0.6, col: '#7d858c' });
    const zp = c.kind === 'remote' ? !!(c.flags & 8) : c.zapT > 0;
    if (zp && Math.random() < 0.5) particles.push({ x: c.x + (Math.random() - .5) * 8, y: c.y + (Math.random() - .5) * 8, life: 0.25, max: 0.25, col: '#ffd84a' });
  }
  collide(cars);
  for (let i = haz.length - 1; i >= 0; i--) if (now - haz[i].t0 > 30000) haz.splice(i, 1);
  stepParticles(dt);
  if (racing) raceT = mode === 'online' ? (now - goAt) / 1000 : raceT + dt;
  if (state === 'finish') { finishT += dt; if (mode === 'practice' && finishT > 2.5) { results = practiceResults(); state = 'results'; } }
  if (mode === 'online' && me && (state === 'count' || racing)) {
    sendT -= dt;
    if (sendT <= 0) { sendT = 0.05;
      send({ type: 's', d: [+me.x.toFixed(1), +me.y.toFixed(1), +me.a.toFixed(3), +speedF(me).toFixed(1), flagsOf(me), +me.f.toFixed(4), SURFS.indexOf(me.surf), me.lap] }); }
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
  const fx = Math.cos(camA), fy = Math.sin(camA);
  camX = c.x - fx * CAMD; camY = c.y - fy * CAMD;
  // kamera yerden yükseklikte kalır, yokuşa bakarken eğilir
  const hc = hAt(c.x, c.y), hb = hAt(camX, camY);
  const zT = Math.max(hc, hb) + CAMH, sl = (hAt(c.x + fx * 40, c.y + fy * 40) - hb) / (40 + CAMD);
  const pT = Math.atan(sl) * 0.75, kk = Math.min(1, dt * 6);
  if (!isFinite(camZ) || Math.abs(camZ - zT) > 60) camZ = zT; else camZ += (zT - camZ) * Math.min(1, dt * 10);
  camP += (pT - camP) * kk;
}
function updateAttract(dt, now) {
  let live = null;
  for (const [id, c] of spec) { if (now - c.seen > 3000) { spec.delete(id); continue; } updRemote(c, now); if (!live || progOf(c) > progOf(live)) live = c; }
  if (live) { followCam(live, dt); return; }
  if (!demo || demo.def.key !== selCar || demo.tk !== TK) {
    const keep = demo && demo.tk === TK ? demo : null; demo = makeCar(CARK[selCar], 0, 'ai'); demo.tk = TK;
    if (keep) Object.assign(demo, { x: keep.x, y: keep.y, a: keep.a, vx: keep.vx, vy: keep.vy, idx: keep.idx }); else camA = demo.a;
  }
  const inp = aiDrive(demo, dt, null); demo.turboOn = false;
  stepCar(demo, inp, dt); trackUpdate(demo, false); collide([demo]);
  stepParticles(dt);
  followCam(demo, dt);
}
function practiceResults() {
  return standings().map(c => ({ name: c === me ? (playerName() || 'SEN') : cname(c.def), car: c.def.key, finished: c.finished, total: c.total, best: c.bestLap, me: c === me }));
}

/* =========================================================
   ÇİZİM
   ========================================================= */
let ground, g32, haze, groundC, groundG;
let camZ = CAMH, camP = 0, horizonY = HY, groundTop = H;
const rowD = new Float32Array(H);
// Her satır için kameradan çıkan ışını araziye çarpana kadar ilerlet (yokuş, tepe, çukur)
function drawGround() {
  const fx = Math.cos(camA), fy = Math.sin(camA), rx = -fy, ry = fx;
  const tp = Math.tan(camP), MAXD = 1700;
  let d = 4, y = H - 1;
  for (; y >= 0; y--) {
    const sv = (y - HY) / F, t = (sv - tp) / (1 + sv * tp);
    let hit = false;
    while (d < MAXD) { if (camZ - d * t <= hAt(camX + fx * d, camY + fy * d)) { hit = true; break; } d += d < 60 ? 0.6 : d * 0.012; }
    let dist = d;
    if (!hit) { const dd = t !== 0 ? (camZ - HFAR) / t : -1; if (dd > MAXD) dist = dd; else break; }
    rowD[y] = dist; drawRow(y, dist, fx, fy, rx, ry);
  }
  groundTop = y + 1;
  for (let yy = 0; yy <= y; yy++) rowD[yy] = Infinity;
  if (groundTop > 0) g32.fill(0, 0, groundTop * W);
  groundG.putImageData(ground, 0, 0);
  ctx.drawImage(groundC, 0, 0);
  ctx.fillStyle = haze; ctx.save(); ctx.translate(0, Math.round(horizonY - HY)); ctx.fillRect(0, HY, W, 46); ctx.restore();
}
function drawRow(row, dist, fx, fy, rx, ry) {
  const sc = dist / F;
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
// derinliği verilen bir nesnenin, önündeki tepe yüzünden görünmeyen kısmı: bu satırın altı örtülü
function clipY(depth) {
  const lim = depth * 0.97 - 2;
  let lo = groundTop, hi = H;           // rowD aşağı doğru küçülür
  while (lo < hi) { const m = (lo + hi) >> 1; if (rowD[m] < lim) hi = m; else lo = m + 1; }
  return lo;
}
function proj(x, y) {
  const fx = Math.cos(camA), fy = Math.sin(camA);
  const dx = x - camX, dy = y - camY, depth = dx * fx + dy * fy;
  if (depth < 5) return null;
  const lat = dx * -fy + dy * fx, k = F / depth;
  const z = hAt(camX + fx * depth, camY + fy * depth), b = (camZ - z) / depth, tp = Math.tan(camP);
  return { sx: W / 2 + lat * k, gy: HY + F * (b + tp) / (1 - b * tp), k, depth };
}
function sprAt(img, p, ww, lift = 0) {
  const dw = ww * p.k, dh = dw * img.height / img.width;
  ctx.drawImage(img, Math.round(p.sx - dw / 2), Math.round(p.gy - dh - lift * p.k), Math.max(1, Math.round(dw)), Math.max(1, Math.round(dh)));
}
function drawWorld(list, target) {
  const now = performance.now(), viewer = me || demo;
  const off = ((camA / TAU * PW) % PW + PW) % PW;
  horizonY = HY + F * Math.tan(camP); const py = Math.round(horizonY - HY);
  if (py > 0) { ctx.fillStyle = TH.sky[0]; ctx.fillRect(0, 0, W, py); }
  ctx.drawImage(pano, -Math.round(off), py); ctx.drawImage(pano, PW - Math.round(off), py);
  if (py < 0) { ctx.fillStyle = TH.sky[TH.sky.length - 1]; ctx.fillRect(0, HY + py, W, -py + 1); }
  drawGround();
  const items = [];
  const add = (x, y, t, o, maxD) => { const p = proj(x, y); if (p && p.depth < maxD) items.push({ p, o, t }); };
  for (const o of objs) { const p = proj(o.x, o.y); if (!p || p.depth > 1500) continue; const w = o.ww * p.k; if (p.sx + w < -20 || p.sx - w > W + 20) continue; items.push({ p, o, t: 0 }); }
  for (const pk of pickups) if (!(pk.tk.get(viewer) > now)) add(pk.x, pk.y, 1, pk, 700);
  for (const b of boxes) if (!(b.tk.get(viewer) > now)) add(b.x, b.y, 5, b, 800);
  for (const o of obst) if (!(o.k === 'cone' && o.tk.get(viewer) > now)) add(o.x, o.y, 6, o, 800);
  for (const h of haz) add(h.x, h.y, 7, h, 700);
  for (const pa of particles) add(pa.x, pa.y, 2, pa, 500);
  for (const c of list) { if (c === target) continue; add(c.x, c.y, 3, c, 1200); }
  if (target) { const p = proj(target.x, target.y) || { depth: CAMD, sx: W / 2, gy: HY + CAMH * F / CAMD, k: F / CAMD }; items.push({ p, o: target, t: 4 }); }
  items.sort((a, b) => b.p.depth - a.p.depth);
  for (const it of items) {
    const { p, o } = it;
    const cy = it.t === 4 ? H : clipY(p.depth);
    if (cy < p.gy - 0.5) {                       // tepenin arkasında: kısmen ya da tamamen gizli
      if (cy < p.gy - 90 * p.k || cy <= 0) continue;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, cy); ctx.clip(); drawItem(it, now, viewer); ctx.restore();
    } else drawItem(it, now, viewer);
  }
}
function drawItem(it, now, viewer) {
  const { p, o } = it;
  {
    if (it.t === 0) sprAt(o.img, p, o.ww);
    else if (it.t === 1) {
      const dw = 6 * p.k, dh = dw * 10 / 8, bob = (Math.sin(gT * 4 + o.x) * 1.5 + 3) * p.k;
      ctx.fillStyle = 'rgba(63,208,240,.25)'; ctx.fillRect(Math.round(p.sx - dw * 0.8), Math.round(p.gy - dh - bob - dw * 0.3), Math.round(dw * 1.6), Math.round(dh + dw * 0.6));
      ctx.drawImage(imgH2, Math.round(p.sx - dw / 2), Math.round(p.gy - dh - bob), Math.max(1, Math.round(dw)), Math.max(1, Math.round(dh)));
    } else if (it.t === 5) {
      const sc = Math.max(0.2, Math.abs(Math.cos(gT * 2.5 + o.ph))), dw = 7 * p.k, bob = (Math.sin(gT * 3 + o.ph) * 1 + 3) * p.k;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(Math.round(p.sx - dw / 2), Math.round(p.gy - 1), Math.round(dw), Math.max(1, Math.round(p.k * .6)));
      ctx.drawImage(imgBox, Math.round(p.sx - dw * sc / 2), Math.round(p.gy - dw - bob), Math.max(1, Math.round(dw * sc)), Math.max(1, Math.round(dw)));
    } else if (it.t === 6) {
      if (o.k === 'cone') sprAt(imgCone, p, 4.2);
      else if (o.k === 'barrel') sprAt(imgBarrel, p, 7);
      else sprAt(imgOil, p, 14);
    } else if (it.t === 7) sprAt(imgOil, p, 13);
    else if (it.t === 2) {
      const a = o.life / o.max, s = clamp(Math.round((3 + (1 - a) * 5) * p.k * 0.6), 1, 9);
      ctx.globalAlpha = a * 0.8; ctx.fillStyle = o.col; ctx.fillRect(Math.round(p.sx - s / 2), Math.round(p.gy - s - (1 - a) * 4 * p.k), s, s); ctx.globalAlpha = 1;
    } else if (it.t === 3) {
      const los = Math.atan2(o.y - camY, o.x - camX);
      const k = ((Math.round(wrapA(o.a - los) / TAU * SN) % SN) + SN) % SN;
      const ds = p.k * VW / SS;
      { const rel = wrapA(o.a - los), sw = (3.4 + 4.6 * Math.abs(Math.sin(rel))) * p.k; ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(Math.round(p.sx - sw), Math.round(p.gy - p.k * 0.5), Math.round(sw * 2), Math.max(1, Math.round(p.k * 1))); }
      ctx.drawImage(o.def.sheet[k], Math.round(p.sx - SOX * ds), Math.round(p.gy - SOY * ds), Math.round(SW_ * ds), Math.round(SH_ * ds));
      const fl = o.kind === 'remote' ? o.flags : flagsOf(o);
      if (fl & 1) for (let i = 0; i < 3; i++) { ctx.fillStyle = i % 2 ? '#ffd84a' : '#ff7a1a'; ctx.fillRect(Math.round(p.sx - 2 + Math.random() * 4), Math.round(p.gy - 3 - Math.random() * 3), 2, 2); }
      if (fl & 2) shieldRing(p.sx, p.gy - 4 * p.k, 10 * p.k);
      if (p.depth < 240) { const tag = o.kind === 'ai' ? cname(o.def) : o.name; txt(tag, p.sx, p.gy - 22 * p.k * VW - 12, o.def.col, 8, 'center'); }
    } else {
      const s = p.k * VW, phi = wrapA(o.a - camA);
      const bounce = (o.surf === 'grass' || o.surf === 'gravel') && Math.abs(speedF(o)) > 30 ? Math.round(Math.random() * 2) : 0;
      { const sw = (3.6 + 4.6 * Math.abs(Math.sin(phi))) * p.k; ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(Math.round(p.sx - sw), Math.round(p.gy - 2), Math.round(sw * 2), 4); }
      M.renderCar(ctx, o.def.model, Math.PI / 2 - phi, s, p.sx, p.gy - bounce, PITCH);
      if (o.turboOn) for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#ffd84a' : '#ff7a1a'; ctx.fillRect(Math.round(p.sx - 7 + Math.random() * 14), Math.round(p.gy - 12 + Math.random() * 8), 3, 3); }
      const fl = o.kind === 'remote' ? o.flags : flagsOf(o);
      if (fl & 2) shieldRing(p.sx, p.gy - 12, 36);
      if (fl & 8) for (let i = 0; i < 5; i++) { ctx.fillStyle = '#ffd84a'; const x = p.sx - 24 + Math.random() * 48, y = p.gy - 30 + Math.random() * 26; ctx.fillRect(Math.round(x), Math.round(y), 2, 6); ctx.fillRect(Math.round(x) + 2, Math.round(y) + 5, 2, 4); }
    }
  }
}
function shieldRing(x, y, r) {
  ctx.strokeStyle = 'rgba(63,208,240,' + (0.45 + 0.25 * Math.sin(gT * 10)) + ')'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, 0, 0, TAU); ctx.stroke();
}
function drawRain() {
  ctx.strokeStyle = 'rgba(210,222,235,.35)'; ctx.lineWidth = 1; ctx.beginPath();
  const t = gT * 300;
  for (let i = 0; i < 90; i++) { const x = (i * 97 + t * 0.4) % (W + 40) - 20, y = (i * 53 + t) % (H + 20) - 10; ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 9); }
  ctx.stroke();
}
function panel(x, y, w, h) { ctx.fillStyle = 'rgba(6,18,30,.88)'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#2a94d8'; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2); }
const boardFor = (tk) => (board.tracks && board.tracks[tk]) || { laps: [], races: [] };
function hud() {
  logoBadge(ctx, 4, 4);
  if (state === 'results') { drawResults(); return; }
  const st = standings(), pos = st.indexOf(me) + 1;
  txt(String(pos), 6, 24, '#ffffff', 16); txt('/' + cars.length, 24, 32, '#9ecbef', 8);
  // eşya kutusu
  if (race.items) {
    const ix = 50, iy = 22; ctx.fillStyle = '#000'; ctx.fillRect(ix - 1, iy - 1, 22, 22); ctx.fillStyle = me.item ? '#13304d' : '#0b1a2a'; ctx.fillRect(ix, iy, 20, 20);
    ctx.fillStyle = '#2a94d8'; ctx.fillRect(ix, iy, 20, 1); ctx.fillRect(ix, iy + 19, 20, 1);
    if (me.item) { ctx.drawImage(ICONS[me.item], ix + 2, iy + 2, 16, 16); if (Math.floor(gT * 3) % 2) txt(coarse ? 'EŞYA' : 'E', ix + 24, iy + 7, '#ffd84a', 6, 'left'); }
  }
  txt('TUR ' + clamp(me.lap + 1, 1, race.laps) + '/' + race.laps, W / 2, 5, '#ffffff', 8, 'center');
  txt(fmt(state === 'count' ? 0 : raceT), W / 2, 16, '#ffd84a', 8, 'center');
  const kmh = Math.round(Math.abs(speedF(me)) * 0.22);
  txt(String(kmh), W - 46, 6, '#ffffff', 16, 'right'); txt('KM/H', W - 6, 14, '#9ecbef', 8, 'right');
  const recL = boardFor(race.track).laps[0];
  const rec = mode === 'online' ? (recL && recL.time) : me.bestStored;
  txt('REKOR ' + (rec ? fmt(rec) : '--:--.-'), W - 6, 28, '#c3ccd4', 8, 'right');
  if (me.bestLap) txt('SENİN ' + fmt(me.bestLap), W - 6, 38, '#9ecbef', 8, 'right');
  const mob = coarse;   // telefonda alt köşeler dokunmatik tuşlara ayrılır
  const tbx = mob ? W / 2 - 50 : 6, tby = mob ? 30 : H - 27;
  if (!mob) txt('TURBO', tbx, tby, '#9ecbef');
  txt('H2', tbx, tby + 12 - (mob ? 1 : 0), '#3fd0f0'); ctx.fillStyle = '#000'; ctx.fillRect(tbx + 22, tby + 11, 72, 10); ctx.fillStyle = '#20313f'; ctx.fillRect(tbx + 23, tby + 12, 70, 8);
  ctx.fillStyle = me.turboOn ? (Math.floor(gT * 10) % 2 ? '#ffd84a' : '#ff7a1a') : '#3fd0f0'; ctx.fillRect(tbx + 23, tby + 12, Math.round(me.turbo * 0.7), 8);
  if (me.def.myst) { const t = me.mTier || MYST[2]; txt('GÜÇ x' + me.mm.toFixed(2), tbx + 98, tby + 12, t[2], 8); }
  const mx = W - MM - 4, my = mob ? 48 : H - MM - 4; ctx.drawImage(minimap, mx, my);
  for (const c of cars) { const x = mx + (c.x - mmScale.x0) * mmScale.s, y = my + (c.y - mmScale.y0) * mmScale.s, s = c === me ? 3 : 2;
    ctx.fillStyle = '#000'; ctx.fillRect(Math.round(x) - s, Math.round(y) - s, s + 2, s + 2); ctx.fillStyle = c.def.col; ctx.fillRect(Math.round(x) - s + 1, Math.round(y) - s + 1, s, s); }
  st.forEach((c, i) => { const y = 50 + i * 10; ctx.fillStyle = c.def.col; ctx.fillRect(6, y + 1, 4, 6);
    const nm = (c.kind === 'ai' ? cname(c.def) : c.name).toLocaleUpperCase('tr').slice(0, 10);
    txt((i + 1) + ' ' + nm, 13, y, c === me ? '#ffd84a' : c.finished ? '#5fd16b' : '#e6eef5', 8); });
  feed.forEach((f, i) => { ctx.globalAlpha = Math.min(1, f.life); if (mob) txt(f.t, W / 2, 84 + i * 10, f.col, 8, 'center'); else txt(f.t, W - 6, 52 + i * 10, f.col, 8, 'right'); ctx.globalAlpha = 1; });
  const dot = Math.cos(me.a) * TX[me.idx] + Math.sin(me.a) * TY[me.idx];
  if (state === 'race' && me.spinT <= 0 && dot < -0.35 && Math.abs(speedF(me)) > 15 && Math.floor(gT * 3) % 2) txt('TERS YÖN!', W / 2, 60, '#ff6a5e', 16, 'center');
  if (msgT > 0) txt(msg, W / 2, 40 + (mob ? 22 : 0), msgCol, 8, 'center');
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
  if (state === 'count') txt(TRACKS[race.track].name + ' · ' + race.laps + ' TUR', W / 2, 58, '#ffffff', 8, 'center');
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
  else if (TK) txt(TRACKS[TK].name, 6, 24, '#ffffff', 8);
}
function render() {
  if (state === 'boot') { ctx.fillStyle = '#0a1f33'; ctx.fillRect(0, 0, W, H); txt('YÜKLENİYOR…', W / 2, H / 2 - 4, '#e6eef5', 8, 'center'); return; }
  ctx.save();
  if (shake > 0 && !reduced) ctx.translate(Math.round((Math.random() - .5) * 4), Math.round((Math.random() - .5) * 3));
  if (state === 'menu' || state === 'room') {
    const list = spec.size ? [...spec.values()] : [demo];
    let target = demo; if (spec.size) target = list.reduce((a, b) => progOf(b) > progOf(a) ? b : a);
    drawWorld(list, target); if (TH.rain && !reduced) drawRain(); ctx.restore(); drawAttractHUD(); return;
  }
  drawWorld(cars, me);
  if (TH.rain && !reduced) drawRain();
  ctx.restore();
  if (zapFlash > 0) { ctx.fillStyle = 'rgba(255,248,200,' + (zapFlash * 2) + ')'; ctx.fillRect(0, 0, W, H); }
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
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = c.name;
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
  if (!p.b.offsetParent && !force) return;
  if (on) p.yaw += 0.025;
  const g = p.g; g.imageSmoothingEnabled = false; g.clearRect(0, 0, 96, 48);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(18, 38, 60, 4);
  M.renderCar(g, CARK[p.key].model, on ? p.yaw : -Math.PI / 2 + .7, 1.35, 48, 38, .5);
}
function showScreen(which) {
  $('scrEntry').hidden = which !== 'entry';
  $('scrRoom').hidden = which !== 'room';
  $('scrPractice').hidden = which !== 'practice';
  $('overlay').hidden = !which;
}
/* ---- yarış ayarları paneli ---- */
const THUMBS = {};
function cfgUI(el, onChange) {
  el.textContent = '';
  let cur = Object.assign({}, CFG_DEF), editable = true;
  const mkEl = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const row = label => { const r = mkEl('div', 'cfgrow'); r.append(mkEl('span', 'cl', label)); el.append(r); return r; };
  const tr = row('PİST'), tg = mkEl('div', 'tracks'); tr.append(tg);
  const tbtn = [...TRACK_KEYS, 'random'].map(k => {
    const b = mkEl('button', 'trk'); b.type = 'button';
    const c = document.createElement('canvas'); c.width = 64; c.height = 40;
    if (k === 'random') { const g = c.getContext('2d'); g.fillStyle = '#e6eef5'; g.font = '20px "Press Start 2P", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 32, 22); }
    else c.getContext('2d').drawImage(THUMBS[k], 0, 0);
    b.append(c, mkEl('span', null, k === 'random' ? 'RASTGELE' : TRACKS[k].short));
    b.onclick = () => editable && onChange({ track: k }); tg.append(b); return [k, b];
  });
  const lr = row('TUR SAYISI'), st = mkEl('div', 'stepper'), minus = mkEl('button', 'btn ghost', '−'), val = mkEl('b', 'sv', '3'), plus = mkEl('button', 'btn ghost', '+');
  minus.type = plus.type = 'button'; st.append(minus, val, plus); lr.append(st);
  minus.onclick = () => editable && onChange({ laps: Math.max(1, cur.laps - 1) });
  plus.onclick = () => editable && onChange({ laps: Math.min(10, cur.laps + 1) });
  const seg = (label, key, opts) => {
    const r = row(label), s = mkEl('div', 'seg'); r.append(s);
    const bs = opts.map((o, i) => { const b = mkEl('button', null, o); b.type = 'button'; b.onclick = () => editable && onChange({ [key]: i }); s.append(b); return b; });
    return () => bs.forEach((b, i) => { b.setAttribute('aria-pressed', String(cur[key] === i)); b.disabled = !editable; });
  };
  const syncs = [seg('EŞYA KUTULARI', 'items', ['KAPALI', 'NORMAL', 'BOL']), seg('ENGELLER', 'obst', ['YOK', 'AZ', 'NORMAL', 'ÇOK']),
    seg('YAKALAMA BONUSU', 'catchup', ['KAPALI', 'AÇIK']), seg('ARAÇ ÇARPIŞMASI', 'collide', ['KAPALI', 'AÇIK'])];
  el.append(mkEl('p', 'note', 'Yakalama bonusu açıkken geride kalan daha güçlü eşya alır (süper turbo, şimşek).'));
  return {
    set(cfg, ed) {
      cur = Object.assign({}, CFG_DEF, cfg); editable = ed;
      for (const [k, b] of tbtn) { b.setAttribute('aria-pressed', String(cur.track === k)); b.disabled = !ed; }
      val.textContent = cur.laps; minus.disabled = plus.disabled = !ed;
      syncs.forEach(f => f());
    }
  };
}
let cfgRoomUI, cfgPracUI;
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
  if (cfgRoomUI) cfgRoomUI.set(room.cfg || CFG_DEF, isHost && !live);
  $('cfgHint').textContent = isHost ? '(sen ayarlıyorsun)' : '(oda sahibi ayarlar)';
  $('roomNote').textContent = live ? (room.phase === 'results' ? 'Sonuçlar gösteriliyor, birazdan lobiye dönülecek.' : 'Yarış sürüyor, canlı izliyorsun. Bir sonraki yarışa katılacaksın.')
    : isHost ? (room.players.length < 2 ? 'Tek başına da başlatabilirsin; arkadaşların sonraki yarışa katılır.' : 'Herkes hazırsa başlat.') : 'Oda sahibinin (' + (host ? host.name : '…') + ') başlatması bekleniyor.';
  if (!live && room.cfg && room.cfg.track !== 'random' && state === 'room') useTrack(room.cfg.track);
}
let lbTab = 'laps', lbTrack = 'istanbul';
const OBST_NAMES = ['ENGELSİZ', 'AZ', 'NORMAL', 'ÇOK'];
function renderBoard() {
  for (const b of document.querySelectorAll('#lbTracks .tab')) b.setAttribute('aria-selected', String(b.dataset.t === lbTrack));
  const list = (boardFor(lbTrack)[lbTab] || []).slice(0, 10), tb = $('lb').tBodies[0]; tb.textContent = '';
  const mine = playerName().toLocaleLowerCase('tr');
  list.forEach((r, i) => {
    const tr = document.createElement('tr'); if (i < 3) tr.className = 'top' + (i + 1); if (mine && r.name.toLocaleLowerCase('tr') === mine) tr.classList.add('me');
    const c = CARK[r.car] || CARS[0];
    const td = (t, cls) => { const d = document.createElement('td'); if (cls) d.className = cls; d.textContent = t; return d; };
    const carTd = td(''); const sw = document.createElement('span'); sw.className = 'sw'; sw.style.background = c.col; carTd.append(sw, document.createTextNode(c.name));
    tr.append(td(String(i + 1), 'r'), td(r.name), carTd, td(r.obst == null ? '—' : OBST_NAMES[r.obst] || '—', 'ob o' + r.obst), td(fmt2(r.time), 't'));
    tb.append(tr);
  });
  $('lbEmpty').hidden = list.length > 0;
}
$('tabLap').onclick = () => { lbTab = 'laps'; $('tabLap').setAttribute('aria-selected', 'true'); $('tabRace').setAttribute('aria-selected', 'false'); renderBoard(); };
$('tabRace').onclick = () => { lbTab = 'races'; $('tabRace').setAttribute('aria-selected', 'true'); $('tabLap').setAttribute('aria-selected', 'false'); renderBoard(); };
for (const k of TRACK_KEYS) { const b = document.createElement('button'); b.className = 'tab'; b.dataset.t = k; b.textContent = TRACKS[k].short; b.onclick = () => { lbTrack = k; renderBoard(); }; $('lbTracks').append(b); }

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
$('btnPractice').onclick = () => { if (state === 'boot') return; store.set('hgp-name', playerName()); showScreen('practice'); cfgPracUI.set(pcfg, true); if (pcfg.track !== 'random') useTrack(pcfg.track); };
$('btnPBack').onclick = () => showScreen('entry');
$('btnPStart').onclick = () => startPractice();
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
      if (m.phase === 'lobby' && (state === 'results' || state === 'finish' || state === 'race' || state === 'count')) { cars = []; me = null; graceEnd = 0; state = 'room'; showScreen('room'); renderRoom(); }
      break;
    case 'leftRoom': room = null; mode = null; spec.clear(); state = 'menu'; showScreen('entry'); try { history.replaceState(null, '', location.pathname); } catch (e) {} break;
    case 'error': ($('scrRoom').hidden ? $('entryErr') : $('roomErr')).textContent = m.msg; break;
    case 'count':
      race = Object.assign({}, CFG_DEF, m.cfg || {}, { seed: m.seed | 0 });
      useTrack(race.track);
      if (m.grid.includes(myId)) enterOnlineRace(m.grid);
      break;
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
    case 'drop': haz.push({ id: m.id, x: m.x, y: m.y, owner: m.owner, t0: now }); break;
    case 'hazGone': removeHaz(m.id); break;
    case 'zap':
      if (m.id !== myId && me && !me.finished && state === 'race' && progOf(me) > m.p) {
        if (me.shieldT > 0) flash('KALKAN KORUDU', '#3fd0f0');
        else { me.zapT = 2.6; flash('ŞİMŞEK ÇARPTI! (' + nameOf(m.id).toLocaleUpperCase('tr').slice(0, 8) + ')', '#ffd84a'); shake = 0.3; }
      }
      if (state === 'race' || state === 'finish') { zapFlash = 0.25; sfx('zap'); }
      break;
    case 'left': { const i = cars.findIndex(c => c.id === m.id); if (i >= 0 && cars[i] !== me) { pushFeed(cars[i].name.toLocaleUpperCase('tr').slice(0, 10) + ' AYRILDI', '#ff6a5e'); cars.splice(i, 1); } spec.delete(m.id); break; }
  }
}

/* =========================================================
   GİRDİ
   ========================================================= */
const BOT = params.has('bot');
let autoGas = store.get('hgp-autogas', false);
let turboLatch = store.get('hgp-tlatch', false), latched = false;
$('turboLatch').checked = turboLatch;
$('turboLatch').onchange = () => { turboLatch = $('turboLatch').checked; store.set('hgp-tlatch', turboLatch); };
$('autoGas').checked = autoGas;
$('autoGas').onchange = () => { autoGas = $('autoGas').checked; store.set('hgp-autogas', autoGas); };
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
// fiziksel tuş konumuna göre oku (Shift basılıyken harfler/Türkçe F klavye fark etmesin)
const CODEK = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', KeyE: 'e', KeyQ: 'q', KeyX: 'x', KeyP: 'p', Space: ' ', ShiftLeft: 'shift', ShiftRight: 'shift',
  ArrowUp: 'arrowup', ArrowDown: 'arrowdown', ArrowLeft: 'arrowleft', ArrowRight: 'arrowright' };
const keyName = e => CODEK[e.code] || (e.key || '').toLowerCase();
addEventListener('keydown', e => {
  if (drawerOpen()) { if (e.key === 'Escape') closeDrawers(); return; }
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
  const k = keyName(e);
  const inGame = state === 'race' || state === 'count' || state === 'finish' || state === 'paused';
  if (inGame && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (inGame && k !== 'enter') { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); }
  else if (tag === 'button' && (k === 'enter' || k === ' ')) return;
  if (!e.repeat) {
    if (k === 'enter') confirmAction();
    if (k === 'escape' || k === 'p') togglePause();
    if ((k === 'e' || k === 'x' || k === 'q') && me && inGame) useItem(me);
    if ((k === ' ' || k === 'shift') && turboLatch && state === 'race') latched = !latched;
    if (k === 'm') nextSong();
    if ((state === 'menu' || state === 'room') && (k === 'arrowleft' || k === 'arrowright')) {
      const i = CARS.findIndex(c => c.key === selCar); chooseCar(CARS[(i + (k === 'arrowright' ? 1 : CARS.length - 1)) % CARS.length].key);
    }
  }
  keys[k] = true;
});
addEventListener('keyup', e => { keys[keyName(e)] = false; keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
cv.addEventListener('pointerdown', e => {
  initAudio(); if (state === 'results' || state === 'paused') confirmAction();
  const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
});
// dokunmatik: her parmak hangi tuşun üstündeyse o basılı sayılır; parmağı kaldırmadan tuştan tuşa kaydırılabilir
const touchBtns = [...document.querySelectorAll('#touch button[data-k]')];
const touchPtrs = new Map();
const keyAt = (x, y) => { const el = document.elementFromPoint(x, y); const b = el && el.closest ? el.closest('#touch button[data-k]') : null; return b ? b.dataset.k : null; };
function syncTouch() {
  const act = new Set(touchPtrs.values());
  for (const b of touchBtns) { const k = b.dataset.k, on = act.has(k); b.classList.toggle('on', on); keys[k] = on; }
}
$('touch').addEventListener('pointerdown', e => {
  const k = keyAt(e.clientX, e.clientY); if (!k) return;
  e.preventDefault(); initAudio(); touchPtrs.set(e.pointerId, k); syncTouch();
});
addEventListener('pointermove', e => { if (!touchPtrs.has(e.pointerId)) return; const k = keyAt(e.clientX, e.clientY); if (k !== touchPtrs.get(e.pointerId)) { touchPtrs.set(e.pointerId, k); syncTouch(); } }, { passive: true });
const touchEnd = e => { if (touchPtrs.delete(e.pointerId)) syncTouch(); };
addEventListener('pointerup', touchEnd); addEventListener('pointercancel', touchEnd);
$('tItem').addEventListener('pointerdown', e => { e.preventDefault(); if (me) useItem(me); });
const clamp1 = v => clamp(v, -1, 1);
function readInput() {
  const kS = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0);
  const kT = (keys.arrowup || keys.w ? 1 : 0) - (keys.arrowdown || keys.s ? 1 : 0);
  const tS = (coarse && ctlMode === 'tilt' && tilt.on) ? tilt.steer : 0;
  const kTurbo = !!(keys[' '] || keys.shift);
  if (turboLatch) {   // tek basışla aç/kapat (keydown'da çevrilir): bazı klavyeler ↑+←+Space'i aynı anda okuyamıyor
    if (latched && (keys.arrowdown || keys.s || (me && me.turbo <= 0 && me.boostT <= 0) || state !== 'race')) latched = false;
  } else latched = false;
  const turbo = !!((turboLatch ? latched : kTurbo) || (joy.ok && joy.b));
  let thr = clamp1(kT + (joy.ok ? joy.y : 0));
  if (coarse && autoGas && !keys.arrowdown) thr = Math.max(thr, 1);     // otomatik gaz
  if (turbo && thr > -0.3) thr = 1;                                     // H2 basılıyken gaz da basılı sayılır
  lastInput = { steer: clamp1(kS + tS + (joy.ok ? joy.x : 0)), thr, turbo };
  return lastInput;
}
let navLatch = false;
function joyMenuNav() {
  if (!joy.ok || (state !== 'menu' && state !== 'room')) { navLatch = false; return; }
  if (!navLatch && Math.abs(joy.x) > 0.6) { const i = CARS.findIndex(c => c.key === selCar); chooseCar(CARS[(i + (joy.x > 0 ? 1 : CARS.length - 1)) % CARS.length].key); navLatch = true; }
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
  else if (b && !joy.b && me && me.item && state === 'race') useItem(me);
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
    if (MUS) { MUS.init(ac, ac.destination); MUS.setVolume(muted ? 0 : mvol); MUS.onEnd = () => { if (musicSel === 'shuffle') playSong(randomSong()); }; playSong(musicSel === 'shuffle' ? randomSong() : musicSel); }
  } catch (e) { ac = null; }
}
/* ---------------- müzik ---------------- */
const MUS = window.HGP_MUSIC;
let musicSel = store.get('hgp-music', 'shuffle'), mvol = store.get('hgp-mvol', 0.45);
const randomSong = () => { const l = MUS.songs.filter(s => s.id !== MUS.current); return l[Math.random() * l.length | 0].id; };
function playSong(id) {
  if (!MUS || !ac) return;
  if (id === 'off' || !id) { MUS.stop(); renderSongs(); return; }
  MUS.play(id); renderSongs();
  const s = MUS.songs.find(x => x.id === id); if (s && (state === 'race' || state === 'count')) flash('♪ ' + s.name.toLocaleUpperCase('tr'), '#3fd0f0');
}
function nextSong() {
  if (!MUS) return; initAudio();
  const ids = MUS.songs.map(s => s.id), i = ids.indexOf(MUS.current);
  playSong(ids[(i + 1) % ids.length]);
}
function renderSongs() {
  const el = $('songList'); if (!el || !MUS) return; el.textContent = '';
  const opts = [{ id: 'shuffle', name: 'KARIŞIK', mood: 'Her şarkı bitince başka biri' }, ...MUS.songs, { id: 'off', name: 'KAPALI', mood: 'Sadece motor ve efektler' }];
  for (const o of opts) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'song';
    const on = o.id === musicSel || (musicSel === 'shuffle' && o.id === MUS.current);
    b.setAttribute('aria-pressed', String(on));
    const t = document.createElement('b'); t.textContent = o.name.toLocaleUpperCase('tr'); const m = document.createElement('span'); m.textContent = o.mood;
    b.append(t, m);
    b.onclick = () => { initAudio(); musicSel = o.id; store.set('hgp-music', o.id); playSong(o.id === 'shuffle' ? (MUS.current || randomSong()) : o.id); };
    el.append(b);
  }
}
if (MUS) {
  $('mvol').value = Math.round(mvol * 100);
  $('mvol').oninput = () => { mvol = $('mvol').value / 100; store.set('hgp-mvol', mvol); if (!muted) MUS.setVolume(mvol); };
}
function sfx(type) {
  if (!ac || muted) return;
  const t = ac.currentTime;
  if (type === 'turbo' || type === 'crash' || type === 'bump' || type === 'zap') {
    const len = type === 'turbo' ? 0.5 : 0.25, buf = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    f.type = type === 'turbo' ? 'bandpass' : type === 'zap' ? 'highpass' : 'lowpass'; f.frequency.value = type === 'turbo' ? 1200 : type === 'zap' ? 2500 : 500;
    g.gain.value = type === 'bump' ? 0.05 : 0.09; src.buffer = buf; src.connect(f).connect(g).connect(ac.destination); src.start(t); return;
  }
  const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; let dur = 0.18;
  if (type === 'pick') { o.frequency.setValueAtTime(660, t); o.frequency.setValueAtTime(990, t + 0.06); }
  else if (type === 'beep') o.frequency.setValueAtTime(440, t);
  else if (type === 'go') { o.frequency.setValueAtTime(880, t); dur = 0.4; }
  else if (type === 'box') { o.frequency.setValueAtTime(523, t); o.frequency.setValueAtTime(784, t + 0.05); o.frequency.setValueAtTime(1047, t + 0.1); dur = 0.22; }
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
$('muteBtn').onclick = () => { initAudio(); muted = !muted; store.set('hgp-mute', muted); muteSync(); if (muted && engGain) engGain.gain.value = 0; if (MUS) MUS.setVolume(muted ? 0 : mvol); };

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
const drawers = { board: $('drawerBoard'), set: $('drawerSet'), music: $('drawerMusic') };
const openDrawer = k => { for (const d of Object.values(drawers)) d.hidden = true; drawers[k].hidden = false; const b = drawers[k].querySelector('[data-close]'); if (b) b.focus(); };
const closeDrawers = () => { for (const d of Object.values(drawers)) d.hidden = true; };
const drawerOpen = () => Object.values(drawers).some(d => !d.hidden);
$('boardBtn').onclick = () => openDrawer('board');
$('setBtn').onclick = () => openDrawer('set');
$('musicBtn').onclick = () => { initAudio(); renderSongs(); openDrawer('music'); };
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
  $('tItem').hidden = !race.items;
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
  buildArt();
  for (const k of TRACK_KEYS) THUMBS[k] = trackThumb(k, 64, 40);
  [groundC, groundG] = mk(W, H); ground = groundG.createImageData(W, H); g32 = new Uint32Array(ground.data.buffer);
  useTrack(pcfg.track !== 'random' ? pcfg.track : 'istanbul');
  buildPicker($('carsEntry')); buildPicker($('carsRoom')); syncPickers();
  cfgRoomUI = cfgUI($('cfgRoom'), patch => { if (room && room.host === myId) send({ type: 'cfg', cfg: Object.assign({}, CFG_DEF, room.cfg, patch) }); });
  cfgPracUI = cfgUI($('cfgPractice'), patch => {
    pcfg = Object.assign({}, pcfg, patch); store.set('hgp-pcfg', pcfg); cfgPracUI.set(pcfg, true);
    if (patch.track && patch.track !== 'random') useTrack(patch.track);
  });
  cfgPracUI.set(pcfg, true);
  renderBoard();
  state = 'menu'; showScreen('entry');
  connect();
}
window.__hgp = { get state() { return state; }, get room() { return room; }, get me() { return me; }, get cars() { return cars; }, get board() { return board; },
  get myId() { return myId; }, get race() { return race; }, get NS() { return NS; }, get tex() { return tc; }, send, chooseCar, useTrack, useItem, startPractice,
  setPcfg(c) { pcfg = Object.assign({}, pcfg, c); },
  // denge testi: tek aracı yapay zekâ sürüşüyle hızlandırılmış simüle et, tur sürelerini döndür
  simRace(key, tk, laps, eager) {
    const keep = { state, race, raceT, cars, me }; useTrack(tk);
    race = Object.assign({}, CFG_DEF, { items: 0, obst: 0, collide: 0, laps, track: tk, seed: 1 }); placeRaceItems(race, 1);
    const c = makeCar(CARK[key], 0, 'ai'); cars = [c]; me = null; state = 'race'; raceT = 0; c.lapStart = 0;
    const dt = 1 / 60;
    for (let n = 0; n < 60 * 400 && c.laps.length < laps; n++) {
      raceT += dt; const inp = aiDrive(c, dt, null); if (eager) inp.turbo = c.turbo > 0;   // insan gibi: turbo varsa bas
      for (const k of ['boostT', 'shieldT', 'spinT', 'zapT']) if (c[k] > 0) c[k] = Math.max(0, c[k] - dt);
      if (c.def.myst) { c.mT -= dt; if (c.mT <= 0) rollMyst(c); c.mm += (c.mmT - c.mm) * Math.min(1, dt * 2.5); }
      c.turboOn = c.boostT > 0 || (!!inp.turbo && c.turbo > 0 && speedF(c) > 20);
      if (c.turboOn && c.boostT <= 0) c.turbo = Math.max(0, c.turbo - 30 * dt); else if (c.def.regen) c.turbo = Math.min(100, c.turbo + c.def.regen * dt);
      stepCar(c, inp, dt); trackUpdate(c, true); interact(c, raceT * 1000); collide([c]);
    }
    const out = c.laps.map(x => +x.toFixed(2)); Object.assign({}, keep); state = keep.state; race = keep.race; raceT = keep.raceT; cars = keep.cars; me = keep.me;
    return out;
  }, get haz() { return haz; }, get obst() { return obst; }, get boxes() { return boxes; }, get pano() { return pano; } };
init();
})();
