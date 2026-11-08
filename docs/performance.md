# Performance delivery and profiling

## Implemented

- Compact WebP delivery copies for 198 PNG assets. World art and animation sheets use quality 88 with exact alpha; UI text, logos and icons remain lossless. Every copy is verified for original dimensions and identical alpha bytes, with full RGBA verification for UI. Original PNGs remain available for authoring and older clients. Atlas coordinates remain unchanged. RGB compression is not pixel-identical; source artwork is retained.
- `assetUrl` resolves runtime image URLs through the generated manifest. CSS also uses the optimized login background. Content-addressed delivery URLs have a one-year immutable cache policy on Vercel. Updating art generates a new URL; deployment does not require Python.
- Character entry loads the two base bodies and only currently needed armed/gathering sheets. New equipment and tools load on demand; the body supplies a valid fallback until loading finishes. Pending attacks resume on the loaded sheet. NPC and Wolf art load only on maps that use them. A fresh unarmed entry no longer preloads eight starter weapon sheets and six gathering sheets.
- Outfit recoloring remains lazy. Tier weapons use the sage starter reference without making duplicate colored starter textures. Animation registration is cached. The existing island-sheet cache protects in-use/death sprites and prunes unused sheets toward twelve entries.
- Protocol version 1 sends field-level snapshot deltas at the existing 15 Hz rate, with full keyframes on entry, reconnect, resync, map change and every five seconds. Unchanged bags, equipment and entities are omitted. Clients reject sequence gaps and request a rate-limited keyframe. Older clients retain full-snapshot compatibility; a new client can also receive full snapshots from an older server during deployment.
- Phaser receives every decoded update immediately. React publishes only changes relevant to the HUD, coalesced to at most ten updates per second. Animation-only changes and distant movement do not rerender the panel tree. Hidden documents skip HUD publication and flush their latest state when visible. Leaving cancels queued work.

## Measurements

Measurements use the local development environment, not deployed production infrastructure.

| Check                                                    | Result                                                                                                               |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Full optimized image library                             | 365,382,011 source bytes → 98,932,584 delivery bytes (72.9% smaller)                                                 |
| Cold unarmed boar-area image set                         | 26,810,896 previous delivery bytes → 11,757,482 new delivery bytes (56.1% less); zero armed/gathering sheets fetched |
| 24-client Crystal room, ten monsters                     | About 3.4 KB average wire update versus 29.4 KB reconstructed full state, about 88.5% less JSON payload              |
| Same room, 12-second sample                              | About 70 ms p95 update interval; periodic full keyframes included                                                    |
| 390×844 mobile viewport, device scale 2, CPU throttle 2× | 24 actors and ten monsters, five-second sample after warmup: about 24 ms average frame and 33.4 ms p95 frame         |
| Texture memory estimate in that scene                    | 258 MiB decoded RGBA; removing duplicate tier/legacy outfit textures saved about 48 MiB in the fixture               |

The mobile fixture also runs its synthetic world simulation in the browser; this is a local stress measurement, not a prediction for a real handset. Texture bytes are an estimate from decoded texture dimensions, not measured GPU allocation. JavaScript heap and frame times vary with hardware, browser and load. Physical-phone testing, longer sessions and production capacity validation remain necessary; these checks do not establish a universal 60 FPS target.

## Reproduce

With Node 24, dependencies, the database, game server and web server running:

```sh
npm run typecheck
npm test
npm run test:integration
npm run build
node --env-file-if-exists=apps/server/.env --import tsx scripts/load-room.mjs
node scripts/browser-performance.mjs
node scripts/browser-startup.mjs
node scripts/browser-characters.mjs
node scripts/browser-island-weapons.mjs
node scripts/browser-gathering-animations.mjs
node scripts/browser-crystal.mjs
node --env-file-if-exists=apps/server/.env scripts/browser-recovery-audio.mjs
node --env-file-if-exists=apps/server/.env scripts/browser-world-map.mjs
node --env-file-if-exists=apps/server/.env scripts/browser-equipment-management.mjs
```

Reports and screenshots are written to the ignored `artifacts/` directory. The load script compares encoded payload sizes with the reconstructed full snapshots in the same run; those JSON sizes do not include WebSocket framing or transport compression. It fails on missing delta bases, low update counts, p95 intervals above 250 ms or less than 50% bandwidth reduction.

For newly authored PNG art, regenerate delivery copies with Python 3 and Pillow with WebP support:

```sh
python scripts/optimize-art.py --verify
```

Commit the new delivery copies and manifest along with source-art changes. The generator also refreshes matching CSS background URLs. Original PNG files remain a fallback for paths absent from the manifest.

The loading screen now reports actual artwork-loader progress. The initial module download is labeled “Opening the realm”; artwork then reports 0–100%. These improvements target client downloads. They do not measure deployed backend wake-up or sign-in latency. The login background shrank from 1,225,722 to 115,492 bytes (90.6% less).

For an uncached before/after artwork-entry comparison, save the previous optimized manifest to a temporary file and run `BASELINE_MANIFEST=/tmp/startup-before-manifest.json node scripts/browser-startup.mjs`. It simulates 10 Mbps with 40 ms latency, imports development modules before timing, checks readiness and actual progress, and records the payload and elapsed time in `artifacts/startup-performance.json`.

In the uncached artwork-entry test above, the same unarmed Woods fixture transferred 24,419,134 → 10,475,950 artwork bytes and became playable in 19.956 → 8.713 seconds. This is a local 10 Mbps/40 ms simulation, excludes initial development-module imports and sign-in, and is not a production loading-time guarantee. The larger image-set row includes the login imagery too. Compression changes transfer sizes; decoded texture dimensions and estimated GPU memory remain unchanged.

## Map travel

Travel preserves the Phaser game, renderer, shared textures and animation registry for the whole play session. Each destination gets a fresh scene so characters, monsters, physics, effects, camera state and scenery listeners from the prior map are removed. Shared assets already in Phaser’s cache are reused. World backgrounds have distinct keys by image path and an LRU limit of three Woods/Crystal backgrounds; returning after eviction reloads that background only. Exiting the world still destroys the game and its texture cache.

The server’s ordered save, room transfer, portal/key validation and Teleport Crystal charges are unchanged. During handoff the previous scene stops consuming snapshots/inputs, and the loading overlay remains until the destination scene is ready.

Run `node scripts/browser-travel-cache.mjs` for 13 map changes through all Woods/Crystal areas plus the village. The check verifies one canvas/renderer, shared body texture identity, one scene/character, correct per-area backgrounds, the background limit, and no image requests on warm repeated travel. In the local mobile fixture, final warm Woods ↔ Spider scene changes took about 100–110 ms; that excludes backend handoff and is not a deployed-network guarantee.

With the local database and server running, run `node --env-file-if-exists=apps/server/.env scripts/browser-travel-ui.mjs` to exercise real world-map teleports, canvas reuse, exact crystal charges and saved destination state.

## Preparing destinations and direct handoff

After the character's destination and travel costs are saved, current clients receive a Colyseus seat reservation over the existing authenticated connection. They connect directly to that seat, overlapping closure of the old socket and skipping the separate HTTP matchmaking request. The destination still performs normal token/character authentication and enforces single-session ownership. Old-session cleanup cannot release the destination session's lock. Failed seat preparation or consumption falls back to a normal authenticated join. Older clients and servers retain the string-message path.

The active scene can prepare a destination’s missing artwork without entering it. Walking within 400 horizontal and 220 vertical units of a portal starts preparation after the scene’s first three seconds; world-map island selection, destination hover and keyboard focus can also prepare art. Preparation never spends crystals or keys, changes the saved map or joins a room. It skips under-level destinations, explicit browser Data Saver, and an already-busy loader. Approaching a keyed portal only prepares it when the player has its key. The existing background LRU remains capped at three; initial startup keeps priority.

Run `PREPARE_TRAVEL=1 node scripts/browser-travel-cache.mjs` to check all 13 prepared transitions with zero image requests during entry. The ordinary cache test remains available without the flag. `tests/travel-handoff.integration.ts` verifies the durable charge and destination before handoff, direct seat consumption while the old socket is still open, rejection of old-session actions, rejection of duplicate logins even after old-socket cleanup, and one charge under duplicate travel requests.

For repeatable real UI checks with added latency, run `TRAVEL_LATENCY_MS=180 node --env-file-if-exists=apps/server/.env scripts/browser-travel-ui.mjs`; add `LEGACY_TRAVEL=1` for the sequential HTTP-matchmaking path. Both verify four trips, canvas reuse, exact crystal charges and final saved state. Current clients should make one HTTP matchmaking request for initial entry and zero for the four transfers, versus five total for legacy mode.

In a local 10 Mbps / 180 ms latency simulation, warm return trips reached about 1.2 seconds with direct reservations versus 1.7–1.8 seconds through the sequential matchmaking path; another direct-reservation repeat measured 1.8 seconds for Woods and 1.18 seconds for Village, so timings remain variable. First visits still depend on artwork download/preparation: the same fixture’s first Woods entry measured about 3.2 seconds versus 5.3 seconds. These are short local comparisons, not production timing guarantees; backend region, database latency and connection quality still matter.
