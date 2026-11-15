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
