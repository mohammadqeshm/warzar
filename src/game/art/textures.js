/* WZ.Tex.paint — procedural canvas textures (digital camo, wood, crate, stone, plaster, roof, sandbags, sprites...).
 * Requested through WZ.Assets.tex(key) so real art can replace any of them later. */
(function (WZ) {
  'use strict';
  const T = THREE, R = WZ.RNG;
  const FONT = 'Impact, Haettenschweiler, "Arial Narrow Bold", "Franklin Gothic Heavy", "Roboto Condensed", "Arial Black", sans-serif';

  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function tex(c, o) {
    o = o || {};
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = o.clamp ? T.ClampToEdgeWrapping : T.RepeatWrapping;
    t.anisotropy = 4;
    if (o.nearest) t.magFilter = T.NearestFilter;
    t.userData.shared = true;
    return t;
  }
  function speckle(g, w, h, n, rng, cols, size, alpha) {
    g.globalAlpha = alpha == null ? 0.25 : alpha;
    for (let i = 0; i < n; i++) { g.fillStyle = cols[(rng() * cols.length) | 0]; g.fillRect(rng() * w, rng() * h, size, size); }
    g.globalAlpha = 1;
  }
  function radial(size, stops) {
    const c = cv(size, size), g = c.getContext('2d'), r = size / 2;
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    stops.forEach((s) => gr.addColorStop(s[0], s[1]));
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
    return c;
  }

  function camo(pal, seed) {
    const c = cv(128, 128), g = c.getContext('2d'), r = R.mulberry32(seed), n1 = R.noise2(seed), n2 = R.noise2(seed + 77);
    const B = 8;
    for (let by = 0; by < 16; by++) for (let bx = 0; bx < 16; bx++) {
      const v = n1(bx * 0.32, by * 0.32) * 0.6 + n2(bx * 0.8, by * 0.8) * 0.4 + (r() - 0.5) * 0.2;
      g.fillStyle = pal[v < 0.32 ? 0 : v < 0.48 ? 1 : v < 0.7 ? 2 : 3];
      g.fillRect(bx * B, by * B, B, B);
    }
    g.globalAlpha = 0.1; g.fillStyle = '#fff';
    for (let by = 0; by < 16; by++) for (let bx = 0; bx < 16; bx++) g.fillRect(bx * B, by * B, B, 1);
    g.globalAlpha = 1;
    return tex(c, { nearest: true });
  }

  const paint = {
    camoGreen: () => camo(['#1B1D1A', '#2E3226', '#4A4F36', '#6B5B3A'], 3),
    camoDark: () => camo(['#0F100E', '#1B1D1A', '#2E3226', '#4A4F36'], 9),

    wood() {
      const c = cv(256, 256), g = c.getContext('2d'), r = R.mulberry32(11);
      const cols = ['#7A5230', '#6B4A2B', '#5E4126', '#725030', '#6F4C2C'];
      const pw = 256 / 5;
      for (let i = 0; i < 5; i++) {
        g.fillStyle = cols[i]; g.fillRect(i * pw, 0, pw, 256);
        for (let k = 0; k < 16; k++) {
          g.strokeStyle = 'rgba(40,25,12,' + (0.12 + r() * 0.22) + ')'; g.lineWidth = 1 + r() * 1.4;
          const x = i * pw + r() * pw; g.beginPath(); g.moveTo(x, 0);
          g.bezierCurveTo(x + (r() - 0.5) * 8, 80, x + (r() - 0.5) * 8, 170, x + (r() - 0.5) * 6, 256); g.stroke();
        }
        g.fillStyle = 'rgba(20,12,6,.75)'; g.fillRect(i * pw, 0, 2, 256);
        g.fillStyle = 'rgba(255,220,170,.10)'; g.fillRect(i * pw + 2, 0, 2, 256);
      }
      speckle(g, 256, 256, 600, r, ['#2a1a0c', '#a07848'], 2, 0.2);
      return tex(c);
    },

    crate() {
      const c = cv(256, 256), g = c.getContext('2d'), r = R.mulberry32(21);
      const rows = ['#7A5230', '#6F4C2C', '#7E5634', '#6B4A2B'];
      for (let i = 0; i < 4; i++) {
        g.fillStyle = rows[i]; g.fillRect(0, i * 64, 256, 64);
        for (let k = 0; k < 10; k++) {
          g.strokeStyle = 'rgba(40,25,12,' + (0.1 + r() * 0.2) + ')'; g.lineWidth = 1 + r();
          const y = i * 64 + r() * 64; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(80, y + (r() - 0.5) * 6, 170, y + (r() - 0.5) * 6, 256, y + (r() - 0.5) * 4); g.stroke();
        }
        g.fillStyle = 'rgba(15,8,4,.8)'; g.fillRect(0, i * 64, 256, 3);
      }
      // frame
      g.fillStyle = '#5A3C22'; g.fillRect(0, 0, 256, 20); g.fillRect(0, 236, 256, 20); g.fillRect(0, 0, 20, 256); g.fillRect(236, 0, 20, 256);
      g.strokeStyle = 'rgba(15,8,4,.8)'; g.lineWidth = 3; g.strokeRect(20, 20, 216, 216);
      // diagonal brace
      g.save(); g.translate(128, 128); g.rotate(Math.PI / 4);
      g.fillStyle = '#5E4126'; g.fillRect(-170, -16, 340, 32); g.strokeStyle = 'rgba(15,8,4,.8)'; g.strokeRect(-170, -16, 340, 32); g.restore();
      // metal corners
      const corner = (x, y, sx, sy) => {
        g.save(); g.translate(x, y); g.scale(sx, sy);
        g.fillStyle = '#3A3C3E'; g.beginPath(); g.moveTo(0, 0); g.lineTo(62, 0); g.lineTo(62, 18); g.lineTo(18, 18); g.lineTo(18, 62); g.lineTo(0, 62); g.closePath(); g.fill();
        g.fillStyle = '#6A6D70'; g.fillRect(0, 0, 62, 3); g.fillRect(0, 0, 3, 62);
        g.fillStyle = '#8A8D90'; [[9, 9], [45, 9], [9, 45]].forEach((p) => { g.beginPath(); g.arc(p[0], p[1], 3, 0, 7); g.fill(); });
        g.restore();
      };
      corner(0, 0, 1, 1); corner(256, 0, -1, 1); corner(0, 256, 1, -1); corner(256, 256, -1, -1);
      // stencil marks
      g.fillStyle = 'rgba(236,233,225,.62)'; g.font = '34px ' + FONT; g.textAlign = 'center';
      g.fillText('WARZAR', 128, 112);
      g.font = '18px ' + FONT; g.fillText('\u2191  THIS SIDE UP', 128, 150);
      g.fillStyle = 'rgba(255,180,0,.8)'; for (let i = 0; i < 6; i++) g.fillRect(70 + i * 20, 168, 10, 8);
      speckle(g, 256, 256, 900, r, ['#1a0e06', '#b88a58', '#000'], 2, 0.18);
      return tex(c);
    },

    stone() {
      const c = cv(256, 256), g = c.getContext('2d'), r = R.mulberry32(5);
      g.fillStyle = '#2E3032'; g.fillRect(0, 0, 256, 256);
      const rowH = 42;
      for (let row = 0; row < 6; row++) {
        let x = -(row % 2) * 36;
        while (x < 256) {
          const w = 64 + r() * 44, y = row * rowH, sh = (r() - 0.5) * 16;
          const v = 76 + sh;
          g.fillStyle = 'rgb(' + (v - 2) + ',' + (v + 1) + ',' + (v + 4) + ')';
          g.fillRect(x + 2, y + 2, w - 3, rowH - 3);
          g.fillStyle = '#5F6366'; g.fillRect(x + 2, y + 2, w - 3, 3); g.fillRect(x + 2, y + 2, 3, rowH - 3);
          g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x + 2, y + rowH - 6, w - 3, 3);
          x += w;
        }
      }
      speckle(g, 256, 256, 1400, r, ['#1d1f21', '#8a8e91', '#4a4d50'], 2, 0.3);
      return tex(c);
    },

    plaster() {
      const c = cv(256, 256), g = c.getContext('2d'), r = R.mulberry32(8);
      g.fillStyle = '#A89A82'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 26; i++) {
        const x = r() * 256, y = r() * 256, s = 20 + r() * 60;
        const gr = g.createRadialGradient(x, y, 0, x, y, s);
        gr.addColorStop(0, r() < 0.5 ? 'rgba(110,95,70,.28)' : 'rgba(200,188,165,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(x - s, y - s, s * 2, s * 2);
      }
      // exposed brick patches
      for (let k = 0; k < 3; k++) {
        const bx = 20 + r() * 170, by = 20 + r() * 170, bw = 40 + r() * 36, bh = 28 + r() * 26;
        g.fillStyle = '#8F5A40'; g.fillRect(bx, by, bw, bh);
        g.strokeStyle = '#5a3a2a'; g.lineWidth = 2;
        for (let yy = by; yy < by + bh; yy += 9) { g.beginPath(); g.moveTo(bx, yy); g.lineTo(bx + bw, yy); g.stroke(); }
        for (let yy = by, i = 0; yy < by + bh; yy += 9, i++) for (let xx = bx + (i % 2) * 9; xx < bx + bw; xx += 18) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + 9); g.stroke(); }
        g.strokeStyle = 'rgba(70,58,40,.7)'; g.lineWidth = 3; g.strokeRect(bx, by, bw, bh);
      }
      g.strokeStyle = 'rgba(50,40,28,.55)'; g.lineWidth = 1.6;
      for (let k = 0; k < 5; k++) { let x = r() * 256, y = r() * 256; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += (r() - 0.5) * 22; y += 8 + r() * 14; g.lineTo(x, y); } g.stroke(); }
      speckle(g, 256, 256, 1600, r, ['#6b5d46', '#d3c8b0', '#8a7b62'], 2, 0.28);
      return tex(c);
    },

    roofRust() {
      const c = cv(256, 256), g = c.getContext('2d'), r = R.mulberry32(13);
      for (let i = 0; i < 16; i++) {
        const gr = g.createLinearGradient(i * 16, 0, i * 16 + 16, 0);
        gr.addColorStop(0, '#7E3A22'); gr.addColorStop(0.45, '#B0603A'); gr.addColorStop(1, '#8A4228');
        g.fillStyle = gr; g.fillRect(i * 16, 0, 16, 256);
      }
      for (let k = 0; k < 40; k++) { g.fillStyle = 'rgba(' + (r() < 0.5 ? '60,28,16' : '200,120,70') + ',' + (0.1 + r() * 0.2) + ')'; g.fillRect(r() * 256, r() * 256, 3 + r() * 5, 20 + r() * 70); }
      g.fillStyle = 'rgba(30,14,8,.5)'; g.fillRect(0, 126, 256, 4); g.fillRect(0, 252, 256, 4);
      speckle(g, 256, 256, 700, r, ['#3a1a0e', '#d08a5a'], 2, 0.25);
      return tex(c);
    },

    sandbag() {
      const c = cv(128, 128), g = c.getContext('2d'), r = R.mulberry32(17);
      g.fillStyle = '#B89A64'; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = 'rgba(110,86,48,.45)'; g.lineWidth = 1;
      for (let i = 0; i < 128; i += 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); }
      g.fillStyle = 'rgba(90,66,36,.7)'; g.fillRect(0, 60, 128, 4);
      for (let i = 0; i < 128; i += 8) g.fillRect(i, 58, 4, 8);
      speckle(g, 128, 128, 300, r, ['#6e5630', '#d9be86'], 2, 0.3);
      return tex(c);
    },

    // ---- sprites ----
    soft: () => tex(radial(64, [[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,.55)'], [1, 'rgba(255,255,255,0)']]), { clamp: true }),
    glow: () => tex(radial(64, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,.7)'], [1, 'rgba(255,255,255,0)']]), { clamp: true }),
    blob: () => tex(radial(64, [[0, 'rgba(0,0,0,.55)'], [0.6, 'rgba(0,0,0,.3)'], [1, 'rgba(0,0,0,0)']]), { clamp: true }),
    star() {
      const c = cv(64, 64), g = c.getContext('2d');
      g.translate(32, 33); g.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 11 : 28; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      g.closePath(); g.fillStyle = '#fff'; g.shadowColor = 'rgba(255,255,255,.9)'; g.shadowBlur = 5; g.fill();
      return tex(c, { clamp: true });
    },
    beam() {
      const c = cv(64, 256), g = c.getContext('2d');
      let gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.3, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,.95)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
      const r = R.mulberry32(4);
      g.fillStyle = 'rgba(0,0,0,.12)';
      for (let i = 0; i < 40; i++) g.fillRect(r() * 64, r() * 256, 6 + r() * 10, 12 + r() * 40);
      g.globalCompositeOperation = 'destination-in';
      gr = g.createLinearGradient(0, 0, 64, 0);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.3, 'rgba(0,0,0,.9)'); gr.addColorStop(0.5, '#000'); gr.addColorStop(0.7, 'rgba(0,0,0,.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
      return tex(c, { clamp: true });
    },

    // ---- character details ----
    eye() { // sphere map: pupil faces +Z at u=.25, v=.5
      const c = cv(128, 64), g = c.getContext('2d');
      g.fillStyle = '#F6F3EA'; g.fillRect(0, 0, 128, 64);
      g.fillStyle = '#111'; g.beginPath(); g.arc(32, 34, 11, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(28, 29, 3.5, 0, 7); g.fill();
      return tex(c, { clamp: true });
    },
    faceEnemy() {
      const c = cv(128, 112), g = c.getContext('2d');
      g.fillStyle = '#1A1210';
      const brow = (sx) => { g.save(); g.translate(64, 0); g.scale(sx, 1); g.beginPath(); g.moveTo(12, 16); g.lineTo(52, 32); g.lineTo(52, 46); g.lineTo(12, 34); g.closePath(); g.fill(); g.restore(); };
      brow(1); brow(-1);
      g.fillStyle = '#2A1410'; g.beginPath(); g.moveTo(34, 86); g.lineTo(94, 86); g.lineTo(98, 94); g.lineTo(90, 96); g.lineTo(38, 96); g.lineTo(30, 94); g.closePath(); g.fill();
      return tex(c, { clamp: true });
    },
    chevron() {
      const c = cv(128, 64), g = c.getContext('2d');
      g.lineCap = 'round'; g.lineJoin = 'round';
      const v = (y) => { g.beginPath(); g.moveTo(22, y + 12); g.lineTo(64, y - 8); g.lineTo(106, y + 12); };
      [[0, 8, '#33383C', 14], [0, 8, '#C9CED2', 8], [1, 28, '#33383C', 14], [1, 28, '#C9CED2', 8]].forEach((s) => { v(s[1] + 8); g.strokeStyle = s[2]; g.lineWidth = s[3]; g.stroke(); });
      return tex(c, { clamp: true });
    },
    smiley() {
      const c = cv(64, 64), g = c.getContext('2d');
      g.fillStyle = '#0E0E0E'; g.beginPath(); g.arc(32, 32, 31, 0, 7); g.fill();
      g.fillStyle = '#FFB400'; g.beginPath(); g.arc(32, 32, 27, 0, 7); g.fill();
      g.fillStyle = '#111'; g.fillRect(20, 18, 7, 13); g.fillRect(37, 18, 7, 13);
      g.strokeStyle = '#111'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.arc(32, 34, 15, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      return tex(c, { clamp: true });
    },
    nanaDecals() { // top: NANA stencil (256x64) · bottom-left: smiley sticker · next: card patch
      const c = cv(256, 128), g = c.getContext('2d'), r = R.mulberry32(31);
      g.fillStyle = '#ECE9E1'; g.font = '58px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('NANA', 128, 34);
      g.globalCompositeOperation = 'destination-out';
      g.fillRect(0, 22, 256, 2); g.fillRect(0, 44, 256, 2);
      for (let i = 0; i < 90; i++) g.fillRect(r() * 256, r() * 64, 1 + r() * 3, 1 + r() * 2);
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#FFB400'; g.beginPath(); g.arc(32, 96, 27, 0, 7); g.fill();
      g.fillStyle = '#111'; g.fillRect(21, 84, 6, 11); g.fillRect(37, 84, 6, 11);
      g.strokeStyle = '#111'; g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath(); g.arc(32, 98, 13, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
      g.fillStyle = '#ECE9E1'; g.fillRect(74, 68, 44, 54); g.strokeStyle = '#111'; g.lineWidth = 3; g.strokeRect(74, 68, 44, 54);
      g.fillStyle = '#111'; g.font = '26px ' + FONT; g.fillText('A', 96, 88);
      g.fillStyle = '#A8322A'; g.beginPath(); g.moveTo(96, 96); g.lineTo(106, 106); g.lineTo(96, 116); g.lineTo(86, 106); g.closePath(); g.fill();
      return tex(c, { clamp: true });
    },
  };

  WZ.Tex = { paint, FONT, cv };
})(window.WZ = window.WZ || {});
