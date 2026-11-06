/* WZ.Assets — the ASSET SWAP LAYER.
 * Everything asks for textures/models here. A request returns the procedural fallback immediately; if the
 * manifest lists a file for that key, the file is loaded and hot-swapped in (no code changes needed).
 *
 *   WZ.Assets.manifest.textures.crate = 'assets/crate.png';       // drop-in texture (same key as the procedural one)
 *   WZ.Assets.overrideModel('jeep', () => myJeepGroup);            // drop-in model factory (e.g. built from a GLTF)
 */
(function (WZ) {
  'use strict';
  const T = THREE;
  const texCache = new Map();
  const overrides = new Map();

  const Assets = {
    manifest: { textures: {}, models: {} },

    /** Cached texture by key. Procedural painter: WZ.Tex.paint[key](). */
    tex(key) {
      let t = texCache.get(key);
      if (t) return t;
      const painter = WZ.Tex && WZ.Tex.paint[key];
      if (!painter) throw new Error('[Assets] unknown texture ' + key);
      t = painter();
      t.userData.shared = true;
      texCache.set(key, t);
      const file = Assets.manifest.textures[key];
      if (file) {
        const img = new Image();
        img.onload = () => { t.image = img; t.needsUpdate = true; };
        img.onerror = () => { /* keep procedural fallback */ };
        img.src = file;
      }
      return t;
    },

    overrideModel(key, factory) { overrides.set(key, factory); },
    /** Returns an override model if one is registered, else null (caller builds the procedural one). */
    modelOverride(key) { const f = overrides.get(key); return f ? f() : null; },

    disposeAll() { texCache.forEach((t) => t.dispose()); texCache.clear(); },
  };

  Assets._T = T;
  WZ.Assets = Assets;
})(window.WZ = window.WZ || {});
