# Performance checklist

Local measurements and regression checks for the test build are retained in [checklist-measurements.json](performance/checklist-measurements.json). These are Chromium mobile emulation and local CPU/database measurements, not physical-phone, internet-latency or production-capacity guarantees. Texture figures estimate decoded RGBA source memory and exclude driver overhead. Frame-time samples vary with the host; the crowded-hunt average was effectively unchanged, so this pass does not claim a universal FPS increase.

## Changes and measured outcomes

| Checklist item | Changes and evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Travel memory  | Keep only the two most recently used hunting islands' monster families. Remove their associated animation definitions when evicting sheets so revisits register fresh frames. Background and generated-terrain caches remain bounded. Two tours through all four playable islands return to the same 360.8 MiB texture estimate and one scene, with evicted bosses successfully reloaded. This bounds the tested travel pattern, not every possible player skin/tool combination.                                                                                                                                                                                                                                                              |
| Busy combat    | Skip detailed visual work and labels for offscreen players while retaining server simulation. Avoid prefetching the exit map in Arena/Battlegrounds: the stress scene no longer loads four unused gathering sheets during combat. Skip obsolete citizen sheets for current skins while preserving the legacy fallback. The 24-player/10-monster hunt drops from 259.8 to 223.8 MiB decoded textures; average frame time stays approximately 34 ms. With four players and 2× CPU slowdown, wave nine with 14 monsters averages 36.79 ms (P95 50.1 ms); the boss-special scene averages 34.67 ms (P95 50 ms). Battleground fixture health is held high to avoid a wipe truncating measurement; this is rendering stress, not balance validation. |
| House loading  | Load island loot/equipment atlases only for placed displays and animated stands only when Celestial/Shadow displays need them. Previewing or placing a new item loads its art on demand and disables placement until ready. A fresh empty house loads no island equipment atlases; adding a Frost resource display adds only the Frost resource groups. Cold empty/decorated texture estimates are 180.6/192.6 MiB. Existing generated art and source dimensions are preserved.                                                                                                                                                                                                                                                                |
| Download size  | Split Bag, Storage, Housing, Recipes, World Map, Class Carousel and the disabled cutscene player into lazy chunks with local Suspense boundaries, keeping the game mounted while a panel loads. The initial JavaScript entry falls from about 605 kB to 568 kB raw (about 6%). Production startup/account-dialog checks request no game engine or heavy panel chunks. The engine remains a separate large chunk loaded when entering the world; the bundler warning is retained.                                                                                                                                                                                                                                                               |
| Server load    | Reuse public player views and serialized field fingerprints within one synchronous broadcast, never across ticks or private viewers. Wire output and privacy have an equivalence regression. The 24-player CPU/JSON comparison reduces encoding time from 6,072 to 2,904 ms over 30 simulated seconds; P95 broadcast preparation falls from 20.01 to 8.49 ms. A live local 24-player AUTO room sustains 15 updates/second/player over ten measured seconds with normal autosaves. Saves skip redundant completed/zero-progress quest updates while retaining character writes and the five-second cadence; completed-quest saves measure 3.23 ms median and 18.32 ms P95 locally. Network payload volume is not reduced by the CPU cache.      |

## Reproduce

Start the local database, game server (2567) and Vite server (5173). Run performance measurements separately from builds and other benchmarks to reduce host contention.

```sh
node scripts/browser-performance.mjs
node scripts/browser-performance-checklist.mjs
node --import tsx scripts/benchmark-server.ts
node --env-file-if-exists=apps/server/.env --import tsx scripts/check-server-load.ts
```

For the production download check, build the client and serve its preview on 4173:

```sh
npm run build
npm run preview -w @ros/web -- --host 127.0.0.1
node scripts/check-production-download.mjs
```

Functional checks include the complete integration suite, snapshot cache/privacy unit tests, Frost house placement/retrieval/re-entry, all seven themed display stands including animated stands, and desktop/mobile guide/settings dialogs. No artwork is regenerated or resized in this pass. Real phones and a longer public-server soak remain necessary playtest observations, particularly crowded-combat frame pacing.
