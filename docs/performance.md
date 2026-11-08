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
