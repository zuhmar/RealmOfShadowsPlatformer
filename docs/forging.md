# Bram’s forge

Bram stands at x900 in Elderwood Village. Interact nearby to accept his first crafting quest, smelt bars, forge tools, and claim the reward. Journal also displays the quest; crafting requires standing near Bram.

Requirements are ten times the original proposal: one Iron Bar costs20 Iron Ore; each Iron Pickaxe, Axe, Fishing Rod, or Sickle costs30 Iron Bars and20 Oak Logs. One tool therefore takes600 raw ore plus20 logs. The quest requires30 bars smelted and one tool forged, then rewards25 gold and20 Blacksmithing XP. Each smelt grants5 Blacksmithing XP and each tool15.

Only wooden starters are automatic. Forging adds an Iron tool to owned tools without equipping it. Open Character and explicitly equip Iron for its gathering skill. Equipped Iron tools take80% of the wooden gathering duration and display silver held tools in both character animation sets. Switching tools cancels an active gathering attempt. Higher ore tiers remain future upgrades.

Ownership, equipment, Blacksmithing progression, recipe materials and quest counters persist in character JSON; no database migration is required. The server validates proximity and ownership. Forge transactions lock the character row and compare a persisted revision to reject stale or duplicate material spends. Quest claims also use the durable quest ledger to prevent duplicate rewards.

Validation: direct forging unit tests, database concurrency/duplicate-claim integration test, full browser quest-to-craft-to-manual-equip/save flow, and live mining with the Iron pickaxe.
