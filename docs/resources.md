# Gathering and crafting resource proposal

Status: proposed, not locked. The island order and level bands in this roster are approved and reflected in the world map. Resource names and skill requirements remain proposed. Whispering Woods and Crystal Caverns implement gathering platforms, fishing, smelting, equipment and tool crafting. Crystal nodes require gathering level 11; its fish unlock at levels 11/15/20. Later island gathering remains planned. See `docs/whispering-woods-gathering.md` for the initial mechanics.

Elderwood Village remains the safe hub and is not counted as a hunting island.

## Skill graph

| Gathering   | Crafting      | Unique resources |
| ----------- | ------------- | ---------------- |
| Mining      | Blacksmithing | 7                |
| Woodcutting | Carpentry     | 7                |
| Fishing     | Cooking       | 21               |
| Herbalism   | Alchemy       | 7                |

Four gathering skills plus four crafting skills make eight total skills. The roster has 42 unique resources: six per island, including three fish tiers. Non-fishing level requirements and rarities are unspecified, not automatically equal to island levels.

## Proposed roster

Fish entries show Common / Uncommon / Rare, with their Fishing skill levels.

| Island           | Proposed levels | Mining        | Woodcutting | Herbalism   | Fish (Common / Uncommon / Rare)                                      |
| ---------------- | --------------- | ------------- | ----------- | ----------- | -------------------------------------------------------------------- |
| Whispering Woods | 1–10            | Iron Ore      | Oak Logs    | Greenleaf   | Brook Trout (Lv. 1) / Silver Minnow (Lv. 5) / Golden Carp (Lv. 10)   |
| Crystal Caverns  | 11–20           | Crystal Ore   | Crystalwood | Glowcap     | Crystal Fish (Lv. 11) / Glowfin (Lv. 15) / Prismatic Eel (Lv. 20)    |
| Murkmire Swamp   | 21–30           | Mire Ore      | Bogwood     | Mirebloom   | Mudfish (Lv. 21) / Bog Catfish (Lv. 25) / Venomfin (Lv. 30)          |
| Frostfall Tundra | 31–40           | Frost Ore     | Frostpine   | Frostleaf   | Icefin (Lv. 31) / Frost Salmon (Lv. 35) / Glacier Pike (Lv. 40)      |
| Ember Peaks      | 41–50           | Ember Ore     | Emberwood   | Fireblossom | Lavafin (Lv. 41) / Ember Snapper (Lv. 45) / Inferno Eel (Lv. 50)     |
| Celestial Realm  | 51–60           | Celestial Ore | Starwood    | Moonbloom   | Starfish (Lv. 51) / Moonfin (Lv. 55) / Celestial Koi (Lv. 60)        |
| Shadow Fortress  | 61–100          | Shadow Ore    | Shadowwood  | Nightshade  | Shadow Eel (Lv. 61) / Nightfin (Lv. 65) / Abyssal Leviathan (Lv. 70) |

## Approved island progression

The user approved this proposal's island order and level bands: Ember Peaks at 41–50, Celestial Realm at 51–60, and Shadow Fortress at 61–100. `ISLANDS`, the world map, and `docs/story.md` now follow those bands. The monster and boss roster is retained, including the Shadow Dragon as the final encounter.

The machine-readable draft is `docs/resource-proposal.json`. Non-fishing requirement/rarity fields use null for unspecified values. Resource names and requirements remain adjustable.

## Implementation planning

Build one end-to-end gathering/crafting loop in Whispering Woods before adding all islands: resource nodes, separate skill XP, inventory stacking, a crafting station, and a useful recipe. Mining → Blacksmithing is a natural first loop for Bram and weapon upgrades. Recipe costs, tools, harvesting timing, XP curves, and fish rarity probabilities still need design; they are not inferred from this roster.

Shadow Fortress spans combat levels 61–100. Its currently proposed fishing tiers remain at Fishing levels 61, 65, and 70; additional resource tiers above 70 are not defined.
