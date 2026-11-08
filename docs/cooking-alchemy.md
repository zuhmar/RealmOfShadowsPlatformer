# Cooking and Alchemy

Open **Skills → Cooking & Alchemy recipes**, or interact with the Cooking Campfire (x1360) or Alchemy Table (x1100) on Elderwood Village’s ground. Recipes can be browsed anywhere. Find each recipe on the corresponding island’s monsters and collect its scroll to permanently unlock crafting; crafting also requires the matching station. Ingredients are consumed and one item is produced per successful craft. Use owned items from the recipe book or the Bag item details.

| Recipe                  | Profession level | Ingredients      | Effect                                                  | Profession XP |
| ----------------------- | ---------------: | ---------------- | ------------------------------------------------------- | ------------: |
| Trout Skewers           |        Cooking 1 | 10 Brook Trout   | +10% attack damage, 10 minutes                          |            20 |
| Silver Minnow Broth     |        Cooking 5 | 15 Silver Minnow | +2 health regeneration/second out of combat, 10 minutes |            35 |
| Golden Carp Feast       |       Cooking 10 | 20 Golden Carp   | +10 percentage points crit chance, 20 minutes           |            55 |
| Crystal Fish Roast      |       Cooking 11 | 20 Crystal Fish  | +20% attack damage, 15 minutes                          |            60 |
| Glowfin Soup            |       Cooking 15 | 25 Glowfin       | +4 health regeneration/second out of combat, 15 minutes |            85 |
| Prismatic Eel Banquet   |       Cooking 20 | 30 Prismatic Eel | +15 percentage points crit chance, 30 minutes           |           110 |
| Greenleaf Health Potion |        Alchemy 1 | 10 Greenleaf     | Restore 40 health                                       |            20 |
| Greenleaf Mana Potion   |        Alchemy 1 | 20 Greenleaf     | Restore 25 mana                                         |            30 |
| Glowcap Health Potion   |       Alchemy 11 | 20 Glowcap       | Restore 100 health                                      |            60 |
| Glowcap Mana Potion     |       Alchemy 15 | 30 Glowcap       | Restore 60 mana                                         |            90 |

Woods recipes require character level 1. Crystal recipes also require character level 11. Crafting requires the listed profession level; using an owned item requires its character level. Professions start at level 1 on old saves and cap at 100. They use the gathering XP curve and never grant character XP or gold.

## Consumption

- One active food buff. Eating another meal replaces it; eating the same meal refreshes its duration without stacking. A HUD badge and recipe-book timer show the active meal.
- Food timestamps persist across travel, death and re-entry, and expire in real time while offline. Bonuses apply to active play, including AUTO; offline reward estimates deliberately exclude food to prevent retroactive claim-time bonuses.
- Equipment remains the source of permanent attributes. Food crit bonuses obey the existing 30% cap. Regeneration follows the existing six seconds without incoming damage rule.
- Health/mana potions share a ten-second cooldown, persist it across re-entry, and clamp restoration to current maxima. An attempt at a full bar rejects without spending an item or starting the cooldown.
- Food and potions are used manually. Existing AUTO healing settings do not automatically consume these items.

## Persistence and validation

Recipe actions use the room’s ordered save queue, per-character action lock, a database row lock and a provision revision. Crafting rechecks location before charging ingredients. Failed or stale transactions do not charge. Client payloads cannot supply costs, effects, output amounts or timestamps. Live healing and inventory deltas preserve damage, regeneration and loot received while saving. Remote players’ snapshots hide crafting skills, food, cooldown and revision fields. Existing character JSON needs no database migration.

Food/potion inventory icons use the generated `recipe-consumables` atlas; both stations remain code-native illustrations. The Alchemy Table replaces the village’s decorative training target; route/collider geometry is unchanged.

## Verification

`npm test`, `npm run build`, `npm run test:integration`, and `node --env-file-if-exists=apps/server/.env scripts/browser-recipes.mjs`. Checks cover exact costs, recipe levels, profession leveling, buff replacement/expiry, capped restoration, shared cooldowns, no full-bar waste, durable re-entry, duplicate/stale crafting, station validation, and desktop/mobile layouts. Screenshots are under ignored `artifacts/`.
