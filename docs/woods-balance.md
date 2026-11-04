# Whispering Woods balance pass

Run `npm run balance:woods` to reproduce the server damage and economy benchmark. Woods uses a level-seven Civilian with an Ironwood weapon and four crafted armor pieces; saved combat training is inactive before class choice. Crystal uses level 20, training level 10, matching Crystal gear and four talent points. Random attributes are absent. These stationary damage times exclude incoming attacks, dodging, travel and respawn waits; they are not playthrough predictions.

| Weapon path    | Forest Bear, 1,100 HP | Crystal Wyrm, 8,500 HP |
| -------------- | --------------------: | ---------------------: |
| Sword / Knight |               15.86 s |                44.24 s |
| Bow / Archer   |               17.22 s |                49.90 s |
| Staff / Mage   |               18.02 s |                53.02 s |
| Dagger / Rogue |               12.56 s |                35.36 s |

Dagger damage is scaled to 70% to account for its fast attack interval; bow uses 110% and staff 120%. Rogue retains stronger close-range sustained damage. Every modeled weapon encounters the bear’s first dodge window. The bear’s 1.8-second warning and 88-damage slam remain; the Wyrm’s animated eruption deals 192 damage before avoidance. Equipment remains the source of critical, dodge, block and other attributes.

## Quest and economy constraints retained

- Wolves 15, spiders 30, boars 60, boss 1. No quest count reductions or boss multipliers.
- Starting at level one with no extra kills or offline XP, the required kills finish the stages at levels 3, 5, 7 and 8. Leveling while gathering or repeating fights may change this.
- The chain gives 1,755 gold from required kills, quest turn-ins and the first-clear bonus, before additional hunting or gear sales.
- Normal equipment chance remains 10%, and the bear guarantees one: 11.5 expected pieces from the required kills. At the current rarity weights, expected identification fees total about 684 gold; actual luck and player choices vary substantially.
- 20 ore makes one bar. Each Woods piece costs five bars: 400 ore for four armor pieces, 800 for all eight designs. With a 1–3 yield averaging two resources per three-second cycle, gathering all eight takes about 20 active minutes with wood tools or 16 with an equipped Iron tool, excluding travel, initial tool crafting and other gathering.
- Equipped pieces cannot be sold. Woods sale values before identification are 4/8/20/50/125 gold for Common/Uncommon/Rare/Epic/Legendary; identified monster gear gains 25%. Crafted gear gets no identification premium. Sale proceeds stay below identification fees, avoiding profitable identification-only rerolls or a free crafted-gold loop.

No normal-monster health, skill XP rates, resource yields, crafting costs, drop odds or key odds were changed. These measurements support the current first-island economy; real player sessions should guide later class and encounter tuning.

Regular Woods hunting rooms now contain ten monsters instead of five; the Forest Bear room still contains one boss. This increases available targets without changing per-monster drops or rank-one Ironwood combat. Later equipment tiers evolve weapon specials through seven ranks; the Woods benchmark continues to use rank one.
