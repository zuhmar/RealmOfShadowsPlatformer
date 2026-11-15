# Playtest preparation

The in-game **Test guide and recovery** button opens the playtest companion. The Journal also shows the next main quest, its hunting area and whether to accept or turn it in. Settings links back to the guide.

## Scope and existing content

- Elderwood is the safe hub. Whispering Woods, Crystal Caverns, Murkmire and Frostfall each have three hunts and one keyed boss. Quest counts escalate; bosses remain one kill.
- Murkmire and Frostfall include their hunting quest chains, island resources, recipe drops, equipment, provisions, tools and boss first-clear rewards. All recipes require discovery; picking up a scroll learns it automatically. Check `docs/murkmire-swamp.md` and `docs/frostfall-tundra.md` for values.
- Mirebound Arena has gateway access, two-seat matchmaking, mutual ready, countdown, actual gear/skills, timed results, and forfeit/exit. It is unranked, has no level brackets and grants no PvE loot or XP.
- Frostbound Battlegrounds has private solo lobbies, party codes for up to four players, ready/start, ten scaled waves, completion rewards, knockout/spectator behavior and free exit. Leaving ends participation.
- Cutscene artwork and authoring remain preserved, but automatic and Journal playback stay disabled. Later hunting islands are outside this test.

## Added preparation

The companion explains controls, starter weapons, the Crystal class trial, gathering/equipped tools, recipe discovery, identification, food/potions, travel/keys, housing/storage and both combat modes. It includes Discord bug-report and suggestion links and a report checklist. The landing badge and in-game map title identify this as a test build. It does not announce new dates or promise access to unreleased islands.

Audio settings retain the master volume and add separate effects/music volumes. Reduced visual effects persist per device and default to the OS motion preference on first use. They suppress decorative fireflies and weapon bursts, reduce floating-number motion, and stop warning-area pulsation; boss danger zones, countdown labels, projectiles and damage rules remain active.

Recovery is checked by the server. **Unstuck** moves the character to the current map's entrance without healing or changing inventory. **Return to Elderwood** uses the normal saved travel path, is free and asks for confirmation. Both require ten seconds since the last attack or incoming hit and share a persisted sixty-second cooldown. Rejoining starts the ordinary incoming-hit grace timestamp, so recovery also waits ten seconds after entry. Neither action bypasses Arena forfeits or Battleground participation: use those modes' Leave buttons instead. Dead/cinematic characters cannot recover. Being in Elderwood prevents a redundant return but still allows Unstuck.

## Validation

- `npm test`
- `npm run typecheck`
- `npm run build`
- With the local game server/database: `node --env-file-if-exists=apps/server/.env --import tsx --test --test-concurrency=1 tests/arena.integration.ts tests/frostfall.integration.ts tests/recovery.integration.ts`
- With the local web server: `ROS_REDUCED_EFFECTS=1 node scripts/browser-boss-combat.mjs` verifies that reduced effects preserve boss warnings, dodge timing and damage.
- With the local web/game servers: `node --env-file-if-exists=apps/server/.env scripts/browser-playtest-guide.mjs`

The browser check covers desktop/mobile guide layout, current quest guidance, Discord destinations, return confirmation and independent volume/reduced-effect persistence. Screenshots are saved in `artifacts/playtest-*.png`. Multiplayer balance, phone performance and full progression remain playtest feedback areas.

## Follow-up review fixes

- Frostfall gathering resources, monster materials, boss keys and trophies are eligible for house displays. The display whitelist and stand theme now use the complete Frostfall item catalog so items such as Giant Heart and Wraith Essence use the Frost stand.
- Equipment identification applies only the changed gear instance and inventory/gold deltas when its transaction completes. Loot collected during database waits remains in the live character and the next save. `tests/identification-loot.integration.ts` holds a real row lock while collecting a drop to cover this case.
- Renderer sizing has a nonzero minimum for hidden/detached game containers. Resize observation updates Phaser's parent dimensions before refreshing the canvas, so restoring the host also restores the full viewport. `ROS_FROST_DISPLAY_TEST=1 node --env-file-if-exists=apps/server/.env scripts/browser-house-displays.mjs` covers hidden/restored rendering, Frostfall decoration placement, retrieval and saved re-entry.
- Quest/recovery integration fixtures use isolated rooms to avoid inheriting other test characters' monster positions. The starter-quest test allows its full real-time hunt to complete before its outer deadline.

## Quest and combat transaction review

Quest giver locations are resolved from the map NPC catalog. This fixes the Frost Warden being incorrectly routed through the village-only fallback, which prevented Frostfall quest acceptance and turn-ins. The server checks proximity before queueing and again when the queued action begins; clicking a distant Frost Warden now gives an approach notice.

Quest results apply only changed quest states plus inventory/gold deltas. Class actions also apply gold deltas. Loot and progress from other hunts that arrive while a database action waits remain intact. A potion accepted before a Battleground knockout cannot restore the eliminated player's health when its save finishes. AUTO's zero-percent recovery threshold is now preserved instead of defaulting to thirty percent.

Regression coverage:

- `tests/frostfall-quest-rpc.integration.ts`: all four Frostfall quests through real player requests, giver proximity, forged-progress rejection, single rewards, persisted results and a zero-percent AUTO threshold.
- `tests/action-save-races.integration.ts`: real database row locks around potion/knockout, class talent/gold and quest reward/loot races.
- `node --env-file-if-exists=apps/server/.env --import tsx scripts/browser-frostfall-quests.mjs`: actual Frost Warden interaction, dialog, quest acceptance and mobile layout.
