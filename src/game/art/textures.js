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

  /** finer pixel-block digital camo for the heroes (n x n cells, 8 px each) */
  function camoPix(pal, seed, n) {
    const S = n * 8, c = cv(S, S), g = c.getContext('2d'), r = R.mulberry32(seed), n1 = R.noise2(seed), n2 = R.noise2(seed + 41);
    for (let by = 0; by < n; by++) for (let bx = 0; bx < n; bx++) {
      const v = n1(bx * 0.28, by * 0.28) * 0.55 + n2(bx * 0.75, by * 0.75) * 0.45 + (r() - 0.5) * 0.24;
      g.fillStyle = pal[v < 0.36 ? 0 : v < 0.52 ? 1 : v < 0.74 ? 2 : 3];
      g.fillRect(bx * 8, by * 8, 8, 8);
    }
    g.fillStyle = pal[0]; // dark flecks break up the blocks like printed digital camo
    for (let i = 0; i < n * 2; i++) g.fillRect(((r() * n) | 0) * 8, ((r() * n) | 0) * 8, 8, 8);
    g.globalAlpha = 0.12; g.fillStyle = '#000';
    for (let by = 0; by < n; by++) g.fillRect(0, by * 8 + 7, S, 1);
    g.globalAlpha = 1;
    return tex(c, { nearest: true });
  }

  // Warm, low-contrast digital cloth for the two protagonists; the soldier and vehicle palettes stay separate.
  function heroCamo(pal, seed) {
    const size = 256, cells = 16, cell = size / cells;
    const c = cv(size, size), g = c.getContext('2d'), rng = R.mulberry32(seed);
    const broad = R.noise2(seed), fine = R.noise2(seed + 37);
    for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) {
      const value = broad(x * 0.43, y * 0.43) * 0.69 + fine(x * 0.89, y * 0.89) * 0.31 + (rng() - 0.5) * 0.13;
      g.fillStyle = pal[value < 0.36 ? 0 : value < 0.49 ? 1 : value < 0.61 ? 2 : value < 0.72 ? 3 : 4];
      g.fillRect(x * cell, y * cell, cell, cell);
    }
    speckle(g, size, size, 1600, rng, ['#161311', '#EFE1C7'], 1.1, 0.12);
    return tex(c, { nearest: true });
  }

  function drawSmiley(g, x, y, r) {
    g.save(); g.translate(x, y); g.scale(r / 30, r / 30);
    const gold = g.createLinearGradient(0, -30, 0, 30);
    gold.addColorStop(0, '#FFD751'); gold.addColorStop(1, '#F5AE16');
    g.fillStyle = '#302218'; g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.fill();
    g.fillStyle = gold; g.beginPath(); g.arc(0, 0, 27.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#252018';
    for (const x of [-8.5, 8.5]) { g.beginPath(); g.ellipse(x, -6, 3.3, 6.4, 0.12, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = '#252018'; g.lineWidth = 4.1; g.lineCap = 'round';
    g.beginPath(); g.arc(0, 2, 14, Math.PI * 0.14, Math.PI * 0.86); g.stroke(); g.restore();
  }

  // The eyes are hand shaded in the face decal, so the rounded look does not cost another draw call.
  function heroEye(g, x, y, w, h, angle, px, py, radius) {
    const sclera = g.createRadialGradient(x - 12, y - 15, 7, x, y, w + 4);
    sclera.addColorStop(0, '#FFFFFB'); sclera.addColorStop(0.62, '#FFF7E9'); sclera.addColorStop(1, '#C8AA90');
    g.beginPath(); g.ellipse(x, y, w, h, angle, 0, Math.PI * 2);
    g.fillStyle = sclera; g.fill(); g.lineWidth = 6; g.strokeStyle = '#513326'; g.stroke();
    const iris = g.createLinearGradient(px, py - radius, px, py + radius);
    iris.addColorStop(0, '#201511'); iris.addColorStop(1, '#67452F');
    g.beginPath(); g.arc(px, py, radius, 0, Math.PI * 2); g.fillStyle = iris; g.fill();
    g.beginPath(); g.arc(px, py, radius * 0.68, 0, Math.PI * 2); g.fillStyle = '#100D0D'; g.fill();
    g.fillStyle = '#FFFEF9'; g.beginPath(); g.arc(px - radius * 0.31, py - radius * 0.36, radius * 0.28, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(px + radius * 0.33, py + radius * 0.27, radius * 0.12, 0, Math.PI * 2); g.fill();
  }

  function faceGrain(g, seed, y) {
    const rng = R.mulberry32(seed);
    for (const s of [-1, 1]) for (let i = 0; i < 13; i++) {
      const x = 224 + s * (104 + rng() * 70);
      g.fillStyle = i % 4 ? '#B88663' : '#946748';
      g.beginPath(); g.arc(x, y + rng() * 45, 0.9 + rng() * 1.7, 0, Math.PI * 2); g.fill();
    }
  }

  function polygon(g, points) {
    g.beginPath(); points.forEach(([x, y]) => g.lineTo(x, y)); g.closePath();
  }

  const paint = {
    camoGreen: () => camo(['#1B1D1A', '#2E3226', '#4A4F36', '#6B5B3A'], 3),
    camoDark: () => camo(['#0F100E', '#1B1D1A', '#2E3226', '#4A4F36'], 9),
    camoCmdr: () => heroCamo(['#292624', '#423932', '#5C5146', '#7B684F', '#9F8364'], 5),
    camoNana: () => heroCamo(['#272627', '#3B3632', '#53483D', '#715F4E', '#978066'], 12),
    camoSoldier: () => camoPix(['#0A1C36', '#143C70', '#1F68B5', '#3CA0F0'], 29, 20), // Allied Soldier: vivid Spec-Ops Blue / Cyan camo

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
      g.font = '18px ' + FONT; g.fillText('\u2191  ' + (WZ.t ? WZ.t('art.crate.up') : 'THIS SIDE UP'), 128, 150, 192);
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
      drawSmiley(g, 32, 32, 31);
      return tex(c, { clamp: true });
    },
    cmdrEmblem() { // stamped rank: two small points over a pair of broad winged chevrons
      const c = cv(128, 96), g = c.getContext('2d');
      const bars = [
        [[42, 22], [64, 7], [86, 22], [79, 29], [64, 19], [49, 29]],
        [[36, 38], [64, 21], [92, 38], [84, 45], [64, 34], [44, 45]],
        [[9, 44], [43, 48], [64, 60], [85, 48], [119, 44], [103, 58], [86, 58], [64, 73], [42, 58], [25, 58]],
        [[24, 64], [43, 66], [64, 81], [85, 66], [104, 64], [91, 76], [64, 93], [37, 76]],
      ];
      g.lineJoin = 'round'; g.strokeStyle = '#2C2723'; g.lineWidth = 4;
      const silver = g.createLinearGradient(0, 10, 0, 94);
      silver.addColorStop(0, '#FFFCF6'); silver.addColorStop(1, '#CBC1B4'); g.fillStyle = silver;
      bars.forEach((bar) => { polygon(g, bar); g.stroke(); g.fill(); });
      return tex(c, { clamp: true });
    },
    faceCmdr() {
      const c = cv(448, 400), g = c.getContext('2d');
      g.lineCap = 'round'; g.lineJoin = 'round';
      faceGrain(g, 27, 255);
      for (const s of [-1, 1]) {
        const x = 224 + s * 93;
        heroEye(g, x, 176, 73, 57, s * 0.13, x - s * 19, 173, 26);
        polygon(g, [[224 + s * 176, 88], [224 + s * 20, 139], [224 + s * 29, 170], [224 + s * 172, 136], [224 + s * 186, 119]]);
        const brow = g.createLinearGradient(0, 93, 0, 176);
        brow.addColorStop(0, '#36261F'); brow.addColorStop(1, '#140E0C'); g.fillStyle = brow; g.fill();
      }
      g.strokeStyle = '#4E2B21'; g.lineWidth = 8; g.beginPath();
      g.moveTo(138, 326); g.bezierCurveTo(184, 303, 246, 305, 294, 327); g.stroke();
      return tex(c, { clamp: true });
    },
    faceSoldier() { // Allied Spec-Ops Commando: glowing cyan tactical visor goggles + confident smirk
      const c = cv(448, 400), g = c.getContext('2d');
      g.lineJoin = 'round'; g.lineCap = 'round';
      // visor frame
      g.fillStyle = '#0D131A';
      g.beginPath();
      if (g.roundRect) g.roundRect(36, 118, 376, 148, 42); else g.rect(36, 118, 376, 148);
      g.fill();
      g.lineWidth = 12; g.strokeStyle = '#FFB400'; g.stroke();
      // glowing cyan lens
      const gr = g.createLinearGradient(0, 130, 0, 256);
      gr.addColorStop(0, '#72F6FF'); gr.addColorStop(0.5, '#15B8E8'); gr.addColorStop(1, '#096898');
      g.fillStyle = gr;
      g.beginPath();
      if (g.roundRect) g.roundRect(52, 134, 344, 116, 32); else g.rect(52, 134, 344, 116);
      g.fill();
      // HUD crosshair & reflection streaks on visor
      g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(86, 154); g.lineTo(170, 154); g.moveTo(290, 154); g.lineTo(356, 154); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 4;
      g.beginPath(); g.arc(140, 194, 24, 0, 7); g.arc(308, 194, 24, 0, 7); g.stroke();
      // nose bridge notch
      g.fillStyle = '#0D131A';
      g.beginPath(); g.moveTo(196, 266); g.lineTo(224, 232); g.lineTo(252, 266); g.closePath(); g.fill();
      // confident tactical smirk
      g.strokeStyle = '#2A1510'; g.lineWidth = 13;
      g.beginPath(); g.moveTo(156, 344); g.quadraticCurveTo(228, 362, 296, 330); g.stroke();
      return tex(c, { clamp: true });
    },
    faceNana() { // big round eyes, gapped grin, tongue and a crossed cheek bandage
      const c = cv(448, 400), g = c.getContext('2d');
      g.lineCap = 'round'; g.lineJoin = 'round';
      faceGrain(g, 45, 238);
      for (const s of [-1, 1]) {
        const x = 224 + s * 91, lift = s > 0 ? 7 : 0;
        heroEye(g, x, 188 - lift, 72, 70, -s * 0.08, x + 11, 195 - lift, 29);
        g.beginPath(); g.moveTo(224 + s * 30, 101 - lift);
        g.quadraticCurveTo(224 + s * 102, 56 - lift, 224 + s * 165, 89 - lift);
        g.lineTo(224 + s * 161, 112 - lift);
        g.quadraticCurveTo(224 + s * 100, 89 - lift, 224 + s * 38, 122 - lift); g.closePath();
        g.fillStyle = '#281912'; g.fill();
      }
      g.beginPath(); g.moveTo(100, 259); g.quadraticCurveTo(198, 290, 329, 266);
      g.bezierCurveTo(329, 326, 312, 350, 238, 354); g.quadraticCurveTo(115, 356, 100, 259); g.closePath();
      const mouth = g.createLinearGradient(0, 260, 0, 357);
      mouth.addColorStop(0, '#21100D'); mouth.addColorStop(1, '#542820');
      g.fillStyle = mouth; g.fill(); g.strokeStyle = '#573023'; g.lineWidth = 6; g.stroke();
      g.save(); g.clip();
      g.fillStyle = '#FFF5DF';
      for (const [x, y, w] of [[134, 260, 36], [202, 265, 48]]) {
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w, y + 41);
        g.quadraticCurveTo(x + w - 1, y + 49, x + w - 9, y + 49);
        g.lineTo(x + 8, y + 49); g.quadraticCurveTo(x, y + 49, x, y + 40); g.closePath(); g.fill();
      }
      g.restore();
      g.save(); g.translate(291, 332); g.rotate(-0.48);
      const tongue = g.createLinearGradient(0, -28, 0, 45);
      tongue.addColorStop(0, '#D87759'); tongue.addColorStop(1, '#EFAC87');
      g.beginPath(); g.moveTo(-32, -9); g.bezierCurveTo(-29, -33, -5, -34, 1, -23);
      g.bezierCurveTo(24, -43, 35, -13, 33, 9); g.bezierCurveTo(30, 51, -26, 49, -32, -9); g.closePath();
      g.fillStyle = tongue; g.fill(); g.strokeStyle = '#813F2C'; g.lineWidth = 4; g.stroke();
      g.beginPath(); g.moveTo(1, -21); g.quadraticCurveTo(-4, -9, 2, 16); g.stroke(); g.restore();
      // Two crossed adhesive strips on Nana's left cheek (the right of the face texture).
      g.save(); g.translate(372, 282);
      for (const a of [0.81, -0.63]) {
        g.rotate(a); g.beginPath(); g.moveTo(-30, -12); g.lineTo(30, -12); g.quadraticCurveTo(44, 0, 30, 12);
        g.lineTo(-30, 12); g.quadraticCurveTo(-44, 0, -30, -12); g.closePath();
        g.fillStyle = '#EEC398'; g.fill(); g.strokeStyle = '#AB7953'; g.lineWidth = 2; g.stroke(); g.rotate(-a);
      }
      g.fillStyle = '#AE805A'; for (const y of [-4, 4]) for (const x of [-6, 0, 6]) g.fillRect(x - 1, y - 1, 2, 2);
      g.restore();
      return tex(c, { clamp: true });
    },
    nanaDecals() { // one continuous helmet print: white stencil, angled ace patch and smiley sticker
      const c = cv(512, 144), g = c.getContext('2d'), rng = R.mulberry32(31);
      g.save(); g.transform(1, 0, -0.20, 1, 33, 0);
      g.fillStyle = '#F6F2E9';
      for (const [i, letter] of [...'NANA'].entries()) {
        g.save(); g.translate(11 + i * 70, 30);
        if (letter === 'N') {
          polygon(g, [[0, 83], [0, 0], [16, 0], [47, 51], [47, 0], [63, 0], [63, 83], [47, 83], [16, 32], [16, 83]]); g.fill();
        } else {
          polygon(g, [[0, 83], [22, 0], [43, 0], [65, 83], [47, 83], [43, 66], [22, 66], [17, 83]]);
          g.moveTo(26, 50); g.lineTo(39, 50); g.lineTo(32, 19); g.closePath(); g.fill('evenodd');
        }
        g.restore();
      }
      g.restore();
      g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 60; i++) g.fillRect(16 + rng() * 288, 28 + rng() * 87, 1 + rng() * 1.5, 1 + rng() * 2);
      g.globalCompositeOperation = 'source-over';
      g.save(); g.translate(420, 57); g.rotate(0.20);
      g.fillStyle = '#E5D9C3'; g.fillRect(-37, -48, 74, 96);
      g.strokeStyle = '#A39682'; g.lineWidth = 3; g.strokeRect(-35.5, -46.5, 71, 93);
      g.strokeStyle = '#F2E9D8'; g.lineWidth = 1.5; g.strokeRect(-31, -42, 62, 84);
      g.fillStyle = '#2B2523'; g.textAlign = 'center'; g.font = 'bold 20px sans-serif'; g.fillText('A', -23, -25);
      g.beginPath(); g.moveTo(1, -19); g.bezierCurveTo(-1, -10, -22, -3, -20, 8);
      g.quadraticCurveTo(-18, 23, -3, 13); g.lineTo(-9, 24); g.lineTo(11, 24); g.lineTo(5, 13);
      g.quadraticCurveTo(20, 23, 22, 8); g.bezierCurveTo(24, -3, 3, -10, 1, -19); g.closePath(); g.fill();
      g.fillStyle = '#A9583C'; g.fillRect(20, -34, 6, 6); g.fillRect(-25, 31, 6, 6); g.restore();
      drawSmiley(g, 404, 109, 30);
      return tex(c, { clamp: true });
    },
  };

  WZ.Tex = { paint, FONT, cv };
})(window.WZ = window.WZ || {});
