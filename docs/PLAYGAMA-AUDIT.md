# WARZAR: Crate Rush — Playgama requirements audit

**Candidate:** 1.0.0 · **Bridge:** 2.4.3 · **Rules checked:** 2026-11-18. Applies to the Playgama upload ZIP only. The independent standalone HTML is not a Playgama submission build.

**Verdict: candidate for dashboard QA, not certified or submitted.** Local evidence and exact artifact identity are in [PLAYGAMA-QA.md](PLAYGAMA-QA.md). “Build” below means visible in this build or source; “Local” is bounded to the environment and test noted in the QA report. “Host/owner” means still to confirm. “N/A” means the feature is not present, not that one has been tested.

## 1. Technical requirements

[Official §1](https://wiki.playgama.com/playgama/game-requirements/technical-requirements)

| Rule | Finding / scope |
|---|---|
| **1.1.1** | Build: local, unmodified Bridge 2.4.3, the stable version, checked against the vendor listing; the ZIP matches the pinned npm distribution byte for byte. Reconfirm the current version if publication is delayed. |
| **1.1.2** | Build + local: see the eight SDK steps below. Dashboard analyzer and actual host integration are still required. |
| **1.2.1–1.2.3** | No external registration, sign-in prompt, sign-in button or account flow. Failed sign-in is N/A. |
| **1.2.4** | No app analytics or external tracking. Bridge config sets `sendAnalyticsEvents: false`. Required lifecycle messages still go through Bridge. |
| **1.2.5** | Engine, assets, configuration, MP3s and unmodified local SDK ship together; no app-driven CDN, external fonts or runtime asset fetches to other origins. A stock nested-frame run with network routes blocked outside the test origin checks this. A destination's own SDK/services belong to that destination. |
| **1.2.6** | No player-facing outgoing links. Credits/license URLs are in archive text notices, not UI links. |
| **1.2.7** | No URL allowlist or URL gating in the app. Relative paths work under a nested host URL. Release build ignores QA flags, rather than granting features on a special URL. |
| **1.3.1** | Local: ZIP and total unpacked bytes are both far below 300 MB. The archive itself is under 5 MB; this is not proof of load time on a phone. |
| **1.3.2** | Local: root `index.html`, ASCII Latin paths, adjacent config and SDK, bytes/inventory/CRC verified after ZIP extraction. No parent folder, source tree, deployment-only media, or dev server needed. |
| **1.3.3** | No startup memory failure in local tested contexts. Chromium JS heap is only a partial measurement, not a platform peak including GPU. **Confirm <2 GB with the dashboard auto-check and real devices.** |
| **1.4.1** | Game fills its embed, including desktop and narrow touch viewports. Browser fullscreen is optional and offered only when available/granted; embedding host controls native display mode. Verify inside mobile Playgama and Safari. |
| **1.4.2–1.4.3** | No editable text fields. Both mobile orientations implemented; no orientation lock or unnecessary rotate prompt. Declare both only after device QA. |
| **1.4.4** | Build + touch automation: floating stick, touch Boost/Deploy, equipment and pause; release/cancel clears held control. Main loop can be played one thumb sequentially. Verify actual gestures and hit zones on physical devices. |
| **1.4.5** | Build + event tests: no game-area native select, drag, context menu or touch callout. iOS magnifier/long press with the real browser UI still needs hands-on verification. |
| **1.4.6** | No normal-start WebGL warning in working local contexts. Failures expose localized retry, not a permanently black screen. Driver/context recovery and compatibility are device checks. |
| **1.5.1–1.5.3** | Desktop WASD/arrows, keyboard actions and mouse support; touch mode available separately. The app does not bind, cancel or repurpose Escape; native fullscreen exit is left to the browser. |
| **1.6.1–1.6.4** | Canvas fits the available viewport. No outer scrolling; internal shop/maps and panel scrolling allowed. Bounded short-landscape menu columns, details and actions, fit-to-viewport HUD and separate notice stack avoid important control collisions. Local checks are sampled geometries, not all phones, fonts or OS chrome states. |
| **1.6.5** | Maps closes via Back/Confirm, Shop via Back, briefing now has Main Menu as well as Start, pause offers Resume, and results have continuation/back actions. Recovery uses Retry. Unlock animation is finite and returns control. |
| **1.6.6–1.6.8** | Touch controls and game field need no page drag/scroll. Local narrow portrait, short landscape and square checks cover critical visible actions, including localized labels. Physical safe areas, readability and touch reach remain owner checks. |
| **1.7.1** | Local: startup, save/error paths, resize, pause reasons, ad failure, browser reload and touch event guards. No claim of 100% device stability. Verify sleep/wake, real history navigation, native minimize/restore, OS interruption and context loss in Test Game. |
| **1.7.2** | Local: onboard by actually driving, auto-defeating the guardian, deploying Nana, picking up the crate, boarding, extracting and opening level 2. Five-map smoke and generator tests are not a 50-level human campaign playthrough. |
| **1.7.3** | **Host/owner:** run current Chrome/Firefox/Opera/Safari/Edge and the Windows/macOS/Android/iOS matrix required by the rules. Linux Playwright engine coverage is not equivalent. See QA report for exact versions/results and any case still open. |
| **1.8.1–1.8.2** | No game video, embed or system player. Host-served ads are Bridge-managed. |

### Bridge Required Steps (§1.1.2)

[Official list](https://wiki.playgama.com/playgama/bridge-sdk/api#required-steps) · [Setup](https://wiki.playgama.com/playgama/bridge-sdk/setup) · [Config](https://wiki.playgama.com/playgama/bridge-sdk/config)

1. **Config:** local `playgama-bridge-config.json` adjacent to `index.html`. Checked against the stable vendor JSON schema. No forced platform ID or guessed partner IDs.
2. **Initialization barrier:** first normal script is local Bridge. `src/playgama-entry.ts` sets engine and version and awaits initialization before dynamically importing `main`; there is no module preload. Mock delays and missing/init errors check there are no early engine/audio requests. No silent standalone fallback.
3. **Locale:** a single Bridge language read at initialization. EN fallback; RU only when supported/requested by Bridge. No OS/browser or saved preference override.
4. **Storage:** one `storage.get([key])` before interaction. Key `warzar_crate_rush_save_v1` preserved. Changes are one batched/serialized `storage.set` payload; skip identical snapshots and keep unload/pause flush. No game-owned Web Storage/IndexedDB in the upload. Bridge can pick a supported storage backend. Failed startup read shows retry without writing defaults. Cloud/cross-device retention and blocked storage belong in dashboard QA.
5. **States:** independent Bridge mute, saved player mute, platform pause, manual pause, ad states, visibility and page lifecycle. Muted startup fetches no game MP3s until allowed; first playback requires input. New pause causes reset held input, not the run. Returning from one cause does not clear the others.
6. **Readiness:** restore save, build and render menu, hide loader, allow a browser frame, then send `game_ready` once. Loader progress reflects asset and scene milestones rather than an artificial delay; slow/failed startup exposes Retry.
7. **Transition ads:** only from natural confirmed transitions (results onward/retry/shop/menu, restart/menu from pause). Bridge owns pacing and first-ad delay; the 60-second value is a Bridge setting. Game waits have deadlines for **unopened** ads only; no game-controlled ad spacing and no timed resume over an open ad.
8. **Capabilities:** ad controls hidden without support. No IAP store, leaderboard, auth or outbound-link buttons. Shop equipment costs in-game coins only; there is no rewarded offer inside Shop. Verify hosts with unsupported ads and opt-in callbacks in the actual dashboard environment.

## 2. Ads and payments

[Official §2](https://wiki.playgama.com/playgama/game-requirements/advertising-requirements) · [Interstitials](https://wiki.playgama.com/playgama/bridge-sdk/api/advertisement/interstitial) · [Rewarded](https://wiki.playgama.com/playgama/bridge-sdk/api/advertisement/rewarded)

| Rule | Finding / scope |
|---|---|
| **2.1.1–2.1.3** | Bridge only. Explicit calls at natural breaks after play, not a mid-mission timer or first-load pre-roll. Hosts without ads continue. |
| **2.1.4–2.1.5** | No app banners or ad blocks that move under a finger/cursor. Host overlay placement and orientation still must be checked in actual ad deliveries. |
| **2.1.6** | Open ads stop simulation and audio. Closing one gate does not resume over a different ad, hidden tab or manual pause. Local fixtures use the Bridge state names, not actual ad inventory. |
| **2.1.7** | No-fill/error/skip do not block transitions or pay a bonus. Result panels present visible localized feedback, including touch. A missing callback while loading (not opened) releases the UI wait. Actual no-fill and ad close timing are host checks. |
| **2.2.1–2.2.3** | “WATCH AD”/“РЕКЛАМА” and the exact number of bonus coins on mission results only. The Shop offers no ads. Decline by continuing without the ad; no progression gated on an ad. |
| **2.2.4** | N/A: no ad-based revive, extra life, extra time or recovery. Reward is coins, not another life. |
| **2.2.5** | Credit matching `rewarded` event once; never credit merely on `closed`, fail, or cancel. Coin grant/save happens on the reward event; controls stay latched and pause remains until the ad closes. Test same behavior with real host callbacks and placement mapping. |
| **2.3.1–2.3.2** | N/A: no banners, no advanced banners, no RTB integrations. |
| **2.4.1–2.4.6** | N/A: no IAP, pricing API, receipt/durable purchase/consumption flows or external payments. Equipment inventory trades virtual earned coins only. |
| **2.5.1–2.5.2** | No cash, wagering, lottery, withdrawals, prizes of external value or simulated trading. |

## 3. User experience

[Official §3](https://wiki.playgama.com/playgama/game-requirements/user-experience-requirements) · [Sound guide](https://wiki.playgama.com/playgama/guides/game-development/sound) · [First session](https://wiki.playgama.com/playgama/guides/game-development/first-session)

| Rule | Finding / scope |
|---|---|
| **3.1.1.1–3.1.1.3** | Meets the progress and interaction alternatives. 50 levels (5 seasons × 10), steering, timed pickups/extraction and upgrading equipment. Not a branching story game. |
| **3.1.2** | A fictional cargo-rescue setting; crate count, enemy/guardian strength and environmental threats increase across seasons. Test difficulty and retention with human players, not just generator checks. |
| **3.1.3** | First Start goes straight into a single-crate playable training run with contextual driving, guardian, deploy, boarding and extraction prompts. Subsequent briefings are short, closable. A seeded real-simulation onboarding win was verified locally; report measures it separately from real human time-to-win. |
| **3.2.1–3.2.2** | Bridge-only progress, coins, inventory, level ratings and preferences. Save occurs on gameplay milestones and UI changes; result and rewards bank before reload/transition, not at the end of an animation. |
| **3.2.3** | Local stock SDK reload of mute preference and mock host reload of won level/wallet; active run kept on rotation and state transitions. Live/cloud saves and repeated reopen on destination are still required. |
| **3.3.1–3.3.2** | Released sound is 88 compressed licensed recordings/produced cuts, not a conversion of code-generated synth sounds. Distinct menu and mission music, layered engine/wind, UI/combat cues and loop metadata. Verify on-device audibility/volume. See [credits](PLAYGAMA-AUDIO.md) and QA. |
| **3.3.3** | Speaker in menu and Sound in pause; persist user preference separately from host mute. YouTube host identification uses its documented host-only mute behavior; verify this only if enabling that destination. |
| **3.3.4** | Bridge initial state checked prior to preparing audio; event-driven mute and pause from host; a user cannot override host mute. Check actual host mute on first launch and after reload. |
| **3.3.5** | Web visibility and page lifecycle gates silence audio and hold mission state. Automated event fixtures do not replace OS tab switch, minimizing, lock/unlock and resume tests. |
| **3.4.1–3.4.3** | English fallback, Bridge-selected RU, 383 matching translation keys and substitutions, scripted localization checks and RU browser flows. Declare exactly EN/RU. Do a native-speaker copy pass across late missions in dashboard. |
| **3.4.4** | N/A: no separate language selector. |
| **3.5.1** | Exact title **WARZAR: Crate Rush** in the page title, menu artwork/accessibility label, cover text and supplied listing. |

## 4. Content

[Official §4](https://wiki.playgama.com/playgama/game-requirements/content-requirements) · [Self-check](https://wiki.playgama.com/playgama/game-requirements/game-self-check)

| Rule | Finding / scope |
|---|---|
| **4.1.1–4.1.3** | Stylized low-poly arcade action; no realistic injury, blood or gore observed in audited material. Fictional crew and regions, no real conflicts, flags of national states, religion or political messaging intended. Military-looking equipment, cartoon combat and the title still warrant moderator review; stricter partner bans may apply. |
| **4.1.4–4.1.8** | No player life/health predictions, sexual material, slurs/profanity or self-harm material in the audited EN/RU copy and assets. Not a rating/approval decision. |
| **4.1.9–4.1.11** | No real-world unlawful instruction or inducement, extremist material, gambling, casino or financial trading in the game or listing. Local law/rights and final moderation are owner/host determinations. |
| **4.2.1 / 4.2.3** | Code/art come from the project; third-party audio and library licenses listed. Owner must confirm authority to upload and retain notices (including the CC BY motor recording, license link and modifications). No rights granted by this audit. |
| **4.2.2 / 4.2.4 / 4.2.5** | No copied branded characters, partner logos or implication of endorsement in this build/listing. Confirm title, original/related releases and duplicates with owner and catalog before submission. |
| **4.3.1** | Distinct custom controls, gameplay, geometry and texture treatments. Covers are typeset renders of the game, not generated substitute art. AI-assisted work has occurred; do not assert “human-only” or guarantee that moderators will find sufficient refinement. Owner confirms use/disclosure and provenance. |
| **4.3.2** | Custom canvas/SVG iconography; no emoji used as the interface. Locale check covers keys, placeholders and emoji. |
| **4.4.1** | Game code stores progress/settings via Bridge, asks for no names, emails or IDs and adds no data collection. Account storage, ads, consent and any required privacy notice are host/owner checks; do not authorize account/data use on anyone's behalf. |

## 5. Engine-specific

[Official §5](https://wiki.playgama.com/playgama/game-requirements/engine-specific-requirements): **5.1.1 N/A** (Unity WebGL Decompression Fallback). This is a JavaScript/Three.js build, not Unity.

## 6. Destination-specific — do not opt in automatically

[Official §6](https://wiki.playgama.com/playgama/game-requirements/platform-specific-requirements) · [YouTube integration](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration)

| Destination | Local fit and remaining decision |
|---|---|
| **Playgama** | First target only. Upload the game ZIP into a draft, then complete **Test Game**, ownership/media review, and actual platform acceptance. |
| **Facebook** | Archive fits the size and file budgets; no launch ad. It lacks the requested combination of social, multiplayer, leaderboards or IAP, and fast loading/mobile acceptance is unverified. Hold. |
| **MSN** | Under 50 MB with landscape; partner selection and real game ID/integration not verified. Hold. |
| **CrazyGames** | Doc says Playgama does not publish there. Independent launch would require separate QA, retention and onboarding checks. |
| **Playhop / Yandex** | RU build and replayable campaign present; real retention, device tests and placement/native SDK validation not done. |
| **Game Distribution** | Internal assets and no outward links; **do not opt in by default**. Its no-violence rule is stricter than a no-gore check, and the game has cartoon fighting. Ask moderation rather than assuming acceptance. |
| **VK** | Doc says not distributed by Playgama. Would need its RU-default fallback and social/retention review separately. |
| **Discord** | No multiplayer or IAP; does not meet requested feature set. Hold. |
| **Xiaomi** | Build fits size limit. Verify Android startup, session length and legitimate dashboard ad ID. No placeholder ID. |
| **YouTube Playables** | Locally fits size/file limits and uses both orientations. No app analytics; actual integration and zero unapproved calls must be checked on YouTube. Playtime, physical device matrix, content and selection are unverified. The separate standalone file is not a YouTube submission. |
| **TikTok** | Doc says publishing paused. No shortcut/sidebar integration; no device/network/playtime claim. |
| **GameSnacks** | Local files and initial payload below size limits; layout supports 9:16 and saved record is small. Verify time-to-play under their network conditions, native iOS/Android, external calls and partner acceptance. |

## Owner's release gate

1. Review the packaged bytes, media, listing, audio attribution, rights, content and AI disclosures.
2. In [Developer Dashboard](https://developer.playgama.com/), add/update the **draft** and attach only the upload game ZIP. Use separate media slots for the three covers and screenshots. Use the [submission guide](https://wiki.playgama.com/playgama/submitting-a-game) and leave unverified destinations excluded.
3. Run **Test Game**: SDK analyzer/version/config/memory; clean startup, first win, level progression and reload; test EN/RU; both orientations and a square embed; device/fullscreen and OS interruptions; actual paid/declined/cancelled/no-fill ads and cloud save under real host mute.
4. Run the real browser/device matrix and record failures with browser/OS, viewport, host, exact ZIP SHA-256, and action steps. Fix blockers and re-test the new exact archive.
5. Save as Draft if any check is open. Only the authorized owner should submit, publish or enable partner distribution after validation. Nothing has been uploaded or published by this audit.
