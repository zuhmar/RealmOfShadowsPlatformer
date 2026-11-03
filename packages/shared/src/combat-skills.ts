import {
  weaponKind,
  maxHp,
  damage,
  combatSkillXpNeeded,
  type CombatSkill,
  type OffensiveSkill,
} from '@ros/game-data';
import { attackBonus } from './woods-progression';
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
    defense = rank('Defense'),
    evasion = rank('Evasion'),
    vitality = rank('Vitality'),
    focus = rank('Focus');
  return {
    activeSkill: active,
    trainingDamage: offense * 2,
    critChance: active ? Math.min(0.3, offense * 0.003 + focus * 0.002) : 0,
    critDamage: Math.min(2.5, 1.5 + focus * 0.02),
    dodgeChance: Math.min(0.25, evasion * 0.005),
    blockChance: Math.min(0.3, defense * 0.004),
    blockReduction: Math.min(0.6, 0.35 + defense * 0.002),
    armor: Math.min(30, defense * 0.5),
    maxHealth: maxHp(p.level) + vitality * 3,
    maxMana: 50 + focus * 2,
    healthRegen: 3 + vitality * 0.03,
    manaRegen: 1.5 + focus * 0.02,
  };
}
export const attackPower = (p: Player) =>
  damage(p.level, attackBonus(p)) + playerAttributes(p).trainingDamage;
