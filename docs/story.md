# Realm of Shadows story foundation

The protagonist is a boy whose hometown was attacked by the Shadow Dragon. The dragon killed everyone except him. He trained for years after surviving the attack. He is now ready to begin the journey to slay the Shadow Dragon.

This is the canonical premise. Do not change the attack into a disappearance, leave other hometown survivors, replace the Shadow Dragon, or treat the hero as someone who has never trained. The hometown's name, the hero's personal name, and the dragon's motives are not yet established. Player appearance customization remains available; dialogue addresses the player as “you.”

Elderwood Village is the safe hub at the beginning of the playable journey. It is not identified as the destroyed hometown. Mira's first trial tests the survivor's years of training: accept her quest, defeat 15 Wolves in Wolf Hollow, return to her, and receive 75 gold plus one starter weapon for each path: a Knight’s sword, Archer’s bow, Mage’s staff, and Rogue’s dagger. Later trials and islands should build toward Shadow Fortress and the final Shadow Dragon encounter.

The opening and quest dialogue are defined in `packages/game-data/src/index.ts` (`STORY`, `QUESTS`). New story content should follow this foundation without inventing permanent lore for unspecified islands.

## Island progression

The confirmed island roster and level ranges are:

| Island | Levels | Monsters | Boss |
| --- | --- | --- | --- |
| Whispering Woods | 1–10 | Wolf, Thorn Spider, Wild Boar | Forest Bear |
| Crystal Caverns | 11–20 | Cave Bat, Crystal Golem, Shard Scorpion | Crystal Wyrm |
| Murkmire Swamp | 21–30 | Bog Slime, Swamp Lurker, Venom Toad | Hydra |
| Frostfall Tundra | 31–40 | Frost Wolf, Ice Troll, Frozen Wraith | Frost Giant |
| Ember Peaks | 41–50 | Fire Imp, Magma Golem, Ember Salamander | Infernal Drake |
| Celestial Realm | 51–60 | Fallen Sprite, Celestial Sentinel, Astral Wisp | Fallen Seraph |
| Shadow Fortress | 61–100 | Shadow Knight, Shadow Lich, Void Stalker | Shadow Dragon |

This roster is stored in `ISLANDS` and shown in the world map. It is a content plan, not a declaration that all areas, enemies, or bosses are implemented. Elderwood Village and Wolf Hollow remain the playable maps. Build the rest of Whispering Woods next: Thorn Spider, Wild Boar, then Forest Bear and the quest progression leading to it. Bram's quest should support that roster rather than introducing a different first boss.

The island ordering and bands follow the approved resource-proposal revision: Ember Peaks precedes Celestial Realm and the final island spans 61–100. The resource roster itself remains proposed; see `docs/resources.md`.
