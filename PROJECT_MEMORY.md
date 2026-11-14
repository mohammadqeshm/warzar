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

---
## Update — bug-fix pass (weapon icon, river, HUD, result screens, PC input, pickups, shop icon)
- **Weapon button icon**: `UI.paintWeapons` no longer compares against `dataset.w` (markup default `gun` meant the icon was never painted); it uses `UI._wico`, reset in `resetHudCache`.
- **Jurassic river**: `CFG.maps.jurassic.{waterSlow,waterTurn,waterGrip,current}`; mission sets `J.wade/curX/curZ`, `Jeep.step` adds a downstream current, lowers steering and side grip while wading.
- **Result screens**: `UI.showSummary` — VICTORY (sunburst, confetti, LEVEL UP badge, 1–3 cosmetic stars from time left, counting coins) and DEFEAT (dark/smoky, FAILED stamp, reason icon, crate progress, tip). Styles at the end of `game.css`. Mission passes `timeLimit`.
- **PC input** (`systems/input.js`): mouse WHEEL = previous/next weapon, RIGHT CLICK (capture `pointerdown`) = use selected weapon, only LEFT button drives the floating stick. The stick knob is now visible for mouse users (the `.dev-keys #stick-knob` hide rule was removed).
- **Pickups**: `CFG.pickups.minFromStart` 38 → 110 (hearts/clocks are never near the start).
- **Main-menu SHOP button**: storefront icon (`SHOP_ICO`) + coin counter. **HUD**: top bar width-limited so it never runs under the pause button; compact rules for ≤640 px, ≤360 px and short landscape screens.

---

## VOLCANIC WASTELAND map (added after the Jurassic update)

Third entry in `CFG.maps.order` (`village`, `jurassic`, `volcanic`); selected from the main-menu map cards (`Save.data.settings.map = 'volcanic'`). Harder than the Jurassic map by design.

**New files** (all registered in `src/game/index.js`, load order matters):
- `world/gen_volcanic.js` - `WZ.WorldV.generate`. Two analytic LAVA RIVERS (west-east, wide; north-south, narrower, kept away from the start), carved into the terrain, basalt CAUSEWAYS (raised terrain + slab deck) wherever a trail crosses a river. `map.lava = { level, rivers, inLava(x,z), depth(x,z) 0..1, flow(x,z,out) }`, `map.navBlock` (lava cells are blocked in the nav grids -> enemies / Titans / Nana use the causeways), `map.noHazard`, `map.noTornado`.
- `art/volcanic.js` - `WZ.Volca`: ash ground splat with glowing cracks, charred trees / obsidian spires / basalt boulders / fumaroles / causeways, animated lava mesh, embers + falling ash, red sky, ash clouds, volcano with a crater glow + plume that reacts to `WZ.Volcano.alert`, black cliffs.
- `art/magma.js` - `WZ.MagmaArt` (Titan rig + pose; same rig contract as the club giant / dino).
- `systems/volcano.js` - `WZ.Volcano`: lava burning, eruptions, vents, magma pools, Titan boulders (`lob`). No-op on other maps.

**Mechanics** (all numbers in `CFG.maps.volcanic`, `CFG.volcano`, `CFG.titan`):
- LAVA: vehicle wades like the Jurassic river (slow / heavy steering / slide; `Jeep.wc` selects the liquid config) AND burns `lavaPct` of its MAX armor per second (rises with mission); Nana burns; enemies in lava are KO'd. Fail reason `lava`.
- ERUPTION: siren + rumble + redder sky/lighting (`Volcano.alert`), then molten rocks fall SLOWLY (~5-6 s) each with a pulsing red ground ring (radius = blast). Standing still gets you targeted. Fail reason `rock`.
- VENTS: cracked mounds, periodic charge-up (flashing ring) then a fire blast; driving close makes them charge earlier but always with the warning. Fail reason `vent`.
- MAGMA TITAN (`giant.js`, flag `g.titan`): slam (two fists up -> smash -> ring of magma pools), boulder lob (wind-up with boulder overhead -> ring on landing spot -> blast + magma pool; two boulders below 50% HP), magma trail under its feet. HP bar label `TITAN`.
- Tornado is disabled on this map (`map.noTornado`); mines / barrels / pits / pickups still appear. Non-tutorial missions get `spawnMul` / `hpMul`.

**Touched existing files (small, additive):** `config.js`, `world/gen.js` (dispatch), `world/navgrid.js` (optional `map.navBlock` hook), `world/worldview.js` (theme branches), `entities/jeep.js` (`wc` liquid config, default = Jurassic values), `entities/giant.js` (Titan branches), `scenes/mission.js` (lava wading, Volcano init/update/render/dispose, map tips, hint line), `systems/hazards.js` (`noTornado`), `audio.js` (`rumble`), `i18n.js`, `ui.js` (map icon + fail reasons), `game.css` (3 map cards fit on phones).

**QA:** `node tools/test-volcano-gen.cjs` (144 maps: reachability, nothing in lava, causeways). Verified in headless Chromium (SwiftShader): menu, briefing, lava damage, eruption warn + rockfall, vents, Titan slam / boulder / pools, village + Jurassic still start and run 25 s of sim without errors. NOT tested on real phones. `tools/test-hazards.cjs` already fails on the original repo (fake canvas stub, unrelated).

---
## Update: FROZEN FRONTIER map, map-select screen, bug fixes
**New map `frozen`** (`CFG.maps.frozen`, order: village, jurassic, volcanic, frozen): `world/gen_frozen.js` (`WZ.WorldF`: snowy hills, frozen lakes + glossy ice patches via `map.ice.at(x,z)` 0..1, cabin camps, pine groves, snow boulders, ice spikes; crates/extract never on ice), `art/frozen.js` (`WZ.Froze` scenery/sky/ice meshes/snowstorm, `WZ.FrostArt` Ice Beast rig+pose), `systems/frost.js` (`WZ.Ice`: surface(), wave(), patch(), aim()/aimOff() charge lane, snowstorm gusts, hints). Guardian = **Ice Beast** (`CFG.beast`, branch `g.beast` in `entities/giant.js`: charge wind-up lane -> dash -> slam -> ice wave + slippery patch). Ice effect on the vehicle: `Jeep.ice` (set by the mission each step) scales grip/steer/accel/brake/coast with `CFG.maps.frozen.ice*`. Fail reasons added: `wave`, `beast`.
**Map selection**: main menu shows a map chip; `UI.showMapSelect` = horizontal snap carousel; `scenes/mapview.js` (`WZ.MapPreview`) renders REAL 3D map shots + transparent guardian portraits off-screen (lazy, one per tick, cached); `scenes/menu.js` now rebuilds the 3D scene behind the menu for the selected theme (`Menu.pick`, `World.backdrop(seed, theme)`).
**Fixes**: (1) guardians return to their crate post: `Giants._homeWatch` (watchdog; teleports home only while unseen) + faster return; (2) right-click weapon works while the left button is held (chorded buttons arrive as `pointermove`/`mousedown`, see `systems/input.js`); (3) result popups fit the screen, buttons pinned (css block "RESULT POPUP FIT"); (4) vehicle ram kills pay `economy.kill.ramMul` x loot (code previously paid the same per kill; ramMul=10 is a balance value in config.js).
**QA**: `node tools/test-frozen-gen.cjs` (144 maps: reachability, nothing on ice). Verified in headless Chromium: menu, map select (4 maps, portrait + landscape), frozen mission (ice slide, beast charge/wave), win/fail popups, guardian return-home on all 4 maps, chorded right-click. Not tested on real phones.

---
## Update: SUNKEN HARBOR map + HARBOR MECH guardian
**New map `harbor`** (`CFG.maps.order`: village, jurassic, volcanic, frozen, harbor; `CFG.maps.harbor`, `CFG.harbor`, `CFG.mech`, `CFG.mechStats`).
- `world/gen_harbor.js` (`WZ.WorldH`): the SEA is east of a straight quay; it is walled off with invisible collider boxes (`kind:'sea'`, curbs are drawn on them), so nobody can drive/spawn into it. Piers stick out into the sea; every pier has two half-width BROKEN SECTIONS (`map.holes`, alternating sides = chicane) and sometimes a full cut (unreachable dead-end tip). Holes are NOT colliders (the only way into the water) and are blocked for AI through `map.navBlock`. `map.inHole(x,z,margin)`, `map.waterDist(x,z)`. Container YARDS (`map.stacks`, `map.blocks`, `map.lanes`; lanes 9.4 / 9.0 / 7.4 u, some segments PLUGGED => dead ends), DEPOTS (sheds, fuel tanks, loose containers, a beached ship), STS gantry cranes + sunken ships (decor). `map.noHazard` keeps mines/barrels/pits/pickups out of the yards and away from the water. `map.cranes[i] = {x,z, hx,hz (home pad), hhw,hhd, slot}`; `slot` (a lane segment) is chosen AFTER the objectives (never near start / crates / extraction).
- `art/harbor.js` (`WZ.Harbo`): baked ground, corrugated container stacks (chunked), sheds/tanks/gantries, curbs, broken-deck rims (hazard stripes, barricades, amber beacons), ships, animated sea, sky/hills/clouds, container-wall border, and `Harbo.crane(map, c, parent)` = the tower-crane rig (`setLoad(x,y,z,yaw)` drives jib/trolley/cable). `art/mech.js` (`WZ.MechArt.rig/pose`): the Harbor Mech rig (same contract as the other guardians).
- `systems/harbor.js` (`WZ.Harbor`, no-op on other maps): SEA FALLS (vehicle -`fall.pct` of max armor then put back on the deck with a grace period, Nana -HP, enemies KO'd; fail reason `sea`), TOWER CRANES (state machine idle > pick > lift > carry > lower > hold > raise > back > set; telegraph = flashing beacon + hatched red slot rectangle + siren/beeps; the load hovers until the vehicle/Nana/guardian is clear, enemies under it are crushed; the container is a DYNAMIC collider), MECH AI + weapons.
- `WZ.Collision` got an optional `col.dyn` list (axis-aligned dynamic boxes `{x,z,hw,hd,on}`) used by `resolve()` / `free()`; empty on every other map.
- HARBOR MECH (`g.mech`, state in `g.M`, hooks in `entities/giant.js`): CANNON (laser lane + ring telegraph, locks 0.4 s before the shot, flat shell stopped by containers; line of sight = `Harbor.lineClear` over `col.free`), MISSILES (arc over containers onto red rings), COVER (walks behind a container, crouches, flushes the player out with missiles; `Harbor.mechArmor` cuts direct fire - gun/turret/heli/pan/tank - to `CFG.mech.cover.armor` while hidden; bombs/jet/mines/barrels hit full), STOMP (ring telegraph, kills Nana in reach). Fail reasons added: `sea`, `shell`, `missile`, `mech`.
- Touched existing files (small, additive): `config.js`, `index.js`, `world/gen.js` (dispatch), `world/collision.js` (`dyn`), `world/worldview.js` (theme branches), `entities/giant.js` (mech branches), `scenes/mission.js` (init/update/render/dispose/hint/tips), `ui.js` (map icon, difficulty, fail reasons), `scenes/mapview.js` (portrait rim), `game.css`, `i18n.js`.
- QA: `node tools/test-harbor-gen.cjs` (144 maps: reachability, objectives away from water/holes, sea walled, holes open, cranes with jobs). Verified in headless Chromium (SwiftShader): briefing + play, fall into a hole, crane job (carry/lower/collider), mech aim/pods/go/cover cycle, map-select card with 3D preview + mech portrait, all 5 maps start without errors. NOT tested on real phones.

---
## Update: HERO REDESIGN (Commander + Nana, from the character sheet)
Visual-only change; the rig API (`rig.root/bodyG/torso/head/legL/legR/armL/armR`, `setMode`, `punch`, `flash`, `swing`, `rig.rifle` (commander), `rig.pan` (Nana)), animation keys and all callers (jeep, nana.js, menu, shop, mapview) are unchanged.
- `art/heroes.js`: bigger square head block (`HW/HH/HD`), face = decal plane (`addFace/mountFace`) + small 3D nose; chunkier bodies (plate carrier with pouch grid + ID panel, camo shoulders/sleeves with bare forearm + black wrist band + fingerless gloves, knee pads, cargo pockets, thigh holster, boots with cuff + sole); big comms headsets on both; **Commander**: flared boxy patrol cap with 3-chevron emblem (also on the vest back), mic boom, new M4-style rifle; **Nana**: big dome helmet with NANA stencil, smiley sticker and ace-of-spades patch on her left side, hair, **ponytail** (`rig.tail`, swings with the head and streams back when running), colourful back patches, smiley chest badge. Root scale 0.85 -> 0.82 (bigger heads keep the same overall height). Pan anchor now uses `HAND_Y`.
- `art/textures.js`: new keys `camoCmdr`, `camoNana` (finer black/brown/tan digital camo, 20x20 cells), `cmdrEmblem`, `faceCmdr` (angry), `faceNana` (goofy: tongue, buck teeth, band-aid); `nanaDecals` repainted (same UV layout). Old `camoGreen/camoDark/chevron/smiley` untouched (jeep, menu helmet etc. still use them).
- `main.js`: the new texture keys were added to the preload list `TEX`.
- Thin rboxes stretch camo UVs: pass `uv:[1, h]` for tall/thin parts (see the cap).
- QA: rendered both heroes front / 3-4 / back / head close-ups in headless Chromium (SwiftShader) with a throw-away harness (not committed); `node tools/test-garage.cjs` passes. `tools/test-combat.cjs` and `tools/test-turrets.cjs` already failed before this change (they do not load `WZ.Volcano` / `WZ.Save`). NOT tested on real phones.

## Update — dynamic Health & Time pickups (WZ.Pickups redesign)
- **Replaced** the old "scatter a few hearts/clocks at mission start" logic in `systems/pickups.js`. Pickups are now generated DURING the mission. Public API unchanged (`init / update / render / arrows / dispose`); new: `stop()` (called by `Mission.complete/fail`), `status()`, `debugLine()`, `pickReward()`.
- **Budget** (per kind, per mission) = the displayed mission level = `mission.index` (HUD "LEVEL n" and briefing both print `data.index`). `CFG.pickups.budget(level)`; no cap. A pickup consumes budget only when it is actually placed; failed placements cost nothing and are retried (`CFG.pickups.retry`, back-off, capped).
- **Heart**: eligible while armor <= 50 % of max (never at full armor), heals 40 % of MAX armor (unchanged), max 1 active, cooldown 12 s. **Clock**: eligible while timer <= 60 s, "urgent" at <= 30 s (shorter start delay / cooldown / retry, nearer placement); reward drawn from `CFG.pickups.time.rewards` (+20/+35/+60, weights 50/35/15, editable). The n-th clock's reward is a pure function of (mission seed, n); positions come from per-kind seeded `WZ.RNG` streams.
- **Placement** (`Pickups.validate / hazard / findSpot`): bounds, static flood-fill reachability (computed once) + live `NavGrid.path` from the vehicle (max path length, limited by the time left for clocks), `map.noHazard` / `navBlock` / water / lava / slope ring, `col.free` (incl. dynamic harbor containers), harbor crane slots + home pads (cranes themselves untouched), distance to jeep / Nana / start / crates / extraction / other pickups, and mines, barrels, pits, vents, magma pools, rocks, tornado, explosions + ground fire, player mines, turrets, enemies, guardians. At most `place.samples` cheap checks and `place.pathChecks` A* runs per attempt; attempts only happen when a pickup is due.
- **Pooling**: pickup world objects are created lazily, reused, share geometry/materials; a small "+20s / +40%" label shows the reward. Spawn notice + arrows (range 400) tell the player where it is. New event `pickup:collect {type, amount}`; new i18n keys `hud.pk.spawnHeal/Time`.
- **Lifecycle**: `update(dt)` only runs in the mission 'play' phase with the fixed step => nothing advances while paused / briefing / ended. The tutorial mission stays pickup-free (`CFG.pickups.inTutorial=false`).
- `mission.js` changes: `M.ctx.timeLeft` getter, `WZ.Pickups.stop()` in `complete()/fail()`, pickup line in the debug overlay. `?pkdebug=1` logs spawns/failures to the console.
- Tests: `node tools/test-pickups.cjs [--quick]` (headless; budgets, eligibility, rewards, cooldowns, failures, restart, determinism, pooling, five-map placement, harbor cranes).

---

## Seasons & Levels update (latest)
- **Structure:** every map is a *season* (order = `CFG.maps.order`); every season has **10 levels**; **level N has N crates** (level 1 = 1 crate, level 10 = 10). Clearing level 10 unlocks the next season (which starts again at level 1). Locked seasons/levels show padlocks and cannot be selected.
- **Difficulty:** `mission.index` is now the *difficulty number* = `level + CFG.progress.seasonBoost * seasonIndex` (every level is tougher; every season starts harder than the last). `mission.level` (1..10) is the displayed level and the crate count. Guardians per mission: `CFG.calc.giantCount` (grows with the level, max `CFG.progress.maxGiants`). Timer: `CFG.timer`.
- **Code:** `src/game/progress.js` (`WZ.Progress`: unlock rules, `complete()`, `nextAfterWin()`, `sanitize()`, `presentResult()`), save keys `prog` (stars per level), `lvlSel` (level START launches), `progV: 2` (old single-counter saves are migrated into season 1). `WZ.World.generate(seed, index, {tutorial, theme, crates})` takes the exact crate count. Mission scene data is now `{ theme, level, runSeed, runCoins }`.
- **Map select UI:** mouse drag (desktop), LEFT/RIGHT buttons + arrow keys, swipe on touch; per-card **SELECT MAP** button (or click the card); level nodes on each card pick the level.
- **Shop bug fix:** the results screen is plain data (`Main.lastResult`, `Progress.presentResult`); BACK in the shop returns to the same results screen (menu scene, `Main.go('menu', {result})`) instead of starting a mission.
- **QA:** `?unlock=1` opens all seasons/levels (not saved). Tests: `node tools/test-progress.cjs`, `node tools/test-levels-gen.cjs`.

---

## Update — Season Unlock Surprise Ceremony, Opaque Grayscale Locked Cards, and Guardian-per-Crate Fix
- **Season Unlock Surprise in Seasons Screen (`save.js`, `progress.js`, `scenes/menu.js`, `ui.js`, `i18n.js`, `game.css`):**
  - Clearing level 10 of a season sets `Save.data.flags.pendingUnlock = unlockedSeason`.
  - Proceeding from the level 10 victory summary (`UNLOCK SEASON` / `NEXT SEASON` or `MAIN MENU`, including after visiting the Shop) transitions to the **Seasons screen** (`Main.go('menu', { maps: true, unlockSeason, fromTheme })`).
  - `UI.showMapSelect` initially displays the newly unlocked season card in its locked grayscale state (`fakeLocked`), glides the carousel from the completed season to the locked new season, plays a surprise banner + golden padlock rattle + shackle pop-open + shockwave/confetti reveal, awakens the card into full color, selects Level 1, and switches the 3D menu backdrop to the new season.
- **Opaque Monochrome Locked Season Cards (`game.css`):**
  - `.ms-card` and `.ms-card.locked` now have `opacity: 1` and solid opaque dark backgrounds so the 3D scene behind the carousel never bleeds through. Locked cards remain strictly grayscale/black-and-white (`--mc: #8A8E96`, `filter: grayscale(1)`) with a high-contrast padlock overlay.
- **Every Crate Guarded (`config.js`, `entities/giant.js`, `tools/test-progress.cjs`, `tools/test-levels-gen.cjs`):**
  - Restored `CFG.progress.maxGiants = 10` and `CFG.calc.giantCount = (lvl, crates) => Math.max(1, Math.min(crates, CFG.progress.maxGiants))` so every crate in every level (1..10) has a guardian next to it (`Math.ceil(lvl * 0.6)` previously left 1–4 crates unguarded on levels 3–10).
  - Improved guardian placement in `Giants.init` with line-of-sight (`nav.los`) and a deterministic ring/nearestFree fallback so guardians never spawn inside obstacles or across container walls.
