# WARZAR: Crate Rush 1.0.0 — Release QA record

Checked 2026-11-18 against the Playgama requirements in [the numbered audit](PLAYGAMA-AUDIT.md). This is **local release QA**, not a dashboard review, certification, or partner approval. Nothing was uploaded or published.

## What to upload

| Property | Exact value |
|---|---|
| Upload file | `warzar-crate-rush-1.0.0-playgama.zip` |
| Version / SDK | WARZAR 1.0.0 / Playgama Bridge 2.4.3 |
| SHA-256 | `f5e76890a12f01e56622b14b8cbfb410858c284c3b45f559ad3466322865762a` |
| Compressed / unpacked | 2,935,413 / 4,402,560 bytes |
| Contents | 98 files, including 88 MP3s, root `index.html`, `playgama-bridge.js`, `playgama-bridge-config.json`, `assets/`, `audio/`, and four notice files |
| Source baseline | `c84bd45a64125af510f3c0cd85ca3bed09838678` + working-tree changes, including earlier mobile/character/audio work. The source ZIP is the complete working tree needed to build; not a commit. |

The upload ZIP was CRC-tested and extracted to an empty directory. All **88 MP3 files and the bundled Bridge** are byte-identical to the previous upload. In the Bridge config, only the unused Shop reward placement was removed; `bonus_coins`, interstitial placements and timing, and the stable-schema validation are unchanged. The app bundle is checked for direct browser storage and packaging of the historical sound bank. Keep using the game ZIP in the dashboard, not the source or media ZIP.

The developer build and standalone HTML now use the exact same licensed sound bank as Playgama, including separate menu and mission music. The standalone `dist/index.html` is 4,804,147 bytes, with the MP3s and attribution embedded. The old rendered samples are retained only in source and are not imported by either production build.

## Local regression checks — current ZIP

Node 20.20.2 / Vite 7.3.7. Both production builds, `tsc --noEmit`, `git diff --check`, MP3 inventory, platform mock, progress, Shop/garage, and 383 EN/RU key/placeholder checks passed. The only Shop behavior removed is the opt-in offer for coins. Purchase prices, inventory, upgrades, and other ads are untouched. The Shop is still an equipment store that spends in-game coins.

| Case | Observed result |
|---|---|
| **Exact extracted ZIP over HTTP** — Chromium 159.0.8154.6 | Stock SDK 2.4.3 startup in the cross-origin fixture, menu and mission, music, persisted mute on reload, debug disabled. |
| **Shop / layouts** — Chromium and WebKit 27.2 | The Shop has no ad button or ad call even when the fixture reports rewarded support. Successfully bought a mine and upgraded it with the correct wallet deduction. Back navigation, RU layouts from 320×320 to 1120×740 across eight sizes, touch release/cancel and pause controls passed. |
| **Level 1 → result reward → level 2** — Chromium | Completed the tutorial simulation with real steering, boarding, crate delivery and extraction. Skipping paid zero; duplicate earned callbacks paid the offered reward once, and play stayed paused until close. No-fill did not block level 2. The wallet and unlock persisted after reload. |
| **Audio in the exact game archive** — Chromium desktop / WebKit touch | Decoded all 88 files. First gesture, host/user mute and reload, menu-to-mission crossfade, purchase cue, six-layer engine and boost, wind, and overlapping ad/pause/visibility reasons passed. |
| **Default `npm run dev`** — Chromium | The same 88-entry bank loaded. The separate menu and mission MP3s decoded from the licensed folder, and the Shop had no rewarded offer. |
| **Standalone `file://`** — Chromium and WebKit | Opened the isolated HTML and played the menu and mission tracks without any local sidecar server. Decoded data URLs for all 88 files matched the licensed source bytes. The Shop had no rewarded offer. |

These are browser runs and controlled callbacks, **not** live ads, cloud storage, physical-device QA, or dashboard acceptance.

## Earlier baseline checks (previous archive)

The candidate before audio unification and Shop ad removal (`abd60257ebc846bf03e0059afe6d35d5ea5cf77bc4dd7d15e6105671777184ae`) passed the 16 Node suites (including 350 hazards cases, 200 level layouts, and 144 layouts each for frozen, volcanic and harbor). Its extra browser checks covered stock SDK startup in WebKit and Firefox (Xvfb and a CI audio sink), localized rejected init/storage recovery, permitted iframe fullscreen and unbound Escape, and a five-theme level-5 render/failure/retry smoke. Those checks identify the baseline, not additional runs of this exact ZIP. Code that controls the maps, game balance, saving, SDK boot and results is unchanged in this follow-up.

## Reproduce the local package checks

```sh
npm ci
npm run build:playgama
python3 tools/package-playgama.py /tmp/warzar-upload.zip --extract /tmp/warzar-verified
npm run build
npx tsc --noEmit
for f in tools/test-*.cjs; do node "$f" || exit 1; done
node tools/test-audio.cjs --legacy # optional archival inventory
```

The extraction directory needs to be empty. To test the upload yourself, serve the extracted folder over HTTP; do not double-click its `index.html`. For browser checks, install [Playwright](https://playwright.dev/) and the browser binaries separately (not part of the game dependencies), then set `WZ_PLAYWRIGHT` to the installed module path. Run **one browser at a time** on memory-constrained CI.

```sh
export WZ_PLAYGAMA_DIR=/tmp/warzar-verified
# export WZ_PLAYWRIGHT=/absolute/path/to/node_modules/playwright
node tools/qa-playgama.cjs chromium --stock
node tools/qa-playgama.cjs webkit --stock
node tools/qa-playgama.cjs chromium --core
node tools/qa-playgama.cjs chromium --layout
node tools/qa-playgama.cjs webkit --layout
node tools/qa-playgama.cjs chromium --failure
node tools/qa-playgama.cjs chromium --fullscreen
node tools/qa-playgama.cjs chromium --scenes
node tools/qa-playgama.cjs chromium --assets
node tools/qa-playgama.cjs webkit --assets
node tools/qa-audio.cjs chromium
node tools/qa-audio.cjs webkit
# Linux CI: provide an audio sink and a working WebGL display for Firefox.
xvfb-run -a node tools/qa-playgama.cjs firefox --stock
```

`qa-playgama.cjs` serves the exact extracted upload over HTTP under a nested cross-origin sandboxed iframe. `--stock` keeps the real packaged SDK and uses its local/mock destination; fixtures for other flags replace Bridge only in the test server. `qa-audio.cjs` uses a mock host with the built game, real decoded samples and the real AudioContext; its standalone check opens the build on `file://`. None of the fixture code ships in the upload.

## Media and listing

Three in-engine cover compositions (800×800, 1080×1920 and 1920×1080) and five actual screenshots were reviewed visually and decoded/checked as JPEGs. Menu, desert pickup, volcanic run and equipment Shop are 1600×900; the touch harbor run is 540×960. Each image is under 1 MB. The captures are packaged separately with [the EN/RU listing](PLAYGAMA-LISTING.md), not shipped in the executable ZIP. The selected combat soldier card, model and description match in the Shop screenshot.

## Dashboard and device checks still required

1. **Draft & analyzer:** upload this exact ZIP to **Test Game** in the [Developer Dashboard](https://developer.playgama.com/). Record the SDK, configuration, readiness, startup memory (official peak under 2 GB), and destination findings. A JS heap reading by itself does not measure graphics or total memory.
2. **Hands-on play and persistence:** complete first pickup/extraction without test input; play later levels and verify unlocks. Close/reload during results, rotate in play and in Shop, and test save continuity across actual hosting/session boundaries. Check host-muted launch and player vs host mute after reload. Test real storage, including blocked storage, sessions and cloud/cross-device where applicable.
3. **Live ads:** verify real availability, no-fill/skip/close, opt-in amounts and placement mapping. Reward only on earned callback, once. Exercise ads after results and from pause. Ensure audio and input do not resume while the host, user or an open ad still pauses the game.
4. **Physical devices / browsers:** test required current Chrome, Firefox, Opera, Safari and Edge on supported Windows, macOS, Android and iOS, including phones with notches. Confirm actual fullscreen/viewport, portrait and landscape, 1:1 embed, touch without selection/callout, lock/wake, native switching/minimizing, history, hardware performance and recovery. Emulation and synthetic lifecycle events are not these checks.
5. **Submission decisions:** confirm title/originality, all distribution rights and accurate AI/asset disclosures. Review the supplied covers, screenshots, and English/Russian listing. Approve cartoon combat with moderation and check separate partner rules before opting in. Save as Draft if a gate is open; only the authorized owner submits or enables distribution.
