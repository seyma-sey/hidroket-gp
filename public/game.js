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
  // eğlence aracı: yavaş ama durdurulamaz (engelleri ezer, yağdan etkilenmez, pist kenarında yavaşlamaz)
  // normal hızı çok düşük; H2 turbosuyla ancak diğerlerinin normal hızına çıkar
  { key: 'patpat', name: "HASAN FURKAN'IN PATPATI", short: 'PATPAT', trait: 'Durdurulamaz', col: '#ffd23f', tank: true, offroad: true, topAbs: 205, accAbs: 150, tb: [1.45, 1.6], s: { top: 0, acc: .3, turn: .72, grip: .85 } },
  // hızlı ama yol tutuşu çok düşük: virajda kayar, kontrolü zor
  { key: 'h100', name: "KADİR'İN H100'Ü", short: 'H100', trait: 'Hızlı ama kaygan', col: '#eef0ee', gripAbs: 2.2, turnAbs: 2.5, s: { top: 1.05, acc: .78, turn: .5, grip: 0 } },
  // çok yavaş; hidrojen tüpleri turboyu kendiliğinden doldurur
  { key: 'cart', name: 'ATÖLYENİN ALIŞVERİŞ ARABASI', short: 'MARKET', trait: 'Hidrojen tüplü', col: '#d8302a', topAbs: 175, accAbs: 140, regen: 9, eager: true, tb: [1.6, 2], gas: true, s: { top: 0, acc: .3, turn: .95, grip: .9 } },
  { key: 'passat', name: "SAFA'NIN PASSATI", short: 'PASSAT', trait: 'Konforlu sedan', col: '#f4f4f0', flip: true, s: { top: .85, acc: .68, turn: .72, grip: .78 } },
  { key: 'halis', name: "HALİS'İN SCOOTERI", short: 'HALİS', trait: 'Turbo canavarı', col: '#2f4fd8', tb: [1.9, 2.5], pick: 25, eager: true, s: { top: .4, acc: .62, turn: .95, grip: .85 } }
];
const cname = d => d.short || d.name;
// Gizemli güç kademeleri: [çarpan, ad, renk, olasılık]. Oyuncuya gösterilmez; hızdan sezilir.
const MYST = [[1.38, 'AŞIRI GÜÇ!', '#c792ea', .15], [1.16, 'GÜÇ ARTTI', '#5fd16b', .25], [1, 'NORMAL', '#e6eef5', .28], [.84, 'GÜÇ DÜŞTÜ', '#ffb03b', .2], [.68, 'GÜÇ ÇEKİLDİ', '#ff6a5e', .12]];
function rollMyst(c) {
  let x = Math.random(), t = MYST[2];
  for (const m of MYST) { x -= m[3]; if (x <= 0) { t = m; break; } }
  c.mmT = t[0]; c.mTier = t; c.mT = 3.5 + Math.random() * 3.5;
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
// kampüs binaları: 60-70'lerin bej beton fakülte blokları, tuğla binalar, Gölbaşı'nın yeni mühendislik binaları
const CAMPUS_BLD = [], TAN_BLD = [], GOL_BLD = [];
let imgTent, imgHedge, imgRedTree, imgYellowTree, imgStadStand, imgFlood;
// Tandoğan: kesme taş (Ankara taşı) fakülte binaları, uzun dar pencereler, kırmızı kafesli giriş
function makeStoneBuilding(r) {
  const w = 58 + (r() * 22 | 0), floors = 3 + (r() * 2 | 0), h = floors * 11 + 8;
  const [c, g] = mk(w, h + 4);
  const base = ['#8d7f70', '#968878', '#857868'][r() * 3 | 0];
  g.fillStyle = base; g.fillRect(0, 4, w, h);
  for (let y = 6; y < h + 4; y += 3) for (let x = (y / 3 % 2) * 3; x < w; x += 6) { g.fillStyle = r() < .5 ? '#7d6f61' : '#a29483'; g.fillRect(x, y, 5, 2); }   // taş örgü
  g.fillStyle = '#6e6255'; g.fillRect(0, 0, w, 5); g.fillStyle = '#5c5146'; g.fillRect(0, 4, w, 1);            // saçak
  g.fillStyle = '#00000030'; g.fillRect(w - 4, 4, 4, h);
  const door = (w * (.55 + r() * .25)) | 0;
  for (let f = 0; f < floors; f++) for (let x = 4; x < w - 6; x += 7) { if (Math.abs(x - door) < 8) continue;
    const y = 9 + f * 11; g.fillStyle = '#cfd2cf'; g.fillRect(x - 1, y - 1, 5, 9); g.fillStyle = '#3a4650'; g.fillRect(x, y, 3, 7); g.fillStyle = '#cfd2cf'; g.fillRect(x, y + 3, 3, 1); }
  g.fillStyle = '#9a2335'; g.fillRect(door - 6, h - 22, 12, 26);                                               // kırmızı kafes kapı
  g.fillStyle = '#5e1420'; for (let y = h - 21; y < h + 4; y += 3) g.fillRect(door - 6, y, 12, 1); for (let x = door - 6; x < door + 6; x += 3) g.fillRect(x, h - 22, 1, 26);
  g.fillStyle = '#b9b4a8'; g.fillRect(door - 12, h + 1, 24, 3); g.fillStyle = '#a7a296'; g.fillRect(door - 10, h - 1, 20, 2);   // merdiven
  return c;
}
// Gölbaşı: beyaz-gri modern binalar, mavi cam bantlar, yuvarlak cam kuleler
function makeModernBuilding(r, tower) {
  const w = 60 + (r() * 24 | 0), floors = 3 + (r() * 2 | 0), h = floors * 10 + 6;
  const [c, g] = mk(w, h + 3);
  g.fillStyle = '#e4e8ec'; g.fillRect(0, 3, w, h); g.fillStyle = '#c9d0d6'; g.fillRect(0, 0, w, 4);
  g.fillStyle = '#00000020'; g.fillRect(w - 4, 3, 4, h);
  for (let f = 0; f < floors; f++) { const y = 8 + f * 10; g.fillStyle = '#4f86b8'; g.fillRect(3, y, w - 8, 5); g.fillStyle = '#8fc0e0'; g.fillRect(3, y, w - 8, 1); g.fillStyle = '#e4e8ec'; for (let x = 10; x < w - 6; x += 9) g.fillRect(x, y, 1, 5); }
  if (tower) { const tx = w - 18; g.fillStyle = '#c0cad3'; g.fillRect(tx, 0, 14, h + 3); g.fillStyle = '#3f74a6'; g.fillRect(tx + 3, 4, 8, h - 2); g.fillStyle = '#9cc6e4'; g.fillRect(tx + 4, 4, 1, h - 2); }
  else { g.fillStyle = '#c0cad3'; g.fillRect(0, 0, 10, h + 3); g.fillStyle = '#dfe4e8'; g.fillRect(2, 0, 3, h + 3); }
  g.fillStyle = '#2f4f7a'; g.fillRect((w / 2 | 0) - 8, h - 9, 16, 12); g.fillStyle = '#c8d0d6'; g.fillRect((w / 2 | 0) - 11, h, 22, 3);   // cam giriş + basamak
  g.fillStyle = '#26508a'; g.fillRect((w / 2 | 0) - 10, h - 13, 20, 3);                                                                 // tabela
  return c;
}
function buildCampusArt() {
  for (let i = 0; i < 6; i++) TAN_BLD.push(makeStoneBuilding(rng(301 + i * 19)));
  for (let i = 0; i < 6; i++) GOL_BLD.push(makeModernBuilding(rng(401 + i * 23), i % 2 === 0));
  // açık hava tiyatrosu: beyaz gergi çatı ve kemer kafes
  imgTent = (() => { const [c, g] = mk(70, 34); g.fillStyle = '#e8ecef';
    g.beginPath(); g.moveTo(2, 30); g.quadraticCurveTo(20, 14, 40, 6); g.quadraticCurveTo(58, 2, 68, 22); g.lineTo(68, 26); g.quadraticCurveTo(50, 16, 30, 24); g.lineTo(2, 32); g.fill();
    g.fillStyle = '#c9cfd4'; g.beginPath(); g.moveTo(30, 24); g.quadraticCurveTo(50, 16, 68, 26); g.lineTo(68, 30); g.quadraticCurveTo(48, 22, 30, 28); g.fill();
    g.strokeStyle = '#f4f6f8'; g.lineWidth = 2; g.beginPath(); g.moveTo(24, 32); g.quadraticCurveTo(46, -6, 68, 30); g.stroke();
    g.strokeStyle = '#b9c1c8'; g.lineWidth = 1; for (let t = .1; t < 1; t += .09) { const x = 24 + 44 * t, y = 32 - 38 * 4 * t * (1 - t) * .9; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y + 3); g.stroke(); }
    g.fillStyle = '#d8dde1'; g.fillRect(4, 27, 1, 7); g.fillRect(20, 20, 1, 13);
    g.fillStyle = '#7a5040'; for (let i = 0; i < 6; i++) g.fillRect(34 + i * 5, 29 + (i % 2), 4, 5 - (i % 2));   // basamaklı oturma
    return c; })();
  imgHedge = (() => { const [c, g] = mk(16, 7); const r = rng(55); g.fillStyle = '#2f5a2a'; g.fillRect(0, 1, 16, 6);
    for (let i = 0; i < 40; i++) { g.fillStyle = r() < .5 ? '#3f7234' : '#4f8a3f'; g.fillRect(r() * 15 | 0, r() * 6 | 0, 2, 1); } return c; })();
  const leafTree = (pal, seed) => { const [c, g] = mk(26, 34); const r = rng(seed); g.fillStyle = '#5a4030'; g.fillRect(12, 16, 2, 18); g.fillRect(9, 20, 3, 1); g.fillRect(14, 22, 3, 1);
    for (let i = 0; i < 160; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 11; g.fillStyle = pal[r() * pal.length | 0]; g.fillRect(13 + Math.cos(a) * d | 0, 13 + Math.sin(a) * d * .8 | 0, 2, 2); } return c; };
  imgRedTree = leafTree(['#b8322a', '#d8452e', '#e2643a', '#8f2420'], 61);
  imgYellowTree = leafTree(['#d8b02a', '#e8c840', '#c09020', '#9cae3a'], 62);
  // stadyum tribünü: beyaz dalgalı şemsiye çatı, mavi-beyaz koltuklar
  imgStadStand = (() => { const [c, g] = mk(120, 30); const r = rng(71);
    g.fillStyle = '#8a8f96'; g.fillRect(0, 22, 120, 8);
    for (let y = 12; y < 22; y += 2) for (let x = 2; x < 118; x += 2) { g.fillStyle = r() < .55 ? '#2f5fae' : r() < .5 ? '#e8ecef' : '#c8463a'; g.fillRect(x, y, 2, 1); }
    g.fillStyle = '#c0c6cc'; for (let x = 6; x < 118; x += 14) g.fillRect(x, 4, 1, 9);
    for (let x = 0; x < 120; x++) { const h = 2 + Math.round(2 * Math.abs(Math.sin(x / 120 * Math.PI * 9))); g.fillStyle = '#f2f4f6'; g.fillRect(x, 4 - h + 2, 1, h); }
    return c; })();
  imgFlood = (() => { const [c, g] = mk(10, 64); g.fillStyle = '#9aa0a8'; g.fillRect(4, 8, 2, 56); g.fillStyle = '#6f757c'; g.fillRect(0, 0, 10, 8); g.fillStyle = '#e8eef2'; for (let y = 1; y < 7; y += 2) for (let x = 1; x < 9; x += 2) g.fillRect(x, y, 1, 1); return c; })();
}

function makeCampusBuilding(r, style) {
  const w = 44 + (r() * 20 | 0), floors = style === 'new' ? 3 + (r() * 2 | 0) : 3 + (r() * 3 | 0), h = floors * 9 + 6;
  const [c, g] = mk(w, h + 3);
  const wall = style === 'brick' ? '#b0603e' : style === 'new' ? '#e6e8ea' : ['#e2d6b8', '#d8c9a4', '#e9dfc8'][r() * 3 | 0];
  g.fillStyle = wall; g.fillRect(0, 3, w, h);
  g.fillStyle = '#00000026'; g.fillRect(w - 4, 3, 4, h);
  g.fillStyle = style === 'new' ? '#9aa4ad' : '#8e8574'; g.fillRect(0, 0, w, 4);            // düz çatı / parapet
  for (let f = 0; f < floors; f++) {
    const y = 8 + f * 9;
    if (style === 'new') { g.fillStyle = '#3d6f96'; g.fillRect(2, y, w - 6, 5); g.fillStyle = '#7fb2d4'; for (let x = 4; x < w - 6; x += 7) g.fillRect(x, y, 1, 5); }
    else { g.fillStyle = style === 'brick' ? '#efe2d0' : '#b9ab8a'; g.fillRect(1, y + 6, w - 5, 1);     // kat bandı
      for (let x = 3; x < w - 6; x += 5) { g.fillStyle = '#2d3a46'; g.fillRect(x, y, 3, 5); g.fillStyle = '#ffffff40'; g.fillRect(x, y, 3, 1); } }
  }
  g.fillStyle = '#3b3328'; g.fillRect((w / 2 | 0) - 3, h - 4, 6, 7);                       // giriş
  g.fillStyle = '#5a5a52'; g.fillRect(0, h + 1, w, 2);
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
  for (let i = 0; i < 9; i++) CAMPUS_BLD.push(makeCampusBuilding(rng(77 + i * 13), ['old', 'old', 'brick', 'new'][i % 4]));
  buildCampusArt();
}

/* =========================================================
   PİSTLER
   ========================================================= */
const TRACKS = {
  istanbul: { hk: 0.6, name: 'İSTANBUL PARK', short: 'İSTANBUL', tw: 56, theme: 'istanbul',
    cp: [[1150,1760],[800,1760],[470,1730],[330,1600],[350,1430],[500,1340],[650,1280],[700,1140],[600,1010],[430,930],
      [330,760],[380,560],[560,400],[820,320],[1080,340],[1260,470],[1300,660],[1200,820],[1150,980],[1290,1080],
      [1500,1030],[1680,920],[1820,1000],[1840,1220],[1720,1380],[1560,1430],[1480,1560],[1360,1700]],
    h: [34,34,28,8,4,10,22,30,26,18,12,16,26,34,40,44,40,30,22,16,22,34,46,48,42,36,34,34] },
  monaco: { hk: 0.6, name: 'MONAKO', short: 'MONAKO', tw: 44, theme: 'monaco',
    cp: [[950,1500],[660,1500],[450,1470],[370,1320],[420,1120],[500,920],[470,720],[540,540],[740,470],[900,560],
      [1010,710],[1150,660],[1220,530],[1320,590],[1270,740],[1390,880],[1620,900],[1820,980],[1860,1180],[1720,1270],
      [1640,1390],[1490,1430],[1400,1340],[1300,1430],[1190,1350],[1100,1440],[1050,1500]],
    h: [6,6,6,8,20,34,44,50,52,44,34,30,26,22,16,10,6,4,4,4,4,4,4,4,5,6,6] },
  spa: { hk: 0.38, name: 'SPA', short: 'SPA', tw: 58, theme: 'spa',
    cp: [[760,1680],[520,1720],[360,1650],[400,1530],[590,1470],[760,1370],[830,1240],[790,1110],[880,900],[1030,650],
      [1180,420],[1290,280],[1450,290],[1490,420],[1610,500],[1720,630],[1650,780],[1500,760],[1410,880],[1380,1030],
      [1460,1160],[1610,1210],[1740,1330],[1790,1510],[1690,1660],[1480,1740],[1200,1770],[1010,1740],[900,1700]],
    h: [44,44,42,30,16,6,30,46,56,66,74,80,80,70,60,52,44,38,28,20,14,10,8,10,18,28,36,42,44] },
  monza: { hk: 0.8, name: 'MONZA', short: 'MONZA', tw: 56, theme: 'monza',
    cp: [[250,1450],[250,1200],[250,950],[250,720],[267,620],[352,585],[381,520],[373,430],[417,300],[555,190],[758,140],[990,150],[1178,210],
      [1294,250],[1338,310],[1425,330],[1599,350],[1744,410],[1802,510],[1787,610],[1700,700],[1483,820],[1222,960],[990,1080],
      [874,1150],[801,1230],[714,1280],[656,1350],[642,1500],[642,1650],[613,1760],[468,1830],[308,1800],[257,1680]],
    h: [10,10,10,10,10,10,10,9,8,7,6,6,8,10,11,12,14,15,15,14,12,9,6,4,4,5,6,7,8,9,10,10,10,10] },
  baku: { hk: 0.7, name: 'BAKÜ', short: 'BAKÜ', tw: 44, theme: 'baku',
    cp: [[826,1650],[1166,1650],[1506,1650],[1737,1648],[1825,1613],[1846,1525],[1846,1300],[1832,1200],[1750,1175],[1574,1175],[1492,1163],
      [1465,1088],[1465,900],[1492,825],[1587,800],[1723,800],[1805,775],[1832,675],[1832,500],[1805,400],[1696,375],[1370,375],[1098,375],
      [962,350],[880,275],[798,263],[744,325],[662,350],[581,300],[499,213],[390,200],[282,225],[227,325],[214,550],[200,863],[227,1175],
      [309,1425],[445,1600],[608,1650]],
    h: [4,4,4,4,5,6,8,10,11,12,12,13,14,15,16,16,17,18,20,21,22,22,23,25,28,30,30,29,28,28,27,26,24,20,14,9,6,4,4] },
  silverstone: { hk: 0.8, name: 'SILVERSTONE', short: 'SILVERSTONE', tw: 56, theme: 'silverstone',
    cp: [[311,1685],[311,1461],[333,1304],[398,1214],[441,1125],[462,1046],[549,1013],[635,990],[657,923],[603,878],[527,834],[462,699],
      [419,542],[398,430],[333,363],[246,341],[214,262],[268,195],[365,184],[506,195],[776,206],[1046,218],[1218,251],[1316,330],
      [1370,408],[1456,442],[1521,520],[1542,610],[1607,677],[1672,856],[1715,1080],[1737,1304],[1737,1461],[1672,1550],[1542,1595],[1456,1640],
      [1262,1685],[992,1752],[830,1774],[743,1842],[635,1842],[462,1864],[344,1808]],
    h: [10,10,10,11,12,12,12,12,13,13,13,14,15,16,16,16,16,15,14,13,12,11,10,10,9,9,8,8,8,8,8,8,8,8,8,8,9,9,10,10,10,10,10] },
  podyum: { hk: 0.6, name: 'PODYUM PARK', short: 'PODYUM', tw: 42, theme: 'podyum',
    cp: [[597,1722],[1047,1722],[1422,1707],[1617,1617],[1647,1437],[1497,1347],[1272,1362],[1122,1272],[1137,1107],[1272,987],[1497,957],[1677,867],
      [1722,687],[1617,537],[1422,522],[1272,627],[1107,687],[942,597],[897,432],[777,327],[582,357],[447,507],[477,717],[627,837],
      [747,987],[657,1137],[447,1167],[327,1317],[357,1542],[447,1677]],
    h: [10,10,12,16,20,22,22,24,26,28,30,32,34,34,32,30,30,32,34,34,32,28,24,22,20,18,16,14,12,10] },
  // Ankara Üniversitesi kampüsleri: pist, kampüsün gerçek yollarından (OpenStreetMap) çıkarıldı
  tandogan: { hk: 1, name: 'TANDOĞAN KAMPÜSÜ', short: 'TANDOĞAN', tw: 40, theme: 'tandogan', campus: 'tandogan', rot: 4,
    h: [8, 9, 10, 11, 12, 13, 14, 15, 15, 14, 13, 12, 11, 10, 9, 9, 8, 7, 6, 6, 6, 7, 7, 8] },
  golbasi: { hk: 1, name: 'GÖLBAŞI KAMPÜSÜ', short: 'GÖLBAŞI', tw: 44, theme: 'golbasi', campus: 'golbasi', rot: 5,
    h: [6, 6, 7, 8, 9, 10, 11, 12, 12, 12, 11, 10, 9, 8, 8, 9, 10, 11, 12, 12, 11, 10, 9, 8, 7, 6, 6] }
};
for (const k in TRACKS) { const T = TRACKS[k]; if (!T.campus) continue;
  const d = window.HGP_CAMPUS && window.HGP_CAMPUS[T.campus];
  if (!d) { delete TRACKS[k]; continue; }
  const n = d.cp.length, rot = (T.rot || 0) % n;
  T.cp = d.cp.slice(rot).concat(d.cp.slice(0, rot)); T.h = T.h.slice(rot).concat(T.h.slice(0, rot)); T.feat = d.f;
}
const COMP_TRACKS = ['istanbul', 'monaco', 'spa', 'monza', 'baku', 'silverstone', 'podyum'];   // rekabetçi + antrenman
const TRACK_KEYS = [...COMP_TRACKS, 'tandogan', 'golbasi'].filter(k => TRACKS[k]);              // serbest modda hepsi
const COMP_CARS = ['turaz', 'pars', 'ucube', 'heli'];
const ITEM_KEYS = ['turbo', 'super', 'oil', 'shield', 'zap'];
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
// kampüs zemini: OpenStreetMap çokgenlerinden (binalar, orman, bahçe, saha, otopark, su, diğer yollar)
const featsOf = key => (TRACKS[key].feat || []).map(f => { const i = f.indexOf(':'), a = f.slice(i + 1).split(',').map(Number), p = []; for (let j = 0; j + 1 < a.length; j += 2) p.push([a[j], a[j + 1]]); return { k: f.slice(0, i), p }; });
function polyPath(g, p) { g.beginPath(); p.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); }
function inPoly(x, y, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
const centroid = p => { let x = 0, y = 0; for (const q of p) { x += q[0]; y += q[1]; } return [x / p.length, y / p.length]; };
const bbox = p => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; };
const bigPitch = F => { let b = null, ba = 0; for (const f of F) if (f.k === 'p') { const [x0, y0, x1, y1] = bbox(f.p), a = (x1 - x0) * (y1 - y0); if (a > ba) { ba = a; b = f; } } return b; };
function campusGround(base, lawn, roof) {
  return (g, r) => {
    g.fillStyle = base; g.fillRect(0, 0, TS, TS);
    for (let i = 0; i < 26000; i++) { g.fillStyle = r() < .5 ? '#00000010' : '#ffffff12'; g.fillRect(r() * TS | 0, r() * TS | 0, 2, 1); }
    const F = featsOf(TK), fill = (k, col) => { for (const f of F) if (f.k === k) { g.fillStyle = col; polyPath(g, f.p); g.fill(); } };
    fill('m', '#a39e6a'); fill('u', lawn); fill('g', '#6fa04a');
    fill('f', '#3f6e34'); for (const f of F) if (f.k === 'f') { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of f.p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      for (let i = 0; i < (x1 - x0) * (y1 - y0) / 60; i++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0); if (!inPoly(x, y, f.p)) continue; g.fillStyle = r() < .5 ? '#2f5a28' : '#4d7e3e'; g.fillRect(x | 0, y | 0, 3, 3); } }
    const big = bigPitch(F);
    for (const f of F) if (f.k === 'p') {
      if (f === big && TK === 'golbasi') {          // atletizm pisti: kırmızı tartan, beyaz kulvarlar, yeşil çim
        const [cx, cy] = centroid(f.p), sc = (k, p) => p.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
        g.fillStyle = '#b8463a'; polyPath(g, f.p); g.fill();
        g.strokeStyle = '#f4f0ec'; g.lineWidth = 1; for (const k of [.96, .91, .86, .81]) { polyPath(g, sc(k, f.p)); g.stroke(); }
        g.fillStyle = '#4fa042'; polyPath(g, sc(.76, f.p)); g.fill();
        g.strokeStyle = '#e8f0e0'; g.lineWidth = 2; polyPath(g, sc(.62, f.p)); g.stroke();
        continue; }
      g.fillStyle = '#4d9a42'; polyPath(g, f.p); g.fill(); g.strokeStyle = '#e8f0e0'; g.lineWidth = 2; g.stroke(); }
    for (const f of F) if (f.k === 'k') { g.fillStyle = '#74787e'; polyPath(g, f.p); g.fill(); g.strokeStyle = '#d8dcdf'; g.lineWidth = 1; g.setLineDash([3, 6]); g.stroke(); g.setLineDash([]); }
    for (const f of F) if (f.k === 'h') { g.fillStyle = '#c9b89a'; polyPath(g, f.p); g.fill(); g.strokeStyle = '#a8977a'; g.lineWidth = 2; g.stroke(); }
    fill('w', '#3a7fb8');
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const f of F) if (f.k === 'r' || f.k === 'R' || f.k === 't') { g.beginPath(); f.p.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
      g.strokeStyle = f.k === 't' ? '#a08a5a' : '#8b8e92'; g.lineWidth = f.k === 't' ? 8 : f.k === 'R' ? 20 : 15; g.stroke();
      if (f.k !== 't') { g.strokeStyle = '#5f6369'; g.lineWidth = f.k === 'R' ? 16 : 11; g.stroke(); } }
    for (const f of F) if (f.k === 'b') {                       // bina tabanı: gölge + çatı
      g.save(); g.translate(5, 5); g.fillStyle = 'rgba(30,34,28,.35)'; polyPath(g, f.p); g.fill(); g.restore();
      g.fillStyle = roof; polyPath(g, f.p); g.fill(); g.strokeStyle = '#7e786c'; g.lineWidth = 2; g.stroke(); }
  };
}
THEMES.tandogan = {      // Beşevler: koru ağaçları, fakülte blokları, arkada Ankara silüeti ve Anıtkabir
  sky: ['#3f86d6', '#4b8fda', '#5a99dd', '#6ba3df', '#7daddf', '#90b6dc', '#a3bfd8', '#b5c6d2', '#c4cbcb', '#cfcdc2'],
  haze: 'rgba(207,205,194,', out: [0x9a, 0xa0, 0x5c], ground: campusGround('#9aa05c', '#86a94e', '#9a8c7c'),
  runoff: null
};
THEMES.golbasi = {       // Gölbaşı 50. Yıl: geniş bozkır, kampüs halka yolu, uzakta Mogan Gölü
  sky: ['#3a86dc', '#4891df', '#579be1', '#68a5e3', '#7bafe3', '#8fb9e2', '#a3c2df', '#b6cad9', '#c7d0d2', '#d3d3c8'],
  haze: 'rgba(211,211,200,', out: [0xb4, 0xa8, 0x6a], ground: campusGround('#b4a86a', '#93ad5a', '#cfd3d6'),
  runoff: { col: '#c2b48a', dot: ['#b3a47a', '#d4c79c'], band: null, surf: 'gravel' }
};

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
  for (let i = 0; i < NS; i++) { SX[i] = P[i][0]; SY[i] = P[i][1]; SZ[i] = (P[i][2] || 0) * (T.hk || 1); }   // hk: pistin eğim çarpanı
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
// çizim için yükseklik: ayarlardan eğimli görüntü kapatılırsa düz zemin (fizik herkes için aynı kalır)
let elevView = store.get('hgp-elev', true);
const hR = (x, y) => elevView ? hAt(x, y) : 0;
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
  } else if (TK === 'tandogan') {
    for (let k = 0; k < 6; k++) cloud(r() * PW, 4 + r() * 20, 24 + r() * 36, ['#ffffff', '#eef4fa']);
    for (let x = 0; x < PW; x++) { const a = x / PW * TAU; const h = Math.round(16 + 6 * Math.sin(a * 2 + 1) + 3 * Math.sin(a * 7)); g.fillStyle = '#a89c80'; g.fillRect(x, HY - h, 1, h + 1); }   // Ankara tepeleri
    for (let x = 0; x < PW;) { if (x > 560 && x < 720) { x = 720; continue; } const w = 5 + (r() * 9 | 0), h = 7 + (r() * 16 | 0);       // apartmanlar
      g.fillStyle = ['#e8dcc8', '#e2c9b0', '#f1ece2', '#d8c0a8', '#cfd3d6'][r() * 5 | 0]; g.fillRect(x, HY - h, w, h + 1);
      g.fillStyle = '#7b6a5a'; for (let yy = HY - h + 2; yy < HY - 1; yy += 3) for (let xx = x + 1; xx < x + w - 1; xx += 2) if (r() < .8) g.fillRect(xx, yy, 1, 1);
      x += w + (r() * 2 | 0); }
    // Anıtkabir: tepe, merdiven ve sütunlu mozole
    g.fillStyle = '#6f8a4a'; for (let x = 960; x < 1300; x++) { const t = (x - 960) / 340, h = Math.round(14 * Math.sin(t * Math.PI) ** .6); g.fillRect(x, HY - h, 1, h + 1); }
    const ax = 1080, ab = HY - 13;
    g.fillStyle = '#e8dcc0'; g.fillRect(ax - 8, ab - 3, 116, 3); g.fillRect(ax, ab - 16, 100, 13);
    g.fillStyle = '#b8a888'; for (let x = ax + 3; x < ax + 98; x += 4) g.fillRect(x, ab - 14, 1, 10);
    g.fillStyle = '#d8ccb0'; g.fillRect(ax - 2, ab - 19, 104, 3); g.fillStyle = '#c8bca0'; g.fillRect(ax + 30, ab - 23, 40, 4);
    // Atakule
    g.fillStyle = '#b9bfc6'; g.fillRect(330, HY - 44, 4, 44); g.fillStyle = '#9aa2aa'; g.fillRect(322, HY - 50, 20, 6); g.fillStyle = '#d8dde2'; g.fillRect(326, HY - 54, 12, 4);
    for (let x = 0; x < PW; x += 4 + (r() * 5 | 0)) { if (x > 560 && x < 720) continue; const h = 6 + r() * 9 | 0;                                // koru ağaçları
      g.fillStyle = r() < .5 ? '#3f6e34' : '#4d7e3e'; g.fillRect(x, HY - h, 3, h + 1); }
  } else if (TK === 'golbasi') {
    for (let k = 0; k < 8; k++) cloud(r() * PW, 4 + r() * 22, 30 + r() * 50, ['#ffffff', '#eef4fa', '#e2ebf2']);
    for (let x = 0; x < PW; x++) { const a = x / PW * TAU; const h = Math.round(20 + 8 * Math.sin(a * 2 + .3) + 4 * Math.sin(a * 5 + 1) + 2 * Math.sin(a * 13)); g.fillStyle = '#b8a476'; g.fillRect(x, HY - h, 1, h + 1); g.fillStyle = '#cbb98a'; g.fillRect(x, HY - h, 1, 1); }   // bozkır tepeleri
    for (let x = 0; x < PW; x++) { const a = x / PW * TAU; const h = Math.round(9 + 3 * Math.sin(a * 4)); g.fillStyle = '#a99560'; g.fillRect(x, HY - h, 1, h + 1); }
    g.fillStyle = '#4f8fbf'; g.fillRect(860, HY - 5, 560, 5); g.fillStyle = '#9cc6e0'; for (let i = 0; i < 80; i++) g.fillRect(860 + r() * 560 | 0, HY - 5 + r() * 5 | 0, 3, 1);   // Mogan Gölü
    for (let x = 150; x < 520;) { const w = 6 + (r() * 10 | 0), h = 5 + (r() * 9 | 0); g.fillStyle = ['#e8dcc8', '#f1ece2', '#d9c7a3'][r() * 3 | 0]; g.fillRect(x, HY - h, w, h + 1); g.fillStyle = '#b55a3a'; g.fillRect(x, HY - h, w, 1); x += w + (r() * 4 | 0); }   // Gölbaşı
    for (const x0 of [760, 1420]) { g.fillStyle = '#e6e8ea'; g.fillRect(x0, HY - 16, 70, 16); g.fillStyle = '#3d6f96'; for (let y = HY - 13; y < HY - 2; y += 4) g.fillRect(x0 + 3, y, 64, 2); }   // mühendislik binaları
    for (let x = 0; x < PW; x += 6 + (r() * 10 | 0)) { if ((x > 560 && x < 720) || (x > 860 && x < 1420)) continue; const h = 9 + r() * 10 | 0;      // kavaklar
      g.fillStyle = '#5f7a3a'; g.fillRect(x, HY - h, 2, h); g.fillRect(x - 1, HY - h + 2, 4, h - 4); }
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
  if (!TH.walls && !['monza', 'silverstone', 'podyum', 'tandogan', 'golbasi'].includes(TK)) for (let x = 0; x < PW; x += 5 + (r() * 6 | 0)) { if (x > 560 && x < 720) continue; if (TK === 'istanbul' && x > 860 && x < 1400) continue;
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
  if (TRACKS[TK].campus) {
    const F = featsOf(TK);
    const roadClearC = (x, y, m) => { for (let k = 0; k < NS; k++) if (sq(x - SX[k]) + sq(y - SY[k]) < sq(TW / 2 + m)) return false; return true; };
    for (const f of F) {
      if (f.k === 'b') {                                   // gerçek bina konumları
        let cx = 0, cy = 0, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of f.p) { cx += x; cy += y; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
        cx /= f.p.length; cy /= f.p.length; const sz = Math.min(x1 - x0, y1 - y0), ww = clamp(Math.max(x1 - x0, y1 - y0) * .55, 26, 64);
        if (cx < 30 || cy < 30 || cx > TS - 30 || cy > TS - 30 || !farFromTrack(cx, cy, Math.max(10, sz * .4)) || !awayFromBuildings(cx, cy)) continue;
        const set = TK === 'tandogan' ? TAN_BLD : TK === 'golbasi' ? GOL_BLD : CAMPUS_BLD;
        addObj({ x: cx, y: cy, img: set[(Math.abs(cx * 7 + cy * 3) | 0) % set.length], ww: ww * 1.15, r: clamp(sz * .35, 8, 22) });
      } else if (f.k === 'f' || f.k === 'g') {            // ormanlık alan ve bahçelere ağaç
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of f.p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
        const n = Math.min(60, (x1 - x0) * (y1 - y0) / (f.k === 'f' ? 2600 : 7000));
        for (let i = 0, t = 0; i < n && t < n * 6; t++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
          if (x < 30 || y < 30 || x > TS - 30 || y > TS - 30 || !inPoly(x, y, f.p) || !farFromTrack(x, y, 18) || !awayFromBuildings(x, y)) continue;
          const k = r();
          if (TK === 'tandogan') addObj(k < .25 ? { x, y, img: imgRedTree, ww: 26, r: 4 } : k < .45 ? { x, y, img: imgYellowTree, ww: 26, r: 4 } : k < .8 ? { x, y, img: imgPine2, ww: 24, r: 4 } : { x, y, img: imgDarkPine, ww: 26, r: 4 });
          else addObj(k < .4 ? { x, y, img: imgPoplar, ww: 16, r: 3 } : k < .75 ? { x, y, img: imgPine2, ww: 22, r: 4 } : { x, y, img: imgCypress, ww: 12, r: 3 }); i++; }
      } else if (f.k === 'h' && TK === 'tandogan') {     // açık hava tiyatrosu çadırı
        const [cx, cy] = centroid(f.p); if (farFromTrack(cx, cy, 30)) addObj({ x: cx, y: cy, img: imgTent, ww: 120, r: 26 });
      }
    }
    if (TK === 'tandogan') {     // yol kenarında budanmış şimşir çitler ve ağaç sırası (fotoğraftaki gibi)
      for (let i = 30; i < NS - 10; i += 4) { if (GRAV[i]) continue;
        for (const side of [-1, 1]) { const d = TW / 2 + 11, x = SX[i] + RNX(i) * side * d, y = SY[i] + RNY(i) * side * d;
          if (roadClearC(x, y, 8)) addObj({ x, y, img: imgHedge, ww: 15, r: 2 });
          if (i % 16 === 2) { const d2 = TW / 2 + 26, x2 = SX[i] + RNX(i) * side * d2, y2 = SY[i] + RNY(i) * side * d2;
            if (roadClearC(x2, y2, 18) && awayFromBuildings(x2, y2)) addObj({ x: x2, y: y2, img: (i / 16 | 0) % 3 === 0 ? imgRedTree : (i / 16 | 0) % 3 === 1 ? imgYellowTree : imgPoplar, ww: 26, r: 4 }); } } }
    }
    if (TK === 'golbasi') {      // stadyum: tribün ve ışık direkleri
      const big = bigPitch(F);
      if (big) { const [x0, y0, x1, y1] = bbox(big.p), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        const sx = x1 + 22; if (farFromTrack(sx, cy, 30)) addObj({ x: sx, y: cy, img: imgStadStand, ww: 140, r: 30 });
        for (const [fx, fy] of [[x0 - 12, y0 - 12], [x1 + 12, y0 - 12], [x0 - 12, y1 + 12], [x1 + 12, y1 + 12]]) if (fx > 20 && fy > 20 && fx < TS - 20 && fy < TS - 20 && farFromTrack(fx, fy, 14)) addObj({ x: fx, y: fy, img: imgFlood, ww: 10, r: 2 }); }
    }
    for (let t = 0; t < 900 && objs.length < 420; t++) { const x = 60 + r() * (TS - 120), y = 60 + r() * (TS - 120);   // kampüs dışı seyrek ağaçlar
      if (!farFromTrack(x, y, 40) || !awayFromBuildings(x, y) || r() < .6) continue; addObj(r() < .5 ? { x, y, img: imgPoplar, ww: 16, r: 3 } : { x, y, img: imgAutumn, ww: 24, r: 4 }); }
  } else if (TH.walls) {
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
  // reklam tabelaları: pistin hiçbir yerine (virajın iç tarafındaki başka bir yol parçası dahil) değmemeli
  const roadClear = (x, y, m) => { for (let k = 0; k < NS; k++) if (sq(x - SX[k]) + sq(y - SY[k]) < sq(TW / 2 + m)) return false; return true; };
  for (let i = 40; i < NS; i += Math.floor(NS / 10)) { const pref = (i / 7 | 0) % 2 ? 1 : -1; const d = TW / 2 + (TH.walls ? 9 : 18);
    for (const side of [pref, -pref]) {
      if (GRAV[i] && TH.runoff && side === -Math.sign(KV[i])) continue;
      const x = SX[i] + RNX(i) * side * d, y = SY[i] + RNY(i) * side * d; if (TH.seaY && y > TH.seaY - 32) continue;
      if (!roadClear(x, y, TH.walls ? 6 : 15)) continue;
      addObj({ x, y, img: imgBanner, ww: 30, r: TH.walls ? 0 : 3 }); break;
    } }
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
  const rows = (cfg.itemSet && !cfg.itemSet.length) ? 0 : [0, 5, 9][cfg.items | 0] || 0;
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
const TB_DEF = [1.35, 1.8], SPIN_T = 1.1;
const statsOf = s => ({ top: 230 + 90 * s.top, acc: 110 + 130 * s.acc, turn: 2.1 + 1.3 * s.turn, grip: 4.5 + 7 * s.grip });
function makeCar(def, slot, kind) {
  const gp = gridPos(slot);
  const stats = statsOf(def.s); if (def.topAbs) stats.top = def.topAbs; if (def.accAbs) stats.acc = def.accAbs; if (def.gripAbs) stats.grip = def.gripAbs; if (def.turnAbs) stats.turn = def.turnAbs;
  return { def, kind, stats, x: gp.x, y: gp.y, a: gp.a, vx: 0, vy: 0, av: 0, idx: gp.i, lap: -1, maxLap: -1, lapStart: 0, laps: [], bestLap: 0,
    finished: false, fin: 0, total: 0, turbo: 25, turboOn: false, lane: (Math.random() - 0.5) * 0.4, laneT: 1 + Math.random() * 2, surf: 'road', slip: 0,
    skill: 0.96 + Math.random() * 0.05, hitT: 0, buf: [], vf: 0, f: gp.i / NS, name: def.name, id: 0, seen: 0,
    item: null, itemT: 0, boostT: 0, shieldT: 0, spinT: 0, spinDir: 1, zapT: 0, flags: 0, mm: 1, mmT: 1, mT: 2 + Math.random() * 3, mTier: null };
}
const speedF = c => c.kind === 'remote' ? c.vf : c.vx * Math.cos(c.a) + c.vy * Math.sin(c.a);
function stepCar(c, inp, dt) {
  const st = c.stats, fx = Math.cos(c.a), fy = Math.sin(c.a), rxv = -fy, ryv = fx;
  let vf = c.vx * fx + c.vy * fy, vl = c.vx * rxv + c.vy * ryv;
  // patpat: kum, çim ve kaçış alanında yavaşlamaz (pistten çok uzaklaşırsa normal çim gibi davranır, kestirme olmasın)
  const sf = c.def.offroad ? SURF.road : SURF[c.surf] || SURF.road;   // patpat: toprak, çim, kum, kaçış alanı fark etmez
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
  if (c.spinT > 0 && c.spinA0 != null) {          // yağ lekesi: tam 360° dönüp eski yönünde biter
    const pr = 1 - c.spinT / SPIN_T, e = pr * pr * (3 - 2 * pr), na = wrapA(c.spinA0 + c.spinDir * TAU * e);
    c.av = wrapA(na - c.a) / dt; c.a = na;
  } else {
    if (c.spinA0 != null) { c.a = c.spinA0; c.spinA0 = null; }
    c.a = wrapA(c.a + c.av * dt);
  }
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
  if (TH.walls && d > TW / 2 + 5 && !c.def.tank) {     // şehir pisti bariyeri (patpat bariyeri de dinlemez)
    const s = Math.sign(lat), lim = TW / 2 + 5, nx = RNX(c.idx) * s, ny = RNY(c.idx) * s;
    c.x -= nx * (d - lim); c.y -= ny * (d - lim);
    const vn = c.vx * nx + c.vy * ny;
    if (vn > 0) { c.vx -= nx * vn * 1.3; c.vy -= ny * vn * 1.3; c.vx *= 0.82; c.vy *= 0.82;
      if (c === me && vn > 40 && c.hitT <= 0) { shake = 0.25; sfx('bump'); c.hitT = 0.3; for (let k = 0; k < 4; k++) particles.push({ x: c.x + nx * 4, y: c.y + ny * 4, life: 0.35, max: 0.35, col: '#ffd84a' }); } }
    lat = s * lim; d = lim;
  }
  c.latD = d;
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
  return { steer: clamp(diff * 3, -1, 1), thr: vf < target ? 1 : vf > target * 1.08 ? -0.6 : 0.15, turbo: c.def.eager ? (c.turbo > 8 && km < 0.007) : (c.turbo > 50 && km < 0.003 && vf > target * 0.8) };
}
// patpatın çarptığı nesne devrilir: parçalar saçılır, 20 sn yerde kalır, sonra yerine gelir
function knockNear(c, nowMs) {
  const gx = c.x / GC | 0, gy = c.y / GC | 0;
  for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) { const l = grid.get((gx + ox) + ',' + (gy + oy)); if (!l) continue;
    for (const o of l) { if (o.downT > nowMs || !o.r) continue; if (sq(c.x - o.x) + sq(c.y - o.y) > sq(o.r + 5)) continue;
      o.downT = nowMs + 20000; o.downA = Math.atan2(o.y - c.y, o.x - c.x);
      const tree = o.ww < 30, cols = tree ? ['#3f6e34', '#6b4a2a', '#8ab04a'] : ['#d9d2c3', '#8e8574', '#f4f6f8'];
      for (let k = 0; k < 14; k++) particles.push({ x: o.x + (Math.random() - .5) * 10, y: o.y + (Math.random() - .5) * 10, life: 0.9, max: 0.9, col: cols[k % 3] });
      if (c === me) { shake = 0.25; sfx('crash'); }
    } }
}
function collide(list) {
  if (race.collide) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (a.kind === 'remote' && b.kind === 'remote') continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = 10;
    if (!(d > 0 && d < m)) continue;
    const nx = dx / d, ny = dy / d, push = m - d;
    const aFix = a.kind === 'remote', bFix = b.kind === 'remote';
    let wa = aFix ? 0 : bFix ? 1 : .5, wb = bFix ? 0 : aFix ? 1 : .5;
    if (!aFix && !bFix && a.def.tank !== b.def.tank) { wa = a.def.tank ? .12 : .88; wb = 1 - wa; }   // patpat ağır: çarpan savrulur
    a.x -= nx * push * wa; a.y -= ny * push * wa; b.x += nx * push * wb; b.y += ny * push * wb;
    const avx = aFix ? Math.cos(a.a) * a.vf : a.vx, avy = aFix ? Math.sin(a.a) * a.vf : a.vy;
    const bvx = bFix ? Math.cos(b.a) * b.vf : b.vx, bvy = bFix ? Math.sin(b.a) * b.vf : b.vy;
    const rel = (bvx - avx) * nx + (bvy - avy) * ny;
    if (rel < 0) { const imp = -rel * 0.75;
      if (!aFix) { a.vx -= nx * imp * wa * 2; a.vy -= ny * imp * wa * 2; }
      if (!bFix) { b.vx += nx * imp * wb * 2; b.vy += ny * imp * wb * 2; }
      if ((a === me || b === me) && imp > 30) { shake = 0.2; sfx('bump'); } }
  }
  const nowMs = performance.now();
  for (const c of list) {
    if (c.def.tank) { knockNear(c, nowMs); continue; }   // patpat ağacı, tabelayı, binayı yıkıp geçer
    if (c.kind === 'remote') continue;
    const solids = [];
    const gx = c.x / GC | 0, gy = c.y / GC | 0;
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) { const l = grid.get((gx + ox) + ',' + (gy + oy)); if (l) solids.push(...l); }
    if (!c.def.tank) for (const o of obst) if (o.k === 'barrel' && Math.abs(o.x - c.x) < 20 && Math.abs(o.y - c.y) < 20) solids.push(o);
    for (const o of solids) { if (o.downT > nowMs) continue; const dx = c.x - o.x, dy = c.y - o.y, d = Math.hypot(dx, dy), m = o.r + 4;
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
const CFG_DEF = { track: 'istanbul', laps: 3, items: 1, obst: 1, catchup: 1, collide: 1, cars: CARS.map(c => c.key), itemSet: ITEM_KEYS.slice() };
let pcfg = Object.assign({}, CFG_DEF, store.get('hgp-pcfg', {}));
let race = Object.assign({ seed: 1 }, CFG_DEF);

function flash(t, col = '#ffd84a') { msg = t; msgT = 2.2; msgCol = col; }
function pushFeed(t, col = '#e6eef5') { feed.push({ t, col, life: 5 }); if (feed.length > 4) feed.shift(); }
function playerName() { return ($('name').value || '').trim().slice(0, 14); }
const pickTrack = k => k === 'random' ? COMP_TRACKS[Math.random() * COMP_TRACKS.length | 0] : (TRACKS[k] ? k : 'istanbul');

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
  const allow = race.itemSet || ITEM_KEYS; for (const k in w) if (!allow.includes(k)) w[k] = 0;
  let sum = 0; for (const k in w) sum += w[k];
  if (sum <= 0) return null;
  let x = Math.random() * sum;
  for (const k in w) { x -= w[k]; if (x <= 0) return k; }
  return 'turbo';
}
function useItem(c) {
  const it = c.item; if (!it || state !== 'race' || c.finished) return; c.item = null;
  if (it === 'turbo') c.turbo = Math.min(100, c.turbo + (c.def.pick ? 25 : 50));
  else if (it === 'super') { c.turbo = c.def.pick ? Math.min(100, c.turbo + 50) : 100; c.boostT = 1.8; }
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
  c.spinT = SPIN_T; c.spinA0 = c.a; c.spinDir = Math.random() < .5 ? -1 : 1; c.vx *= 0.55; c.vy *= 0.55;
  if (c === me) { flash('KAYDIN!', '#ff6a5e'); shake = 0.3; sfx('crash'); }
}
function removeHaz(id) { const i = haz.findIndex(h => h.id === id); if (i >= 0) haz.splice(i, 1); }
function interact(c, now) {
  for (const p of pickups) {
    if (p.tk.get(c) > now || sq(c.x - p.x) + sq(c.y - p.y) > 100) continue;
    p.tk.set(c, now + 4000); c.turbo = Math.min(100, c.turbo + (c.def.pick || 45));
    if (c === me) { sfx('pick'); flash('+H2 TURBO', '#3fd0f0'); }
  }
  for (const b of boxes) {
    if (b.tk.get(c) > now || sq(c.x - b.x) + sq(c.y - b.y) > 64) continue;
    b.tk.set(c, now + 2200);
    for (let k = 0; k < 6; k++) particles.push({ x: b.x, y: b.y, life: 0.4, max: 0.4, col: k % 2 ? '#79c8f2' : '#ffffff' });
    if (!c.item) { c.item = rollItem(c); c.itemT = 1 + Math.random() * 3; if (c === me && c.item) { sfx('box'); flash('EŞYA: ' + ITEM_NAMES[c.item], '#ffffff'); } }
  }
  for (const o of obst) {
    const d2 = sq(c.x - o.x) + sq(c.y - o.y);
    if (o.k === 'cone') {
      if (d2 > 36 || o.tk.get(c) > now) continue;
      o.tk.set(c, now + 12000);
      if (c.shieldT <= 0 && !c.def.tank) { c.vx *= 0.6; c.vy *= 0.6; }
      for (let k = 0; k < 5; k++) particles.push({ x: o.x, y: o.y, life: 0.5, max: 0.5, col: k % 2 ? '#ff7a1a' : '#ffffff' });
      if (c === me) { shake = 0.2; sfx('bump'); }
    } else if (o.k === 'barrel' && c.def.tank) {      // patpat varili ezer
      if (d2 > 60 || (o.tk && o.tk.get(c) > now)) continue;
      (o.tk = o.tk || new Map()).set(c, now + 12000);
      for (let k = 0; k < 8; k++) particles.push({ x: o.x + (Math.random() - .5) * 6, y: o.y + (Math.random() - .5) * 6, life: 0.6, max: 0.6, col: k % 2 ? '#d8322a' : '#f4f4f4' });
      if (c === me) { shake = 0.15; sfx('bump'); }
    } else if (o.k === 'oil') {
      if (c.def.tank) continue;                        // yağdan etkilenmez
      if (d2 > 40 || (c.oilT || 0) > now) continue;
      c.oilT = now + 1500; spinOut(c);
    }
  }
  for (let i = haz.length - 1; i >= 0; i--) {
    const h = haz[i];
    if (sq(c.x - h.x) + sq(c.y - h.y) > 49) continue;
    if ((h.owner === c || (c.id && h.owner === c.id)) && now - h.t0 < 2000) continue;
    if (c.def.tank) continue;
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
const flagsOf = c => (c.turboOn ? 1 : 0) | (c.shieldT > 0 ? 2 : 0) | (c.spinT > 0 ? 4 : 0) | (c.zapT > 0 ? 8 : 0);

/* ---------------- ana güncelleme ---------------- */
function update(dt) {
  gT += dt; if (state === 'results') resT += dt;
  const now = performance.now();
  joyMenuNav();
  for (const f of feed) f.life -= dt; while (feed.length && feed[0].life <= 0) feed.shift();
  zapFlash = Math.max(0, zapFlash - dt);
  if (state === 'boot') return;
  if (state === 'menu' || state === 'room' || state === 'pick') { updateAttract(dt, now); updateEngine(); return; }
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
    else if (c.def.regen && state === 'race') c.turbo = Math.min(100, c.turbo + c.def.regen * dt);   // tüpler turboyu doldurur
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
    if (c.def.gas && Math.random() < (tb ? 0.9 : 0.35)) for (const sd of [-1, 1]) {     // hidrojen tüplerinden gaz
      const fx = Math.cos(c.a), fy = Math.sin(c.a), x = c.x - fx * 3 + -fy * sd * 9, y = c.y - fy * 3 + fx * sd * 9;
      particles.push({ x: x + (Math.random() - .5) * 3, y: y + (Math.random() - .5) * 3, life: 0.5, max: 0.5, col: Math.random() < .6 ? '#e6f4ff' : '#9fd0f0' }); }
    const zp = c.kind === 'remote' ? !!(c.flags & 8) : c.zapT > 0;
    if (zp && Math.random() < 0.5) particles.push({ x: c.x + (Math.random() - .5) * 8, y: c.y + (Math.random() - .5) * 8, life: 0.25, max: 0.25, col: '#ffd84a' });
  }
  collide(cars);
  for (let i = haz.length - 1; i >= 0; i--) if (now - haz[i].t0 > 30000) haz.splice(i, 1);
  stepParticles(dt);
  if (racing) raceT = mode === 'online' ? (now - goAt) / 1000 : raceT + dt;
  if (state === 'finish') { finishT += dt; if (mode === 'practice' && finishT > 2.5) { startResults(practiceResults()); if (acct) send({ type: 'pracDone', ms: Math.round(raceT * 1000) }); } }
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
  const ta = c.spinT > 0 && c.spinA0 != null ? c.spinA0 : c.a;    // dönerken kamera sabit: dönüş görünsün
  camA = wrapA(camA + wrapA(ta - camA) * Math.min(1, dt * 5));
  const fx = Math.cos(camA), fy = Math.sin(camA);
  camX = c.x - fx * CAMD; camY = c.y - fy * CAMD;
  // kamera yerden yükseklikte kalır, yokuşa bakarken eğilir
  const hc = hR(c.x, c.y), hb = hR(camX, camY);
  const zT = Math.max(hc, hb) + CAMH, sl = (hR(c.x + fx * 40, c.y + fy * 40) - hb) / (40 + CAMD);
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
    while (d < MAXD) { if (camZ - d * t <= hR(camX + fx * d, camY + fy * d)) { hit = true; break; } d += d < 60 ? 0.6 : d * 0.012; }
    let dist = d;
    if (!hit) { const dd = t !== 0 ? (camZ - (elevView ? HFAR : 0)) / t : -1; if (dd > MAXD) dist = dd; else break; }
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
  const z = hR(camX + fx * depth, camY + fy * depth), b = (camZ - z) / depth, tp = Math.tan(camP);
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
  for (const o of obst) if (!((o.k === 'cone' || o.k === 'barrel') && o.tk && o.tk.get(viewer) > now)) add(o.x, o.y, 6, o, 800);
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
    if (it.t === 0) {
      if (o.downT > now) {   // devrilmiş: yere yatık, ezik
        const dw = o.ww * p.k * 1.15, dh = Math.max(1, dw * o.img.height / o.img.width * 0.22);
        ctx.globalAlpha = 0.9; ctx.drawImage(o.img, Math.round(p.sx - dw / 2), Math.round(p.gy - dh), Math.max(1, Math.round(dw)), Math.round(dh)); ctx.globalAlpha = 1;
      } else sprAt(o.img, p, o.ww);
    }
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
const boardOf = (kind, tk) => ((kind === 'comp' ? board.comp && board.comp.tracks : board.tracks) || {})[tk] || { laps: [], races: [] };
const boardFor = tk => boardOf(lbMode, tk);
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
  const recL = mode === 'online' ? boardOf(race.kind, race.track).laps[0] : null;
  const rec = mode === 'online' ? (recL && recL.time) : me.bestStored;
  txt('REKOR ' + (rec ? fmt(rec) : '--:--.-'), W - 6, 28, '#c3ccd4', 8, 'right');
  if (me.bestLap) txt('SENİN ' + fmt(me.bestLap), W - 6, 38, '#9ecbef', 8, 'right');
  const mob = coarse;   // telefonda alt köşeler dokunmatik tuşlara ayrılır
  const tbx = mob ? W / 2 - 50 : 6, tby = mob ? 30 : H - 27;
  if (!mob) txt('TURBO', tbx, tby, '#9ecbef');
  txt('H2', tbx, tby + 12 - (mob ? 1 : 0), '#3fd0f0'); ctx.fillStyle = '#000'; ctx.fillRect(tbx + 22, tby + 11, 72, 10); ctx.fillStyle = '#20313f'; ctx.fillRect(tbx + 23, tby + 12, 70, 8);
  ctx.fillStyle = me.turboOn ? (Math.floor(gT * 10) % 2 ? '#ffd84a' : '#ff7a1a') : '#3fd0f0'; ctx.fillRect(tbx + 23, tby + 12, Math.round(me.turbo * 0.7), 8);
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
// Yarış sonu: Kahoot tarzı podyum. Önce 3., sonra 2., en son 1. yükselir; araçlar üstünde döner.
let resT = 0, confetti = [];
function startResults(rows) {
  results = rows; state = 'results'; resT = 0; confetti = [];
  for (let i = 0; i < 90; i++) confetti.push({ x: Math.random() * W, y: -Math.random() * 160, vy: 28 + Math.random() * 40, vx: (Math.random() - .5) * 20, w: Math.random() * TAU,
    col: ['#ffd84a', '#3fd0f0', '#ff6a5e', '#5fd16b', '#c792ea', '#ffffff'][i % 6] });
}
const POD = [   // sıra: 1., 2., 3.
  { x: 152, w: 80, h: 66, col: '#ffd84a', dark: '#b8962a', at: 2.9 },
  { x: 66, w: 80, h: 46, col: '#d7dde3', dark: '#8f99a3', at: 1.7 },
  { x: 238, w: 80, h: 32, col: '#e09a5a', dark: '#9a5f30', at: 0.6 }
];
function drawResults() {
  const rows = results || [], base = 192;
  // sahne: koyu arka plan, ışık hüzmeleri, zemin
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0d2a4a'); bg.addColorStop(1, '#06121f'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  for (const [x, a] of [[60, .07], [W / 2, .1], [W - 60, .07]]) { ctx.fillStyle = 'rgba(255,240,190,' + a + ')'; ctx.beginPath(); ctx.moveTo(x - 6, 0); ctx.lineTo(x + 6, 0); ctx.lineTo(x + 70, base); ctx.lineTo(x - 70, base); ctx.fill(); }
  ctx.fillStyle = '#0f3456'; ctx.fillRect(0, base, W, H - base); ctx.fillStyle = '#2a94d8'; ctx.fillRect(0, base, W, 1);
  logoBadge(ctx, 4, 4);
  txt('PODYUM', W / 2, 8, '#ffd84a', 16, 'center');
  txt(TRACKS[race.track] ? TRACKS[race.track].name : '', W / 2, 28, '#9ecbef', 8, 'center');
  const prev = resT - (1 / 60);
  for (let k = 2; k >= 0; k--) {
    const r = rows[k], P = POD[k]; if (!r) continue;
    const t = clamp((resT - P.at) / 0.45, 0, 1), e = 1 - Math.pow(1 - t, 3), h = Math.round(P.h * e);
    if (prev < P.at && resT >= P.at) sfx(k === 0 ? 'go' : 'lap');
    if (h <= 0) { if (k === 0 && resT > 1.9) txt('...', P.x + P.w / 2, base - 20, '#ffd84a', 16, 'center'); continue; }
    const top = base - h;
    ctx.fillStyle = P.dark; ctx.fillRect(P.x, top, P.w, h);
    ctx.fillStyle = P.col; ctx.fillRect(P.x, top, P.w, Math.min(h, 6)); ctx.fillRect(P.x + 2, top + 6, P.w - 4, Math.max(0, h - 6));
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(P.x + P.w - 6, top + 6, 4, Math.max(0, h - 6));
    if (h > 22) txt(String(k + 1), P.x + P.w / 2, top + 9, P.dark, 16, 'center');
    if (h > 40 && r.finished) txt(fmt(r.total), P.x + P.w / 2, top + 30, '#3a2a10', 8, 'center');
    if (t >= 1) {
      const c = CARK[r.car] || CARS[0], mine = r.me || (r.id && r.id === myId);
      const pop = clamp((resT - P.at - 0.45) / 0.3, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(P.x + 12, top - 2, P.w - 24, 3);
      M.renderCar(ctx, c.model, gT * 1.3 + k, (c.key === 'halis' ? 1.05 : .95) * (0.6 + 0.4 * pop), P.x + P.w / 2, top - 1, PITCH * 1.6);
      const nm = String(r.name).toLocaleUpperCase('tr').slice(0, 11), cn = cname(c);
      const same = nm === cn.toLocaleUpperCase('tr');
      txt(nm, P.x + P.w / 2, top - (same ? 40 : 48), mine ? '#ffd84a' : '#ffffff', 8, 'center');
      if (!same) txt(cn, P.x + P.w / 2, top - 39, c.col, 8, 'center');
      if (mine) txt('SEN', P.x + P.w / 2, top - (same ? 50 : 58), '#ffd84a', 8, 'center');
    }
  }
  // 1. açıklanınca konfeti
  if (resT > POD[0].at && rows[0]) for (const q of confetti) {
    const tt = resT - POD[0].at, y = q.y + q.vy * tt, x = q.x + q.vx * tt + Math.sin(tt * 3 + q.w) * 6;
    if (y > H || y < 0) continue; ctx.fillStyle = q.col; ctx.fillRect(Math.round(x), Math.round(y), Math.sin(tt * 6 + q.w) > 0 ? 3 : 1, 2);
  }
  // 4. ve sonrası
  if (resT > POD[0].at + 0.6 && rows.length > 3) {
    const rest = rows.slice(3).map((r, i) => (i + 4) + '. ' + String(r.name).toLocaleUpperCase('tr').slice(0, 9) + (r.finished ? '' : ' (DNF)')).join('   ');
    txt(rest, W / 2, base + 6, '#c3ccd4', 8, 'center');
  }
  const msgTxt = mode === 'online' ? 'Lobiye dönülüyor…' : 'ENTER / BUTON: MENÜ';
  if (resT > POD[0].at + 1 && Math.floor(gT * 2) % 2) txt(msgTxt, W / 2, H - 9, '#9ecbef', 8, 'center');
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
  if (state === 'menu' || state === 'room' || state === 'pick') {
    const list = spec.size ? [...spec.values()] : [demo];
    let target = demo; if (spec.size) target = list.reduce((a, b) => progOf(b) > progOf(a) ? b : a);
    drawWorld(list, target); if (TH.rain && !reduced) drawRain(); ctx.restore(); drawAttractHUD(); return;
  }
  if (state !== 'results') { drawWorld(cars, me); if (TH.rain && !reduced) drawRain(); }
  ctx.restore();
  if (zapFlash > 0) { ctx.fillStyle = 'rgba(255,248,200,' + (zapFlash * 2) + ')'; ctx.fillRect(0, 0, W, H); }
  hud();
}

/* =========================================================
   LOBİ ARAYÜZÜ
   ========================================================= */
const pickers = [];
function buildPicker(el, keys) {
  const btns = CARS.filter(c => !keys || keys.includes(c.key)).map(c => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'carbtn'; b.dataset.car = c.key;
    const cc = document.createElement('canvas'); cc.width = 96; cc.height = 48;
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = c.name;
    const tr = document.createElement('span'); tr.className = 'tr'; tr.textContent = c.trait + (c.num ? ' · #' + c.num : '');
    b.append(cc, nm, tr);
    b.addEventListener('click', () => chooseCar(c.key));
    el.appendChild(b);
    return { b, cc, g: cc.getContext('2d'), key: c.key, yaw: -Math.PI / 2 + .7, el };
  });
  pickers.push(...btns);
}
function allowPicker(el, keys) { for (const p of pickers) if (p.el === el) p.b.hidden = !keys.includes(p.key); }
function chooseCar(key) {
  if (!CARK[key]) return;
  if (room && (state === 'room' || state === 'pick')) {
    const allow = room.kind === 'comp' ? COMP_CARS : (room.cfg && room.cfg.cars) || CFG_DEF.cars;
    if (!allow.includes(key)) return;
    send({ type: 'car', car: key });
  }
  selCar = key; store.set('hgp-car', key); sfx('beep');
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
// hesap yoksa ana menü yerine giriş/kayıt ekranı
const homeScreen = () => acct ? 'entry' : (guest ? 'entry' : 'auth');
function showScreen(which) {
  if (which === 'entry' && !acct && !guest) which = 'auth';
  $('scrAuth').hidden = which !== 'auth';
  $('scrEntry').hidden = which !== 'entry';
  $('scrOnline').hidden = which !== 'online';
  $('scrPick').hidden = which !== 'pick';
  $('scrRoom').hidden = which !== 'room';
  $('scrPractice').hidden = which !== 'practice';
  $('overlay').hidden = !which;
}
/* ---- yarış ayarları paneli ---- */
const THUMBS = {};
function cfgUI(el, onChange, opt = {}) {
  el.textContent = '';
  let cur = Object.assign({}, CFG_DEF), editable = true;
  const mkEl = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const row = label => { const r = mkEl('div', 'cfgrow'); r.append(mkEl('span', 'cl', label)); el.append(r); return r; };
  const tr = row('PİST'), tg = mkEl('div', 'tracks'); tr.append(tg);
  const tbtn = [...(opt.tracks || TRACK_KEYS), 'random'].map(k => {
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
  // serbest oda: hangi araçlar ve hangi güçler çıkabilir
  const chipRow = (label, key, items, nameOf) => {
    const r = row(label), box = mkEl('div', 'chips'); r.append(box);
    const bs = items.map(k => { const b = mkEl('button', 'chip', nameOf(k)); b.type = 'button';
      b.onclick = () => { if (!editable) return; const on = cur[key].includes(k);
        const next = on ? cur[key].filter(x => x !== k) : items.filter(x => x === k || cur[key].includes(x));
        if (key === 'cars' && !next.length) return;   // en az bir araç kalmalı
        onChange({ [key]: next }); };
      box.append(b); return [k, b]; });
    return () => bs.forEach(([k, b]) => { b.setAttribute('aria-pressed', String(cur[key].includes(k))); b.disabled = !editable; });
  };
  if (opt.choose) {
    syncs.push(chipRow('SEÇİLEBİLEN ARAÇLAR', 'cars', CARS.map(c => c.key), k => cname(CARK[k])));
    syncs.push(chipRow('ÇIKABİLECEK GÜÇLER', 'itemSet', ITEM_KEYS, k => ITEM_NAMES[k]));
  }
  el.append(mkEl('p', 'note', 'Yakalama bonusu açıkken geride kalan daha güçlü eşya alır (süper turbo, şimşek).' + (opt.choose ? ' Kapattığın araçlar bu odada seçilemez, kapattığın güçler eşya kutularından çıkmaz.' : '')));
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
let pickEnd = 0;
function renderPick() {
  if (!room || room.kind !== 'comp') return;
  const ul = $('pickList'); ul.textContent = '';
  for (const p of room.players) {
    const li = document.createElement('li');
    const sw = document.createElement('span'); sw.className = 'sw'; sw.style.background = p.picked ? (CARK[p.car] || CARS[0]).col : '#33475a';
    const pn = document.createElement('span'); pn.className = 'pn'; pn.textContent = p.name + (p.picked ? ' · ' + cname(CARK[p.car] || CARS[0]) : '');
    const t = document.createElement('span'); t.className = 'tag ' + (p.picked ? 'ok' : 'wait'); t.textContent = p.picked ? 'SEÇTİ' : 'SEÇİYOR';
    li.append(sw, pn, t); if (p.id === myId) { const y = document.createElement('span'); y.className = 'tag you'; y.textContent = 'SEN'; li.append(y); }
    ul.append(li);
  }
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
    if (room.kind === 'comp') { pn.textContent = p.name; const t = document.createElement('span'); t.className = 'tag ' + (p.ready ? 'ok' : 'wait'); t.textContent = p.ready ? 'HAZIR' : 'BEKLİYOR'; li.append(t); if (p.id === room.host) li.querySelector('.tag').remove(); }
    ul.append(li);
  }
  $('pcount').textContent = '(' + room.players.length + '/8)';
  const host = room.players.find(p => p.id === room.host), isHost = room.host === myId, comp = room.kind === 'comp';
  const live = room.phase !== 'lobby', mine = room.players.find(p => p.id === myId);
  $('roomMode').textContent = comp ? 'REKABETÇİ' : 'SERBEST'; $('roomMode').className = 'mbadge ' + (comp ? 'comp' : 'free');
  $('compBox').hidden = !comp; $('freeBox').hidden = comp;
  $('btnStart').hidden = comp || !isHost; $('btnStart').disabled = live;
  $('btnReady').hidden = !comp; $('btnReady').disabled = live;
  $('btnReady').textContent = mine && mine.ready ? 'HAZIR DEĞİLİM' : 'HAZIRIM';
  if (!comp) {
    if (cfgRoomUI) cfgRoomUI.set(room.cfg || CFG_DEF, isHost && !live);
    allowPicker($('carsRoom'), (room.cfg && room.cfg.cars) || CFG_DEF.cars);
    if (mine && mine.car !== selCar && CARK[mine.car]) { selCar = mine.car; syncPickers(); }
  }
  $('cfgHint').textContent = isHost ? '(sen ayarlıyorsun)' : '(oda sahibi ayarlar)';
  const nReady = room.players.filter(p => p.ready).length, need = room.min || 3;
  $('roomNote').textContent = live ? (room.phase === 'results' ? 'Sonuçlar gösteriliyor, birazdan lobiye dönülecek.' : room.phase === 'pick' ? 'Araçlar seçiliyor…' : 'Yarış sürüyor, canlı izliyorsun. Bir sonraki yarışa katılacaksın.')
    : comp ? (room.players.length < need ? 'En az ' + need + ' pilot gerekiyor (' + room.players.length + '/' + need + '). Arkadaşlarını kodla çağır.' : 'Hazır: ' + nReady + '/' + room.players.length + '. Herkes hazır olunca başlar.')
    : isHost ? (room.players.length < 2 ? 'Tek başına da başlatabilirsin; arkadaşların sonraki yarışa katılır.' : 'Herkes hazırsa başlat.') : 'Oda sahibinin (' + (host ? host.name : '…') + ') başlatması bekleniyor.';
  if (!live && !comp && room.cfg && room.cfg.track !== 'random' && state === 'room') useTrack(room.cfg.track);
  renderPick();
}
let lbTab = 'laps', lbTrack = 'istanbul', lbMode = 'comp';
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
function buildLbTracks() {
  const keys = lbMode === 'comp' ? COMP_TRACKS : TRACK_KEYS; $('lbTracks').textContent = '';
  if (!keys.includes(lbTrack)) lbTrack = keys[0];
  for (const k of keys) { const b = document.createElement('button'); b.className = 'tab'; b.dataset.t = k; b.textContent = TRACKS[k].short; b.onclick = () => { lbTrack = k; renderBoard(); }; $('lbTracks').append(b); }
  $('tabRace').textContent = lbMode === 'comp' ? '5 TUR YARIŞ' : '3 TUR YARIŞ';
  $('lbComp').setAttribute('aria-selected', String(lbMode === 'comp')); $('lbFree').setAttribute('aria-selected', String(lbMode === 'free'));
}
$('lbComp').onclick = () => { lbMode = 'comp'; buildLbTracks(); renderBoard(); };
$('lbFree').onclick = () => { lbMode = 'free'; buildLbTracks(); renderBoard(); };
buildLbTracks();

function needName(errEl) {
  if (!acct) { errEl.textContent = 'Online oynamak için giriş yapmalısın. ÇIKIŞ / GİRİŞ YAP düğmesini kullan.'; return null; }
  return acct.name;
}
function needNet(errEl) {
  if (!net.ok) { errEl.textContent = location.protocol === 'file:' ? 'Dosya olarak açtın, online oynamak için sunucu adresinden gir. Antrenman çalışır.' : 'Sunucuya bağlı değilsin. Birkaç saniye bekle ya da antrenman yap.'; return false; }
  return true;
}
// ---- hesap: giriş / kayıt ----
let acct = store.get('hgp-acct', null), guest = false, profile = null, pendingAuth = false, authMode = 'login';
if (acct && !(acct.name && acct.token)) acct = null;
function syncPilot() { $('pilotName').textContent = acct ? acct.name : 'MİSAFİR'; $('btnLogout').textContent = acct ? 'ÇIKIŞ' : 'GİRİŞ YAP'; $('btnProfile').hidden = !acct; }
function showAuthForm(modeName) {
  authMode = modeName; $('authPick').hidden = true; $('authForm').hidden = false; $('authErr').textContent = '';
  const reg = modeName === 'register';
  $('authTitle').textContent = reg ? 'KAYDOL' : 'GİRİŞ YAP'; $('btnAuthGo').textContent = reg ? 'KAYDOL' : 'GİRİŞ YAP';
  $('aPass2Row').hidden = !reg; $('aPass').autocomplete = reg ? 'new-password' : 'current-password';
  $('authHint').textContent = reg ? 'Kullanıcı adı 3-14 karakter (harf, rakam, boşluk, _ . -). Şifre en az 6 karakter. Skor tablosunda bu adla görünürsün.' : '';
  $('aUser').focus();
}
$('btnShowLogin').onclick = () => showAuthForm('login');
$('btnShowReg').onclick = () => showAuthForm('register');
$('btnAuthBack').onclick = () => { $('authForm').hidden = true; $('authPick').hidden = false; $('authErr').textContent = ''; };
$('authForm').addEventListener('submit', e => {
  e.preventDefault(); initAudio();
  const name = $('aUser').value.trim(), pass = $('aPass').value, err = $('authErr');
  if (name.length < 3) { err.textContent = 'Kullanıcı adı en az 3 karakter olmalı.'; return; }
  if (pass.length < 6) { err.textContent = 'Şifre en az 6 karakter olmalı.'; return; }
  if (authMode === 'register' && pass !== $('aPass2').value) { err.textContent = 'Şifreler aynı değil.'; return; }
  if (!net.ok) { err.textContent = 'Sunucuya bağlı değilsin. Birkaç saniye bekle (sunucu uyanıyor olabilir).'; return; }
  err.textContent = ''; pendingAuth = true; $('btnAuthGo').disabled = true; setTimeout(() => $('btnAuthGo').disabled = false, 2500);
  send({ type: authMode, name, pass });
});
$('btnGuest').onclick = () => { guest = true; syncPilot(); showScreen('entry'); };
$('btnLogout').onclick = () => {
  if (acct) { send({ type: 'logout', token: acct.token }); acct = null; store.set('hgp-acct', null); profile = null; }
  guest = false; syncPilot(); room = null; mode = null; state = 'menu';
  $('authForm').hidden = true; $('authPick').hidden = false; showScreen('auth');
};
$('btnProfile').onclick = () => { send({ type: 'profile' }); renderProfile(); openDrawer('profile'); };
const fmtDur = ms => { const sec = Math.round(ms / 1000), m = Math.floor(sec / 60), h = Math.floor(m / 60); return h ? h + ' sa ' + (m % 60) + ' dk' : m ? m + ' dk ' + (sec % 60) + ' sn' : sec + ' sn'; };
const fmtDate = d => { const x = new Date(d); return x.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) + ' ' + x.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); };
const MODE_TR = { comp: 'REKABETÇİ', free: 'SERBEST' };
function renderProfile() {
  if (!profile) return; const st = profile.stats || {}, hist = st.hist || [];
  $('profName').textContent = String(profile.name).toLocaleUpperCase('tr');
  $('profSince').textContent = 'Üyelik: ' + new Date(profile.created).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const box = $('profStats'); box.textContent = '';
  const card = (k, v) => { const d = document.createElement('div'); d.className = 'pstat'; const a = document.createElement('span'); a.textContent = k; const b = document.createElement('b'); b.textContent = v; d.append(a, b); box.append(d); };
  card('OYUN SÜRESİ', fmtDur((st.playMs || 0) + (st.pracMs || 0)));
  card('ONLINE YARIŞ', String(st.races || 0)); card('GALİBİYET', String(st.wins || 0)); card('PODYUM', String(st.podiums || 0));
  card('BİTİRME', st.races ? Math.round(100 * (st.finishes || 0) / st.races) + '%' : '—'); card('TUR', String(st.laps || 0));
  card('ANTRENMAN', String(st.pracRaces || 0));
  const top = $('profTop'); top.textContent = '';
  const best = hist.filter(h => h.fin).sort((a, b) => a.pos - b.pos || b.of - a.of || a.tot - b.tot).slice(0, 5);
  if (!best.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'Henüz bitirdiğin online yarış yok.'; top.append(p); }
  for (const h of best) { const r = document.createElement('div'); r.className = 'topm';
    const md = document.createElement('span'); md.className = 'md ' + (['g', 's', 'b'][h.pos - 1] || ''); md.textContent = h.pos + '.';
    const t = document.createElement('span'); t.textContent = (TRACKS[h.t] ? TRACKS[h.t].name : h.t) + ' · ' + MODE_TR[h.k] + ' · ' + cname(CARK[h.c] || CARS[0]) + ' · ' + h.of + ' pilot içinde · ' + fmt2(h.tot) + ' · ' + fmtDate(h.d);
    r.append(md, t); top.append(r); }
  const tb = $('profBest').tBodies[0]; tb.textContent = '';
  const td = t => { const d = document.createElement('td'); d.textContent = t; return d; };
  for (const [k, b] of Object.entries(st.best || {})) { const [kind, tk] = k.split(':'); const tr = document.createElement('tr');
    const last = td(b.race ? fmt2(b.race) + ' (' + b.raceLaps + ' tur)' : '—'); last.className = 't';
    tr.append(td(TRACKS[tk] ? TRACKS[tk].short : tk), td(MODE_TR[kind] || kind), td(b.lap ? fmt2(b.lap) + ' · ' + cname(CARK[b.lapCar] || CARS[0]) : '—'), last); tb.append(tr); }
  if (!tb.children.length) { const tr = document.createElement('tr'); const d = td('Henüz rekor yok.'); d.colSpan = 4; tr.append(d); tb.append(tr); }
  const hb = $('profHist').tBodies[0]; hb.textContent = '';
  for (const h of hist.slice(0, 25)) { const tr = document.createElement('tr'); const last = td(h.fin ? fmt2(h.tot) : 'BİTİREMEDİ'); last.className = 't';
    tr.append(td(fmtDate(h.d)), td(MODE_TR[h.k] || h.k), td(TRACKS[h.t] ? TRACKS[h.t].short : h.t), td(cname(CARK[h.c] || CARS[0])), td(h.pos + '/' + h.of), last); hb.append(tr); }
  if (!hb.children.length) { const tr = document.createElement('tr'); const d = td('Henüz online yarış yok.'); d.colSpan = 6; tr.append(d); hb.append(tr); }
}
// giriş: üç mod
let onlineKind = 'comp';
const MODE_TXT = {
  comp: ['REKABETÇİ', 'Kurallar herkes için aynı: 5 tur, engeller az, eşyalar normal, çarpışma açık, yakalama bonusu kapalı. Pist rastgele gelir, araçlar sadece Tur-AZ, Pars, Ucube ve Helianthus. En az 3 pilot gerekir; dereceler rekabetçi skor tablosuna yazılır.'],
  free: ['SERBEST', 'Oda sahibi her şeyi seçer: pist (kampüs pistleri dahil), tur sayısı, engeller, hangi araçların ve hangi güçlerin olacağı. Hidroket-1, Halis\'in scooterı ve Hasan Furkan\'ın patpatı sadece burada. Dereceler serbest skor tablosuna yazılır.']
};
function openOnline(kind) {
  const e = $('entryErr'); e.textContent = ''; if (!needName(e)) return;
  onlineKind = kind; $('onlineTitle').textContent = MODE_TXT[kind][0]; $('onlineDesc').textContent = MODE_TXT[kind][1]; $('onlineErr').textContent = '';
  showScreen('online');
}
$('btnModeComp').onclick = () => { initAudio(); openOnline('comp'); };
$('btnModeFree').onclick = () => { initAudio(); openOnline('free'); };
$('btnOBack').onclick = () => showScreen('entry');
$('btnQuick').onclick = () => { initAudio(); const e = $('onlineErr'); e.textContent = ''; const n = needName(e); if (!n || !needNet(e)) return; send({ type: 'quick', kind: onlineKind, name: n, car: selCar }); };
$('btnCreate').onclick = () => { initAudio(); const e = $('onlineErr'); e.textContent = ''; const n = needName(e); if (!n || !needNet(e)) return; send({ type: 'create', kind: onlineKind, name: n, car: selCar }); };
$('btnJoin').onclick = () => { initAudio(); const e = $('onlineErr'); e.textContent = ''; const n = needName(e); if (!n || !needNet(e)) return;
  const code = $('code').value.trim().toUpperCase(); if (code.length !== 4) { e.textContent = 'Oda kodu 4 harf olmalı.'; $('code').focus(); return; }
  send({ type: 'join', code, name: n, car: selCar }); };
$('btnModePrac').onclick = () => { if (state === 'boot') return; store.set('hgp-name', playerName()); showScreen('practice'); cfgPracUI.set(pcfg, true); if (pcfg.track !== 'random') useTrack(pcfg.track); };
$('btnReady').onclick = () => { initAudio(); const mine = room && room.players.find(p => p.id === myId); send({ type: 'ready', on: !(mine && mine.ready) }); };
$('btnPBack').onclick = () => showScreen('entry');
$('btnPStart').onclick = () => startPractice();
$('btnStart').onclick = () => { initAudio(); send({ type: 'start' }); };
$('btnLeave').onclick = () => { send({ type: 'leave' }); };
$('btnCopyLink').onclick = async () => {
  const link = location.origin + location.pathname + '?oda=' + (room ? room.code : ''), b = $('btnCopyLink');
  try { await navigator.clipboard.writeText(link); b.textContent = 'KOPYALANDI'; } catch (e) { $('shareNote').textContent = link; b.textContent = 'LİNK AŞAĞIDA'; }
  setTimeout(() => b.textContent = 'LİNKİ KOPYALA', 1600);
};
$('name').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('btnModeComp').click(); } });
$('name').addEventListener('input', () => { $('entryErr').textContent = ''; renderBoard(); });
$('code').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('btnJoin').click(); } });
$('code').addEventListener('input', () => { $('code').value = $('code').value.toUpperCase().replace(/[^A-ZÇĞİÖŞÜ]/g, '').slice(0, 4); });

/* =========================================================
   AĞ
   ========================================================= */
const net = { ws: null, ok: false, retry: 0, wakeTimer: 0 };
function setNet(s, t) { for (const [a, b] of [['netStatus', 'netText'], ['authNet', 'authNetText']]) { $(a).dataset.s = s; $(b).textContent = t; } }
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
// rekabetçi: pist belli oldu, 15 sn araç seçimi
function enterPick(track, ms) {
  state = 'pick'; pickEnd = performance.now() + (ms || 15000);
  if (TRACKS[track]) { useTrack(track); $('pickTrack').textContent = 'PİST: ' + TRACKS[track].name; }
  if (!COMP_CARS.includes(selCar)) selCar = COMP_CARS[0];
  syncPickers(); renderPick(); showScreen('pick'); sfx('lap');
}
function onMsg(m) {
  const now = performance.now();
  switch (m.type) {
    case 'welcome': myId = m.id; if (m.board) { board = m.board; renderBoard(); }
      if (acct) send({ type: 'auth', name: acct.name, token: acct.token });
      if (params.get('oda') && !room) { $('code').value = params.get('oda').toUpperCase().slice(0, 4); if (state === 'menu' && playerName()) { onlineKind = 'free'; showScreen('online'); $('onlineTitle').textContent = 'ODAYA KATIL'; $('onlineDesc').textContent = 'Linkle geldin. Kod hazır, KATIL\'a bas.'; } }
      break;
    case 'authOk':
      acct = { name: m.name, token: m.token }; store.set('hgp-acct', acct); guest = false; profile = m.profile;
      $('name').value = m.name; syncPilot(); $('authErr').textContent = ''; $('aPass').value = ''; $('aPass2').value = '';
      if (!$('scrAuth').hidden) showScreen('entry');
      if (pendingAuth) { sfx('lap'); pendingAuth = false; }
      renderProfile(); break;
    case 'authErr':
      pendingAuth = false; $('btnAuthGo').disabled = false;
      if (m.op === 'auth') { acct = null; store.set('hgp-acct', null); syncPilot(); if (state === 'menu') showScreen('auth'); }
      $('authErr').textContent = m.msg; break;
    case 'loggedOut': break;
    case 'profile': profile = m.profile; renderProfile(); break;
    case 'joined': mode = 'online'; state = 'room'; showScreen('room'); $('roomErr').textContent = '';
      try { history.replaceState(null, '', location.pathname + '?oda=' + m.code); } catch (e) {}
      break;
    case 'room': room = m; renderRoom();
      if (m.phase === 'lobby' && (state === 'results' || state === 'finish' || state === 'race' || state === 'count' || state === 'pick')) { cars = []; me = null; graceEnd = 0; state = 'room'; showScreen('room'); renderRoom(); }
      if (m.phase === 'pick' && state === 'room') enterPick(m.track, m.pickLeft);
      break;
    case 'pick': if (room) enterPick(m.track, m.ms); break;
    case 'leftRoom': room = null; mode = null; spec.clear(); state = 'menu'; showScreen('entry'); try { history.replaceState(null, '', location.pathname); } catch (e) {} break;
    case 'error': (!$('scrRoom').hidden ? $('roomErr') : !$('scrOnline').hidden ? $('onlineErr') : $('entryErr')).textContent = m.msg; break;
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
        } else if (state === 'menu' || state === 'room' || state === 'pick') {
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
      if (mode === 'online' && me) { startResults(m.rows); graceEnd = 0; }
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
$('elevView').checked = elevView;
$('elevView').onchange = () => { elevView = $('elevView').checked; store.set('hgp-elev', elevView); };
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
  if (state === 'room' && room && room.kind === 'comp' && room.phase === 'lobby') $('btnReady').click();
  else if (state === 'room' && room && room.host === myId && room.phase === 'lobby') send({ type: 'start' });
  else if (state === 'results' && mode === 'practice' && resT < POD[0].at + 1) resT = POD[0].at + 1;   // ilk basış: podyumu hemen göster
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
    if ((state === 'menu' || state === 'room' || state === 'pick') && (k === 'arrowleft' || k === 'arrowright')) {
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
  const flip = me && me.def.flip ? -1 : 1;
  if (turboLatch) {   // tek basışla aç/kapat (keydown'da çevrilir): bazı klavyeler ↑+←+Space'i aynı anda okuyamıyor
    if (latched && (keys.arrowdown || keys.s || (me && me.turbo <= 0 && me.boostT <= 0) || state !== 'race')) latched = false;
  } else latched = false;
  const turbo = !!((turboLatch ? latched : kTurbo) || (joy.ok && joy.b));
  let thr = clamp1(kT + (joy.ok ? joy.y : 0)) * flip;
  if (coarse && autoGas && !keys.arrowdown) thr = flip > 0 ? Math.max(thr, 1) : Math.min(thr, -1);     // otomatik gaz
  if (turbo && thr > -0.3) thr = 1;                                     // H2 basılıyken gaz da basılı sayılır
  lastInput = { steer: clamp1(kS + tS + (joy.ok ? joy.x : 0)) * flip, thr, turbo };
  return lastInput;
}
let navLatch = false;
function joyMenuNav() {
  if (!joy.ok || (state !== 'menu' && state !== 'room' && state !== 'pick')) { navLatch = false; return; }
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
// patpat: tek silindirli dizel; her ateşlemede boğuk bir "pat" (düşen sinüs + filtreli gürültü + tıkırtı)
let patNext = 0, noiseBuf = null;
function patThump(t, loud) {
  if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.07);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22 * loud, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.11);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.13);
  const n = ac.createBufferSource(), f = ac.createBiquadFilter(), ng = ac.createGain(); n.buffer = noiseBuf;
  f.type = 'lowpass'; f.frequency.value = 520 + 400 * loud; ng.gain.setValueAtTime(0.16 * loud, t); ng.gain.exponentialRampToValueAtTime(0.0008, t + 0.06);
  n.connect(f).connect(ng).connect(ac.destination); n.start(t, Math.random() * 0.1); n.stop(t + 0.07);
  const k = ac.createBufferSource(), kf = ac.createBiquadFilter(), kg = ac.createGain(); k.buffer = noiseBuf;
  kf.type = 'highpass'; kf.frequency.value = 2800; kg.gain.setValueAtTime(0.03, t + 0.02); kg.gain.exponentialRampToValueAtTime(0.0005, t + 0.035);
  k.connect(kf).connect(kg).connect(ac.destination); k.start(t + 0.02, Math.random() * 0.1); k.stop(t + 0.04);
}
function updateEngine() {
  if (!ac) return;
  const c = (state === 'menu' || state === 'room' || state === 'pick') ? null : me;
  const on = !muted && c && state !== 'paused' && state !== 'results';
  const r = c ? Math.abs(speedF(c)) / c.stats.top : 0;
  if (c && c.def.key === 'patpat') {
    engGain.gain.setTargetAtTime(0, ac.currentTime, 0.05);
    if (!on) { patNext = 0; return; }
    const rate = 7.5 + r * 13 + (c.turboOn ? 4 : 0), t0 = ac.currentTime;   // rölantide ~8, tam gazda ~20 pat/sn
    if (patNext < t0) patNext = t0 + 0.02;
    while (patNext < t0 + 0.12) { patThump(patNext, 0.65 + 0.35 * Math.min(1, r + (lastInput.thr > 0 ? .2 : 0))); patNext += (1 / rate) * (0.9 + Math.random() * 0.2); }
    return;
  }
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
const drawers = { board: $('drawerBoard'), set: $('drawerSet'), music: $('drawerMusic'), profile: $('drawerProfile') };
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
  $('tools').hidden = !(state === 'menu' || state === 'room' || state === 'pick' || state === 'boot' || state === 'results' || state === 'paused');
  if (state === 'pick') $('pickTime').textContent = Math.max(0, Math.ceil((pickEnd - performance.now()) / 1000));
}


/* =========================================================
   BAŞLAT
   ========================================================= */
let last = performance.now();
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  update(dt); render(); drawJoy();
  if (state === 'menu' || state === 'room' || state === 'pick') for (const p of pickers) drawPreview(p, false);
  uiTick();
  requestAnimationFrame(frame);
}
async function init() {
  $('name').value = acct ? acct.name : (params.get('name') || ''); syncPilot();
  showScreen(null);
  requestAnimationFrame(frame);
  const [em, wd] = await Promise.all([loadImg(window.HGP_LOGO.emblem), loadImg(window.HGP_LOGO.word)]);
  $('brandEm').src = window.HGP_LOGO.emblem; $('brandWord').src = window.HGP_LOGO.word;
  for (const e of document.querySelectorAll('.brandEm')) e.src = window.HGP_LOGO.emblem; for (const e of document.querySelectorAll('.brandWord')) e.src = window.HGP_LOGO.word;
  const emB = tint(em, '#0b0b0b'), emW = tint(em, '#ffffff'), wdB = tint(wd, '#0b0b0b'), wdW = tint(wd, '#ffffff');
  Object.assign(LOGO, { emB18: scaled(emB, 17), emW18: scaled(emW, 18), wdB52: scaled(wdB, 50), wdB44: scaled(wdB, 44), wdB38: scaled(wdB, 38), wdW52: scaled(wdW, 52), wdW30: scaled(wdW, 30) });
  if (document.fonts && document.fonts.load) await Promise.race([document.fonts.load('8px "Press Start 2P"').catch(() => {}), new Promise(r => setTimeout(r, 1500))]);
  await new Promise(r => setTimeout(r, 30));
  buildCars();
  buildArt();
  for (const k of TRACK_KEYS) THUMBS[k] = trackThumb(k, 64, 40);
  [groundC, groundG] = mk(W, H); ground = groundG.createImageData(W, H); g32 = new Uint32Array(ground.data.buffer);
  useTrack(pcfg.track !== 'random' ? pcfg.track : 'istanbul');
  buildPicker($('carsPrac')); buildPicker($('carsRoom')); buildPicker($('carsPick'), COMP_CARS); syncPickers();
  cfgRoomUI = cfgUI($('cfgRoom'), patch => { if (room && room.host === myId) send({ type: 'cfg', cfg: Object.assign({}, CFG_DEF, room.cfg, patch) }); }, { tracks: TRACK_KEYS, choose: true });
  cfgPracUI = cfgUI($('cfgPractice'), patch => {
    pcfg = Object.assign({}, pcfg, patch); store.set('hgp-pcfg', pcfg); cfgPracUI.set(pcfg, true);
    if (patch.track && patch.track !== 'random') useTrack(patch.track);
  }, { tracks: COMP_TRACKS });
  if (!COMP_TRACKS.includes(pcfg.track) && pcfg.track !== 'random') pcfg.track = 'istanbul';
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
  }, get haz() { return haz; }, get obst() { return obst; }, get boxes() { return boxes; }, get pano() { return pano; }, get objs() { return objs; }, roadDist(x, y) { let b = 1e9; for (let i = 0; i < NS; i++) b = Math.min(b, Math.hypot(x - SX[i], y - SY[i])); return b - TW / 2; } };
init();
})();
