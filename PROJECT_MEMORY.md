# PROJECT_MEMORY.md — WARZAR: CRATE RUSH

> Living handoff file for AI coding agents. **Paste this file at the start of every new chat/session, together with GDD.md and the milestone prompt.** Update it at the end of every milestone and before you run out of quota. If something here conflicts with code that exists, the **code wins**; fix this file.

Last updated: 2026-11-05 · Current milestone: **M1 DONE (vertical slice) — awaiting the 5-person fun test / "MILESTONE 2" prompt**

---

## 1. What we are building (3 lines)
A 3D web game for Playgama / YouTube Playables. Commander drives a military jeep, Nana (frying pan) jumps out to fetch supply crates, enemies swarm, a timer runs, Time Bank carries over, procedural endless missions, shop upgrades. Full design: `GDD.md`.

## 2. Hard rules for agents (read every session)
1. Build **only** the milestone named in the prompt. Never start the next one.
2. Output complete files. No placeholders, "TODO", or "rest of code".
3. No external network calls, CDNs, web fonts, analytics, social links. Libraries are bundled locally.
4. Game code = plain JS classic IIFE modules on one namespace `window.WZ` (no imports/exports inside game files). **See D-006: the host project forces a Vite single-file build; the ordered manifest is `src/game/index.js`.**
5. Never invent Playgama Bridge method names. Put every uncertain call in `src/game/platform.js` with `// VERIFY AGAINST OFFICIAL DOCS` and list it in section 9.
6. Family-friendly: no blood/gore, no real weapon brands. KO = stars, helmet pop, smoke poof.
7. All balance values live in `src/game/config.js` (`WZ.CFG`, formulas in `WZ.CFG.calc`).
8. Every platform call goes through `WZ.Platform` (has a local mock).
9. Performance budget: 60 FPS mid-range phone, ≤ 150 draw calls, InstancedMesh for enemies/props/particles, pooling, no per-frame allocations in hot loops.
10. Size budget: initial load ≤ 15 MB, total ≤ 50 MB, no file > 5 MB, ≤ 100 files, file names `[A-Za-z0-9._-]` only.
11. At the end of a milestone: (a) give a browser test checklist, (b) update this file, (c) stop.

## 3. Tech stack and decisions
| Item | Decision |
|---|---|
| Language | Plain JavaScript ES2020 game modules (`src/game/**`), tiny React/TS shell (`src/App.tsx`) only mounts the game |
| 3D | Three.js **r150.1** (npm, pinned exact) → `src/game/three-global.js` sets `window.THREE` |
| Build | `npm run build` (Vite 7 + vite-plugin-singlefile) → **one self-contained `dist/index.html`** (~980 KB, 281 KB gzip) |
| Physics | None. Custom arcade driving + circle/AABB collisions + spatial hash |
| Audio | WebAudio synthesis, no audio files |
| Art | Procedural low-poly models + canvas-baked textures behind `WZ.Assets` swap layer |
| Save | `WZ.Save` → `localStorage` (try/catch, throttled), versioned JSON (Bridge storage in M4) |
| Units | 1 u ≈ 1 m; Y-up; gameplay on XZ plane; heading θ → forward = (sinθ, cosθ); local +X of a model = its LEFT |
| RNG | mulberry32, `missionSeed = hash(runSeed, missionIndex, attempt)` |
| Sim | Fixed 60 Hz step, render interpolation for jeep/Nana/enemies, hit-stop, DPR cap 2 + auto scaling |

## 4. File tree (actual, M1)
```
index.html                      title "WARZAR: Crate Rush", mobile meta, mounts #root
PROJECT_MEMORY.md  LICENSES.txt (GDD.md is kept by the human)
src/main.tsx  src/App.tsx  src/index.css      React shell -> WZ.Main.start(host)
src/game/
  index.js        ordered import manifest (= ordered script tags). ORDER MATTERS
  three-global.js window.THREE
  game.css        all UI styles (black/yellow, dashed panels, tilted buttons, safe-area, portrait/landscape)
  config.js       WZ.CFG + WZ.CFG.calc.{crateCount,timeLimit,spawnRate,enemyHpMul,coinCrate,completion,timeBonus}(…, tut)
  rng.js          WZ.RNG.{mulberry32,hash,create,noise2,fbm,dateSeed}
  events.js       WZ.Events.{on,off,emit,clear}
  util.js         WZ.U (clamp,lerp,damp,wrap,angDiff,smooth,fmtTime) + WZ.SpatialHash
  platform.js     WZ.Platform.{init,gameReady,language} — local mock + guarded Bridge hooks (bridge file NOT loaded yet)
  save.js         WZ.Save.{load,save,flush,newRunSeed}, schema v1 (see section 5)
  i18n.js         WZ.I18n.t(key,vars) / WZ.t — English only in M1
  audio.js        WZ.Audio.{unlock,suspend,resume,setMuted,sfx(name),engineStart/Set/Stop}
  assets.js       WZ.Assets.{tex(key),manifest,overrideModel,modelOverride} — asset swap layer
  art/geo.js        WZ.Geo.{rbox,prism,cyl,cone,sph,ico,box1,Builder,disposeTree}  (Builder merges parts + vertex colours)
  art/textures.js   WZ.Tex.paint.* canvas textures (camo, wood, crate, stone, plaster, roof, sandbag, sprites, face/eye/decals)
  art/props.js      WZ.Props.{house,tower,wall,tree,rock,camp,flagPole,wreck,cliffs,crateMeshShared,barrelGeo,sandbagGeo,clouds,mountains,plane,parachute,flames}
  art/heroes.js     WZ.Heroes.{commander,nana} rigs: setMode(idle|run|carry|sit|grab|ko|dance|cheer|jump|hold), punch, flash, swing
  art/vehicles.js   WZ.Vehicles.jeep() {root,bodyG,wheels,front,gunYaw,muzzle,seatCmdr,seatNana,bedCrates,flag}
  art/enemies.js    WZ.EnemyArt.build(max) instanced toy soldiers (9 draw calls total)
  world/navgrid.js  WZ.NavGrid.{build,validate}, Grid.{flood,path(A*),los,nearestFree}
  world/collision.js WZ.Collision.create(map) -> {resolve(p,r), free(x,z,r)}
  world/gen.js      WZ.World.{generate(runSeed,mission,{tutorial}),backdrop(seed)}
  world/worldview.js WZ.WorldView.build(map,scene,opts) -> {update,followLight,extract,dispose,sun}
  systems/particles.js WZ.Particles (SOFT/GLOW/STAR pools; dust,poof,sparks,muzzle,stars,confetti) + WZ.Blobs (blob shadows)
  systems/input.js  WZ.Input {stick,consume(name),press,setBoost,device,bot} floating stick + WASD/Space/Shift/Esc/P/F3/N
  systems/camera.js WZ.Cam {cam,yaw,init,resize,snap,update,orbit,shake}
  systems/fx.js     WZ.Fx {text,shake,hitstop,flash,update}
  systems/quality.js WZ.Quality {level,dprScale,update(dt),pixelRatio} auto FPS scaling
  systems/spawner.js WZ.Spawner.update(dt,ctx)   rate = base(m) * (1+Heat), off-screen ring
  systems/gun.js    WZ.Gun {init,update,render} auto-aim roof gun + stationary bonus + instanced tracers
  systems/missions.js WZ.Missions.make(index,tutorial)
  entities/jeep.js  WZ.Jeep (step, hurt, addCrate, sync, localToWorld, bedWorld)
  entities/nana.js  WZ.Nana (states below; press(), hurt(), step(), render())
  entities/enemy.js WZ.Enemies {init,spawn,update,render,damage,ko,nearest,hash}
  entities/crate.js WZ.Crates (nearestAvailable, deliver, drop, update, onLanded)
  entities/smallprops.js WZ.SmallProps (sandbags/barrels knocked away by the jeep)
  ui.js             WZ.UI (mount, HUD, arrows, menu, briefing, summary, pause, debug, canvas-drawn WARZAR logo)
  scenes/menu.js    key-art scene (heroes, wall, village, plane, parachutes)
  scenes/mission.js briefing -> play -> ending -> result phases, rules, tutorial prompts, arrows, HUD feed
  main.js           WZ.Main {start,go,togglePause,setUserPause,resize,frame} + WZ.Debug hooks (empty in prod)
```

## 5. Contracts (keep names stable across sessions)

**Events** (`WZ.Events.emit(name, payload)`): emitted in M1: `nana:deploy`, `nana:recall`, `nana:board`, `nana:ko`, `nana:revive`, `nana:hurt`, `crate:grabbed`, `crate:delivered`, `enemy:ko`, `jeep:damaged`, `jeep:destroyed`, `game:pause`, `game:resume`, `scene:change`, `input:device`, `quality:resize`. Reserved for later: `mission:start`, `mission:complete`, `mission:fail`, `crate:spotted`, `heat:changed`, `timer:tick`, `ad:start`, `ad:end`.

**Nana states:** `IN_JEEP, RUNNING_OUT, GRABBING, RETURNING, BOARDING, KO, RECALLING` (`WZ.Nana.S`).

**Scenes:** `WZ.Main.go('menu' | 'mission', data)`. `briefing` / `ending` / `result` are **phases of the mission scene** in M1 (simplification vs. the planned 5 scenes).

**Config keys (`WZ.CFG`)**: `world, sim, camera, jeep, ram, gun, nana, heat, timer, mission, spawn, enemy, enemies.grunt, crates, economy, ads, perf, quality` + `calc` formulas. `config.js` is authoritative.

**Save schema v1** (`WZ.Save.data`): `v, coins, gears, best{mission,runCoins,fastestMission,kos,timeBank}, owned, equipped, upgrades, daily, challenge, ach, settings{sound,music,vibration,shake,lang,quality}, flags{tutorialDone,noAds}, runSeed`. M1 writes: coins, best.*, flags.tutorialDone, settings.sound/shake, runSeed.

**URL params (QA):** `?m=N` start at mission N (non-tutorial) · `?debug=1` debug overlay (also F3 / backquote; `N` = skip mission while overlay is on). `WZ.Input.bot = {x,y}` overrides the stick; `WZ.Debug.cam(cam, missionScene)` camera override hook.

## 6. Milestone status
| M | Scope | Status | Notes |
|---|---|---|---|
| M1 | Vertical slice (map, jeep, Nana deploy, grunts, Heat, timer, tutorial) | **DONE (code + headless QA)** | gate: 5-person fun test (GDD §10) still to run on real phones |
| M2 | Full mission loop (crates, chaos, enemies, boss, modifiers, juice) | NOT STARTED | |
| M3 | Meta (shop, garage, armory, save, daily, challenge, achievements) | NOT STARTED | |
| M4 | Platform (Bridge, ads/IAP, i18n, perf, QA tool) | NOT STARTED | |
| M5 | Release (QA report, submit) | NOT STARTED | |

### M1 feature list (what exists)
Seeded procedural map (6–8 villages, roads, houses with rust/red roofs, watchtowers, stone walls, sandbags, barrels, rocks, trees, burning wreck + smoke columns, border cliffs, rolling hills, sky/clouds/mountains) · reachability guaranteed by construction (flood-fill from start for jeep + Nana grids; crates ≥50 u from start, ≥60 u apart; extraction ≥150 u) · arcade jeep (drift, inertia, boost with cooldown, 2-circle collisions, auto-unstick, small props knocked away) · 3/4 chase camera (look-ahead, yaw bias, portrait-aware, zoom keeps Nana on screen, shake) · DEPLOY / RECALL Nana (A* path, 0.8 s grab, boarding rule speed < 8 & within 4 u, pan cleave bonks, KO + rescue/revive, -5 s penalty, stuck teleport) · grunt enemies choose closer of jeep/Nana · roof gun auto-aim with stationary bonus · basic ramming (≥10 u/s KOs grunts) · Heat (0.08/s up when < 3 u/s, 0.15/s down, ×spawn rate) · timer + win/lose · scripted tutorial (mission 1, 2 crates, Heat off, prompts) · crate beams + edge arrows with distance · menu scene mimicking the key art with canvas-drawn WARZAR logo · briefing / HUD / pause / summary / run-over · touch + keyboard · synthesized SFX + engine hum · coins saved · debug overlay.

### Intentionally NOT in M1 (do in M2+)
Time Bank, other crate types / loot opening, Nana Chaos, rewarded revive, Runner/Brute/Bomber/Jeep/Turret/Boss, modifiers, mini-radar, music, shop/meta, i18n beyond EN, Bridge file + ads.

## 7. Decisions log
| ID | Date | Decision | Reason |
|---|---|---|---|
| D-001 | 2026-11-04 | "Crate Rush" (jeep + Nana deploy) replaces "Airdrop Rush" | Strong brand fit, simple AI |
| D-002 | 2026-11-04 | One thumb + one DEPLOY button; roof gun automatic | One-finger games dominate Playables |
| D-003 | 2026-11-04 | No physics engine; arcade driving | Size, performance, feel |
| D-004 | 2026-11-04 | Procedural missions only (seeded) | Solo dev |
| D-005 | 2026-11-04 | Stricter own size budgets than platform maximums | Faster load |
| D-006 | 2026-11-05 | Host project is Vite + `vite-plugin-singlefile` (only `dist/index.html` is served, `vite.config.ts`/`package.json` must not be edited). Game stays plain IIFE modules on `window.WZ`, bundled by the ordered manifest `src/game/index.js`; Three.js comes from npm (pinned 0.150.1) and is exposed as global `THREE`. React is only a shell. | Environment constraint; keeps the "ordered modules, one namespace" architecture |
| D-007 | 2026-11-05 | Fixed camera base yaw (looking −Z) with a ±0.25 rad speed-based bias; stick maps to screen directions via the *current* camera yaw | Prevents steering feedback loops, readable one-thumb control |
| D-008 | 2026-11-05 | After the tutorial is completed once, mission 1 of later runs uses the normal formulas (3 crates, Heat on) | Avoid replaying a no-Heat mission every run |
| D-009 | 2026-11-05 | Light = hemisphere 0.64 + warm sun 0.86 from top-left; real shadows only jeep/Nana (shadow cam follows jeep); everything else blob shadows / baked splat shadows | Look + performance |
| D-010 | 2026-11-05 | Characters built as merged chamfered boxes with vertex colours; enemies fully instanced | Draw-call budget (measured 61–107 calls, ~110–145 k tris) |

## 8. Known bugs / tech debt
- Tuned only by simulation: **mission 1 is short** (a perfect bot clears it in ~16 s game time; humans ≈ 40–60 s). Re-tune after the fun test (crate distances, grunt count, time).
- No real-device measurement yet. Headless software GL: 10–17 FPS, 61–107 draw calls, 110–145 k tris. Auto quality drops DPR/shadows when FPS < 40.
- Fonts: no font bundled; uses the system condensed stack (Impact / Haettenschweiler / Roboto Condensed / sans-serif-condensed). On systems without them the fallback is wider. M4: bundle an OFL heavy condensed WOFF2 (inline base64) or keep canvas text.
- Map generation takes ~150–350 ms (blocks a frame on mission start). Could be moved to chunks/idle time.
- Two arrows in the same direction can overlap (labels stack).
- `dist/index.html` contains the React production error string `https://react.dev/errors/` and W3C XML-namespace URIs (identifiers, never fetched). No network calls anywhere. If a strict scanner objects, replace React shell by a plain `main.ts` (needs host-project permission).
- Platform: Bridge file is not loaded in M1 (a missing file would log a 404). M4 adds it and the guarded calls.
- Hit flash on enemies brightens vertex colours (saturates to orange) — fine, but could be a white overlay in M2.

## 9. VERIFY AGAINST OFFICIAL DOCS (Playgama Bridge) — all in `src/game/platform.js`
1. global object name `window.bridge`
2. `bridge.initialize()` returns a Promise
3. `bridge.game.on('visibility_state_changed', cb)` event name + payload (`'hidden'`)
4. `bridge.platform.sendMessage('game_ready')` message name
5. `bridge.platform.language` (not used yet; browser language is used)
Still to confirm in M4: storage API, interstitial/rewarded APIs + callbacks, IAP, leaderboard, `playgama-bridge-config.json` requirement.

## 10. Test checklist (M1) — run in the browser
- Open `dist/index.html` by double-click and via `python3 -m http.server`; menu appears < 5 s; no console errors for 10 minutes.
- Landscape + portrait (rotate / resize): canvas always fills the window, no black bars; HUD does not overlap.
- Desktop: WASD/arrows drive, Space = DEPLOY/RECALL, Shift = boost, Esc/P = pause, F3 = debug, N = skip (debug on).
- Touch: drag on the left half = floating stick; DEPLOY / BOOST buttons; no page scroll/zoom/selection/context menu.
- Tutorial (first launch): prompts drive → deploy → defend → (slow down to board) → next crate → green zone. Heat meter greyed out.
- Nana: runs to crate, grabs 0.8 s, returns; boards only below 8 u/s ("SLOW DOWN…" hint otherwise); RECALL works and keeps the crate; KO shows rescue marker, −5 s, revive by parking within 6 u for 1.5 s.
- Gun fires automatically; stand still → "GUN BOOST" tag and faster fire; Heat flames fill while stationary; more enemies.
- Ram grunts at > 10 u/s → stars, helmet pop, poof. Drive through sandbags/barrels → they fly.
- Timer 0 or jeep HP 0 → MISSION FAILED → NEW RUN. Complete → summary → NEXT MISSION (4 crates at mission 3 etc.).
- Hide tab / Esc: simulation, rendering and audio stop; resume shows pause card.
- Search project for `http`, `https`, `//`: see section 8 (only XML namespaces + React error string in the bundle).
- Size: `dist/index.html` ≈ 980 KB (1 file). Repeated menu↔mission cycles do not grow geometry/texture counts.

## 11. Session handoff
```
Date: 2026-11-05
Model used: Claude (single session, with browser-based headless QA via Playwright/Chromium + swiftshader)
Milestone: M1
Done in this session: everything in "M1 feature list"; automated headless QA: menu/mission/portrait/touch/pause/hidden-tab/fail/destroyed/leak/full bot run of the tutorial (no console errors).
Files created/changed: all under src/game/**, src/App.tsx, src/index.css, index.html, PROJECT_MEMORY.md, LICENSES.txt
Next steps (ordered): 1) run the 5-person fun test on phones, tune mission 1 / Heat / Nana trip length; 2) M2: Time Bank, crate types + loot opening, Nana Chaos, remaining enemies, boss, modifiers, radar, music, juice; 3) keep config.js as the single balance file.
Known bugs: see section 8.
Open questions for the human: confirm single-file `dist/index.html` is acceptable for Playgama upload (it is a valid ZIP-root index.html); provide /lib/playgama-bridge.js + docs link for M4; decide on bundled font.
```

## 12. How to start a new chat (copy this)
"You are the lead engineer of WARZAR: CRATE RUSH. Read PROJECT_MEMORY.md and GDD.md below. Obey the Hard rules. Today's task: MILESTONE X (or: fix bug Y). Do not start anything beyond it. At the end give the test checklist and the updated PROJECT_MEMORY.md."


---
## Update — Hazards (mines + tornado) · 2026-11-05
- New module `src/game/systems/hazards.js` (`WZ.Hazards`: `init(ctx, mission, seed)`, `update(dt, ctx, play, tm)`, `render(dt, tm)`, `hint()`, `arrowPos()`, `dispose()`). Imported in `index.js` after `missions.js`. Wired in `scenes/mission.js` (enter/update/render/exit, hint line, arrow kind `storm`).
- Config: `CFG.hazards.mines` and `CFG.hazards.tornado` (all numbers). Both OFF in the tutorial; mines from mission 2, tornado from mission 3.
- Mines: seeded per mission (`hash(hash(runSeed,index),911)`), 55% placed near roads, patches of 3-5 or singles; never near start/crates/extraction. Blinking red LED, proximity ping + "MINEFIELD AHEAD!" hint. Jeep hit = damage (14 + 0.8*mission, max 30), speed x0.35, hop; blast KOs enemies within 6.5 u; Nana on foot takes 14.
- Tornado: 4 s warning (siren, red ring, arrow), then drifts toward the jeep (7 u/s +0.15/mission, max 11; slower than jeep 22, escapable with boost 33). Inside radius 8: drag, pull, heading spin on the jeep; Nana takes damage; enemies are flung (KO). Lasts 18 s, then fades; next one 32-48 s later.
- `Jeep` got `hop` (visual hop on mine hit). New SFX: `mine`, `siren`, `wind`. New i18n keys: `brief.tip5/6`, `hud.mines`, `hud.tornado`, `hud.tornadoEscape`.
- Decision D-006: hazards are visible/telegraphed on purpose (LED, ping, warning, arrow) so deaths feel fair.
- **UNTESTED in a real browser** (container has no browser): verify mine placement density, tornado speed/feel, and FPS on a phone; tune in `CFG.hazards`.

### Correction (same day)
- Mines now start in **mission 1** (tutorial: 4 gentle mines, 8 damage) and the **tornado from mission 2** (first one after 14-22 s), so they are seen immediately. Mines are bigger and impossible to miss: disc + red warning post with a yellow plate + blinking lamp + pulsing red ring; a crater remains after a blast.
- Headless test: `npm run test:hazards` (Node, no browser) checks mine placement (bounds, start/crate/obstacle distance), blasts and the tornado cycle over 14 missions x 25 seeds. Last run: NO ISSUES.
- Still untested visually/FPS in a real browser.

### Fix — touch stick drift (2026-11-05)
- `systems/input.js`: the stick base used to follow the thumb once dragged past the ring, so deflection shrank and the jeep slowed. Now the origin is **fixed** where you touch, the knob is clamped visually, dead zone 6 px, and **full throttle is reached at 60% of the ring** so a creeping thumb never slows the jeep. Test: `npm run test:stick`.

---
## Update — Garage (3D shop), 3 vehicles, buyable landmines · 2026-11-05
- **Scene `shop`** (`scenes/shop.js`, reached from the menu's GARAGE button and from the mission summary; summary passes `ret` so Back resumes the run): live 3D showroom (turntable, studio lights, hold+drag to rotate, heroes seated), **3D-rendered thumbnails** per card (WebGLRenderTarget -> dataURL, cached), stat bars, BUY/EQUIP. No emoji anywhere; coin icon is SVG. Purchase logic is pure: `Shop.buyVehicle/equip/buyMines`.
- **Vehicles** (`art/vehicles_extra.js`, `WZ.Vehicles.build(id)`, `WZ.Vehicles.stats(id)`): `jeep` (free), `buggy` (600), `truck` (2500). Stats live in `CFG.vehicles` and merge over `CFG.jeep`. `entities/jeep.js` now reads `this.P` (per-vehicle) instead of the module constant; camera, enemy damage, ram (`speed * P.ram >= CFG.ram.minSpeed`), engine pitch and wheel radius use it. Models expose `bed:{z,y}` for the crate stack. Slots 4-5 (APC, Tank) are reserved in `CFG.vehicleOrder`: add a builder + a `CFG.vehicles` entry + the id in `vehicleOrder`.
- **Landmines** (`systems/landmines.js`, `WZ.Landmines`): inventory `Save.data.inv.mines` (new saves/old saves start with `CFG.shop.mines.starter` = 3). Plant with **F / M / MINE button** (behind the vehicle); each plant consumes one for good, unused ones carry to the next mission. Arms after 0.9 s, any enemy stepping on it detonates it (blast 8 u, KOs everyone inside); never hurts the jeep/Nana. Packs: 1/5/15 for 30/130/360 coins, stock cap 40 (`CFG.shop.mines`, `CFG.mine`).
- Save defaults added: `inv:{mines:3}`; `equipped.vehicle` / `owned.vehicles` already existed.
- Tests (Node, no browser): `npm run test:garage` (save defaults, 3 models' interface, prices/stats, purchases, planted mines) - NO ISSUES. The real `Jeep` entity was also driven for each vehicle (top speeds 22 / 28 / 18). Garage DOM clicks were checked in jsdom (outside the repo).
- **Untested in a real browser:** WebGL thumbnails, showroom look/FPS on phones, mine button placement. Vehicle previews were rasterised offline and looked right.
- Pending idea from earlier: swap Nana's model with the Meshy GLB (T-pose, 10.4k tris, no skeleton; plan = own 7-bone rig with the same bone names/pivots as the procedural rig so `animate()` is reused).

---
## Update — DEFENSE turret + gun nerf · 2026-11-05
- **Gun nerf:** `CFG.gun` damage 4 -> **2.3**, rate 8 -> **7** (dps ~32 -> ~16, ~30 while stopped; a grunt now takes ~5 hits, was 3). Tune in `config.js`.
- **DEFENSE** (`systems/turrets.js`, `WZ.Turrets`): press **T** or the amber DEFENSE button (cooldown sweep + `active/max` counter). A twin-barrel auto turret rises out of the ground next to the vehicle (behind first, then sides/front if blocked), tracks the nearest enemy (range 30 u, 6 shots/s, 1.7 dmg + a small knockback, ~10 dps), uses the shared tracers (`WZ.Gun._tracer`, tracer pool raised to 48), dismantles itself after 32 s (lamp green -> amber -> blinking red). Max 2 at once, 14 s recharge. Invulnerable, harmless to friends. Numbers: `CFG.turret`.
- Wiring: input `pressed.turret` (KeyT), HUD ids `btn-turret` / `turret-n`, mission enter/update/render/exit, i18n `hud.turret*` + `brief.tip9`, SFX `build` and `tshot`.
- Tests: `npm run test:turrets` (nerf, plant/cooldown/max, placement, targeting, range, lifetime, cleanup) - NO ISSUES. The model was rasterised offline (`WZ.Turrets.model()`); looks right.
- Ideas not done: sell turrets/upgrades in the Garage (more turrets, longer life, faster fire), enemies attacking turrets.
- GitHub: push from the container is impossible (no credentials); deliver as `garage-update.patch` / zip, or commit locally.

---

## Update log — Escort Tank, red-barrel explosions, coin payout fix
- **Escort Tank (new deployable, 6th item in `WZ.Weapons`, key `6`, direct shortcut `Y`)** — `src/game/systems/tanks.js` (`WZ.Tanks`). Bought in the Shop (`CFG.shop.tank`, stock `Save.data.inv.tank`, starter 1). It drives in from off-screen, follows the vehicle (or Nana while she is outside) and *covers* it: when an enemy is near the protected target the tank parks in the gap between them. Cannon = splash shells (+ `WZ.Fire.shell` blast), coax MG = rapid single-target fire, runs over small enemies. Invulnerable, limited life (`CFG.tank.life`), boosted by Defense Tech. All numbers: `CFG.tank`. HUD icon/colours: `ui.js`, `game.css`; texts: `i18n.js` (`w.tank`, `shop.tank*`, `hud.tankOn`, `hud.notank`).
- **Red barrels** — `hazards.js` `boomBarrel` now calls `WZ.Fire.explode` (`src/game/systems/fire.js`): white flash, fireball dome, shock rings, fire column, smoke plume, sparks, flying burning debris, scorch mark, burning crater, orange screen flash, new `blast` sound. The vehicle is **no longer slowed or stopped** (the old `slow` multiplier was removed). After the hit `WZ.Fire.ignite(CFG.hazards.barrels.burn)` puts flame tongues on the vehicle body (+ flames/smoke/embers) for 5 s; they die down one by one. Chained barrels explode one after another (`chainDelay`). Purely visual fire: no extra damage. Particle pools were enlarged (460 soft / 460 glow).
- **Coins on failure** — KO "loot" is now banked when a mission is **lost** too (`mission.js fail()`); crate coins were already saved on delivery. The summary shows the KO COINS row on a loss; HUD tooltip, tips and `sum.keptcoins` text updated. Nothing is burned any more.
- Load order in `src/game/index.js`: `systems/fire.js` before `hazards.js`; `systems/tanks.js` after `heli.js`.
