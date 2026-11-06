# Performance delivery and profiling

## Implemented

- Lossless WebP delivery copies for 166 PNG assets, including backgrounds, transparent island maps, UI, monster and character atlases. Source PNGs remain available for authoring and older clients. Every generated copy was checked against the source dimensions and every RGBA byte. Atlas coordinates and recoloring masks are unchanged.
- `assetUrl` resolves runtime image URLs through the generated manifest. CSS also uses the optimized login background. Content-addressed delivery URLs have a one-year immutable cache policy on Vercel. Updating art generates a new URL; deployment does not require Python.
- Character entry loads the two base bodies and only currently needed armed/gathering sheets. New equipment and tools load on demand; the body supplies a valid fallback until loading finishes. Pending attacks resume on the loaded sheet. NPC and Wolf art load only on maps that use them. A fresh unarmed entry no longer preloads eight starter weapon sheets and six gathering sheets.
- Outfit recoloring remains lazy. Tier weapons use the sage starter reference without making duplicate colored starter textures. Animation registration is cached. The existing island-sheet cache protects in-use/death sprites and prunes unused sheets toward twelve entries.
- Protocol version 1 sends field-level snapshot deltas at the existing 15 Hz rate, with full keyframes on entry, reconnect, resync, map change and every five seconds. Unchanged bags, equipment and entities are omitted. Clients reject sequence gaps and request a rate-limited keyframe. Older clients retain full-snapshot compatibility; a new client can also receive full snapshots from an older server during deployment.
- Phaser receives every decoded update immediately. React publishes only changes relevant to the HUD, coalesced to at most ten updates per second. Animation-only changes and distant movement do not rerender the panel tree. Hidden documents skip HUD publication and flush their latest state when visible. Leaving cancels queued work.

## Measurements

Measurements use the local development environment, not deployed production infrastructure.

| Check                                                    | Result                                                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Full optimized image library                             | 310,339,208 source bytes → 222,656,922 delivery bytes (28.3% smaller)                                               |
| Cold unarmed boar-area image set                         | 39,527,509 equivalent source bytes → 26,810,896 delivery bytes (32.2% smaller); zero armed/gathering sheets fetched |
| 24-client Crystal room, ten monsters                     | About 3.4 KB average wire update versus 29.4 KB reconstructed full state, about 88.5% less JSON payload             |
| Same room, 12-second sample                              | About 70 ms p95 update interval; periodic full keyframes included                                                   |
| 390×844 mobile viewport, device scale 2, CPU throttle 2× | 24 actors and ten monsters, five-second sample after warmup: about 24 ms average frame and 33.4 ms p95 frame        |
| Texture memory estimate in that scene                    | 258 MiB decoded RGBA; removing duplicate tier/legacy outfit textures saved about 48 MiB in the fixture              |

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
node scripts/browser-characters.mjs
node scripts/browser-island-weapons.mjs
node scripts/browser-gathering-animations.mjs
node scripts/browser-crystal.mjs
node --env-file-if-exists=apps/server/.env scripts/browser-recovery-audio.mjs
node --env-file-if-exists=apps/server/.env scripts/browser-world-map.mjs
node --env-file-if-exists=apps/server/.env scripts/browser-equipment-management.mjs
```

Reports and screenshots are written to the ignored `artifacts/` directory. The load script compares encoded payload sizes with the reconstructed full snapshots in the same run; those JSON sizes do not include WebSocket framing or transport compression. It fails on missing delta bases, low update counts, p95 intervals above 250 ms or less than 50% bandwidth reduction.

For newly authored PNG art, regenerate optimized copies with Python 3 and Pillow with WebP support:

```sh
python scripts/optimize-art.py --verify
```

Commit the new delivery copies and manifest along with source-art changes. The generator also refreshes matching CSS background URLs. Original PNG files remain a fallback for paths absent from the manifest.
