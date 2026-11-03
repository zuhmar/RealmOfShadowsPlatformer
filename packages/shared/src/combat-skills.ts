import {
  weaponKind,
  maxHp,
  damage,
  combatSkillXpNeeded,
  type CombatSkill,
  type OffensiveSkill,
} from '@ros/game-data';
import { attackBonus } from './woods-progression';
import { gearAttributes } from './equipment';
import type { Player } from './index';
export function weaponTrainingSkill(weapon: string | null): OffensiveSkill | null {
  const kind = weaponKind(weapon);
  return kind === 'sword' || kind === 'dagger'
    ? 'Melee'
    : kind === 'staff'
      ? 'Magic'
      : kind === 'bow'
        ? 'Distance'
        : null;
}
export function trainCombat(p: Player, skill: CombatSkill, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  const state = ((p.combatSkills ??= {})[skill] ??= { level: 1, xp: 0 });
  if (state.level >= 100) {
    state.xp = 0;
    return;
  }
  state.xp += amount;
  while (state.level < 100 && state.xp >= combatSkillXpNeeded(state.level)) {
    state.xp -= combatSkillXpNeeded(state.level);
    state.level++;
  }
  if (state.level >= 100) state.xp = 0;
}
export function playerAttributes(p: Player) {
  const active = weaponTrainingSkill(p.weapon);
  const rank = (skill: CombatSkill) =>
    Math.max(0, Math.min(99, (p.combatSkills?.[skill]?.level ?? 1) - 1));
  const offense = active ? rank(active) : 0,
    gear = gearAttributes(p);
  return {
    activeSkill: active,
    trainingDamage: offense * 2,
    critChance: Math.min(0.3, gear.critChance),
    critDamage: Math.min(2.5, 1.5 + gear.critDamage),
    dodgeChance: Math.min(0.25, gear.dodgeChance),
    blockChance: Math.min(0.3, gear.blockChance),
    blockReduction: 0.35,
    armor: Math.min(30, gear.armor),
    maxHealth: maxHp(p.level) + gear.health,
    maxMana: 50 + gear.mana,
    healthRegen: 3 + gear.healthRegen,
    manaRegen: 1.5 + gear.manaRegen,
  };
}
export const attackPower = (p: Player) =>
  damage(p.level, attackBonus(p)) + playerAttributes(p).trainingDamage;
