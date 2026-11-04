# Whispering Woods balance pass

Run `npm run balance:woods` to reproduce the server combat benchmark and economy calculation. The benchmark uses character level 7, weapon skill level 6, an Ironwood weapon and four crafted armor pieces. It uses server attacks, specials, projectiles, Flurry and hit-based training at 20 ms steps. Random criticals are disabled. These are stationary damage times, not predicted playthrough completion times: travel, spawn waits, incoming attacks and dodging are excluded.

| Class  | Forest Bear at 450 HP | Forest Bear at 1,100 HP |
| ------ | --------------------: | ----------------------: |
| Knight |                4.64 s |                 11.90 s |
| Archer |                5.18 s |                 15.50 s |
| Mage   |                6.02 s |                 17.02 s |
| Rogue  |                2.30 s |                  6.48 s |

The previous bear could die before its first slam impact at about 5.3 seconds, especially against Rogue. Increasing health to 1,100 gives every modeled class a first dodge window. Rogue retains faster close-range single-target damage; ranged classes can attack outside the 150-unit basic attack range. The warning stays 1.8 seconds, the slam stays 88 damage, and basics stay 22 before armor. Four crafted armor pieces give a level-seven character 192 health and 2.5 armor: an unavoided slam still removes about 46% of maximum health. Passive armor/block/dodge cannot cancel the slam.

## Quest and economy constraints retained

- Wolves 15, spiders 30, boars 60, boss 1. No quest count reductions or boss multipliers.
- Starting at level one with no extra kills or offline XP, the required kills finish the stages at levels 3, 5, 7 and 8. Leveling while gathering or repeating fights may change this.
- The chain gives 1,755 gold from required kills, quest turn-ins and the first-clear bonus, before additional hunting or gear sales.
- Normal equipment chance remains 10%, and the bear guarantees one: 11.5 expected pieces from the required kills. At the current rarity weights, expected identification fees total about 684 gold; actual luck and player choices vary substantially.
- 20 ore makes one bar. Each Woods piece costs five bars: 400 ore for four armor pieces, 800 for all eight designs. With a 1–3 yield averaging two resources per three-second cycle, gathering all eight takes about 20 active minutes with wood tools or 16 with an equipped Iron tool, excluding travel, initial tool crafting and other gathering.
- Equipped pieces cannot be sold. Woods sale values before identification are 4/8/20/50/125 gold for Common/Uncommon/Rare/Epic/Legendary; identified monster gear gains 25%. Crafted gear gets no identification premium. Sale proceeds stay below identification fees, avoiding profitable identification-only rerolls or a free crafted-gold loop.

No normal-monster health, skill XP rates, resource yields, crafting costs, drop odds or key odds were changed. These measurements support the current first-island economy; real player sessions should guide later class and encounter tuning.
