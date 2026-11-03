# Woods quests, loot and first-clear rewards

The quest chain grows harder through both counts and monster strength. Mira offers each step only after the previous reward has been turned in. Kills before acceptance or in the wrong area do not count.

| Quest | Objective | Reward |
| --- | --- | --- |
| The first trial |15 Wolves | Existing75 gold and four class weapons |
| Silk and shadows |30 Thorn Spiders |100 gold,5 Greenleaf |
| Break the bramble line |60 Wild Boars |200 gold, one guaranteed Forest Bear Key |
| The guardian of the woods |1 Forest Bear |500 gold |

The boss objective requires one mechanically harder fight: its doubled size, basic attack, heavy dodge attack and key requirement remain in place. Later island quest chains should continue increasing workload and monster challenge when those islands are built.

Unique collectible loot: Wolves add Wolf Pelts to their existing loot bundle; spiders drop Thorn Silk; boars drop Boar Tusks (their20% direct key roll is unchanged); Forest Bear drops a claw and has a10% chance to include a Forest Guardian Ring. Ground loot remains owner-only and expires after60 seconds. Collecting a bundle grants all its items once.

The ring is a universal accessory, manually equipped in Character. It grants+4 attack to every class weapon, including skill damage. Both ownership and equipment are checked when calculating the bonus. A forged accessory ID or a missing inventory item gives no bonus. The accessory and inventory persist in character JSON.

The first Forest Bear victory immediately grants100 gold, one trophy, and the persistent `crystal` island unlock. A durable first-clear flag prevents repeats. Existing characters with a recorded bear victory receive the same milestone once on login. The world map displays earned access with an original unlock emblem. Crystal Caverns hunting maps remain the next island build; earning access does not create or enable unfinished maps.

All six loot/reward sprites are original transparent RGBA artwork in `ui/woods-loot.png`, with measured atlas bounds. The separate `crystal-unlock.png` is also original transparent artwork. Generated source PNG bytes are preserved.

Quest transactions lock the character row, check durable prerequisites and progress, conditionally claim once, and save reward inventory and gold atomically. The original Mira weapon-kit migration applies only to the first quest. Room serialization blocks overlapping actions during turn-in. No schema migration is needed.

Validation covers increasing requirements/rewards, acceptance and map gates, loot/rare roll boundaries and collection, first-clear idempotence, all weapon paths with a manually equipped ring, durable prerequisite checks, parallel claim rejection, full-chain turn-ins, and live desktop/mobile sprite, journal, ring and unlock UI/save behavior.

Regular kill objectives are15/30/60. Boss quests always require one boss kill; all island definitions use the shared one-kill standard. Existing accepted progress is retained; already claimed quests stay completed. Rewards, loot chances, first-clear rewards, and one-key-per-entry costs are unchanged. Legacy weapon-kit claims remain eligible under their previously completed wolf objective.
