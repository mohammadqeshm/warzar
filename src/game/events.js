/* WZ.Events — tiny pub/sub. Names are listed in PROJECT_MEMORY.md. */
(function (WZ) {
  'use strict';
  const map = new Map();
  WZ.Events = {
    on(name, fn) {
      let a = map.get(name);
      if (!a) { a = []; map.set(name, a); }
      a.push(fn);
      return () => WZ.Events.off(name, fn);
    },
    off(name, fn) {
      const a = map.get(name);
      if (!a) return;
      const i = a.indexOf(fn);
      if (i >= 0) a.splice(i, 1);
    },
    emit(name, payload) {
      const a = map.get(name);
      if (!a) return;
      for (let i = 0; i < a.length; i++) {
        try { a[i](payload); } catch (e) { console.error('[Events]', name, e); }
      }
    },
    clear(prefix) {
      for (const k of Array.from(map.keys())) if (!prefix || k.indexOf(prefix) === 0) map.delete(k);
    },
  };
})(window.WZ = window.WZ || {});
