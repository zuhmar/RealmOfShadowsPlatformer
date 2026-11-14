# Animated cutscenes

The catalog contains 19 playable scenes (48 beats): the first accepted quest in Whispering Woods, Crystal Caverns, Murkmire Swamp and Frostfall Tundra; 11 feature introductions; and four boss entrances. Three later island chapters are drafted but require their actual quests before they can play. The Celestial origin revelation stays gated by authoritative story progress.

Scenes animate existing character, NPC, tool, weapon and monster sheets with camera motion, particles and sound cues that respect the player's audio settings. The opening uses a generated burning-town backdrop. Artwork retains its proportions. Pause, Next and Skip controls support touch and keyboard; Escape skips, and reduced-motion preferences stop movement effects and frame cycling.

Introductions play once per character. Watched scenes appear under Journal → Memories and can be replayed in Elderwood Village. They give no rewards or quest progress. The server validates triggers, persists only the watched receipt and temporarily freezes player actions and incoming damage. Gathering resumes with a fresh cycle. A 90-second server lease restores play even if the client disappears. Arena readiness and party battleground starts wait for introductions to finish.

To add a scene, extend `packages/game-data/src/cutscenes.ts`, then add its authoritative eligibility and contextual trigger in `packages/shared/src/cutscenes.ts`. Keep future story spoilers gated. Use generated art for new illustrations and existing sheet descriptors for real frame animation.

Validation:

```sh
npm test
npm run typecheck
npm run build
node --env-file-if-exists=apps/server/.env --import tsx --test tests/cutscenes.integration.ts
node scripts/browser-cutscenes.mjs
node --env-file-if-exists=apps/server/.env --import tsx scripts/browser-cutscene-flow.mjs
```

Browser checks require local web/server services and Chromium. The fixture checks all playable beats, sprite frame changes, controls, mobile bounds, reduced motion and asset requests. Optional `CUTSCENE_VIDEO=1` recording also requires Playwright's ffmpeg installation.
