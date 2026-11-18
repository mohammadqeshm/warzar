# WARZAR: Crate Rush

<p align="center">
  <strong>A tiny commander. A very big mess.</strong><br />
  A mobile-first 3D arcade game about driving, daring rescues, and getting the cargo out alive.
</p>

> **Project status:** Active development · Pre-release  
> **Target platforms:** YouTube Playables · Playgama  
> **Game type:** 3D arcade action · Procedural missions · Single-player  
> **Build targets:** Standalone `dist/index.html` · Playgama upload in `dist-playgama/`

---

## The game

You are the commander. You drive an off-road vehicle through a hostile, procedurally generated battlefield. Your companion, **Nana**, jumps out with her trusty frying pan to retrieve supply crates while enemies close in.

Your job is to keep moving, manage the danger, protect Nana, collect the cargo, and make it to extraction before the clock runs out.

Every crate is a decision: where to go, when to deploy Nana, how long to stay, and whether you have enough firepower and equipment to survive the trip.

**Drive fast. Think ahead. Protect Nana. Get the crates home.**

## Gameplay

The core experience is built around short missions with escalating pressure:

1. **Explore** a procedurally generated map and locate supply crates.
2. **Drive and survive** while enemies pursue the vehicle and Nana.
3. **Deploy Nana** to collect cargo, then protect her while she is exposed.
4. **Use your equipment** — vehicle weapons, defensive turrets, and landmines — to control the battlefield.
5. **Extract** before the timer expires.
6. **Earn coins and progress** toward new regions and equipment upgrades.

### Current gameplay systems

The project is under active development. The repository currently includes systems such as:

- Procedurally generated 3D environments and mission layouts.
- Arcade-style vehicle driving, drifting, boosting, and collision handling.
- Mobile touch controls and desktop keyboard controls.
- Nana's deploy, crate-pickup, return, boarding, damage, and recovery states.
- Enemy spawning, pursuit, combat, and mission-based difficulty scaling.
- An automatic vehicle roof gun.
- Deployable defensive turrets and heavy defensive equipment.
- Player-planted landmines.
- Environmental hazards, including tornado events.
- Mission timer, extraction objectives, rewards, and a garage/shop.
- Scout Jeep gameplay, with selectable and upgradeable defense equipment.
- Persistent level and equipment progress via Bridge in the Playgama profile, with an offline save adapter for standalone.
- Background music, compressed action/interface sounds, and performance-aware rendering.

Features evolve as development continues. See [Project status](#project-status) and [PROJECT_MEMORY.md](PROJECT_MEMORY.md) before assuming a planned feature is already implemented.

## Design goals

WARZAR is being designed for the realities of browser-based playable games:

- **Fast to understand:** The player should understand the objective almost immediately.
- **Mobile first:** Touch controls and small-screen readability are primary design constraints.
- **Short, replayable sessions:** Missions should be easy to start and satisfying to replay.
- **Skill plus strategy:** Driving, positioning, timing, and equipment choices should matter.
- **Fair difficulty:** Threats should be readable and avoid unavoidable damage or surprise failures.
- **Distinct gameplay roles:** New enemies and equipment should add decisions, not just bigger health bars.
- **Stylized and family-friendly:** Combat feedback stays playful and non-graphic.
- **Performance-conscious:** The game should remain responsive on mid-range mobile devices.
- **Lightweight delivery:** The standalone build embeds all game assets. Playgama ships the same licensed MP3s as loose assets.

This is an arcade game, not a realistic military simulator. The goal is readable action, strong game feel, and meaningful decisions without complicated controls.

## Target platforms

### YouTube Playables

YouTube Playables is a primary distribution target. The game is being built as a browser-based playable experience, with mobile usability, quick loading, and short-session gameplay as core requirements.

### Playgama

The Playgama build packages the local Bridge SDK/config beside the game. It reads the host's sound and pause states on startup and listens for changes. The speaker button in the menu and the Sound control in the pause panel update a separate saved preference; the player cannot override host mute. Opening another tab or backgrounding the game suspends audio and simulation. Returning restores the same run unless the player had manually paused. The overall toggle is not shown when the Bridge identifies YouTube Playables, which has its own mute controls. The equipment Shop has no rewarded offer. The opt-in coin reward is still available in mission results when the host supports it.

**Important:** Running the game locally in a browser does not mean platform integration or submission is complete. Platform SDK/Bridge, storage, ads, lifecycle events, monetization, and submission requirements must be checked against the latest official documentation and tested in the target platform environment before release. Do not assume these integrations are finished.

## Controls

The game supports touch and keyboard input.

| Action | Keyboard |
|---|---|
| Drive | WASD / Arrow keys |
| Deploy / recall Nana | Space |
| Boost | Shift |
| Pause / resume | P |
| Place a landmine | F / M |
| Deploy defense | T |
| Debug overlay (dev / QA only) | F3 / Backquote |

On touch devices, use the on-screen driving stick and action buttons. Button availability can depend on the current game state and equipment.

## Technology

| Area | Technology |
|---|---|
| Application shell | React + TypeScript |
| Build tool | Vite |
| 3D engine | Three.js |
| Game implementation | JavaScript ES2020, modular IIFE modules |
| Game namespace | `window.WZ` |
| Rendering | WebGL |
| Audio | 44.1 kHz VBR MP3 assets; Web Audio sample playback and mixing, no runtime synthesis |
| World and art | Procedural geometry and generated textures |
| Persistence | Versioned, batched Bridge storage (Playgama) or local adapter (standalone) |
| Production output | Vite; `vite-plugin-singlefile` for standalone only |

The game systems share the `window.WZ` namespace. Modules are loaded through an ordered manifest, so **module load order is significant**. Gameplay and balance values are centralized in `src/game/config.js`.

## Getting started

### Requirements

- Node.js (use a current LTS release).
- npm.
- Git.

### Install

```bash
git clone https://github.com/mohammadqeshm/warzar.git
cd warzar
npm ci
```

### Run locally

```bash
npm run dev
```

Vite will print the local development URL in the terminal.

### Create a production build

```bash
npm run build
```

The production output is generated in:

```text
dist/index.html
```

The standalone `index.html` embeds the game code, styles, art and MP3 bank. It runs without loose audio files. The existing optional host Bridge loader is unchanged for this target.

### Package for Playgama

```bash
npm ci
npm run build:playgama
python3 tools/package-playgama.py /tmp/warzar-playgama.zip --extract /tmp/warzar-playgama-extracted
```

Upload the generated **game ZIP**, not the source or media ZIP. Its root has `index.html`, the unmodified local Bridge 2.4.3, the adjacent config, and the `assets/` and `audio/` folders. The SDK finishes initialization before any engine requests. Startup waits for one Bridge read before the first playable frame; there is no game-owned browser storage in this profile. `--extract` is optional and needs an empty directory. See the [numbered release audit](docs/PLAYGAMA-AUDIT.md), [QA evidence](docs/PLAYGAMA-QA.md) and [listing copy](docs/PLAYGAMA-LISTING.md). To test the extracted upload locally, serve its directory over HTTP (for example `python3 -m http.server 8000 --bind 127.0.0.1`), not by double-clicking `index.html`. Complete **Test Game** in the dashboard with the upload archive before submission.

### Audio assets and verification

`src/game/audio-playgama/` contains the 88 licensed MP3s used by `npm run dev` and both production builds. Menu music, mission music, engine, wind and effects are byte-identical across builds; only asset delivery differs. See [sources, changes and licenses](docs/PLAYGAMA-AUDIO.md). `src/game/audio/` preserves the original 87 offline-rendered MP3s in source only, not in either current build. The runtime only plays and mixes samples.

```bash
node tools/test-audio.cjs
node tools/test-audio.cjs --legacy # optional archival bank check
node tools/test-i18n.cjs
npx tsc --noEmit
```

`tools/render-audio.cjs` is an offline renderer for the archival bank. It needs FFmpeg/FFprobe and Playwright Chromium; if working without Git history, pass a copy of the historical `audio.js` recorded in its manifest. It is never run by or included in either production build. Browser test commands, extracted-ZIP fixtures and limitations are in the QA report above.

To preview the default production build locally:

```bash
npm run preview
```

## Project structure

A simplified guide to the codebase:

```text
warzar/
├── index.html
├── package.json
├── vite.config.ts
├── AGENTS.md
├── PROJECT_MEMORY.md
├── LICENSES.txt
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── index.css
    └── game/
        ├── index.js          # Ordered game-module manifest
        ├── config.js         # Gameplay and balance configuration
        ├── main.js           # Game lifecycle and main loop
        ├── platform.js       # Platform adapter boundary
        ├── save.js           # Versioned save system
        ├── ui.js             # Menus, HUD, overlays
        ├── game.css
        ├── art/              # Procedural models, textures, visual effects
        ├── world/            # World generation, navigation, collision
        ├── systems/          # Input, combat, spawning, hazards, defenses
        ├── entities/         # Vehicle, Nana, enemies, crates
        └── scenes/           # Menu, mission, garage/shop
```

The tree above is an orientation guide, not an exhaustive listing. Check the current repository for the exact files and modules.

## Development guidelines

This project uses AI-assisted development, but code quality and correctness remain the responsibility of the project owner and contributors.

Before making changes:

1. Read [AGENTS.md](AGENTS.md) for the coding-agent rules and required workflow.
2. Read [PROJECT_MEMORY.md](PROJECT_MEMORY.md) for architecture, module contracts, decisions, milestone history, and handoff notes.
3. Inspect the current source code. Documentation can become outdated; the code and verified tests are authoritative.
4. Work only on the requested task. Avoid unrelated refactors and speculative features.
5. Keep gameplay balance values in `src/game/config.js`.
6. Preserve the ordered module manifest, `window.WZ` contracts, and existing save compatibility unless the task explicitly requires a coordinated change.
7. Review the complete diff before accepting or merging AI-generated changes.
8. Run the build and relevant tests. Report exactly what was tested; never claim that unrun tests passed.

### Performance and compatibility

- Prioritize touch devices and mobile browser performance.
- Avoid unnecessary dependencies and large runtime assets.
- Do not add external CDNs, runtime asset downloads, tracking, or analytics without explicit approval.
- Avoid expensive allocations in per-frame update loops.
- Reuse geometry, materials, pools, and instancing where appropriate.
- Dispose of scene resources correctly when leaving scenes.
- Test portrait and landscape layouts, touch input, pause/resume, and scene transitions when gameplay or UI changes.
- Verify the final packaged build, not only the development server.

### Platform integrations

All platform-specific functionality should remain isolated behind the platform adapter (currently `WZ.Platform`). Verify SDK APIs and requirements from official documentation before implementation. Never guess method names, event names, ad callbacks, or storage interfaces.

Ads, if introduced, must respect platform policies and player experience. Rewarded ads should be optional and user-initiated, and rewards must only be granted after the platform confirms completion.

## Project status

WARZAR is **not yet presented as a finished or released game**. Development is ongoing.

The codebase already contains a playable gameplay foundation and a growing set of mission, combat, hazard, vehicle, and defense systems. Further work is required for balancing, real-device QA, platform-specific integration, release preparation, and any remaining planned progression/content systems.

For the latest verified milestone, known issues, test notes, and next steps, consult [PROJECT_MEMORY.md](PROJECT_MEMORY.md). Do not treat roadmap items or old handoff notes as proof that a feature is complete.

## Roadmap direction

The broader direction is to develop WARZAR into a polished, replayable playable-game release through focused milestones:

- Improve the core mission loop, pacing, clarity, and difficulty balance.
- Expand enemy behaviors, mission variety, and meaningful tactical choices.
- Deepen vehicle, equipment, and progression systems.
- Improve onboarding, feedback, audio, and mobile usability.
- Complete and verify platform integrations.
- Perform device and platform QA, optimize loading/performance, and prepare submissions.

This is a direction, not a promise that every item is already implemented or scheduled.

## Contributing

This repository is currently owner-led. If you are an AI coding agent or contributor, follow [AGENTS.md](AGENTS.md) before editing the project.

For substantial changes, provide:
- A short implementation plan.
- The files changed and why.
- Build/test commands actually run and their results.
- A manual QA checklist for gameplay or UI changes.
- Known limitations and follow-up work.

Do not commit, push, force-push, or rewrite shared Git history unless the repository owner explicitly asks you to do so.

## License

See [LICENSES.txt](LICENSES.txt) for third-party license notices. No separate open-source license is declared here for the WARZAR project itself. Do not assume the project is open source or that its original assets/code may be reused without permission.


## Recent changes
- New purchasable **Escort Tank** (Shop > Defense): rolls in, follows and covers the vehicle/Nana, shells groups, rakes single targets.
- Red barrels now explode with a big fireball + debris + shockwave, never slow the vehicle, and leave it burning for ~5 s.
- KO coins are always paid out when a mission ends, including a failed one, so a lost run can never leave the player unable to afford upgrades.


## Map: Sunken Harbor
A derelict military port: container yards with narrow lanes (some plugged = dead ends), broken pier decks you can fall off (splash = big armor loss), tower cranes that swing containers across lanes (telegraphed, temporary), and the **Harbor Mech** guardian (cannon with a laser-lane telegraph, arcing missiles, takes cover behind containers). See `PROJECT_MEMORY.md` for details. Generator test: `node tools/test-harbor-gen.cjs`.
