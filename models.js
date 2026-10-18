// Hidroket araç modelleri — fotoğraflardan voxel
// Koordinatlar: x arka(0) → ön(L), y sol → sağ, z yer → yukarı
(function () {
"use strict";
const L = 48;                 // voxel uzunluk (tüm araçlar)
const sq = x => x * x;
const kp = (keys, u) => {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (u <= keys[i][0]) {
    const a = keys[i - 1], b = keys[i], t = (u - a[0]) / (b[0] - a[0]);
    const s = t * t * (3 - 2 * t);          // yumuşak geçiş
    return a[1] + (b[1] - a[1]) * s;
  }
  return keys[keys.length - 1][1];
};
const x8 = u => Math.round(u * 48);

/* ---------- Araç tarifleri ----------
   hw:   yarı genişlik oranı (0..1) uzunluk boyunca
   belt: kemer hattı (alt gövdenin üstü)
   top:  en üst nokta (kabin / kubbe)
   cw:   kabinin gövdeye oranla genişliği
   paint(u, v, z, c) → renk (0xRRGGBB)
   c = { belt, top, h, isTop, upper, side }  */
const SPEC = {
  turaz: {
    W: 20, H: 19, clear: 2,
    hw: u => kp([[0, .80], [.05, .93], [.18, 1], [.72, 1], [.9, .9], [1, .66]], u),
    belt: u => kp([[0, 9.5], [.08, 10.5], [.5, 10.5], [.72, 9.6], [.86, 8.2], [.96, 6.6], [1, 5.2]], u),
    top: u => kp([[0, 9.5], [.03, 12.8], [.12, 15.4], [.28, 16.8], [.42, 16.4], [.56, 14.2], [.72, 10.4], [.86, 8.6], [1, 5.2]], u),
    cw: .8, nLow: 3.2, nUp: 2.2,
    paint(u, v, z, c) {
      const av = Math.abs(v);
      // farlar ve stoplar
      if (u > .955 && z >= 4.5 && z <= 6.5 && av > .42 && av < .86) return 0xfff6d8;
      if (u > .955 && z >= 4.5 && z <= 6.5 && av >= .86) return 0x9aa3ad;
      if (u < .04 && z >= 8 && z <= 10 && av > .45 && av < .9) return 0xe8322a;
      // camlar
      if (c.upper) {
        if (u >= .56 && u <= .73 && av < .8 && c.isTop) return (u > .62 && u < .65) ? 0x7fa9c4 : 0x24485f;      // ön cam
        if (!c.isTop && u >= .22 && u <= .60 && z >= 11.5 && z <= 15.5) {                                          // yan cam
          if (Math.abs(u - .43) < .012) return 0x1d2a33;
          return z > 14.5 ? 0x3c6a86 : 0x1c3a4d;
        }
        if (u < .1 && z >= 12 && z <= 15.5 && av < .7) return 0x1f3d52;                                           // arka cam
        if (!c.isTop && u > .04 && u < .2 && z >= 10.5 && z <= 15) {                                                // arka beyaz şeritler
          const k = (u * 48 + z * 0.9) % 5; if (k < 1) return 0xf4f6f8;
        }
        return 0x2a94d8;
      }
      // kaput: siyah panel + 36 plakası + mavi V
      if (c.isTop) {
        if (u > .77 && u < .9 && av < .46) return (u > .805 && u < .875 && av < .24) ? 0xf4f6f8 : 0x23272c;
        if (u > .72) return av < .9 * (1 - (u - .72) / .3) + .06 ? 0x2a94d8 : 0xb7c1ca;
        return 0x2a94d8;
      }
      // kapı: 36 numarası
      if (u > .4 && u < .5 && z >= 5 && z <= 8.5) return (u > .415 && u < .485 && z > 5.5 && z < 8) ? 0xf4f6f8 : 0x15181b;
      // kapı menteşe çizgisi
      if (Math.abs(u - .62) < .01 && z > 3 && z < 10) return 0x8a939c;
      // gövde alt yarısı gümüş, öne doğru yükselen mavi sınır
      return z < 3 + 10 * u ? 0xb7c1ca : 0x2a94d8;
    },
    wheels: [{ u: .2, r: 3.6, hub: 0xe05a3a, spokes: 10 }, { u: .74, r: 3.6, hub: 0xc9ced3, spokes: 10 }],
    extras(put, I) {
      // aynalar
      for (const s of [-1, 1]) for (let x = 0; x < 2; x++) for (let z = 0; z < 2; z++) put(Math.round(.66 * L) + x, s < 0 ? -1 : 20, 11 + z, 0x15181b);
    }
  },
  pars: {
    W: 17, H: 15, clear: 1.5,
    hw: u => kp([[0, .18], [.08, .42], [.25, .74], [.5, .9], [.72, 1], [.88, .96], [1, .6]], u),
    belt: u => kp([[0, 4.2], [.08, 6], [.3, 7.6], [.55, 8.6], [.72, 8.4], [.88, 7], [.97, 5.4], [1, 4.4]], u),
    top: u => kp([[0, 4.2], [.08, 6], [.3, 7.6], [.42, 9.6], [.55, 11.4], [.66, 11.6], [.76, 9.4], [.88, 7], [1, 4.4]], u),
    cw: .62, nLow: 2.6, nUp: 2,
    paint(u, v, z, c) {
      const av = Math.abs(v);
      if (c.upper) {
        if (u > .6 && u < .66 && c.isTop) return 0x8fb3c7;
        return u > .74 ? 0x1b252c : 0x10171c;
      }
      if (u > .94 && z >= 3.5 && z <= 5.5 && av > .3 && av < .82) return 0xffffff;                  // köşeli farlar
      if (u > .94 && z >= 3 && z <= 6 && av > .25 && av < .86) return 0x111111;
      if (c.isTop) return (u > .82 && u < .9 && av < .3) ? 0xf4f6f8 : 0xc61f2a;
      if (u > .62 && u < .7 && z >= 4.5 && z <= 7.5) return (u > .635 && u < .685 && z > 5 && z < 7) ? 0xf4f6f8 : 0x181818;   // 616
      if (u > .7 && u < .76 && z >= 5 && z <= 7.5) return 0xffd200;                                  // sarı sponsor
      if (u > .2 && u < .52 && z >= 3 && z <= 5) return (Math.floor(u * 90) % 4 === 0) ? 0x1a1a1a : 0xf2f2f2;       // sponsor şeridi
      if (u > .35 && u < .52 && z > 5 && z <= 6.5) return Math.floor(u * 70) % 3 === 0 ? 0xf2f2f2 : 0xc61f2a;
      return z < 2.8 ? 0x8a141c : 0xc61f2a;
    },
    wheels: [{ u: .8, r: 3.2, cover: 0x111214 }, { u: .14, r: 2.8, center: true, cover: 0x111214 }],
    extras(put) {
      // arka kanat
      for (let x = Math.round(.08 * L); x <= Math.round(.2 * L); x++) for (let y = 3; y < 14; y++) {
        const zt = 7.6 + (x - .08 * L) * 0.32; for (let z = 6; z <= zt; z++) put(x, y, z, z > zt - 1 ? 0xd8323c : 0xb01a24);
      }
    }
  },
  ucube: {
    W: 18, H: 17, clear: 1.5,
    hw: u => kp([[0, .3], [.08, .55], [.3, .88], [.5, .95], [.76, .92], [.94, .78], [1, .5]], u),
    belt: u => kp([[0, 5], [.1, 7], [.3, 9.4], [.6, 10], [.8, 8.4], [.94, 6.4], [1, 4.8]], u),
    top: u => kp([[0, 5], [.08, 8], [.32, 12.8], [.46, 14.4], [.6, 13.8], [.74, 10.4], [.9, 7.6], [1, 4.8]], u),
    cw: .86, nLow: 3, nUp: 2.3,
    paint(u, v, z, c) {
      const av = Math.abs(v);
      if (u > .955 && z >= 3.5 && z <= 5 && av > .35 && av < .82) return 0xffffff;
      if (c.upper && !c.isTop && u > .4 && u < .7 && z >= 10.2 && z <= 13) return (z > 12.5 || u < .41 || u > .69) ? 0x111111 : 0x223646;  // yan cam
      if (c.upper && c.isTop && u > .64 && u < .78 && av < .78) return 0x22364a;                                                           // ön cam
      if (u > .17 && u < .25 && z >= 7.5 && z <= 10.5 && !c.isTop) return (Math.abs(u - .21) < .02 && z > 8 && z < 10) ? 0x222222 : 0xf4f6f8; // 7 numara
      if (u > .7) {                                                                                                                        // beyaz burun + mavi noktalar
        if (c.isTop && u > .8 && u < .92 && (Math.round(u * 48) % 2 === 0) && (Math.round(v * 6) % 2 === 0)) return 0x2a4fa8;
        return 0xf4f6f8;
      }
      const d = u + z * .018;                                                                                                              // çapraz şeritler
      if (d > .27 && d < .3) return 0xf4f6f8;
      if (d > .3 && d < .36) return 0x2a4fa8;
      if (d > .58 && d < .61) return 0xf4f6f8;
      if (d > .61 && d < .66) return 0x2a4fa8;
      if (u > .38 && u < .56 && !c.isTop && z > 4 && z < 9 && ((x8(u) + z) % 2 === 0)) return 0xd77812;                                // noktalı panel
      if (u > .66 && u < .7) return 0xf4f6f8;
      return 0xf08a1c;
    },
    wheels: [{ u: .2, r: 3, skirt: true }, { u: .8, r: 3.2, spokes: 8 }],
    extras(put) {
      // kırmızı tepe lambası
      const x0 = Math.round(.78 * L); for (let x = 0; x < 2; x++) for (let y = 8; y < 10; y++) for (let z = 0; z < 2; z++) put(x0 + x, y, 11 + z, z ? 0xff3b30 : 0x8a1010);
    }
  },
  heli: {
    W: 18, H: 15, clear: 1.6,
    hw: u => kp([[0, .45], [.1, .78], [.3, .95], [.6, 1], [.85, .9], [1, .5]], u),
    belt: u => kp([[0, 4.5], [.1, 7.2], [.3, 8.4], [.6, 8.6], [.82, 7.4], [.95, 5.6], [1, 4]], u),
    top: u => kp([[0, 4.5], [.1, 7.2], [.32, 8.6], [.42, 11.2], [.58, 12.2], [.74, 11], [.86, 7.8], [.95, 5.6], [1, 4]], u),
    cw: .8, nLow: 2.2, nUp: 1.8,
    paint(u, v, z, c) {
      const av = Math.abs(v);
      if (c.upper) return (u > .5 && u < .56 && c.isTop) ? 0x9fb4c0 : (u > .6 && av < .3 && c.isTop) ? 0x2b3c47 : 0x18232b;
      if (u > .95 && z >= 3 && z <= 4.5 && av > .3 && av < .75) return 0xfff8de;
      if (u > .78 && u < .86 && z >= 5 && z <= 7 && !c.isTop) return (u > .79 && u < .85 && z > 5.3 && z < 6.7) ? 0x222222 : 0xf4f6f8;  // 304
      if (u > .22 && u < .3 && z >= 4.6 && z <= 6.4 && !c.isTop) return 0xffc21a;                                                         // sarı sponsor
      if (u > .32 && u < .7 && z >= 3.6 && z <= 4.6 && !c.isTop) return Math.floor(u * 80) % 3 ? 0xe9ecef : 0x2a62b8;
      if (c.isTop) return (u < .3 && av < .2) ? 0xe8ecef : 0xc9cfd5;
      return z < 3 ? 0x7f878f : (z > c.belt - 1.5 ? 0xbfc6cd : 0xaab2ba);
    },
    wheels: [{ u: .18, r: 2.8, skirt: true }, { u: .76, r: 3.2, spokes: 5 }],
    extras() {}
  }
};

function buildModel(key) {
  const sp = SPEC[key], W = sp.W, H = sp.H;
  const occ = new Map();
  const K = (x, y, z) => (z * 64 + (y + 4)) * 64 + x;
  const put = (x, y, z, c) => { if (x < 0 || x >= L || z < 0 || z >= H + 3) return; occ.set(K(x, y, z), { x, y, z, c }); };
  for (let x = 0; x < L; x++) {
    const u = (x + .5) / L, hw = Math.max(.12, sp.hw(u)) * W / 2, belt = sp.belt(u), top = Math.max(belt, sp.top(u));
    for (let y = 0; y < W; y++) {
      const vy = y + .5 - W / 2, v = vy / (W / 2), t = Math.abs(vy) / hw;
      if (t > 1.02) continue;
      const low = sp.clear + (belt - sp.clear) * Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, t), sp.nLow)), 1 / sp.nLow);
      const tc = t / sp.cw;
      const up = tc <= 1 && top > belt + .3 ? belt + (top - belt) * Math.pow(Math.max(0, 1 - Math.pow(tc, sp.nUp)), 1 / sp.nUp) : 0;
      const h = Math.max(low, up);
      for (let z = Math.ceil(sp.clear); z <= Math.round(h); z++) {
        const upper = z > belt + .4 && up > 0 && z <= up + .5;
        put(x, y, z, sp.paint(u, v, z, { belt, top, h, isTop: z >= h - 1, upper, side: t > .7 }));
      }
    }
  }
  // tekerlekler
  for (const wh of sp.wheels) {
    const xc = wh.u * L - .5, zc = wh.r - .2;
    const mid = Math.floor(W / 2), ys = wh.center ? [mid - 1, mid] : [-1, 0, W - 1, W];
    for (const y of ys) for (let x = Math.floor(xc - wh.r - 1); x <= xc + wh.r + 1; x++) for (let z = 0; z <= zc + wh.r + 1; z++) {
      const d2 = sq(x - xc) + sq(z - zc); if (d2 > wh.r * wh.r + .4) continue;
      const outer = wh.center || y === -1 || y === W;
      let col = 0x17181a;
      if (outer) {
        const r = Math.sqrt(d2);
        if (wh.cover) col = r < 1 ? 0xffffff : (r > wh.r - .9 ? 0x1c1d20 : wh.cover);
        else if (wh.skirt) col = r > wh.r - 1 ? 0x17181a : 0x2a2c30;
        else if (r <= wh.r - 1.1) {
          const a = Math.atan2(z - zc, x - xc), n = wh.spokes || 6;
          const spoke = Math.abs(((a / (Math.PI * 2) * n) % 1 + 1) % 1 - .5) > .32;
          col = r < 1.1 ? (wh.hub || 0xc9ced3) : spoke ? 0xd7dce0 : 0x3a3d42;
          if (wh.hub && r < 1.9) col = wh.hub;
        }
      }
      put(x, y, z, col);
    }
  }
  sp.extras(put);
  // yüzey voxelleri ve normaller
  const empty = (x, y, z) => !occ.has(K(x, y, z));
  const vox = [];
  for (const o of occ.values()) {
    const { x, y, z } = o;
    const ex = [empty(x + 1, y, z), empty(x - 1, y, z), empty(x, y + 1, z), empty(x, y - 1, z), empty(x, y, z + 1), empty(x, y, z - 1)];
    if (!ex.some(Boolean)) continue;
    let nx = ex[0] - ex[1], ny = ex[2] - ex[3], nz = ex[4] - ex[5]; if (!nx && !ny && !nz) nz = 1;
    const l = Math.hypot(nx, ny, nz);
    vox.push({ x: x - L / 2 + .5, y: y - W / 2 + .5, z: z + .5, r: o.c >> 16 & 255, g: o.c >> 8 & 255, b: o.c & 255, nx: nx / l, ny: ny / l, nz: nz / l, top: ex[4] });
  }
  return { vox, W, H, L };
}

const LIGHT = (() => { const l = [-.42, -.5, .76], m = Math.hypot(...l); return l.map(v => v / m); })();
const HALF = (() => { const h = [LIGHT[0], LIGHT[1], LIGHT[2] + 1], m = Math.hypot(...h); return h.map(v => v / m); })();
// yaw: model x ekseninin ekranda baktığı açı (0 = sağa, π/2 = kameradan uzağa)
function renderVox(g, m, yaw, s, ox, oy, pitch) {
  const cs = Math.cos(yaw), sn = Math.sin(yaw), cp = Math.cos(pitch), spn = Math.sin(pitch);
  const n = m.vox.length;
  if (!m._buf || m._buf.length !== n) m._buf = m.vox.map(v => ({ v, d: 0, sx: 0, sy: 0, col: '' }));
  const list = m._buf;
  for (const o of list) {
    const v = o.v;
    const rx = v.x * cs - v.y * sn, ry = v.x * sn + v.y * cs;
    const nrx = v.nx * cs - v.ny * sn, nry = v.nx * sn + v.ny * cs;
    o.d = ry * cp - v.z * spn; o.sx = rx; o.sy = -(v.z * cp + ry * spn);
    const dif = Math.max(0, nrx * LIGHT[0] + nry * LIGHT[1] + v.nz * LIGHT[2]);
    const spec = Math.pow(Math.max(0, nrx * HALF[0] + nry * HALF[1] + v.nz * HALF[2]), 18) * .35;
    const br = .5 + .62 * dif;
    o.col = 'rgb(' + Math.min(255, v.r * br + 255 * spec | 0) + ',' + Math.min(255, v.g * br + 255 * spec | 0) + ',' + Math.min(255, v.b * br + 255 * spec | 0) + ')';
  }
  list.sort((a, b) => b.d - a.d);
  const sz = Math.max(1, Math.ceil(s * 1.12)), half = s / 2;
  for (const o of list) { g.fillStyle = o.col; g.fillRect(Math.floor(ox + o.sx * s - half), Math.floor(oy + o.sy * s - half), sz, sz); }
}
// koyu dış hat ekleyerek çiz (8-bit görünüm)
const tmp = document.createElement('canvas'), tg = tmp.getContext('2d');
const sil = document.createElement('canvas'), sg = sil.getContext('2d');
function renderCar(g, m, yaw, s, ox, oy, pitch, outline = 'rgba(8,14,22,.85)') {
  const w = Math.ceil((m.L + 6) * s * 1.1), h = Math.ceil((m.H + m.L * .5 + 6) * s);
  if (tmp.width < w || tmp.height < h) { tmp.width = sil.width = Math.max(w, tmp.width); tmp.height = sil.height = Math.max(h, tmp.height); }
  const cx = Math.round(tmp.width / 2), cy = Math.round(tmp.height * .72);
  tg.clearRect(0, 0, tmp.width, tmp.height);
  renderVox(tg, m, yaw, s, cx, cy, pitch);
  sg.globalCompositeOperation = 'copy'; sg.drawImage(tmp, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = outline; sg.fillRect(0, 0, sil.width, sil.height); sg.globalCompositeOperation = 'source-over';
  const x0 = Math.round(ox - cx), y0 = Math.round(oy - cy);
  g.drawImage(sil, x0 - 1, y0); g.drawImage(sil, x0 + 1, y0); g.drawImage(sil, x0, y0 - 1); g.drawImage(sil, x0, y0 + 1);
  g.drawImage(tmp, x0, y0);
}

window.HGP_MODELS = { L, SPEC, buildModel, renderVox, renderCar };
})();
