# AGENTS.md — WARZAR: Crate Rush

This file is the entry point for every AI coding agent working in this repository. Read it before inspecting or changing code. It explains the product, target platforms, design intent, technical constraints, and rules for safe collaboration.

For detailed implementation history and handoff notes, also read `PROJECT_MEMORY.md`. The code currently in the repository is the final authority when documentation and implementation disagree. If you discover a mismatch, report it and update the relevant documentation as part of the requested task; do not silently assume either source is correct.

---

## 1. Product vision

**WARZAR: Crate Rush** is a compact, replayable 3D arcade action game for browser-based game platforms, with **YouTube Playables** and **Playgama** as primary target distribution platforms.

The game should be:
- Instantly understandable and fun within the first few seconds.
- Designed primarily for mobile touch controls, while remaining playable on desktop with keyboard controls.
- Lightweight, fast-loading, responsive, and stable on mid-range phones.
- Family-friendly, visually readable, colorful/stylized, and free of graphic violence.
- Built around short, replayable missions, escalating pressure, meaningful upgrades, and a satisfying progression loop.
- Suitable for embedding and distribution inside third-party playable-game platforms.

This is not intended to be a large realistic military simulator. It is an accessible arcade game with tactical decisions, readable threats, expressive characters, and strong moment-to-moment feedback.

## 2. Core fantasy and gameplay

The player controls a commander driving an off-road combat vehicle. **Nana**, a small brave companion who uses a frying pan, can leave the vehicle to retrieve supply crates. When Nana is outside, the battlefield becomes more dangerous: enemies are drawn toward her and the player must protect her until she returns safely.

The intended mission loop is:

1. **Approach and scout:** Drive through a procedurally generated hostile area while managing the mission timer and environmental threats.
2. **Prepare:** Choose a useful position, manage limited defensive equipment, and decide whether to place mines or deploy defensive units.
3. **Deploy Nana:** Send Nana to retrieve the supply crate. Her exposure creates a clear period of increased danger.
4. **Defend:** Use the vehicle weapon, positioning, mines, and deployed defenses to keep enemies away from Nana.
5. **Recover and extract:** Get Nana and the collected cargo back to safety, then reach the extraction area before time runs out.
6. **Earn rewards and improve:** Receive coins and progression rewards based on mission completion and performance; spend them on vehicles, equipment, and upgrades.

The player should feel pressure before deploying Nana. The best strategy should involve reading the area and preparing, not simply pressing Deploy while the vehicle gun automatically solves every threat.

### Important design principles

- Nana must be meaningfully vulnerable while outside the vehicle. Damage, recovery, and failure rules must be clear and fair.
- Enemies must create different kinds of pressure. Do not make every enemy a copy with only more health.
- The vehicle gun must be useful but must not make defensive equipment irrelevant.
- Defensive equipment must have meaningful constraints: inventory, capacity, cooldown, lifetime, range, targeting, or placement trade-offs.
- Mines, tornadoes, the timer, enemy pressure, and vehicle handling should interact to create decisions—not random unavoidable deaths.
- Hazards must be telegraphed. Give the player readable warning signs and a reasonable chance to react.
- Difficulty should rise through enemy composition, spawn pressure, mission objectives, map/hazard combinations, and time pressure—not only by multiplying enemy HP.
- Avoid making a mission unwinnable because of one unavoidable spawn, an invisible mine, or an unclear mechanic.
- A skilled player should be able to succeed with good driving and combat decisions, but preparation and upgrades should make difficult missions more manageable.
- Keep the controls simple enough for one-thumb mobile play wherever possible.

## 3. Enemies, threats, and defensive gameplay

The design can evolve, but keep these roles distinct when implementing or balancing enemies:

- **Basic / Scout enemies:** fast, fragile, and dangerous mainly because they can reach Nana quickly.
- **Assault enemies:** general-purpose attackers that can pressure the vehicle and Nana.
- **Heavy enemies:** slower, tougher threats that challenge the vehicle gun and reward focused fire or stronger defenses.
- **Special enemies:** future roles may include runners, brutes, bombers, enemy vehicles, turrets, drones, or bosses. Each must introduce a distinct tactical problem.

Defensive systems may include:
- The vehicle's automatic roof gun.
- Temporary deployable defense turrets.
- Heavy/cannon-style defensive units.
- Player-planted landmines.
- Future anti-air or specialized defenses if the game design needs them.

Do not assume every planned defense type already exists. Inspect the current implementation before extending it. In particular, distinguish between **player inventory items** (which are consumed when used) and **temporary deployables** (which may have a lifetime and cooldown).

The desired long-term gameplay includes meaningful preparation around a drop zone: the player should be able to choose where and when to deploy defenses, then protect Nana during the pickup. If current placement mechanics only deploy defenses near the vehicle, do not claim free-placement exists; treat more deliberate placement as a design direction requiring a scoped implementation task.

## 4. Progression and economy

The game should support a persistent progression loop:
- Mission progression and unlocks.
- Coins earned through mission outcomes and player performance.
- Vehicle ownership and equipment.
- Upgrade levels that create understandable, meaningful differences.
- Consumable inventories such as mines and defensive units.
- Longer-term goals such as achievements, daily rewards, and challenges, when implemented and properly integrated.

Reward design should encourage completing missions. Avoid creating an exploit where endlessly farming easy enemies is more profitable than completing objectives. Rewards should be understandable and consistently shown in the mission result UI.

Vehicles should have distinct play styles, not just different skins. For example, a fast/light vehicle may trade durability for mobility, while a heavy vehicle may trade speed and handling for survivability. Upgrades should create choices; do not make every upgrade a simple damage multiplier.

**Do not invent final economy values.** Balance values belong in `src/game/config.js` and must be tuned against actual gameplay and mission duration. If asked to balance the game, inspect the current formulas and relevant systems first, propose values with reasoning, and test the effect.

## 5. Target platforms and release expectations

Primary targets:
1. **YouTube Playables**
2. **Playgama**

The game is currently a web game. Platform-specific integration is a separate release concern; do not pretend it is complete just because the game runs in a browser.

For platform work:
- Check the current official documentation for the exact platform SDK/Bridge, lifecycle, storage, ads, and submission requirements.
- Never invent SDK globals, method names, event names, callbacks, or configuration files.
- Keep platform-specific calls behind `WZ.Platform` (or a clearly isolated platform adapter) rather than spreading SDK calls throughout gameplay code.
- Preserve a local browser/mock mode so development remains possible without the platform SDK.
- Handle pause/resume and visibility changes correctly. The game must not continue simulating or playing audio while hidden or paused.
- Signal game readiness only at the correct point according to the official platform documentation.
- Use platform storage when required/available, while keeping the save interface stable.
- Ads must follow the platform's current policies. Rewarded ads should be optional and user-initiated; never promise rewards before a successful callback. Interstitials must not interrupt active gameplay or violate platform rules.
- Do not add analytics, remote configuration, external scripts, CDNs, web fonts, or network dependencies unless explicitly approved and justified.
- Test the actual packaged build in the target platform environment; a local browser test is not proof of platform compliance.

Platform APIs, technical requirements, monetization rules, and file-size limits can change. Verify current official documentation before making release claims or implementing integrations.

## 6. Technical architecture — preserve it

The current project uses:
- Vite as the build tool.
- React/TypeScript as a small host shell.
- Three.js for 3D rendering.
- Plain JavaScript ES modules at the Vite entry/build level, with game modules implemented as classic IIFE modules sharing the `window.WZ` namespace.
- An ordered game-module manifest at `src/game/index.js`. **Load order matters.**
- `src/game/config.js` as the authoritative home for gameplay and balance values.
- `WZ.Platform` as the platform integration boundary.
- `WZ.Save` as the save-system interface.
- Procedural low-poly art and generated textures, with an asset abstraction layer.
- A fixed-step simulation and performance-conscious rendering.
- A single-file production build: the intended distributable is `dist/index.html`.

Important files:
- `src/game/index.js`: ordered module manifest; preserve dependency order.
- `src/game/config.js`: gameplay constants, formulas, vehicle stats, enemy scaling, equipment, and economy values.
- `src/game/platform.js`: platform adapter and local mock.
- `src/game/save.js`: versioned persistence and save/load behavior.
- `src/game/scenes/mission.js`: mission lifecycle and gameplay orchestration.
- `src/game/systems/`: gameplay systems such as input, enemies, spawning, hazards, turrets, missions, quality, and combat.
- `src/game/entities/`: gameplay entities such as jeep, Nana, enemies, and crates.
- `src/game/scenes/shop.js`: garage/shop flow, if present in the current branch.
- `src/game/ui.js` and `src/game/game.css`: HUD, menus, overlays, and styling.
- `src/game/main.js`: application/game lifecycle.
- `PROJECT_MEMORY.md`: detailed file map, contracts, decisions, milestone notes, and handoff history.

### Build constraints

- Use the existing project setup. Do not replace the engine, migrate frameworks, or restructure the architecture for preference alone.
- Do not edit `package.json`, `package-lock.json`, `vite.config.ts`, or the build pipeline unless the task explicitly requires it and the reason is explained.
- The production build must remain self-contained in `dist/index.html`, unless the owner explicitly approves a different delivery format.
- Keep dependencies bundled locally. No runtime CDN or external asset fetches.
- Do not add large libraries for small features.
- Preserve mobile performance and the single-file delivery goal.
- Do not introduce per-frame allocations, unbounded object creation, or avoidable draw calls in hot loops.
- Reuse pools and instancing where appropriate; dispose of scene resources when scenes exit.
- Respect the existing coordinate conventions, simulation timing, collision model, and RNG/seed design. Inspect implementation before changing them.

## 7. Non-negotiable rules for AI coding agents

1. **Read this file and `PROJECT_MEMORY.md` before making changes.** Inspect the relevant source files too.
2. Work only on the task explicitly requested. Do not start extra milestones, redesign unrelated systems, or add speculative features.
3. Do not rewrite working systems just because a different implementation is preferred.
4. Make the smallest coherent change that solves the requested problem.
5. Keep changes modular and consistent with existing naming, architecture, and code style.
6. Keep balance numbers and formulas centralized in `src/game/config.js`; do not scatter magic numbers across systems.
7. Preserve existing public contracts: `WZ` namespaces, event names/payloads, entity interfaces, save schema, and module load order unless a deliberate migration is part of the task.
8. Before changing a contract, search for all callers and update every affected caller in the same task.
9. Do not silently delete, rename, or overwrite existing features, files, user data, or configuration.
10. Do not add placeholders, fake implementations, dead buttons, TODO-only features, or claims that an integration works when it is only mocked.
11. Do not invent platform SDK APIs. Verify official docs first and isolate uncertain calls.
12. Do not include secrets, tokens, credentials, private keys, or local environment files in source, logs, patches, ZIPs, or commits.
13. Do not add network requests, tracking, analytics, ads, or third-party services unless explicitly requested.
14. Keep the game family-friendly: no blood, gore, graphic injury, or real-world weapon branding. Enemy defeat should remain stylized/non-graphic.
15. Do not change the game's core visual identity or controls without a clear task requirement.
16. If requirements are ambiguous, inspect the project and state the ambiguity before making risky assumptions. Ask one focused question if necessary.
17. Never claim a test passed unless you actually ran it and observed the result. Distinguish static inspection, automated tests, browser tests, and real-device tests.
18. At completion, report changed files, behavior changes, tests actually run, tests not run, known risks, and any documentation updates.
19. Update `PROJECT_MEMORY.md` when a meaningful architectural decision, feature, contract, milestone, or known issue changes. Do not rewrite its historical notes unnecessarily.
20. Stop after completing the requested scope.

## 8. Required development workflow

For every task:

1. **Understand:** Read this file, relevant parts of `PROJECT_MEMORY.md`, and the actual source files.
2. **Baseline:** Check the current Git branch/status and identify the exact starting version. Do not overwrite unrelated user changes.
3. **Plan:** State a short implementation plan and identify likely files and risks before broad edits.
4. **Implement:** Make a focused change. Keep all related code/config/UI wiring consistent.
5. **Review:** Inspect the diff for accidental deletions, duplicated logic, stale references, inconsistent config, and unrelated changes.
6. **Verify:** Run the available build and relevant tests. Check `package.json` and `tools/` for the commands that actually exist; do not assume a command from old notes is still available.
7. **Gameplay QA:** When behavior changes, provide a concise manual test checklist. For gameplay, test both desktop and touch/mobile layouts when possible.
8. **Handoff:** Summarize changed files, exact behavior, commands and results, limitations, and any required follow-up. Update `PROJECT_MEMORY.md` if warranted.

### Git and parallel-agent safety

- Treat the checked-out branch and commit as the baseline; do not assume another agent's ZIP is based on the latest code.
- When comparing multiple model outputs, make sure both agents started from the same commit.
- Review a diff before copying/replacing files from an agent ZIP. Never blindly overwrite the project folder.
- Do not combine two agents' edits to the same file without manually reconciling the changes.
- Prefer a separate feature branch or a clean working copy for each independent agent/task.
- Never force-push, reset, or rewrite shared history unless the owner explicitly requests it.
- Do not commit or push unless explicitly asked by the project owner.
- Keep the human owner in control of which model output is accepted.

## 9. Quality bar

A change is not complete merely because the project compiles.

Depending on the task, verify:
- No console errors or unhandled exceptions.
- Mission start, completion, failure, pause, resume, and scene transitions still work.
- Nana deploy/recall, damage, boarding, crate pickup, and KO behavior remain coherent.
- Vehicle movement, collision, weapons, mines, and defensive units still work together.
- Save data survives reload and old save data migrates safely when the schema changes.
- UI remains usable in portrait and landscape on touch devices.
- Performance remains acceptable on mid-range phones.
- The packaged `dist/index.html` opens and contains all required runtime assets.
- Platform-specific lifecycle/storage/ads behavior is tested in the actual platform environment before being called release-ready.

Do not add difficulty by simply making enemies bullet sponges. Do not make hazards unavoidable. Do not let automatic systems remove all meaningful player decisions.

## 10. Current-state caution

`PROJECT_MEMORY.md` contains detailed milestone history and may include old status statements. Some sections describe planned features, some describe implemented features, and some describe untested work. **Do not treat every item in a roadmap or old handoff as currently implemented.**

Before changing or describing a feature:
- Inspect the current branch's code.
- Check whether the feature is implemented, partially implemented, mocked, or only planned.
- Check whether it is wired into the active scene and UI.
- Check whether tests exist and whether they actually run.
- Label unverified behavior honestly.

The repository's source code and current tests take precedence over stale notes. Update the documentation when you confirm a meaningful discrepancy.

---

## 11. First instruction to any new coding agent

You are working on **WARZAR: Crate Rush**, a mobile-first 3D browser game targeting YouTube Playables and Playgama. Read `AGENTS.md` and `PROJECT_MEMORY.md`, inspect the current implementation, and work only on the task supplied by the owner. Preserve the existing architecture, controls, performance budget, single-file build, and platform boundaries. Make focused changes, review the diff, run only verified available tests, and report exactly what you changed and what you tested. Do not invent features, APIs, or test results.
