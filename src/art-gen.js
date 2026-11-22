/* 殘響 — 以程式繪製的預設美術圖（黑白水墨剪影風，輸出為 SVG）
 * 每張圖由四層組成：back（霧與遠景）→ mid（深灰結構）→ sil（黑色剪影，邊緣帶墨漬抖動）→ front（光源與前景）。
 * 使用者在 assets/img/ 放入同名圖檔時，會改用使用者的圖。 */
(function () {
  'use strict';
  const f = (n) => Math.round(n * 10) / 10;
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rngOf = (seed) => { let a = seed; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  const INK = '#040405', DARK = '#12151a', LIGHT = '#cfd6de';
  const poly = (pts, a) => `<polygon points="${pts}" ${a || ''}/>`;
  const rect = (x, y, w, h, a) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" ${a || ''}/>`;
  const circ = (x, y, r, a) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" ${a || ''}/>`;
  const ell = (x, y, rx, ry, a) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" ${a || ''}/>`;
  const line = (pts, w, a) => `<polyline points="${pts}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${a || ''}/>`;
  const wl = (pts, w, op) => `<polyline points="${pts}" fill="none" stroke="${LIGHT}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
  const glow = (x, y, r, op) => { const o = op == null ? 1 : op; return circ(x, y, r * 6, `fill="url(#gl)" opacity="${f(o * 0.85)}"`) + circ(x, y, r, `fill="#fff" opacity="${o}"`); };
  const eyes = (x, y, gap, r, op) => glow(x - gap / 2, y, r || 1, op) + glow(x + gap / 2, y, r || 1, op);
  const fog = (x, y, rx, ry, op) => ell(x, y, rx, ry, `fill="#aeb8c4" opacity="${op}" filter="url(#bl)"`);
  const blk = (s) => `<g fill="${INK}">${s}</g>`;
  const fig = (x, base, h, a) => `<g ${a || ''}>${circ(x, base - h * 0.88, h * 0.1)}${poly(`${f(x - h * 0.16)},${f(base - h * 0.76)} ${f(x + h * 0.16)},${f(base - h * 0.76)} ${f(x + h * 0.12)},${base} ${f(x - h * 0.12)},${base}`)}</g>`;
  const HOUND = '10,95 30,80 45,82 55,68 62,84 80,88 130,84 160,90 186,68 173,100 166,116 169,166 158,166 152,126 110,122 92,127 88,166 77,166 76,124 58,113 40,109 20,108';

  /* 每個場景回傳 { back, mid, sil, front, top, bottom }；寬圖座標 320×180，方圖 200×200 */
  const SCENES = {
    'key-visual': (r) => {
      let sil = '', front = fog(160, 170, 150, 16, 0.8);
      for (let i = 0; i < 11; i++) {
        const x = 12 + i * 30 + r() * 10, h = 60 + r() * 45 + (1 - Math.abs(i - 5) / 5) * 30, w = 13 + r() * 8;
        sil += ell(x, 152 - h / 2, w, h / 2) + circ(x, 152 - h, 8 + r() * 4);
        front += eyes(x, 152 - h - 1, 6, 0.9, 0.55 + r() * 0.4);
      }
      front += poly('154,176 166,176 250,152 70,152', 'fill="#000" opacity=".7"') + blk(fig(160, 178, 26));
      return { back: fog(160, 70, 180, 60, 0.5), sil, front };
    },
    'pro-1': (r) => {
      let sil = rect(0, 150, 320, 30);
      for (let x = -4; x < 320; x += 17 + r() * 10) { const h = 26 + r() * 74; sil += rect(x, 152 - h, 14 + r() * 8, h); }
      const rift = '230,4 225,34 233,58 226,92 232,118 228,146';
      return { back: fog(215, 80, 150, 60, 0.45), sil,
        front: fog(229, 75, 22, 85, 0.55) + `<polyline points="${rift}" fill="none" stroke="#fff" stroke-width="4" filter="url(#bl)"/>` + wl(rift, 1.4, 1) + fog(70, 172, 70, 7, 0.35) + blk(fig(70, 174, 12)) };
    },
    'pro-2': () => ({ top: '#0d0f12',
      back: fog(160, 92, 46, 40, 0.35),
      mid: poly('0,0 130,58 130,126 0,180') + poly('320,0 190,58 190,126 320,180') + poly('0,0 320,0 190,58 130,58') + poly('0,180 320,180 190,126 130,126'),
      sil: circ(146, 110, 5) + poly('138,115 154,115 159,128 133,128') + rect(126, 126, 68, 3),
      front: rect(170, 70, 2.4, 44, 'fill="#fff" filter="url(#bl)"') + rect(170.6, 74, 1.2, 36, 'fill="#fff"') + wl('0,180 130,126', 0.6, 0.25) + wl('320,180 190,126', 0.6, 0.25) }),
    'pro-3': () => ({ top: '#101216',
      back: rect(28, 28, 62, 52, 'fill="#3d4651" opacity=".6"') + fog(60, 54, 50, 40, 0.25) + fog(160, 108, 90, 50, 0.45),
      sil: rect(0, 150, 320, 30) + rect(60, 130, 200, 14) + rect(64, 142, 6, 10) + rect(250, 142, 6, 10) + rect(58, 27, 2.5, 54) + rect(28, 52, 62, 2.5)
        + circ(150, 92, 9) + poly('138,102 162,102 167,132 133,132') + line('160,108 184,97 204,88', 4.5),
      front: fog(238, 76, 46, 30, 0.42) + rect(207, 57, 62, 38, 'fill="#fff" fill-opacity=".1" stroke="#fff" stroke-width="1.2"') }),
    'loc-city': () => ({
      back: fog(162, 100, 70, 80, 0.6),
      sil: poly('0,0 112,0 130,58 133,152 0,180') + poly('320,0 214,0 196,54 192,152 320,180') + rect(158, 28, 5, 124) + rect(155, 60, 11, 4)
        + rect(133, 128, 18, 24) + rect(172, 133, 20, 19) + line('112,14 168,32 213,12', 0.8) + line('122,32 160,46 205,28', 0.8) + line('127,54 164,64 198,48', 0.8),
      front: glow(160.5, 27, 1.1, 0.9) + fog(162, 168, 60, 8, 0.3) }),
    'loc-training': () => {
      let sil = poly('0,8 320,30 320,54 0,46') + rect(0, 160, 320, 20);
      [[16, 40, 162], [92, 26, 156], [152, 17, 151], [200, 12, 147], [238, 8, 144], [266, 6, 142]].forEach(([x, w, b]) => { sil += rect(x, 44, w, b - 44); });
      return { back: fog(170, 110, 180, 40, 0.5), sil, front: fog(290, 156, 40, 6, 0.4) + blk(fig(292, 158, 9)) };
    },
    'loc-shop': () => ({ top: '#101216',
      mid: rect(100, 0, 120, 152),
      sil: poly('0,0 100,0 100,152 0,180') + poly('320,0 220,0 220,152 320,180') + rect(135, 60, 50, 92) + rect(107, 0, 3, 152) + rect(114, 0, 1.6, 100) + rect(208, 20, 3, 132) + rect(0, 152, 320, 28),
      front: rect(135, 60, 50, 92, 'fill="none" stroke="#3a424c" stroke-width=".8"') + rect(147, 100, 3, 8, 'fill="#3a424c"') + fog(160, 155, 38, 6, 0.7) + rect(136, 151.4, 48, 1.4, 'fill="#fff"') }),
    'loc-home': (r) => {
      let sil = rect(0, 152, 320, 28) + rect(20, 122, 150, 16) + rect(20, 100, 8, 40) + ell(48, 119, 17, 5) + rect(284, 128, 24, 24) + line('290,128 296,118 302,128', 1.6)
        + rect(232, 30, 3, 60) + rect(188, 58, 92, 3) + rect(186, 28, 96, 3) + rect(186, 88, 96, 4) + rect(186, 28, 3, 62) + rect(279, 28, 3, 62);
      for (let x = 190; x < 278; x += 7 + r() * 5) { const h = 6 + r() * 22; sil += rect(x, 90 - h, 5 + r() * 4, h); }
      return { top: '#0d0f12', back: rect(188, 30, 92, 60, 'fill="#55606c" opacity=".75"') + fog(232, 60, 70, 46, 0.22) + fog(110, 118, 120, 36, 0.4), sil, front: fog(120, 150, 80, 10, 0.12) };
    },
    'loc-gate': () => {
      let front = '', sil = poly('0,0 96,0 110,40 110,152 0,180') + poly('320,0 224,0 210,40 210,152 320,180') + rect(96, 0, 128, 34);
      for (let i = 0; i < 6; i++) sil += rect(110 + i * 5, 152 + i * 5, 100 - i * 10, 2.4);
      for (let i = 0; i < 7; i++) { let p = ''; const x = 130 + i * 10; for (let y = 36; y <= 150; y += 6) p += `${f(x + Math.sin(y / 9 + i) * 3)},${y} `; front += wl(p, 0.7, 0.35); }
      return { back: fog(160, 90, 52, 70, 0.7), sil, front: front + wl('104,124 216,104', 2.4, 0.85) + wl('104,106 216,126', 2.4, 0.85) };
    },
    'loc-rift': () => ({
      back: fog(160, 88, 46, 30, 0.7) + fog(170, 130, 160, 30, 0.28),
      sil: poly('0,0 320,0 320,8 172,82 150,82 0,20') + poly('0,180 0,118 150,92 160,92 62,180') + poly('320,0 320,180 302,180 174,92 172,82')
        + rect(18, 18, 16, 122) + rect(62, 48, 10, 66) + rect(95, 64, 7, 42) + rect(118, 74, 5, 28)
        + line('162,93 96,180', 1.5) + line('166,93 150,180', 1.5) + line('170,93 222,180', 1.5) + line('173,93 280,180', 1.5)
        + line('200,38 214,70 232,42', 0.9) + line('250,20 262,62 282,16', 0.9),
      front: glow(162, 88, 1.4, 0.9) }),
    'loc-void': () => {
      let front = '';
      for (let i = 0; i < 7; i++) { const s = 1 - i * 0.14; front += rect(160 - 160 * s, 90 - 90 * s, 320 * s, 180 * s, `fill="none" stroke="#5c6570" stroke-width=".8" opacity="${f(0.55 - i * 0.06)}"`); }
      front += wl('0,0 134,75', 0.5, 0.2) + wl('320,0 186,75', 0.5, 0.2) + wl('0,180 134,105', 0.5, 0.2) + wl('320,180 186,105', 0.5, 0.2);
      let sil = ell(160, 90, 9, 6);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.3; sil += line(`160,90 ${f(160 + Math.cos(a) * 12)},${f(90 + Math.sin(a) * 4 - 6)} ${f(160 + Math.cos(a) * 19)},${f(90 + Math.sin(a) * 9 + 4)}`, 1); }
      return { top: '#07080a', bottom: '#030304', back: fog(160, 90, 30, 20, 0.3), sil, front: front + eyes(160, 89, 5, 0.6, 0.6) };
    },
    'boss-1': () => ({
      back: fog(160, 78, 120, 75, 0.55),
      sil: `<g transform="translate(10,-14)"><path d="M92 172 L84 120 L62 112 L40 150 L26 146 L46 92 L78 70 L104 64 L112 38 L134 22 L166 22 L188 38 L196 64 L222 70 L254 92 L274 146 L260 150 L238 112 L216 120 L208 172 Z"/><path d="M110 40 L96 12 L120 30 Z"/><path d="M190 40 L204 12 L180 30 Z"/></g>`
        + rect(0, 156, 320, 24) + line('36,134 20,150 30,170', 4) + line('284,134 300,150 290,170', 4) + rect(8, 120, 4, 40) + rect(306, 116, 4, 44),
      front: fog(160, 50, 30, 10, 0.5) + `<polyline points="134,44 142,52 150,44 160,54 170,44 178,52 186,44" fill="none" stroke="#fff" stroke-width="4" filter="url(#bl)"/>` + wl('134,44 142,52 150,44 160,54 170,44 178,52 186,44', 1.6, 1) + wl('160,72 160,136', 0.8, 0.4) }),
    'boss-2': (r) => {
      let front = '';
      for (let i = 0; i < 34; i++) { const a = r() * Math.PI * 2, ex = 160 + Math.cos(a) * 240, ey = 90 + Math.sin(a) * 150; front += wl(`${f(160 + Math.cos(a) * 22)},${f(92 + Math.sin(a) * 40)} ${f(ex)},${f(ey)}`, 0.5, f(0.15 + r() * 0.3)); }
      front += ell(160, 94, 34, 54, 'fill="#8d97a3"') + ell(160, 100, 24, 40, 'fill="#1d2127" opacity=".8" filter="url(#bl)"') + glow(160, 102, 2.6, 0.75);
      for (let i = 0; i < 6; i++) front += `<path d="M${126 + i * 2},${60 + i * 12} Q160,${70 + i * 12} ${194 - i * 2},${58 + i * 12}" fill="none" stroke="#e9eef3" stroke-width=".6" opacity=".45"/>`;
      return { back: fog(160, 90, 110, 70, 0.4), sil: poly('0,0 96,0 0,74') + poly('320,0 224,0 320,74') + poly('0,180 0,120 70,180') + poly('320,180 320,120 250,180') + rect(0, 168, 320, 12), front };
    },
    'boss-3': () => ({
      back: fog(215, 92, 80, 80, 0.5),
      sil: rect(150, 18, 170, 138) + rect(0, 154, 320, 26) + rect(150, 12, 170, 8),
      front: rect(196, 48, 42, 106, 'fill="#e4e9ef" opacity=".9" filter="url(#bl)"') + rect(198, 50, 38, 104, 'fill="#dfe5ec" opacity=".75"')
        + rect(256, 56, 42, 22, 'fill="#6b7480" opacity=".45"') + rect(158, 56, 26, 22, 'fill="#6b7480" opacity=".45"') + fog(190, 160, 90, 7, 0.4)
        + blk(poly('207,156 210,74 224,74 227,156') + poly('203,72 231,72 229,86 205,86') + circ(217, 62, 7) + poly('207,57 227,57 225,49 209,49') + rect(204, 56.5, 26, 2.6)) }),
    'mob-1': (r) => {
      let sil = line('96,60 22,200', 2.2) + line('104,60 178,200', 2.2), front = '';
      for (let y = 80; y < 200; y += 16) sil += line(`${f(96 - (y - 60) * 0.5)},${y} ${f(104 + (y - 60) * 0.5)},${y}`, 1);
      for (let i = 0; i < 16; i++) { const y = 92 + r() * 96, sp = (y - 60) * 0.55, x = 100 + (r() * 2 - 1) * sp, s = 3.5 + (y - 90) / 13; sil += ell(x, y, s * 1.7, s) + circ(x - s * 1.5, y + s * 0.2, s * 0.6); front += eyes(x - s * 1.3, y - s * 0.3, s * 0.8, 0.55 + s * 0.04, 0.9); }
      return { back: fog(100, 86, 80, 50, 0.5), sil, front };
    },
    'mob-2': () => ({
      back: fog(100, 96, 72, 84, 0.55),
      sil: poly('82,40 108,36 112,60 86,64') + poly('72,66 126,72 118,130 80,126') + line('74,72 52,110 50,152', 7) + line('124,78 146,112 150,146', 6) + line('88,126 84,182', 8) + line('110,128 118,182', 8)
        + line('98,38 94,14', 1.2) + line('104,37 112,8', 1) + rect(0, 181, 200, 19) + rect(44, 150, 12, 8) + rect(144, 144, 12, 8),
      front: glow(98, 96, 2.2, 1) }),
    'mob-3': () => {
      let front = '';
      for (let i = 0; i < 6; i++) front += fig(58 + i * 15, 178 - i, 118, `fill="#c5ced8" opacity="${f(0.08 + i * 0.07)}"`);
      front += fig(133, 173, 118, 'fill="#dfe5ec" opacity=".5"');
      return { back: fog(110, 100, 80, 85, 0.25), sil: rect(0, 184, 200, 16), front };
    },
    'mob-4': () => {
      let sil = rect(78, 82, 44, 34) + rect(84, 70, 32, 14) + rect(0, 186, 200, 14);
      for (let i = 0; i < 4; i++) { sil += line(`78,${90 + i * 7} ${50 - i * 4},${58 + i * 14} ${28 - i * 2},${124 + i * 18}`, 3) + line(`122,${90 + i * 7} ${150 + i * 4},${58 + i * 14} ${172 + i * 2},${124 + i * 18}`, 3); }
      return { back: fog(100, 100, 82, 72, 0.55), sil, front: glow(92, 96, 0.9, 1) + glow(100, 93, 0.9, 1) + glow(108, 96, 0.9, 1) + glow(96, 103, 0.8, 0.9) + glow(104, 103, 0.8, 0.9) };
    },
    'mob-5': () => ({
      back: fog(100, 104, 88, 62, 0.55),
      sil: poly(HOUND) + rect(0, 165, 200, 35) + ell(150, 78, 26, 10, 'filter="url(#bl)"') + ell(110, 76, 30, 8, 'filter="url(#bl)"') + ell(182, 62, 14, 10, 'filter="url(#bl)"'),
      front: glow(33, 90, 1.2, 1) + glow(44, 88, 1.1, 0.9) }),
    'elite-1': () => ({
      back: fog(126, 110, 46, 46, 0.85) + fog(100, 100, 90, 80, 0.2),
      sil: line('60,200 96,120', 1.6) + line('150,200 110,120', 1.6) + rect(0, 184, 200, 16) + circ(84, 68, 10) + poly('66,82 102,82 114,184 54,184') + poly('70,60 98,60 94,52 74,52') + line('98,92 124,96', 5) + line('124,96 124,108', 1) + rect(119, 108, 10, 12),
      front: glow(124, 114, 3, 1) }),
    'elite-2': () => ({
      back: fog(100, 100, 90, 66, 0.55),
      sil: poly(HOUND) + poly('58,112 40,70 18,62 6,74 26,82 30,96') + poly('24,64 30,48 38,66') + rect(0, 165, 200, 35) + ell(140, 78, 34, 10, 'filter="url(#bl)"') + ell(184, 60, 14, 10, 'filter="url(#bl)"'),
      front: glow(33, 90, 1.2, 1) + glow(44, 88, 1.1, 0.9) + glow(16, 70, 1.1, 1) + glow(26, 69, 1, 0.9) }),
    'elite-3': () => ({
      back: fog(100, 92, 78, 88, 0.55),
      sil: poly('58,184 52,90 70,66 130,66 148,90 142,184') + ell(56, 84, 18, 12) + ell(144, 84, 18, 12) + rect(84, 36, 32, 32) + rect(80, 31, 40, 7) + rect(0, 184, 200, 16) + line('164,22 164,188', 3) + poly('164,10 177,34 164,46'),
      front: fog(100, 51, 18, 5, 0.6) + rect(89, 50, 22, 1.8, 'fill="#fff"') }),
    'event-1': () => {
      let front = '';
      for (let i = 0; i < 12; i++) { const x = 12 + i * 25; front += rect(x, 36, 22, 112, 'fill="#090b0e" stroke="#2f363f" stroke-width=".8"') + wl(`${x + 5},46 ${x + 17},46`, 0.6, 0.25) + wl(`${x + 5},50 ${x + 17},50`, 0.6, 0.25) + rect(x + 17, 92, 1.5, 6, 'fill="#2f363f"'); }
      const gx = 12 + 7 * 25 + 21;
      return { top: '#0e1013', mid: rect(0, 20, 320, 132), sil: rect(0, 150, 320, 30), front: front + fog(gx + 4, 92, 12, 62, 0.65) + rect(gx, 38, 1.8, 108, 'fill="#fff"') + fog(gx + 6, 152, 20, 4, 0.5) };
    },
    'event-2': (r) => {
      let front = '';
      for (let i = 0; i < 16; i++) { const x = r() * 300, y = 40 + r() * 130, w = 20 + r() * 50, a = r() * 0.6 - 0.3; front += wl(`${f(x)},${f(y)} ${f(x + w)},${f(y + w * a)}`, 1, f(0.2 + r() * 0.3)); }
      return { back: fog(172, 100, 40, 44, 0.75),
        sil: '<path fill-rule="evenodd" d="M0,0H320V180H0Z M160,126 L166,86 L179,76 L187,98 L180,132 Z"/>',
        front: front + line('120,60 150,96', 1.2) + line('206,40 190,90', 1.2) + glow(173, 102, 1.4, 0.85) };
    },
    'event-3': () => ({
      back: fog(196, 104, 110, 62, 0.5),
      sil: rect(118, 0, 36, 160) + rect(112, 0, 48, 8) + rect(0, 158, 320, 22) + circ(171, 133, 6) + poly('158,138 177,137 187,159 152,159') + line('178,155 206,158', 5) + rect(210, 148, 15, 11) + line('213,148 217,142 222,148', 1.2),
      front: fog(190, 164, 60, 5, 0.3) }),
  };

  function svg(id) {
    const scene = SCENES[id]; if (!scene) return null;
    const sq = /^(mob|elite)-/.test(id), W = sq ? 200 : 320, H = sq ? 200 : 180, seed = hash(id) % 997;
    const s = scene(rngOf(hash(id)));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 4}" height="${H * 4}" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.top || '#22272d'}"/><stop offset="1" stop-color="${s.bottom || '#090a0c'}"/></linearGradient>
<radialGradient id="gl"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".3" stop-color="#dfe7ef" stop-opacity=".35"/><stop offset="1" stop-color="#dfe7ef" stop-opacity="0"/></radialGradient>
<radialGradient id="vg"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient>
<filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sq ? 5 : 6}"/></filter>
<filter id="ink" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="mist" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".009 .022" numOctaves="4" seed="${seed + 3}"/><feColorMatrix values="0 0 0 0 .78  0 0 0 0 .82  0 0 0 0 .87  1.7 0 0 0 -.62"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${seed + 7}"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  .5 0 0 0 -.2"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
${s.back || ''}
<rect width="${W}" height="${H}" filter="url(#mist)" opacity=".5"/>
<g fill="${DARK}">${s.mid || ''}</g>
<g fill="${INK}" filter="url(#ink)">${s.sil || ''}</g>
${s.front || ''}
<rect width="${W}" height="${H}" filter="url(#mist)" opacity=".16"/>
<rect width="${W}" height="${H}" fill="url(#vg)"/>
<rect width="${W}" height="${H}" filter="url(#grain)" opacity=".13"/>
</svg>`;
  }

  const uriCache = {};
  window.ArtGen = {
    ids: Object.keys(SCENES),
    svg,
    uri(id) { if (!(id in uriCache)) { const s = svg(id); uriCache[id] = s ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s) : null; } return uriCache[id]; },
  };
})();
