# Bram’s forge

Bram stands at x900 in Elderwood Village. Interact nearby to accept his first crafting quest, smelt bars, forge tools, and claim the reward. Journal also displays the quest; crafting requires standing near Bram.

One Iron Bar costs20 Iron Ore; each Iron Pickaxe, Axe, Fishing Rod, or Sickle costs5 Iron Bars and20 Oak Logs. One tool therefore takes100 raw ore plus20 logs. The quest requires5 bars smelted and one tool forged, then rewards25 gold and20 Blacksmithing XP. Each smelt grants5 Blacksmithing XP and each tool15.

Only wooden starters are automatic. Forging adds an Iron tool to owned tools without equipping it. Open Character and explicitly equip Iron for its gathering skill. Equipped Iron tools take80% of the wooden gathering duration and display silver held tools in both character animation sets. Switching tools cancels an active gathering attempt. Iron is the entry crafting tier; later ore tiers should require progressively more materials when their recipes are added. Higher ore tiers remain future upgrades.

Ownership, equipment, Blacksmithing progression, recipe materials and quest counters persist in character JSON; no database migration is required. The server validates proximity and ownership. Forge transactions lock the character row and compare a persisted revision to reject stale or duplicate material spends. Quest claims also use the durable quest ledger to prevent duplicate rewards.

Validation: direct forging unit tests, database concurrency/duplicate-claim integration test, full browser quest-to-craft-to-manual-equip/save flow, and live mining with the Iron pickaxe.

Bram uses an original transparent1254×1254 blacksmith sprite at `/assets/characters/bram.png`, with a measured boot baseline and90px visible height. His existing interaction zone and forge UI remain in place.
