// Hidroket GP — özgün 8-bit müzikler (Web Audio ile çalınır, dosya indirmez)
// Notasyon: "NOTA:uzunluk" (uzunluk 16'lık nota cinsinden), "r:4" = sus. Her ölçü 16 birim.
(function () {
"use strict";

const SONGS = [
  { id: 'hidrojen', name: 'Hidrojen Sürüşü', mood: 'Hızlı · ana tema', bpm: 150, drums: 'rock', bass: 'drive', arp: 'up16', lead: .25,
    A: { ch: ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'G'], ld: [
      'A4:2 C5:2 E5:4 D5:2 C5:2 B4:2 C5:2', 'A4:4 r:2 F4:2 A4:2 C5:2 F5:4', 'E5:2 G5:2 E5:2 C5:2 D5:4 E5:4', 'D5:6 B4:2 G4:4 r:4',
      'A4:2 C5:2 E5:4 A5:4 G5:2 E5:2', 'F5:4 E5:2 D5:2 C5:4 A4:4', 'B4:2 D5:2 G5:4 F5:2 E5:2 D5:4', 'B4:4 D5:4 E5:8'] },
    B: { ch: ['F', 'G', 'Em', 'Am', 'F', 'G', 'E', 'E'], ld: [
      'C5:4 F5:4 E5:2 F5:2 G5:4', 'D5:4 G5:4 F5:2 E5:2 D5:4', 'B4:2 E5:2 G5:4 B5:4 A5:2 G5:2', 'A5:8 E5:4 C5:4',
      'A5:4 G5:2 F5:2 E5:4 C5:4', 'B4:4 D5:2 G5:2 F5:4 D5:4', 'E5:2 G#5:2 B5:4 G#5:2 E5:2 D5:4', 'B4:8 G#4:4 r:4'] },
    order: 'AABABA' },
  { id: 'atolye', name: 'Atölye Gecesi', mood: 'Sakin · funk', bpm: 104, drums: 'funk', bass: 'funk', arp: 'stab', lead: .5, swing: .12,
    A: { ch: ['Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7', 'Em7', 'A7'], ld: [
      'r:2 F5:2 A5:2 C6:2 A5:4 G5:4', 'F5:2 D5:2 r:2 B4:2 D5:4 F5:4', 'E5:6 G5:2 B5:4 A5:4', 'G5:4 E5:4 C5:4 r:4',
      'r:2 A4:2 D5:2 F5:2 A5:6 G5:2', 'F5:4 D5:2 B4:2 G4:4 B4:4', 'E5:4 G5:4 B5:2 A5:2 G5:4', 'C#5:4 E5:4 G5:4 r:4'] },
    B: { ch: ['Bbmaj7', 'C', 'Am7', 'Dm7', 'Gm7', 'C7', 'Fmaj7', 'A7'], ld: [
      'D5:4 F5:4 A5:6 r:2', 'G5:2 E5:2 C5:4 E5:4 G5:4', 'C6:4 A5:2 G5:2 E5:4 C5:4', 'D5:8 F5:4 r:4',
      'Bb4:2 D5:2 F5:4 G5:4 A5:4', 'Bb5:4 G5:4 E5:4 C5:4', 'A5:6 G5:2 F5:4 E5:4', 'E5:4 C#5:4 A4:4 r:4'] },
    order: 'AABA' },
  { id: 'pit', name: 'Pit Yolu', mood: 'Rock · enerjik', bpm: 168, drums: 'rock', bass: 'drive', arp: 'power', lead: .25,
    A: { ch: ['Em', 'C', 'D', 'Bm', 'Em', 'C', 'D', 'D'], ld: [
      'E5:2 E5:2 G5:2 E5:2 A5:2 G5:2 E5:2 D5:2', 'E5:4 C5:2 E5:2 G5:4 E5:4', 'F#5:2 F#5:2 A5:2 F#5:2 D5:4 A4:4', 'B4:4 D5:4 F#5:6 r:2',
      'E5:2 G5:2 B5:4 A5:2 G5:2 E5:4', 'G5:4 E5:4 C5:4 E5:4', 'D5:2 F#5:2 A5:4 D6:4 A5:4', 'F#5:8 r:8'] },
    B: { ch: ['C', 'D', 'Em', 'Em', 'C', 'D', 'B', 'B'], ld: [
      'G5:6 E5:2 C5:4 G5:4', 'A5:6 F#5:2 D5:4 A5:4', 'B5:4 A5:2 G5:2 F#5:4 E5:4', 'E5:2 F#5:2 G5:2 A5:2 B5:8',
      'C6:4 B5:2 A5:2 G5:4 E5:4', 'D6:4 C6:2 B5:2 A5:4 F#5:4', 'D#5:2 F#5:2 B5:4 A5:2 F#5:2 D#5:4', 'B4:8 r:8'] },
    order: 'AABAB' },
  { id: 'sontur', name: 'Son Tur', mood: 'Çok hızlı · gerilim', bpm: 176, drums: 'fast', bass: 'syn', arp: 'up16', lead: .125,
    A: { ch: ['Cm', 'Ab', 'Bb', 'G', 'Cm', 'Ab', 'Fm', 'G'], ld: [
      'G5:2 C6:2 G5:2 Eb5:2 C5:2 Eb5:2 G5:4', 'Ab5:4 G5:2 F5:2 Eb5:4 C5:4', 'D5:2 F5:2 Bb5:4 F5:2 D5:2 Bb4:4', 'B4:4 D5:4 G5:4 F5:2 D5:2',
      'C6:4 Bb5:2 G5:2 Eb6:4 D6:4', 'C6:4 Ab5:4 Eb5:4 C5:4', 'F5:2 Ab5:2 C6:4 Bb5:2 Ab5:2 G5:4', 'G5:4 B5:4 D6:8'] },
    B: { ch: ['Ab', 'Bb', 'Cm', 'Cm', 'Ab', 'Bb', 'G', 'G'], ld: [
      'Eb5:4 Ab5:4 C6:4 Ab5:4', 'F5:4 Bb5:4 D6:4 Bb5:4', 'G5:2 Eb5:2 G5:2 C6:2 Eb6:4 C6:4', 'D6:2 Eb6:2 D6:2 C6:2 G5:8',
      'Ab5:4 Bb5:4 C6:4 Eb6:4', 'D6:4 C6:2 Bb5:2 F5:4 D5:4', 'D5:2 G5:2 B5:2 D6:2 F6:4 D6:4', 'B5:8 r:8'] },
    order: 'AABAB' },
  { id: 'sabah', name: 'Teknofest Sabahı', mood: 'Neşeli · pop', bpm: 138, drums: 'four', bass: 'pump', arp: 'updown8', lead: .25,
    A: { ch: ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A'], ld: [
      'F#5:2 A5:2 D6:4 A5:2 F#5:2 A5:4', 'E5:4 A5:4 C#6:2 B5:2 A5:4', 'B5:4 F#5:2 D5:2 F#5:4 B5:4', 'A5:2 G5:2 D5:4 B4:4 r:4',
      'D5:2 F#5:2 A5:2 D6:2 F#6:4 E6:4', 'C#6:4 A5:4 E5:4 A5:4', 'B5:2 A5:2 G5:4 D5:2 E5:2 G5:4', 'E5:4 C#5:4 A4:4 r:4'] },
    B: { ch: ['G', 'A', 'F#m', 'Bm', 'G', 'A', 'D', 'D'], ld: [
      'D6:4 B5:2 G5:2 B5:4 D6:4', 'E6:4 C#6:2 A5:2 C#6:4 E6:4', 'F#6:4 E6:2 C#6:2 A5:4 F#5:4', 'D6:8 B5:4 r:4',
      'G5:2 B5:2 D6:4 E6:2 D6:2 B5:4', 'A5:2 C#6:2 E6:4 F#6:2 E6:2 C#6:4', 'D6:6 A5:2 F#5:4 A5:4', 'D6:8 r:8'] },
    order: 'AABA' },
  { id: 'gece', name: 'Gece Yarışı', mood: 'Synthwave · gece', bpm: 112, drums: 'half', bass: 'syn8', arp: 'up16', lead: .5,
    A: { ch: ['F#m', 'D', 'A', 'E', 'F#m', 'D', 'A', 'E'], ld: [
      'C#5:6 F#5:2 A5:8', 'F#5:4 E5:4 D5:8', 'E5:6 A5:2 C#6:8', 'B5:4 G#5:4 E5:8',
      'F#5:2 A5:2 C#6:4 E6:4 C#6:4', 'D6:4 A5:4 F#5:8', 'E5:4 A5:4 C#6:4 B5:4', 'G#5:8 E5:8'] },
    B: { ch: ['Bm', 'D', 'A', 'E', 'Bm', 'D', 'E', 'E'], ld: [
      'D6:8 C#6:4 B5:4', 'A5:8 F#5:8', 'C#6:6 E6:2 A5:8', 'B5:8 G#5:8',
      'F#5:4 B5:4 D6:4 F#6:4', 'E6:4 D6:4 A5:8', 'G#5:4 B5:4 E6:8', 'D6:4 C#6:4 B5:8'] },
    order: 'AABAB' }
];

/* ---------------- yardımcılar ---------------- */
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(n) {   // "C#5" → 73
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(n); if (!m) return null;
  return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const QUAL = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11] };
function chord(name) {   // "F#m7" → { root: 54, tones: [...] }
  const m = /^([A-G])(#|b)?(.*)$/.exec(name);
  const root = 12 * 3 + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12;   // 3. oktav (C3 = 48)
  return { root, tones: (QUAL[m[3]] || QUAL['']).map(i => root + i) };
}
function parseBar(str) {   // → [{ s: başlangıç, l: uzunluk, m: midi }]
  const out = []; let s = 0;
  for (const tok of str.trim().split(/\s+/)) { const [n, l] = tok.split(':'); const len = +l || 1; if (n !== 'r') out.push({ s, l: len, m: midi(n) }); s += len; }
  return out;
}
for (const sg of SONGS) for (const sec of ['A', 'B']) sg[sec].bars = sg[sec].ld.map(parseBar);

const DRUMS = {   // 16 adım: k=bas davul, s=trampet, h=hi-hat, o=açık hi-hat, g=hayalet trampet
  rock: { k: [0, 8, 10], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14] },
  funk: { k: [0, 3, 8, 11], s: [4, 12], g: [7, 15], h: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
  fast: { k: [0, 4, 8, 12, 14], s: [4, 12], h: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
  four: { k: [0, 4, 8, 12], s: [4, 12], o: [2, 6, 10, 14] },
  half: { k: [0, 10], s: [8], h: [0, 2, 4, 6, 8, 10, 12, 14] }
};

/* ---------------- çalıcı ---------------- */
let ac = null, bus = null, vol = 0.5, cur = null, timer = 0, nextT = 0, step = 0, waves = {}, noise = null, onEnd = null;
function wave(duty) {
  if (waves[duty]) return waves[duty];
  const n = 32, re = new Float32Array(n), im = new Float32Array(n);
  for (let k = 1; k < n; k++) im[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * duty);
  return waves[duty] = ac.createPeriodicWave(re, im);
}
function tone(t, f, dur, gain, kind, duty) {
  const o = ac.createOscillator(), g = ac.createGain();
  if (kind === 'tri') o.type = 'triangle'; else o.setPeriodicWave(wave(duty || .5));
  o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.005);
  g.gain.setValueAtTime(gain * 0.8, t + Math.min(dur * 0.4, 0.08)); g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.02);
}
function drum(t, k) {
  if (k === 'k') {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.42, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g).connect(bus); o.start(t); o.stop(t + 0.2); return;
  }
  const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = noise; const len = k === 's' ? 0.16 : k === 'g' ? 0.06 : k === 'o' ? 0.14 : 0.04;
  f.type = k === 's' || k === 'g' ? 'bandpass' : 'highpass'; f.frequency.value = k === 's' || k === 'g' ? 1800 : 7000;
  const gv = k === 's' ? 0.32 : k === 'g' ? 0.08 : k === 'o' ? 0.09 : 0.06;
  g.gain.setValueAtTime(gv, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
  src.connect(f).connect(g).connect(bus); src.start(t, Math.random() * 0.5); src.stop(t + len + 0.02);
  if (k === 's') { const o = ac.createOscillator(), og = ac.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    og.gain.setValueAtTime(0.16, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1); o.connect(og).connect(bus); o.start(t); o.stop(t + 0.12); }
}
function schedStep(sg, t, sp) {
  const barsPer = 8, total = sg.order.length * barsPer * 16;
  const i = step % total, bar = Math.floor(i / 16), s = i % 16;
  const sec = sg[sg.order[Math.floor(bar / barsPer)]], bi = bar % barsPer;
  const ch = chord(sec.ch[bi]), last = bi === barsPer - 1;
  // melodi
  for (const n of sec.bars[bi]) if (n.s === s && n.m) tone(t, hz(n.m), n.l * sp * 0.92, 0.095, 'sq', sg.lead);
  // bas
  const r = ch.root - 12, fifth = r + 7, oct = r + 12;
  const B = { drive: s % 2 === 0 ? [r, 2] : null,
              pump: { 0: [r, 3], 4: [r, 2], 6: [oct, 2], 8: [r, 3], 12: [fifth, 2], 14: [oct, 2] }[s],
              funk: { 0: [r, 2], 3: [oct, 1], 6: [fifth, 2], 8: [r, 2], 10: [r + 10, 1], 11: [oct, 1], 14: [fifth, 2] }[s],
              syn: [s % 2 ? oct : r, 1],
              syn8: s % 2 === 0 ? [s % 4 ? oct : r, 2] : null }[sg.bass];
  if (B) tone(t, hz(B[0]), B[1] * sp * 0.9, 0.16, 'tri');
  // eşlik
  const tn = ch.tones;
  if (sg.arp === 'up16') { const seq = [...tn, ...tn.map(x => x + 12)]; tone(t, hz(seq[s % seq.length] + 12), sp * 0.8, 0.028, 'sq', .125); }
  else if (sg.arp === 'updown8' && s % 2 === 0) { const seq = [tn[0], tn[1], tn[2], tn[0] + 12, tn[2], tn[1]]; tone(t, hz(seq[(s / 2) % seq.length] + 12), sp * 1.6, 0.03, 'sq', .25); }
  else if (sg.arp === 'stab' && (s === 2 || s === 6 || s === 10 || s === 14)) for (const x of tn) tone(t, hz(x + 12), sp * 0.7, 0.018, 'sq', .5);
  else if (sg.arp === 'power' && s % 2 === 0) for (const x of [ch.root, ch.root + 7]) tone(t, hz(x), sp * 1.7, 0.026, 'sq', .5);
  // davul (bölüm sonunda trampet dolgusu)
  const D = DRUMS[sg.drums];
  if (last && Math.floor(bar / barsPer) % 2 === 1 && s >= 12) drum(t, 's');
  else for (const k of ['k', 's', 'g', 'h', 'o']) if (D[k] && D[k].includes(s)) drum(t, k);
  if (s === 0 && bar % 8 === 0 && bar > 0 && D.o == null) drum(t, 'o');
  step++;
  if (step >= total * 2 && onEnd) { const f = onEnd; step = 0; f(); }
}
function tick() {
  if (!cur || !ac) return;
  const sp = 60 / cur.bpm / 4;
  while (nextT < ac.currentTime + 0.18) {
    const sw = cur.swing && step % 2 ? sp * cur.swing : 0;
    schedStep(cur, nextT + sw, sp); nextT += sp;
  }
}
const API = {
  songs: SONGS.map(s => ({ id: s.id, name: s.name, mood: s.mood })),
  init(ctx, dest) {
    if (ac) return; ac = ctx; bus = ac.createGain(); bus.gain.value = vol; bus.connect(dest || ac.destination);
    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  },
  play(id) {
    if (!ac) return; const sg = SONGS.find(s => s.id === id); if (!sg) return API.stop();
    if (cur === sg) return;
    cur = sg; step = 0; nextT = ac.currentTime + 0.08;
    clearInterval(timer); timer = setInterval(tick, 40); tick();
  },
  stop() { cur = null; clearInterval(timer); timer = 0; },
  get current() { return cur ? cur.id : null; },
  set onEnd(f) { onEnd = f; },
  prerender(secs) { const sp = 60 / cur.bpm / 4; while (nextT < secs) { schedStep(cur, nextT, sp); nextT += sp; } },   // test için
  setVolume(v) { vol = v; if (bus) bus.gain.setTargetAtTime(v, ac.currentTime, 0.05); }
};
window.HGP_MUSIC = API;
})();
