# Frostfall Tundra

Frostfall is the fourth playable hunting island, levels 31–40. Defeat Hydra and reach level 31, then enter through Venom Toad Mire or Hydra Basin. Each discovered hunting area supports normal crystal teleportation, with a boss key additionally required for the summit.

| Area | Level | Spawns | Quest kills |
| --- | --- | --- | --- |
| Snowfang Pass | 31 | 10 Frost Wolves | 270 |
| Glacier Watch | 34 | 10 Ice Trolls | 360 |
| Wraith Ruins | 37 | 10 Frozen Wraiths | 450 |
| Frost Giant Summit | 40 | 1 Frost Giant | 1 |

The Frost Warden stands above the fishing dock in Snowfang Pass. Turn in the Murkmire Hydra quest before beginning this quest chain. Only accepted quests count kills in their target hunting area. Rewards total 12,400 gold, 50 Frostpine and one guaranteed Frost Giant Key. Wraiths also have a 20% key drop chance. The generated Frost Giant Cairn is the portal on the upper ledge in Wraith Ruins. Every boss entry consumes one key, including crystal teleportation. Frost Giant is double-sized and has a basic attack plus a fixed-position, 1.8-second Glacial Slam warning and generated eight-frame icy impact. Move beyond its radius or above its damage height to avoid the heavy strike. The first hunting-map victory grants 3,000 extra gold and one trophy, once.

All four maps have different ladder-connected layouts. Mining, woodcutting, herbalism and fishing each have their own platform. Frost Ore, Frostpine and Frostleaf require the corresponding gathering skill at 31; fish unlock at Fishing 31/35/40: Icefin, Frost Salmon and Glacier Pike. Continuous gathering, manually equipped ore tools, automatic wooden tools and existing baked gathering animations apply. Frost tools require character/Blacksmithing 31 and cost 40 Frost Bars plus 160 Frostpine. Smelting stays 20 ore per bar. Frost weapons/armor use the existing Frost equipment roster and generated item art. Monster equipment may be identified; crafted equipment has fixed attributes.

All recipes must be discovered from hunting. Icefin Roast grants +40% damage for 25 minutes, Frost Salmon Stew +8 out-of-combat regeneration for 25 minutes, and Glacier Pike Feast +25 percentage points of crit for 30 minutes within the normal cap. Frostleaf potions restore 300 HP or 150 MP and use the existing shared ten-second cooldown. New consumables and resources have generated inventory and loot sprites.

Backgrounds, monster sheets, platforms, gathering props, winter NPC outfit, ladder/dock, items, slam effect and battleground entrance are generated artwork. PNGs remain unchanged; frame bounds and anchors are metadata from `scripts/frame-frostfall.py`. Delivery WebP copies preserve dimensions and alpha. Terrain is uniformly scaled, with whole platform spans and an authored dock/water surface.

## Frostbound Battlegrounds

Enter the fortress gateway on the ground in Snowfang Pass. Each entrant first gets a private solo lobby. Share the displayed party code; other players enter their own lobby and use Join Party to move into yours. The limit is four, including the leader. Other party members press Ready before the leader starts. Additional or late joins are rejected through the join action once the party is full or fighting. Reserved-seat arrivals during a start are spectators and cannot earn completion rewards.

After a five-second countdown, ten waves begin. Wolves arrive first, Trolls and Wraiths join later waves, and wave ten is a Frost Giant. Count and health scale with the starting party size; health and damage rise across waves. There are seven-second breaks and a fifteen-minute limit. Layout and player movement are shared, with friendly fire disabled. Auto combat is disabled. Normal food and potion use, including the shared potion cooldown, remains available to living players. Equipment/class changes are locked during the expedition. Knocked-out players cannot move, attack or revive with items; they can watch their party finish. A wipe or timeout ends the run.

All starting participants still present at a successful clear receive 3,500 gold and 7,000 XP once. A knocked-out teammate can share the clear reward; a late spectator cannot. Wave enemies do not respawn, drop hunting loot, advance hunting quests or award island boss first-clears. Combat skill training still follows ordinary hits. Leaving or disconnecting removes that player from active participation. Health/mana restore when the run ends. Use Leave Expedition from anywhere to return to Snowfang Pass free of crystal/key charges. Arena and battleground status are transient and stripped from durable saves; party routing alone persists for reconnection. Start another expedition by leaving and re-entering.

Validation: `npm test`, `npm run typecheck`, `npm run build`, `node scripts/browser-frostfall.mjs`, and `node --env-file-if-exists=apps/server/.env --import tsx --test --test-concurrency=1 tests/frostfall.integration.ts`. Unit tests cover layouts, gates, keys, crafting, special avoidance, party consent, scaling, knockouts, reward duplication and late arrivals. Live tests cover quest claims, five separate solo entries, a four-player party, rejected extra member, ready/loadout lock, potion consumption/cooldown, wave isolation and saved exit. Browser captures cover all five maps, the complete fishing dock, generated warning/impact and mobile HUD. Wave and quest values are initial playtest tuning; a full real-phone expedition and progression playthrough remain practical balance checks.
