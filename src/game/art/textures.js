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

  /** classic yellow smiley sticker (dark rim, oval eyes, wide smile) centred at x,y with radius r */
  function drawSmiley(g, x, y, r) {
    g.fillStyle = '#17130A'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.fillStyle = '#FFCC1A'; g.beginPath(); g.arc(x, y, r * 0.86, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.38, r * 0.3, r * 0.16, -0.5, 0, 7); g.fill();
    g.fillStyle = '#17130A';
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(x + s * r * 0.3, y - r * 0.18, r * 0.1, r * 0.2, 0, 0, 7); g.fill(); }
    g.lineCap = 'round'; g.strokeStyle = '#17130A'; g.lineWidth = Math.max(2, r * 0.13);
    g.beginPath(); g.arc(x, y + r * 0.02, r * 0.52, Math.PI * 0.18, Math.PI * 0.82); g.stroke();
  }

  const paint = {
    camoGreen: () => camo(['#1B1D1A', '#2E3226', '#4A4F36', '#6B5B3A'], 3),
    camoDark: () => camo(['#0F100E', '#1B1D1A', '#2E3226', '#4A4F36'], 9),
    camoCmdr: () => camoPix(['#120E0A', '#2E2317', '#56442C', '#8C7550'], 5, 20),   // Commander: black / brown / khaki-tan (reference sheet)
    camoNana: () => camoPix(['#0B0A08', '#1D1913', '#3A2F20', '#6A583B'], 12, 20),  // Nana: darker, mostly black with tan flecks
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
    smiley() { // yellow smiley sticker (Nana's chest badge, as on the character sheet)
      const c = cv(64, 64), g = c.getContext('2d');
      drawSmiley(g, 32, 32, 30);
      return tex(c, { clamp: true });
    },
    cmdrEmblem() { // winged rank insignia: small double chevron on top + two wide wing bars (cap front + vest back)
      const c = cv(128, 80), g = c.getContext('2d');
      g.lineCap = 'round'; g.lineJoin = 'round';
      const pass = (fn) => { fn(); g.strokeStyle = '#15171A'; g.lineWidth = 15; g.stroke(); fn(); g.strokeStyle = '#F4F5F2'; g.lineWidth = 7; g.stroke(); };
      pass(() => { g.beginPath(); g.moveTo(44, 26); g.lineTo(64, 9); g.lineTo(84, 26); });   // top chevron
      pass(() => { g.beginPath(); g.moveTo(52, 30); g.lineTo(64, 21); g.lineTo(76, 30); });  // inner chevron (diamond tip)
      pass(() => { g.beginPath(); g.moveTo(18, 40); g.lineTo(52, 52); g.lineTo(64, 47); g.lineTo(76, 52); g.lineTo(110, 40); }); // upper wing
      pass(() => { g.beginPath(); g.moveTo(26, 56); g.lineTo(54, 68); g.lineTo(64, 64); g.lineTo(74, 68); g.lineTo(102, 56); }); // lower wing
      return tex(c, { clamp: true });
    },
    faceCmdr() { // 448x400, drawn on a 1.1 x 0.98 plane in front of the head: furious eyes, thick brows, grim mouth
      const c = cv(448, 400), g = c.getContext('2d');
      g.lineJoin = 'round'; g.lineCap = 'round';
      for (const s of [-1, 1]) {
        const cx = 224 + s * 94, cy = 218;
        g.beginPath(); g.ellipse(cx, cy, 72, 60, 0, 0, 7); g.fillStyle = '#F8F5EC'; g.fill();
        g.lineWidth = 7; g.strokeStyle = '#120D0A'; g.stroke();
        g.fillStyle = '#0A0A0A'; g.beginPath(); g.ellipse(cx - s * 11, cy + 10, 29, 32, 0, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(cx - s * 11 - 10, cy - 2, 9, 0, 7); g.fill();
        g.beginPath(); g.arc(cx - s * 11 + 10, cy + 23, 4.5, 0, 7); g.fill();
        g.strokeStyle = '#120D0A'; g.lineWidth = 46; // heavy slanted brow
        g.beginPath(); g.moveTo(224 + s * 172, 104); g.lineTo(224 + s * 20, 178); g.stroke();
        g.lineWidth = 14; g.beginPath(); g.moveTo(224 + s * 182, 92); g.lineTo(224 + s * 164, 126); g.stroke();
      }
      g.strokeStyle = '#2A1510'; g.lineWidth = 7; g.beginPath(); g.moveTo(224, 120); g.lineTo(224, 156); g.stroke(); // furrow
      g.lineWidth = 13; g.strokeStyle = '#2A1510'; g.beginPath(); g.arc(224, 398, 64, Math.PI * 1.17, Math.PI * 1.83); g.stroke();
      g.globalAlpha = 0.18; g.fillStyle = '#B5682F'; // cheek shading
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(224 + s * 150, 300, 32, 20, 0, 0, 7); g.fill(); }
      g.globalAlpha = 1;
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
    faceNana() { // goofy-brave face from the character sheet: huge round eyes, raised thick brows, buck-tooth grin + tongue, band-aid
      const c = cv(448, 400), g = c.getContext('2d');
      g.lineJoin = 'round'; g.lineCap = 'round';
      for (const s of [-1, 1]) {
        const cx = 224 + s * 88, cy = 158;
        // big round eye
        g.beginPath(); g.ellipse(cx, cy, 66, 70, 0, 0, 7); g.fillStyle = '#FBF8F0'; g.fill();
        g.lineWidth = 8; g.strokeStyle = '#120D0A'; g.stroke();
        // dark pupil looking at the viewer + highlights
        g.fillStyle = '#0D0A08'; g.beginPath(); g.ellipse(cx - s * 6, cy + 8, 33, 37, 0, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(cx - s * 6 - 12, cy - 6, 11, 0, 7); g.fill();
        g.beginPath(); g.arc(cx - s * 6 + 12, cy + 22, 5, 0, 7); g.fill();
        // thick arched eyebrow, raised (her left one a little higher = cheeky)
        const lift = s > 0 ? 8 : 0;
        g.strokeStyle = '#1A110C'; g.lineWidth = 30;
        g.beginPath(); g.moveTo(224 + s * 34, 76 - lift); g.quadraticCurveTo(224 + s * 92, 36 - lift, 224 + s * 152, 66 - lift); g.stroke();
        // soft cheek blush
        g.globalAlpha = 0.2; g.fillStyle = '#C8643A';
        g.beginPath(); g.ellipse(224 + s * 150, 262, 34, 20, 0, 0, 7); g.fill();
        g.globalAlpha = 1;
      }
      // wide open grin (dark mouth) with two buck teeth and the tongue poking out
      g.beginPath(); g.moveTo(136, 276); g.quadraticCurveTo(224, 288, 312, 274); g.quadraticCurveTo(298, 350, 224, 352); g.quadraticCurveTo(150, 350, 136, 276); g.closePath();
      g.fillStyle = '#4A1410'; g.fill(); g.lineWidth = 8; g.strokeStyle = '#1E0C08'; g.stroke();
      g.fillStyle = '#FFFDF6'; g.strokeStyle = '#1E0C08'; g.lineWidth = 4;
      for (const x of [198, 227]) { g.beginPath(); g.rect(x, 280, 24, 28); g.fill(); g.stroke(); }
      g.save(); g.beginPath(); g.rect(0, 300, 448, 100); g.clip(); // tongue (lower half of the mouth, slightly off-centre)
      g.fillStyle = '#E2555A'; g.beginPath(); g.ellipse(240, 346, 46, 36, 0.1, 0, 7); g.fill();
      g.lineWidth = 6; g.strokeStyle = '#1E0C08'; g.stroke();
      g.strokeStyle = '#B23A40'; g.lineWidth = 4; g.beginPath(); g.moveTo(240, 318); g.lineTo(243, 346); g.stroke();
      g.restore();
      // band-aid on her left cheek (viewer's right)
      g.save(); g.translate(372, 238); g.rotate(-0.5);
      g.fillStyle = '#E8B98A'; g.strokeStyle = '#7A5232'; g.lineWidth = 4;
      g.beginPath(); if (g.roundRect) g.roundRect(-46, -15, 92, 30, 14); else g.rect(-46, -15, 92, 30); g.fill(); g.stroke();
      g.fillStyle = '#F4D3AE'; g.fillRect(-14, -12, 28, 24);
      g.fillStyle = '#B48660'; for (const dx of [-7, 0, 7]) for (const dy of [-5, 4]) g.fillRect(dx - 1.5, dy - 1.5, 3, 3);
      g.restore();
      return tex(c, { clamp: true });
    },
    nanaDecals() { // top: NANA stencil (256x64) · bottom-left: yellow smiley sticker · next: ace-of-spades card patch
      const c = cv(256, 128), g = c.getContext('2d'), r = R.mulberry32(31);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '62px ' + FONT;
      const tw = g.measureText('NANA').width || 120, sx = Math.min(2.2, 232 / tw);
      g.save(); g.translate(128, 33); g.scale(sx, 1);
      g.fillStyle = '#F2EFE6'; g.strokeStyle = '#F2EFE6'; g.lineWidth = 3; g.fillText('NANA', 0, 0); g.strokeText('NANA', 0, 0);
      g.restore();
      g.globalCompositeOperation = 'destination-out'; // worn-paint chips
      for (let i = 0; i < 60; i++) g.fillRect(r() * 256, r() * 64, 1 + r() * 2, 1 + r() * 2);
      g.globalCompositeOperation = 'source-over';
      // yellow smiley sticker
      drawSmiley(g, 32, 96, 30);
      // card
      g.fillStyle = '#E9E3CE'; g.fillRect(74, 68, 44, 54); g.strokeStyle = '#111'; g.lineWidth = 3; g.strokeRect(74, 68, 44, 54);
      g.fillStyle = '#111'; g.font = '16px ' + FONT; g.fillText('A', 83, 79);
      g.beginPath(); g.arc(90, 101, 8, 0, 7); g.arc(104, 101, 8, 0, 7); g.fill();
      g.beginPath(); g.moveTo(96, 80); g.lineTo(113, 99); g.lineTo(81, 99); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(96, 100); g.lineTo(102, 115); g.lineTo(90, 115); g.closePath(); g.fill();
      return tex(c, { clamp: true });
    },
  };

  WZ.Tex = { paint, FONT, cv };
})(window.WZ = window.WZ || {});
