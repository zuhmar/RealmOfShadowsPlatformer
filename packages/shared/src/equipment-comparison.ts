import { canUseClassWeapon } from './classes';
import { attackPower, playerAttributes } from './combat-skills';
import { equipGear, type Gear } from './equipment';
import type { Player } from './index';
export const COMPARISON_STATS = {
  attack: 'Attack',
  critChance: 'Crit chance',
  critDamage: 'Crit damage',
  dodgeChance: 'Dodge chance',
  blockChance: 'Block chance',
  armor: 'Armor',
  maxHealth: 'Maximum health',
  maxMana: 'Maximum mana',
  healthRegen: 'Health regen',
  manaRegen: 'Mana regen',
} as const;
export function compareGear(p: Player, gear: Gear) {
  if (gear.slot === 'weapon' && !canUseClassWeapon(p, gear.base)) return [];
  if (!gear.identified || p.level < gear.level || p.equippedGear?.[gear.slot] === gear.id)
    return [];
  const trial = { ...p, equippedGear: { ...p.equippedGear } };
  equipGear(trial, gear.id);
  const before = { ...playerAttributes(p), attack: attackPower(p) };
  const after = { ...playerAttributes(trial), attack: attackPower(trial) };
  return Object.entries(COMPARISON_STATS)
    .map(([key, name]) => {
      const stat = key as keyof typeof COMPARISON_STATS;
      const difference = Math.round((after[stat] - before[stat]) * 10000) / 10000;
      return { stat, name, difference, percent: key.endsWith('Chance') || key === 'critDamage' };
    })
    .filter((row) => row.difference !== 0);
}
