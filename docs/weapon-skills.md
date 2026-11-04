# Starter weapon skills

J remains the existing basic attack. K (or the skill button) uses the equipped weapon's special attack. All starter weapons remain available to Civilians for class trials.

Every skill costs 12 MP and has a shared five-second base cooldown, reduced by class discipline talents. Switching weapons cannot reset that cooldown or the weapon's existing attack recovery. The skill button displays remaining seconds, dims while unavailable, and shows MP when mana is insufficient. AUTO uses the same server-authoritative skill rules and continues basic attacks when mana is low.

| Weapon | Skill        | Behavior                                                                                                                                                                                               |
| ------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sword  | Cleave       | Double damage to the nearest three targets in front, within 120 units and the existing vertical melee tolerance.                                                                                       |
| Bow    | Power Shot   | Double-damage arrow, 420-unit range, faster flight, and up to three pierced targets in travel order. A target can only be hit once per arrow; no splash damage.                                        |
| Staff  | Arcane Burst | Double-damage orb that explodes on first impact, affecting up to three targets within 140 horizontal and 55 vertical units of the impact target.                                                       |
| Dagger | Flurry       | Three basic-strength hits against one nearby target, at cast, +110ms, and +220ms. Follow-up hits recheck range/facing and cancel after target death, weapon change, owner departure, or player defeat. |

Actual casts and impacts use animated effects matching the equipped weapon’s island theme; empowered arrows/orbs also have distinct projectile visuals. Effects are cosmetic. Damage, mana, cooldowns, collision and kill rewards remain authoritative on the server. No database migration is required.

Validation covers basic-attack regressions, targeting and vertical separation, piercing order and duplicate-hit prevention, explosion geometry, timed Flurry hits and cancellation, mana/cooldown rejection, kill rewards, AUTO hunting, desktop/mobile effects and cleanup, and live skill-button cooldown feedback.

Equipment tiers evolve damage and coverage through seven ranks. After the Crystal Caverns class quest, mastery raises base damage, signature improves the class special and discipline reduces its cooldown. Equipment remains the source of critical, block, dodge and other attributes.
