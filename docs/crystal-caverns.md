# Crystal Caverns and alpha systems

Enter from the ground-level portal at the far right of Brambleboar Run, or the village’s upper terrace. Both routes require level 11 and earned Forest Bear access. The boar area’s keyed bear entrance stays on its separate upper platform.

Crystal Caverns is the second playable island (levels 11–20): Cave Bats, Crystal Golems, Shard Scorpions and Crystal Wyrm have distinct connected platform layouts. Regular areas contain ten monsters; the boss room contains one double-sized boss with a basic attack and telegraphed animated eruption. The upper boss entrance consumes one Crystal key per entry. Scorpions can drop keys; the scorpion quest grants one.

The Cavern Mentor’s quests require 90 bats, 120 golems, 180 scorpions and one Wyrm, sequentially. Claiming the bat trial unlocks the first free class choice at the mentor. Future changes cost 500 gold at the mentor or Mira, refund talents and unequip incompatible weapons. The server checks both the durable quest ledger and location. Knight/Rogue train Melee, Mage trains Magic, Archer trains Distance; Civilian has no active combat training. Training only raises base damage. Each class has mastery, signature and discipline talents with one point per five character levels, up to 15 points.

Four separate platforms provide Crystal Ore, Crystalwood, Glowcap and fishing. Gathering requires the matching skill at level 11. Fish tiers unlock at 11/15/20. Crystal tools require ten Crystal bars and forty Crystalwood; each bar uses twenty ore. Only wooden tools are automatic. Other tools must be owned, level-eligible and explicitly equipped. Crystal tools reduce gathering duration by 35%.

Offline jobs use discovered hunting/gathering areas and an eight-hour cap at 35% modeled active efficiency. Hunting gives deterministic XP/gold, with combat training only after class choice; it does not advance quests or award equipment, boss keys or boss kills. Gathering awards normal resources, common fish only, and gathering XP. Claims and class changes use locked database transactions to prevent duplicate rewards or charges.

Unexpected socket loss reserves the character for thirty seconds, pauses AUTO/gathering and removes the character from combat. Reconnection restores the same live character and cooldowns. Expired recovery returns to character selection; server restarts rely on the last confirmed save. Intentional exits still wait for save confirmation.

Sound effects and optional ambient music use Web Audio, start after interaction, persist volume/mute preferences and suspend in hidden tabs. Outfit recoloring is lazy; island-weapon textures retain their existing bounded cache. Each player receives their own progression and only remote players’ visual/combat state in snapshots.

## Reproducible checks

Run unit/type/build checks plus database integration tests. With web and server running, run `node scripts/browser-crystal.mjs`, character/island-weapon/gathering animation checks and `node --env-file-if-exists=apps/server/.env --import tsx scripts/load-room.mjs`.

The local 24-client, ten-monster room check recorded 94.82 ms p95 snapshot interval and 29,217 average snapshot bytes over twelve seconds. This is a local regression measurement, not a production capacity claim. Desktop/mobile viewport rendering is automated Chromium emulation; physical-phone testing remains outstanding.

The class trial now opens a sprite carousel after its reward is claimed. All four classes now use the Celestial figure, with matching outfit previews and equipped weapon animation sheets. Existing characters migrate to this appearance automatically; see [character direction](character-concept.md). Crystal terrain uses continuous mineral ledges and full-height matching ladders, with no repeated end caps. See [class skins and proportional terrain](class-skins.md).
