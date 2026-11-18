import path from "path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const releaseLoading = `<style>
#wz-start{position:fixed;inset:0;z-index:60;display:grid;place-content:center;justify-items:center;padding:20px;text-align:center;
background:radial-gradient(ellipse at 50% 38%,#30343b,#101216 68%);color:#ffecc6;font:700 15px/1.45 system-ui,sans-serif}
#wz-start[hidden],#wz-start.hand-off,#wz-start-retry[hidden]{display:none}
#wz-start .title{margin:0;color:#ffba22;font-size:clamp(28px,7vw,58px);letter-spacing:-.045em}
#wz-start .rule{width:68px;height:4px;background:#ffba22;transform:skew(-20deg);margin:14px 0 2px}
#wz-start-retry{font:inherit;background:#ffba22;color:#141415;border:0;border-radius:8px;min-height:44px;padding:8px 20px;cursor:pointer}
</style>`;

export default defineConfig(({ mode }) => {
  const packaged = mode === "playgama";
  return {
    base: "./",
    plugins: [
      react(), tailwindcss(),
      packaged ? {
        name: "warzar-playgama-entry",
        transformIndexHtml: {
          order: "pre",
          // The normal first script in head is the unmodified, local Bridge. The entry barrier precedes all game chunks.
          handler: (html) => html.replace(/<!-- bridge-loader -->[\s\S]*?<!-- \/bridge-loader -->/,
            '<script src="./playgama-bridge.js"></script>\n    ' + releaseLoading)
            .replace('<div id="root"></div>', '<div id="root"></div>\n    <section id="wz-start"><h1 class="title">WARZAR: Crate Rush</h1><div class="rule" aria-hidden="true"></div><p id="wz-start-status" role="status">Getting the game ready…</p><button type="button" id="wz-start-retry" hidden>Try again</button></section>')
            .replace('/src/standalone-entry.ts', '/src/playgama-entry.ts'),
        },
      } : viteSingleFile(),
      // The standalone file now redistributes the licensed bank too. Keep its attribution
      // in the HTML without changing the game UI or adding a network dependency.
      !packaged && {
        name: "warzar-standalone-audio-credits",
        apply: "build",
        transformIndexHtml(html) {
          const credits = readFileSync(path.join(__dirname, "docs/PLAYGAMA-AUDIO.md"), "utf8").replace(/-->/g, "-- >");
          return html + "\n<!-- \n" + credits + "\n-->\n";
        },
      },
    ],
    // The Playgama build is intentionally split: an inlined main bundle loads the engine before Bridge initialization.
    // The default standalone build still embeds game assets in dist/index.html.
    build: packaged ? {
      outDir: "dist-playgama",
      assetsInlineLimit: 0,
      modulePreload: false,
      chunkSizeWarningLimit: 1600,
      rollupOptions: { output: {
        assetFileNames: (asset) => (asset.names.some((n) => n.endsWith(".mp3")) ? "audio/" : "assets/") + "[name]-[hash][extname]",
      } },
    } : undefined,
    resolve: { alias: { "@": path.resolve(__dirname, "src"), "@warzar/audio-bank": path.resolve(__dirname, "src/game/audio-playgama-bank.js") } },
  };
});
