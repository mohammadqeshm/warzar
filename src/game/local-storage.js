/* Standalone and headless-test adapter, intentionally not imported by the Playgama entry. */
(function (WZ) {
  'use strict';
  WZ.LocalStorage = {
    get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
    set(key, data) { try { localStorage.setItem(key, data); } catch (_) { /* private/offline session */ } },
  };
})(window.WZ = window.WZ || {});
