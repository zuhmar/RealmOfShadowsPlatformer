# Murkmire Swamp

Murkmire is the third playable hunting island, levels 21–30. Defeat Crystal Wyrm and reach level 21, then use the ground portal in Shard Scorpion Nest or the exit in Crystal Wyrm Lair. Crystal boss history also grants access to existing characters; discovery is still required before crystal teleportation.

| Area | Level | Monster count | Quest kills |
| --- | --- | --- | --- |
| Bog Slime Pools | 21 | 10 Bog Slimes | 180 |
| Swamp Lurker Marsh | 24 | 10 Swamp Lurkers | 240 |
| Venom Toad Mire | 27 | 10 Venom Toads | 300 |
| Hydra Basin | 30 | 1 Hydra | 1 |

The Mire Warden stands above the fishing dock in the first area. Turn in the Crystal Wyrm quest to start the four sequential Murkmire quests. Only accepted quests count kills, in the exact target area. Rewards are 800/1,100/1,600/2,500 gold, with 30 Bogwood from Lurkers and one guaranteed Hydra Key from Toads. Venom Toads also have a 20% key chance.

The Hydra Root Idol is the portal on the uppermost ledge in Venom Toad Mire. Every entry, including a direct crystal teleport, consumes one key. Hydra has twice the normal boss sprite scale, a basic attack and a fixed-position, 1.8-second Venom Eruption warning. Leaving the marked area or moving above its damage height avoids the strike. The generated eight-frame eruption follows server impact; it does not apply additional client damage. First victory awards 1,800 extra gold and one trophy, exactly once. Frostfall remains unavailable.

Four separate platforms provide Mire Ore, Bogwood, Mirebloom and fishing. Fish unlock at Fishing 21/25/30: Mudfish, Bog Catfish and Venomfin. Continuous gathering and equipped-tool rules match existing islands. Smelting remains 20 ore per bar. Mire tools cost 20 bars and 80 Bogwood, require character/Blacksmithing 21 and must be equipped manually. All recipes must be discovered from hunting before crafting.

Swamp weapons and armor use the existing generated equipment set. Monster gear may be identified; crafted gear has fixed stats. Mudfish Roast gives +30% damage for 20 minutes, Catfish Stew gives +6 out-of-combat regeneration for 20 minutes, and Venomfin Feast adds 20 percentage points of crit for 30 minutes, subject to the existing cap. Mirebloom potions restore 180 HP or 100 MP and share the normal potion cooldown. Food replaces the current food buff.

New loot/resources can be displayed at home on the swamp stand. Maps have distinct ladder-connected layouts and whole generated platform spans; backgrounds and props preserve aspect ratio. Art sources are retained alongside content-addressed optimized delivery copies. Frame bounds exclude neighboring atlas silhouettes.

Validation: `npm test`, `npm run test:integration`, `npm run build`, `node scripts/browser-murkmire.mjs`, and `node --env-file-if-exists=apps/server/.env scripts/browser-murkmire-flow.mjs`. Browser captures are written under `artifacts/`. The browser map fixture validates all four maps, spawn counts, aspect-preserving terrain, and generated warning/impact effects; the live flow checks NPC interaction and durable quest acceptance. Balance values are an initial test tuning pass, not a measured full-leveling playthrough.

Murkmire terrain uses cracked purple-gray mudstone with exposed mangrove roots, sparse teal slime and violet mushrooms below the rim. It replaces the original bright mossy Woods-like ledges in all four areas; the bank and underground fill come from the same generated source. Layouts, resource ledges, ladders, fishing dock, and progression are unchanged.
