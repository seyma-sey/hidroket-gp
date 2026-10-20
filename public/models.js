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
  /* TUR-AZ (36): 4 tekerlekli şehir aracı. Alçak burun, uzun eğimli ön cam, yüksek ve yuvarlak arka.
     Üst gövde mavi, alt gövde ve burun gümüş, kaputta mavi V, arka çamurlukta beyaz çapraz şeritler. */
  turaz: {
    W: 20, H: 19, clear: 2,
    hw: u => kp([[0, .8], [.05, .93], [.15, 1], [.75, 1], [.9, .93], [1, .7]], u),
    belt: u => kp([[0, 10], [.06, 11.2], [.45, 11], [.62, 10.4], [.8, 8.6], [.92, 7.2], [1, 5.6]], u),
    top: u => kp([[0, 10], [.03, 13.6], [.1, 15.6], [.25, 16.8], [.42, 16.6], [.52, 15.4], [.66, 12], [.8, 9.2], [.92, 7.4], [1, 5.6]], u),
    cw: .82, nLow: 3.4, nUp: 2.4,
    paint(u, v, z, c) {
      const av = Math.abs(v), BL = 0x2a9be0, SV = 0xb9c2ca;
      if (u > .965 && z >= 5.4 && z <= 7 && av > .5 && av < .86) return 0xfdf6dc;                  // farlar
      if (u < .035 && z >= 9 && z <= 10.6 && av > .42 && av < .82) return 0xe8322a;                  // stoplar
      if (u < .035 && z >= 3 && z <= 4 && av < .5) return 0x2b2f34;                                    // arka tampon gölgesi
      if (c.upper) {
        if (c.isTop && u >= .5 && u <= .8 && av < .84) return (Math.abs(u - .6 - av * .04) < .012) ? 0x8ab4cc : 0x203e52;   // ön cam
        if (!c.isTop && u >= .36 && u <= .58 - (z - 11) * .01 && z >= 11.6 && z <= 15.6) return z > 14.6 ? 0x3d6c88 : 0x1b384b;  // kapı camı
        if (!c.isTop && u > .06 && u < .32) { const k = u * 48 - z * .9; if (((k % 4) + 4) % 4 < 1.1) return 0xf4f6f8; }  // beyaz şeritler
        return BL;
      }
      if (c.isTop) {
        if (u > .8 && u < .92 && av < .42) return (u > .83 && u < .89 && av < .22) ? 0xf4f6f8 : 0x262a2f;   // kaput plakası
        if (u > .8) return av < .86 * (1 - (u - .8) / .22) + .04 ? BL : SV;                                  // mavi V
        return BL;
      }
      // kapı: çizgiler, 36 numarası, menteşe
      if ((Math.abs(u - .36) < .008 || Math.abs(u - .585) < .008) && z > 3 && z < 11.6) return 0x5f6870;
      if (Math.abs(u - .6) < .012 && (Math.abs(z - 5) < .6 || Math.abs(z - 8.6) < .6)) return 0xdfe3e6;
      if (u > .41 && u < .52 && z >= 6 && z <= 9.4) return (u > .425 && u < .505 && z > 6.5 && z < 9) ? ((Math.round(u * 96) % 3 && z > 7 && z < 8.4) ? 0x15181b : 0xf4f6f8) : 0x15181b;
      if (u > .4 && u < .44 && z > 9.8 && z < 10.6) return 0x1a1d20;                                    // kapı kolu
      return z < 3.6 + 10 * Math.pow(u, 1.6) ? SV : BL;
    },
    wheels: [{ u: .19, r: 4.6, hub: 0xd9483a, spokes: 10 }, { u: .79, r: 4.6, hub: 0xc9ced3, spokes: 10 }],
    extras(put) { for (const y of [-1.2, 20.2]) for (let x = 0; x < 2; x++) for (let z = 0; z < 2.4; z += .7) put(.64 * 48 + x, y, 11.4 + z, 0x15181b); }
  },
  /* PARS (701): 3 tekerlekli prototip. Kırmızı, uzun sivri kuyruk, ön tekerlekler siyah kapaklı (hidroket amblemi),
     kabarcık kabin ve arkasında tümsek, beyaz sponsor yazıları, Türk bayrağı, Shell. */
  pars: {
    W: 17, H: 15, clear: 1.6,
    hw: u => kp([[0, .12], [.1, .4], [.3, .72], [.55, .92], [.75, 1], [.9, .95], [1, .55]], u),
    belt: u => kp([[0, 6], [.1, 6.6], [.35, 7.8], [.6, 8.4], [.8, 8], [.93, 6.6], [1, 4.6]], u),
    top: u => kp([[0, 6], [.1, 6.8], [.35, 8.4], [.5, 10], [.6, 11.8], [.68, 12.8], [.76, 12.4], [.85, 10.2], [.92, 7.8], [1, 4.6]], u),
    cw: .76, nLow: 2.6, nUp: 2,
    paint(u, v, z, c) {
      const av = Math.abs(v), R = 0xc81e2b;
      if (c.upper || (c.isTop && u > .62 && u < .88 && av < .6)) {
        if (u > .6 && u < .9) return (c.isTop && Math.abs(u - .7) < .015) ? 0x9cc0d4 : (z > c.top - 1.4 ? 0x2a3a46 : 0x111a21);  // kabarcık cam
        return z > c.top - 1 ? 0xd8323c : R;
      }
      if (u > .955 && z >= 4 && z <= 6 && av > .32 && av < .82) return ((u * 48 + z) % 2 < 1.2) ? 0xffffff : 0x1a1a1a;   // LED farlar
      if (u > .96 && z >= 2.6 && z < 4.4 && av < .3) return 0x0e0f11;                                                       // ön ağız
      if (c.isTop) {
        if (u > .3 && u < .44 && Math.abs(v + .35 - (u - .3) * 1.6) < .07) return 0xf4f6f8;                                    // Atatürk imzası
        return u < .5 && Math.abs(v) < .1 ? 0xd8323c : R;
      }
      if (u > .62 && u < .7 && z >= 4.4 && z <= 7.6) return (u > .632 && u < .688 && z > 4.9 && z < 7.1 && (Math.round(u * 120) % 3 === 0 || z < 5.3 || z > 6.7)) ? 0x111111 : 0xf8f8f6;  // 701
      if (u > .72 && u < .78 && z >= 4.8 && z <= 7.6) { const d = Math.hypot((u - .75) * 48, z - 6.2); return d < 1.5 ? 0xffd400 : d < 1.9 ? 0xe2231a : R; }  // Shell
      { const d = Math.hypot((u - .555) * 48, z - 6.3); if (d < 1.6) return d > 1.1 ? 0xf4f6f8 : (Math.hypot((u - .56) * 48, z - 6.3) < .7 ? 0xf4f6f8 : 0xd1202b); }  // bayrak
      { const d = Math.hypot((u - .495) * 48, z - 6.3); if (d < 1.6) return d > 1.05 ? 0xf4f6f8 : 0xb21a26; }                                               // üniversite mührü
      if (u > .22 && u < .58 && z >= 3 && z <= 5.2) return ((Math.round(u * 110) + Math.round(z * 2)) % 3 === 0) ? 0xf4f6f8 : R;                       // sponsorlar
      return z < 2.8 ? 0x8a141c : R;
    },
    wheels: [{ u: .79, r: 3.8, cover: 0x101113, emblem: true }, { u: .12, r: 3, center: true, cover: 0x101113 }],
    extras(put) {   // kabinin arkasındaki tümsek
      for (let x = .5 * 48; x <= .66 * 48; x += .6) { const t = (x - .5 * 48) / (.16 * 48), zt = 10 + t * 3.6;
        for (let y = 6.6; y <= 10.4; y += .6) for (let z = 9; z <= zt; z += .6) put(x, y, z, z > zt - .7 ? 0xd8323c : 0xb81a26); }
    }
  },
  /* UCUBE (7): 3 tekerlekli elektromobil. Beyaz burun üstünde mavi noktalar, turuncu gövde, çapraz mavi bant
     ve beyaz şeritler, noktalı turuncu panel, uzun yuvarlak kuyruk, kırmızı tepe lambası. */
  ucube: {
    W: 18, H: 17, clear: 1.6,
    hw: u => kp([[0, .55], [.06, .74], [.3, .9], [.55, .96], [.78, .92], [.93, .78], [1, .5]], u),
    belt: u => kp([[0, 8.4], [.08, 9.4], [.3, 10.2], [.55, 10.4], [.72, 9.6], [.85, 8], [.95, 6.2], [1, 4.8]], u),
    top: u => kp([[0, 8.4], [.06, 10.6], [.3, 12.6], [.5, 14.2], [.6, 14.6], [.7, 13.4], [.8, 10.4], [.9, 8], [1, 4.8]], u),
    cw: .86, nLow: 3, nUp: 2.3,
    paint(u, v, z, c) {
      const av = Math.abs(v), OR = 0xf28c1c, BL = 0x2a50a8, WH = 0xf4f6f8;
      if (u > .96 && z >= 4 && z <= 5.4 && av > .38 && av < .8) return 0xffffff;
      if (c.upper && !c.isTop && u > .5 && u < .68 && z >= 11 && z <= 14) return (z > 13.4 || u < .51 || u > .67) ? 0x111111 : 0x22384a;   // yan cam
      if (c.upper && c.isTop && u > .66 && u < .82 && av < .8) return 0x1f3448;                                                         // ön cam
      if (c.isTop && u > .28 && u < .36 && av < .3) { const d = Math.hypot((u - .32) * 48, v * 9); return d < 1.7 ? (d < 1 && Math.abs((u - .32) * 48 + v * 6) < .5 ? 0x111111 : WH) : BL; }  // üstte 7
      if (!c.isTop && u > .14 && u < .24 && z >= 8 && z <= 11.6) { const d = Math.hypot((u - .19) * 48, z - 9.8); if (d < 2) return (d < 1.3 && Math.abs((u - .19) * 48 - (z - 9.8) * .5) < .45) ? 0x111111 : WH; }  // yanda 7
      if (!c.isTop && u > .54 && u < .6 && z > 9 && z < 10.6) return u > .57 ? 0x4cb04c : WH;                                        // EC etiketi
      if (u > .72) {                                                                                                                  // beyaz burun + mavi noktalar
        const dens = 1 - (u - .72) / .16;
        if (dens > 0 && (Math.round(u * 96) % 2 === 0) && (Math.round(z * 2 + (c.isTop ? v * 9 : 0)) % 2 === 0) && ((u * 31 + z * 7) % 1 < dens)) return BL;
        if (!c.isTop && z > 5 && z < 6.2 && u < .84 && Math.abs(z - 5.6 - (u - .72) * 8) < .5) return OR;                             // turuncu şimşek ucu
        return WH;
      }
      const d = u + z * .02;                                                                                                          // çapraz bant ve şeritler
      if (d > .3 && d < .33) return WH;
      if (d > .33 && d < .44) return (!c.isTop && d > .4 && d < .415) ? WH : BL;
      if (d > .44 && d < .465) return WH;
      if (d > .64 && d < .665) return WH;
      if (!c.isTop && z < 3.6 && u > .3 && u < .7) return BL;                                                                         // mavi etek
      if (!c.isTop && u > .46 && u < .64 && z > 3.6 && z < 9.6 && ((Math.round(u * 96) + Math.round(z * 2)) % 2 === 0)) return 0xc96a10;  // noktalı panel
      if (!c.isTop && Math.abs(z - 6.2 + (u - .5) * 6) < .45 && u > .5 && u < .7) return WH;                                         // beyaz şimşek
      return OR;
    },
    wheels: [{ u: .79, r: 3.9, spokes: 10, hub: 0xc9ced3 }, { u: .14, r: 3, center: true, skirt: true }],
    extras(put) {
      const x0 = .8 * 48; for (let x = 0; x < 1.6; x += .6) for (let y = 4.4; y < 6; y += .6) for (let z = 0; z < 2.2; z += .6) put(x0 + x, y, 11 + z, z > 1.2 ? 0xff3b30 : 0x8a1010);   // tepe lambası
      for (let x = 0; x < 1.4; x += .6) for (let z = 0; z < 1.6; z += .6) put(.71 * 48 + x, -1, 11.6 + z, 0x15181b);                                   // ayna
    }
  },
  /* HELIANTHUS (304): gümüş damla gövde, burundan ortaya uzanan büyük füme kabin, açık gümüş jantlı ön
     tekerlekler, kuyrukta küçük rüzgârlık, Shell ve numara plakası. */
  heli: {
    W: 18, H: 14.5, clear: 1.6,
    hw: u => kp([[0, .3], [.1, .62], [.3, .9], [.55, 1], [.8, .95], [.93, .78], [1, .45]], u),
    belt: u => kp([[0, 6], [.1, 7], [.3, 8.2], [.55, 8.4], [.75, 7.4], [.9, 5.8], [1, 4]], u),
    top: u => kp([[0, 6.6], [.06, 7.6], [.2, 8.8], [.4, 11], [.52, 12.4], [.62, 12.2], [.75, 10.6], [.87, 8.2], [.95, 6], [1, 4]], u),
    cw: .86, nLow: 2.2, nUp: 1.8,
    paint(u, v, z, c) {
      const av = Math.abs(v);
      if ((c.upper && u > .5) || (c.isTop && u > .52 && u < .93 && av < .82 - (u - .52) * .6)) return (c.isTop && Math.abs(u - .66) < .018) ? 0x8ea6b4 : (z > c.top - 1.2 ? 0x2a3a46 : 0x131c24);       // füme kabin
      if (u > .955 && z >= 3 && z <= 4.4 && av > .3 && av < .75) return 0xfff8de;
      if (!c.isTop && u > .62 && u < .71 && z >= 4.6 && z <= 7.2) return (u > .632 && u < .698 && z > 5.1 && z < 6.7 && (Math.round(u * 120) % 3 === 0 || z < 5.4 || z > 6.4)) ? 0x151515 : 0xf8f8f6;  // 304
      if (!c.isTop && u > .74 && u < .8 && z >= 4.6 && z <= 7.4) { const d = Math.hypot((u - .77) * 48, z - 6); return d < 1.3 ? 0xffd400 : d < 1.7 ? 0xe2231a : 0xc4cbd2; }  // Shell
      if (!c.isTop && u > .2 && u < .54 && z >= 3.4 && z <= 4.8) return ((Math.round(u * 110) + Math.round(z * 2)) % 3 === 0) ? 0x2a3a8a : 0xf2f4f6;               // sponsor şeridi
      if (c.isTop && u > .8 && u < .88 && av < .25) { const d = Math.hypot((u - .84) * 48, v * 9); if (d < 1.6) return d < 1 ? 0xf4f6f8 : 0xd1202b; }            // bayrak
      if (c.isTop) return (Math.abs(v) < .25 && u < .5) ? 0xe6eaee : 0xc8cfd6;
      return z < 3 ? 0x7c848c : (z > c.belt - 1.4 ? 0xd2d8de : 0xb4bcc4);
    },
    wheels: [{ u: .78, r: 3.7, spokes: 6, hub: 0xd7dce0 }, { u: .14, r: 2.8, center: true, skirt: true }],
    extras(put) { for (let x = .4; x < .07 * 48; x += .6) { const hw = this.hw(x / 48) * 9 - .4; for (let y = 9 - hw; y < 9 + hw; y += .6) put(x, y, 6.8 + (1 - x / 3.4) * 1.4, 0xd2d8de); } }   // rüzgârlık
  },
  /* HİDROKET-1 (3): gümüş gövde, önde turuncu alevler, turuncu burun ve çamurluklar, uzun füme kabin,
     kuyrukta yukarı kalkık rüzgârlık, yanda büyük siyah 3, kuyrukta TOSFED dama bayrağı, turuncu aynalar. */
  hk1: {
    W: 18, H: 17, clear: 1.6,
    hw: u => kp([[0, .58], [.08, .76], [.35, .92], [.65, 1], [.86, .96], [1, .72]], u),
    belt: u => kp([[0, 11.6], [.1, 12], [.35, 10.8], [.6, 9.4], [.78, 8], [.9, 6.4], [1, 4.4]], u),
    top: u => kp([[0, 13], [.05, 15.4], [.12, 14.6], [.35, 13.4], [.5, 13], [.62, 12.4], [.76, 10.4], [.88, 7.4], [1, 4.4]], u),
    cw: .7, nLow: 3.2, nUp: 2,
    paint(u, v, z, c) {
      const av = Math.abs(v), SV = 0xbcc2c9, OR = 0xf2761c;
      if (c.upper && u > .4 && u < .8) return (c.isTop && Math.abs(u - .66) < .015) ? 0x8ea6b4 : (u > .72 && u < .755 && z > c.top - 1 && v < -.25) ? 0xd1202b : 0x15191e;   // füme kabin + bayrak
      if (c.isTop && u > .4 && u < .8 && av < .5) return 0x15191e;
      if (u > .965 && z >= 3.6 && z <= 5 && av > .3 && av < .8) return 0xfff2c8;
      if ((c.side || !c.isTop) && u > .12 && u < .25 && z >= 6.5 && z <= 12.5) return digit3(u, z, v) ? 0x16181c : SV;                                         // büyük 3
      if ((c.side || !c.isTop) && u > .025 && u < .09 && z >= 5.5 && z <= 9.5) return z > 8.6 ? 0xd1202b : ((Math.floor(u * 48 * 1.5) + Math.floor(z * 1.5)) % 2 ? 0x111111 : 0xf4f4f4);  // TOSFED
      if (c.isTop && u > .82 && u < .9 && av < .25) { const d = Math.hypot((u - .86) * 48, v * 9); if (d < 1.7) return d < 1.1 ? 0x3a3020 : 0xe8e2d0; }      // mühür
      // alevler: önden geriye uzanan dilimler
      const tongue = .58 - .2 * Math.pow(Math.max(0, Math.sin(z * 1.25 + (c.isTop ? v * 4 : 0))), .7);
      if (u > .8) return OR;
      if (u > tongue) return (u < tongue + .025) ? 0xf7a24a : OR;
      if (!c.isTop && u > .28 && u < .55 && z > 3 && z < 8 && ((Math.round(u * 140) + Math.round(z * 3)) % 7 === 0)) return 0xf4f6f8;      // sponsor etiketleri
      return z < 2.8 ? 0x8b9198 : SV;
    },
    wheels: [{ u: .78, r: 3.7, spokes: 6, hub: 0xd7dce0 }, { u: .1, r: 2.6, center: true, skirt: true }],
    extras(put) {
      for (let x = 0; x < .07 * 48; x += .6) { const hw = this.hw(x / 48) * 9 + .4; for (let y = 9 - hw; y < 9 + hw; y += .6) put(x, y, 14 + (1 - x / 3.4) * 2.2, 0xc9cfd5); }   // kalkık rüzgârlık
      for (const y of [-1, 19]) { for (let z = 0; z < 2.4; z += .6) put(.71 * 48, y, 11 + z, 0x9aa0a6); put(.71 * 48, y, 13.4, 0xf2761c); put(.71 * 48 + .7, y, 13.4, 0xf2761c); }  // aynalar
    }
  },
  /* HALİS'İN SCOOTERI: siyah elektrikli scooter (mavi ışıklı gövde, çift far, arka çanta) ve üstünde Halis:
     siyah tişört, koyu kıvırcık saç, koyu pantolon, bilekte gümüş bilezik. */
  halis: {
    W: 14, H: 29, clear: 0, custom: true,
    wheels: [{ u: .2, r: 4, center: true, thick: true }, { u: .8, r: 4, center: true, thick: true }],
    extras(put) {
      const box = (x0, x1, y0, y1, z0, z1, c) => { for (let x = x0; x < x1; x += .6) for (let y = y0; y < y1; y += .6) for (let z = z0; z < z1; z += .6) put(x, y, z, typeof c === 'function' ? c(x, y, z) : c); };
      const line = (a, b, r, c) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / .4); for (let i = 0; i <= n; i++) { const t = i / n; box(a[0] + (b[0] - a[0]) * t - r, a[0] + (b[0] - a[0]) * t + r, a[1] + (b[1] - a[1]) * t - r, a[1] + (b[1] - a[1]) * t + r, a[2] + (b[2] - a[2]) * t - r, a[2] + (b[2] - a[2]) * t + r, c); } };
      const BK = 0x16171a, BL = 0x2f4fd8;
      // gövde (ayaklık) + mavi ışıklar
      box(11, 37, 4.4, 9.6, 3.6, 5.4, (x, y, z) => z > 4.8 && (Math.abs(y - 5.8) < .5 || Math.abs(y - 8.2) < .5) && x > 14 && x < 34 && (x | 0) % 3 ? BL : BK);
      box(8, 14, 5.2, 8.8, 3, 5, 0x9aa0a6);                                   // arka salıncak
      line([6, 7, 9.6], [14, 7, 4.8], .5, BK);                              // arka çamurluk desteği
      for (let a = 0; a < Math.PI; a += .12) put(9.6 - Math.cos(a) * 5, 7, 4 + Math.sin(a) * 5, BK);   // çamurluk
      // arka çanta
      box(2.6, 12.4, 2.2, 11.8, 9.6, 16.4, (x, y, z) => z > 15.6 ? 0x23252a : (Math.abs(z - 13.6) < .3 ? 0x0e0f11 : BK));
      line([8, 3, 9.6], [12, 3, 5], .4, BK); line([8, 11, 9.6], [12, 11, 5], .4, BK);
      // ön maşa ve direk (mavi ara parça)
      line([37, 7, 5], [40.2, 7, 24], .9, (x, y, z) => (z > 9 && z < 21 && x < 38.4 + (z - 5) * .17 && Math.abs(y - 7) < .5) ? BL : BK);
      line([38.4, 5.4, 4], [39.4, 5.4, 10], .5, 0xa8aeb4); line([38.4, 8.6, 4], [39.4, 8.6, 10], .5, 0xa8aeb4);
      // çift far
      box(40.4, 41.6, 4.4, 6.2, 9.4, 11.2, 0xfffbe0); box(40.4, 41.6, 7.8, 9.6, 9.4, 11.2, 0xfffbe0);
      box(39.6, 40.4, 4.2, 9.8, 9.2, 11.4, BK);
      // gidon
      box(39.4, 41, 0, 14, 23.4, 24.6, BK); box(39.4, 41.2, -.6, 1.4, 23.2, 24.8, 0x2a2c30); box(39.4, 41.2, 12.6, 14.6, 23.2, 24.8, 0x2a2c30);
      box(40.2, 41.6, 6, 8, 24.4, 25.4, 0x30343a);                            // ekran
      /* Halis */
      const SK = 0xc8875e, SKd = 0xa86d4a, TS = 0x17181b, PN = 0x2f3644, HR = 0x1d1511, HR2 = 0x2c2019;
      box(20.6, 24.4, 5, 6.8, 5.4, 6.8, 0x26272b); box(27.4, 31.2, 7.2, 9, 5.4, 6.8, 0x26272b);            // ayakkabılar
      line([23, 5.9, 6.8], [25.6, 5.9, 15.6], .95, PN); line([29.4, 8.1, 6.8], [27.2, 8.1, 15.6], .95, PN);   // bacaklar
      box(24.4, 29.6, 4.2, 9.8, 15.2, 17, PN);                                                              // kalça
      for (let z = 16.6; z < 24; z += .6) { const lean = (z - 16.6) * .14; box(24.6 + lean, 29.6 + lean, 4 + (z > 21 ? .2 : 0), 10 - (z > 21 ? .2 : 0), z, z + .6, TS); }   // gövde: siyah tişört
      line([29.6, 3.4, 22.6], [33.6, 2.6, 21.6], .9, TS); line([29.6, 10.6, 22.6], [33.6, 11.4, 21.6], .9, TS);   // kollar (kısa kol)
      line([33.6, 2.6, 21.6], [40, .8, 24], .75, SK); line([33.6, 11.4, 21.6], [40, 13.2, 24], .75, SK);           // ön kollar gidona
      box(37.6, 38.8, 12, 14, 22.8, 24.2, 0xd4d8dc);                                                         // gümüş bilezik
      box(27.6, 30, 5.8, 8.2, 23.8, 25, SK);                                                                // boyun
      box(26.6, 31.4, 4.8, 9.2, 24.8, 30, (x, y, z) => {                                                    // baş
        if (x > 30.8) { if (Math.abs(z - 28.2) < .4 && (Math.abs(y - 6) < .5 || Math.abs(y - 8) < .5)) return 0x241a14;   // gözler
                        if (Math.abs(z - 29.1) < .3 && (Math.abs(y - 6) < .8 || Math.abs(y - 8) < .8)) return HR;          // kaşlar
                        if (Math.abs(z - 26.4) < .35 && Math.abs(y - 7) < 1.1) return 0x8a4a36;                             // gülümseme
                        if (Math.abs(y - 7) < .5 && z > 26.8 && z < 28) return SKd; }                                       // burun
        if (x < 27.8 && z > 26.4) return ((x * 3 | 0) + (z * 3 | 0) + (y * 3 | 0)) % 2 ? HR : HR2;                         // ense saç
        return SK; });
      box(26.2, 31.6, 4.4, 9.6, 29.6, 31.8, (x, y, z) => ((x * 2.5 | 0) + (y * 2.5 | 0) + (z * 2.5 | 0)) % 2 ? HR : HR2);  // kıvırcık saç
      box(30.4, 32, 4.8, 9.2, 29.2, 30.2, HR);                                                                          // perçem
      box(26.4, 30.6, 4.2, 4.8, 26.8, 30, HR); box(26.4, 30.6, 9.2, 9.8, 26.8, 30, HR);                                 // yan saçlar
    }
  },
  /* HASAN FURKAN'IN PATPATI: kırmızı kasa ve kasa kapakları (beyaz şeritler, siyah üst parmaklık), önde açıkta
     turuncu tek silindirli motor ve siyah hava filtresi, kırmızı boru kafes, kırmızı ön panel ve farlar,
     sarı "KEL OĞLAN" tamponu, çelik jantlar. Direksiyonda Hasan Furkan: bej şapka, gözlük, neon sarı-mavi tişört, kamuflaj pantolon. */
  patpat: {
    W: 20, H: 24, clear: 0, custom: true,
    wheels: [{ u: .2, r: 4.2, spokes: 5, hub: 0xc9ced3 }, { u: .8, r: 4.2, spokes: 5, hub: 0xc9ced3 }],
    extras(put) {
      const box = (x0, x1, y0, y1, z0, z1, c) => { for (let x = x0; x < x1; x += .6) for (let y = y0; y < y1; y += .6) for (let z = z0; z < z1; z += .6) put(x, y, z, typeof c === 'function' ? c(x, y, z) : c); };
      const line = (a, b, r, c) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / .4); for (let i = 0; i <= n; i++) { const t = i / n; box(a[0] + (b[0] - a[0]) * t - r, a[0] + (b[0] - a[0]) * t + r, a[1] + (b[1] - a[1]) * t - r, a[1] + (b[1] - a[1]) * t + r, a[2] + (b[2] - a[2]) * t - r, a[2] + (b[2] - a[2]) * t + r, c); } };
      const RD = 0xd42a22, RDd = 0x9a1c16, BK = 0x18191c, WH = 0xeceeee, OR = 0xf27a26, YE = 0xf2c230;
      // şasi
      box(4, 46, 3, 6, 3.4, 5, BK); box(4, 46, 14, 17, 3.4, 5, BK);
      // kasa: taban, yan kapaklar (beyaz şeritler, mandallar), ön/arka duvar, siyah parmaklık
      box(1, 27, .5, 19.5, 5, 6.2, RDd);
      const side = (x, y, z) => (Math.abs(z - 7.2) < .35 || Math.abs(z - 12.2) < .35) ? WH : ((Math.abs(x - 6) < .5 || Math.abs(x - 12) < .5 || Math.abs(x - 18) < .5 || Math.abs(x - 24) < .5) && z > 10 && z < 11.6) ? 0xf4f4f4 : RD;
      box(1, 27, .5, 1.5, 6.2, 13, side); box(1, 27, 18.5, 19.5, 6.2, 13, side);
      box(1, 2, .5, 19.5, 6.2, 13, (x, y, z) => (Math.abs(z - 9.5) < .8 && (Math.abs(y - 3) < 1.2 || Math.abs(y - 17) < 1.2)) ? 0xe8322a : side(3, y, z));
      box(26, 27, .5, 19.5, 6.2, 13, RD);
      box(1, 27, 0, 1.6, 13, 13.8, BK); box(1, 27, 18.4, 20, 13, 13.8, BK); box(1, 2, 0, 20, 13, 13.8, BK); box(26, 27, 0, 20, 13, 13.8, BK);
      for (let x = 4; x < 26; x += 4) box(x, x + .6, 0, 20, 13, 13.6, BK);
      // kabin: yan panel beyaz çapraz çıtalı, koltuk ve kırmızı boru çerçeve, gri basamak sacı
      const slat = (x, y, z) => (((x - 27) * .9 + z) % 2.4 < .7) ? WH : RD;
      box(27, 34, .5, 1.5, 3.6, 9, slat); box(27, 34, 18.5, 19.5, 3.6, 9, slat);
      box(31, 38, 1.5, 18.5, 5.4, 6.2, (x, y) => ((x * 1.6 | 0) + (y * 1.6 | 0)) % 2 ? 0x868b91 : 0x6f747a);
      box(28, 31.4, 9, 16, 8.4, 10, RD); box(27, 28.4, 9, 16, 10, 14, 0xb82018);
      for (const y of [1, 19]) { line([27.5, y, 9], [27.5, y, 15], .5, RD); line([27.5, y, 15], [33, y, 15], .5, RD); line([33, y, 15], [34, y, 9], .5, RD); }
      // motor: turuncu blok, kanatçıklar, volan, siyah hava filtresi, paslı egzoz
      box(37, 44, 6, 14, 6, 12.4, (x, y, z) => (z > 10.6 && ((x * 1.7 | 0) % 2)) ? 0xd8661a : OR);
      box(38.4, 42.6, 7.2, 12.8, 12.4, 13.6, 0x9aa0a6);
      box(44, 45, 6.6, 13.4, 6.4, 12, (x, y, z) => Math.hypot(y - 10, z - 9.2) < 2.2 ? 0x2a2c30 : 0x3c3f44);
      box(38, 41.4, 12.4, 15.6, 12.4, 16, (x, y, z) => z > 15.2 ? 0x30333a : BK);
      line([39, 4.6, 12], [33, 3.4, 13], .6, 0x8a4a2a); line([33, 3.4, 13], [28, 3, 12.4], .6, 0x7a4024);
      // ön kafes (kırmızı borular)
      for (const y of [1, 19]) { line([38, y, 6], [38, y, 15.4], .55, RD); line([46.6, y, 6], [46.6, y, 15.4], .55, RD); line([38, y, 15.4], [46.6, y, 15.4], .55, RD); line([38, y, 11], [46.6, y, 11], .45, RD); }
      line([46.6, 1, 15.4], [46.6, 19, 15.4], .55, RD); line([46.6, 1, 11], [46.6, 19, 11], .45, RD); line([38, 1, 15.4], [38, 19, 15.4], .55, RD);
      for (const y of [6.5, 13.5]) line([46.6, y, 8.6], [46.6, y, 15.4], .45, RD);
      // ön panel, farlar, sarı "KEL OĞLAN" tampon ve alt boru
      box(44, 48, 0, 20, 4.4, 8.6, (x, y, z) => x > 47.4 && z > 5.4 && z < 7.8 && ((y > 1.4 && y < 5) || (y > 15 && y < 18.6)) ? (z > 7 ? 0xc9cdc8 : 0xa4a9a4) : RD);
      box(48, 48.8, 5.6, 14.4, 5.2, 7.8, (x, y, z) => (z > 5.8 && z < 7.2 && ((y * 2.2 | 0) % 3 === 0) && Math.abs(y - 10) > .8) ? 0x16171a : YE);
      line([48.4, 3, 4], [48.4, 17, 4], .45, RD); line([48.4, 6, 4], [47.6, 8, 2.6], .4, YE); line([48.4, 14, 4], [47.6, 12, 2.6], .4, YE);
      // direksiyon
      line([34, 12, 9], [36.4, 12, 15], .5, BK);
      for (let a = 0; a < Math.PI * 2; a += .18) put(36.8 + Math.sin(a) * .8, 12 + Math.cos(a) * 2.7, 15.6 + Math.sin(a) * 2.4, BK);
      /* Hasan Furkan */
      const SK = 0xd29a72, NE = 0xc8ee3c, NB = 0x2a4fb8;
      const CAMO = (x, y, z) => [0x5c6038, 0x7c6c44, 0x3a3f28, 0x6a7448][((x * 1.3 | 0) * 7 + (y * 1.3 | 0) * 3 + (z * 1.3 | 0) * 5) % 4];
      for (const y of [10.6, 13.6]) { line([29.4, y, 10.4], [35.6, y + (y < 12 ? -.3 : .3), 11.4], 1, CAMO); line([35.6, y + (y < 12 ? -.3 : .3), 11.4], [37.2, y + (y < 12 ? -.4 : .4), 7.2], .9, CAMO);
        box(36.6, 39.2, y - 1, y + 1, 6.2, 7.4, (x, yy, z) => z > 6.9 ? 0xd8d04a : 0x80857a); }                                  // bacaklar ve ayakkabılar
      for (let z = 10.2; z < 17.6; z += .6) { const lean = (z - 10.2) * -.06; box(28.6 + lean, 31.4 + lean, 9.8, 14.6, z, z + .6, (x, y) => (x > 30.6 + lean && Math.abs(z - 13.6 - Math.abs(y - 12.2) * .45) < .8) ? NB : NE); }   // neon tişört + mavi şerit
      line([30, 9.4, 16.8], [32.4, 8.8, 14.4], .85, NE); line([30, 15, 16.8], [32.4, 15.6, 14.4], .85, NE);
      line([32.4, 8.8, 14.4], [36.2, 10, 15.2], .7, SK); line([32.4, 15.6, 14.4], [36.2, 14.2, 15.2], .7, SK);                                    // kollar direksiyonda
      box(29.4, 31.2, 11.2, 13.4, 17.4, 18.2, SK);                                                                                                    // boyun
      box(28.8, 31.8, 10.4, 14, 18, 21.6, (x, y, z) => {
        if (x > 31.2) { if (Math.abs(z - 20.1) < .35 && y > 10.6 && y < 13.8) return 0x1c1d20;                                                        // gözlük çerçevesi
                        if (z > 19.2 && z < 20.1 && ((y > 10.8 && y < 11.9) || (y > 12.5 && y < 13.6))) return 0x3a4652;                               // camlar
                        if (Math.abs(z - 18.6) < .3 && Math.abs(y - 12.2) < .9) return 0x9a5a44; }                                                      // ağız
        if (x < 29.4 && z > 19) return 0x2a1e16;                                                                                                          // ense saç
        return SK; });
      box(28.6, 32.2, 10.2, 14.2, 21.4, 22.8, 0xb9a986); box(32.2, 34.2, 10.6, 13.8, 21.4, 21.9, 0xa8987a);                                         // bej şapka + siper
      box(28.6, 29.4, 10.2, 14.2, 20.4, 21.4, 0x2a1e16);
    }

  }
};
function digit3(u, z, v) {   // kuyruktaki büyük "3"
  const gx = (u - .12) / .13 * 4, gz = (12.5 - z) / 6 * 5;   // 4x5 ızgara
  const r = Math.floor(gz), cx = Math.floor(gx);
  if (r < 0 || r > 4 || cx < 0 || cx > 3) return false;
  const rows = ['1111', '0001', '0111', '0001', '1111'];
  return rows[r][v < 0 ? cx : 3 - cx] === '1';     // iki yanda da düz okunsun
}

const RES = 1.34;               // her tarif biriminde kaç voxel (daha ince ayrıntı)
function buildModel(key) {
  const sp = SPEC[key], LV = Math.round(L * RES), WV = Math.round(sp.W * RES), HV = Math.round(sp.H * RES);
  const occ = new Map();
  const K = (x, y, z) => (z * 96 + (y + 4)) * 96 + x;
  const putV = (x, y, z, c) => { if (x < 0 || x >= LV || z < 0 || z >= HV + 4) return; occ.set(K(x, y, z), { x, y, z, c }); };
  const put = (x, y, z, c) => putV(Math.floor(x * RES), y < 0 ? Math.floor(y) : y >= sp.W ? WV + Math.floor(y - sp.W) : Math.floor(y * RES), Math.floor(z * RES), c);
  if (!sp.custom) for (let x = 0; x < LV; x++) {
    const u = (x + .5) / LV, hw = Math.max(.12, sp.hw(u)) * sp.W / 2, belt = sp.belt(u), top = Math.max(belt, sp.top(u));
    for (let y = 0; y < WV; y++) {
      const vy = (y + .5) / RES - sp.W / 2, v = vy / (sp.W / 2), t = Math.abs(vy) / hw;
      if (t > 1.02) continue;
      const low = sp.clear + (belt - sp.clear) * Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, t), sp.nLow)), 1 / sp.nLow);
      const tc = t / sp.cw;
      const up = tc <= 1 && top > belt + .3 ? belt + (top - belt) * Math.pow(Math.max(0, 1 - Math.pow(tc, sp.nUp)), 1 / sp.nUp) : 0;
      const h = Math.max(low, up);
      for (let zv = Math.ceil(sp.clear * RES); zv <= Math.round(h * RES); zv++) {
        const z = (zv + .5) / RES;
        const upper = z > belt + .4 && up > 0 && z <= up + .5;
        putV(x, y, zv, sp.paint(u, v, z, { belt, top, h, isTop: z >= h - .8, upper, side: t > .7 }));
      }
    }
  }
  // tekerlekler
  for (const wh of sp.wheels) {
    const xc = wh.u * LV - .5, r = wh.r * RES, zc = r - .2;
    const mid = Math.floor(WV / 2), ys = wh.thick ? [mid - 2, mid - 1, mid, mid + 1] : wh.center ? [mid - 1, mid] : [-2, -1, 0, WV - 1, WV, WV + 1];
    for (const y of ys) for (let x = Math.floor(xc - r - 1); x <= xc + r + 1; x++) for (let z = 0; z <= zc + r + 1; z++) {
      const d2 = sq(x - xc) + sq(z - zc); if (d2 > r * r + .4) continue;
      const outer = (wh.thick ? (y === mid - 2 || y === mid + 1) : wh.center) || y === -2 || y === WV + 1;
      let col = 0x17181a;
      if (outer) {
        const rr = Math.sqrt(d2), dx = (x - xc) / r, dz = (z - zc) / r;
        if (wh.cover) {
          col = rr > r - 1 ? 0x1c1d20 : wh.cover;
          if (wh.emblem) { const m = Math.abs(dx) * .8 + Math.abs(dz); if ((m > .36 && m < .5 && dz > -.2) || (Math.abs(dz + .05) < .07 && Math.abs(dx) < .62)) col = 0xf4f6f8; }
          else if (rr < 1) col = 0xffffff;
        } else if (wh.skirt) col = rr > r - 1 ? 0x17181a : 0x2a2c30;
        else if (rr <= r - 1.3) {
          const a = Math.atan2(z - zc, x - xc), n = wh.spokes || 6;
          const spoke = Math.abs(((a / (Math.PI * 2) * n) % 1 + 1) % 1 - .5) > .3;
          col = spoke ? 0xd7dce0 : 0x34373c;
          if (rr < 1.9) col = 0x9aa0a6;
          if (wh.hub && rr < 2.6 && rr > 1.2 && wh.hub !== 0xc9ced3) col = wh.hub;     // renkli fren diski
        }
      } else if (Math.sqrt(d2) < r - 1.2 && !wh.center) col = 0x2a2c30;
      putV(x, y, z, col);
    }
  }
  sp.extras.call(sp, put);
  // yüzey voxelleri ve normaller
  const empty = (x, y, z) => !occ.has(K(x, y, z));
  const vox = [];
  for (const o of occ.values()) {
    const { x, y, z } = o;
    const ex = [empty(x + 1, y, z), empty(x - 1, y, z), empty(x, y + 1, z), empty(x, y - 1, z), empty(x, y, z + 1), empty(x, y, z - 1)];
    if (!ex.some(Boolean)) continue;
    let nx = ex[0] - ex[1], ny = ex[2] - ex[3], nz = ex[4] - ex[5]; if (!nx && !ny && !nz) nz = 1;
    const l = Math.hypot(nx, ny, nz);
    vox.push({ x: (x - LV / 2 + .5) / RES, y: (y - WV / 2 + .5) / RES, z: (z + .5) / RES, r: o.c >> 16 & 255, g: o.c >> 8 & 255, b: o.c & 255, nx: nx / l, ny: ny / l, nz: nz / l, top: ex[4] });
  }
  return { vox, W: sp.W, H: sp.H, L, RES };
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
    const spec = Math.pow(Math.max(0, nrx * HALF[0] + nry * HALF[1] + v.nz * HALF[2]), 24) * .2;
    const br = .5 + .62 * dif;
    o.col = 'rgb(' + Math.min(255, v.r * br + 255 * spec | 0) + ',' + Math.min(255, v.g * br + 255 * spec | 0) + ',' + Math.min(255, v.b * br + 255 * spec | 0) + ')';
  }
  list.sort((a, b) => b.d - a.d);
  const vs = s / (m.RES || 1), sz = Math.max(1, Math.ceil(vs * 1.12)), half = vs / 2;
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
