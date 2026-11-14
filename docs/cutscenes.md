# Animated cutscenes

The catalog contains 19 playable scenes (48 beats): the first accepted quest in Whispering Woods, Crystal Caverns, Murkmire Swamp and Frostfall Tundra; 11 feature introductions; and four boss entrances. Three later island chapters are drafted but require their actual quests before they can play. The Celestial origin revelation stays gated by authoritative story progress.

The 19 playable scenes use 22 generated animation sheets: four distinct poses per sheet, 88 generated frames total. Playback cycles through the poses at four frames per second. Characters, weapons and creatures change poses within the scene; camera motion and particles add atmosphere. The opening has four separate animated shots: the dragon attack, its aftermath, years of training and Mira's greeting. Other scenes reuse their loop across dialogue beats. Sound cues respect the player's audio settings. Future chapters retain sprite staging until their quests and frame artwork are ready.

Each sheet is exactly 1536×1024 with two columns and two rows of 768×512 landscape frames. Nested SVG viewports clip the sheet to one frame, preventing adjacent cells from leaking into letterboxing on phones. Frames retain their proportions. The original full-scene illustration is the loading/error fallback and ambient backdrop; the complete grid is never shown to players. Only the current scene's sheet is requested. Pause, hidden tabs and reduced-motion preferences stop frame playback. Next, Skip and Escape keep working.

Introductions play once per character. Watched scenes appear under Journal → Memories and can be replayed in Elderwood Village. They give no rewards or quest progress. The server validates triggers, persists only the watched receipt and temporarily freezes player actions and incoming damage. Gathering resumes with a fresh cycle. A 90-second server lease restores play even if the client disappears. Arena readiness and party battleground starts wait for introductions to finish.

To add a scene, extend `packages/game-data/src/cutscenes.ts`, then add its authoritative eligibility and contextual trigger in `packages/shared/src/cutscenes.ts`. Keep future story spoilers gated. Use generated art for new frames, inspect the grid and sequential poses, then set the beat animation metadata. Regenerate the optimized manifest after adding sheets.

Validation:

```sh
npm test
npm run typecheck
npm run build
node --env-file-if-exists=apps/server/.env --import tsx --test tests/cutscenes.integration.ts
node scripts/browser-cutscenes.mjs
node --env-file-if-exists=apps/server/.env --import tsx scripts/browser-cutscene-flow.mjs
```

Browser checks require local web/server services and Chromium. The fixture checks all playable beats, actual generated-frame pixel changes with camera motion disabled, controls, mobile bounds, reduced motion and asset requests. Optional `CUTSCENE_VIDEO=1` recording also requires Playwright's ffmpeg installation.

Source illustrations are in `apps/web/public/assets/cutscenes/` and animation sheets in its `frames/` directory; both `sources.json` files record generated source files. The asset optimizer creates content-addressed WebP delivery images without changing the retained sources. Only the current scene image is loaded during playback; this set is not eagerly downloaded at game startup.
