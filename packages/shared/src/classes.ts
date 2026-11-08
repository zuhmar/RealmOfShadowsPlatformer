import {
  CLASS_PATHS,
  CLASS_CHANGE_GOLD,
  CLASS_TALENTS,
  weaponKind,
  weaponSkillProgression,
  WEAPON_SKILL,
  type ClassId,
  type ClassTalent,
} from '@ros/game-data';
import type { Player } from './index';
export function canUseClassWeapon(p: Pick<Player, 'classId'>, weapon: string | null) {
  return (
    !p.classId ||
    !weapon ||
    weaponKind(weapon) === 'unarmed' ||
    CLASS_PATHS[p.classId].weapon === weaponKind(weapon)
  );
}
export function classPoints(p: Player) {
  const earned = Math.min(15, Math.floor(p.level / 5));
  return Math.max(0, earned - Object.values(p.classTalents ?? {}).reduce((sum, n) => sum + n, 0));
}
export function chooseClass(p: Player, id: string) {
  if (!Object.hasOwn(CLASS_PATHS, id)) throw new Error('Unknown class.');
  if (!p.quests?.['crystal-class-trial']?.claimed)
    throw new Error('Complete the class trial in Crystal Caverns before choosing a class.');
  if (p.classId === id) throw new Error('You already follow this path.');
  if (p.classId && p.gold < CLASS_CHANGE_GOLD)
    throw new Error(`Changing class costs ${CLASS_CHANGE_GOLD} gold.`);
  if (p.classId) p.gold -= CLASS_CHANGE_GOLD;
  p.classId = id as ClassId;
  p.skin = id as ClassId;
  p.skinConceptVersion = 2;
  p.classTalents = {};
  if (!canUseClassWeapon(p, p.weapon)) {
    p.weapon = null;
    if (p.equippedGear) delete p.equippedGear.weapon;
  }
  p.classRevision = (p.classRevision ?? 0) + 1;
}
export function trainClassTalent(p: Player, id: string) {
  if (!p.classId) throw new Error('Choose a class first.');
  if (!Object.hasOwn(CLASS_TALENTS, id)) throw new Error('Unknown talent.');
  const talent = id as ClassTalent,
    rank = p.classTalents?.[talent] ?? 0;
  if (classPoints(p) < 1 || rank >= CLASS_TALENTS[talent].max)
    throw new Error('No available talent point or talent already mastered.');
  (p.classTalents ??= {})[talent] = rank + 1;
  p.classRevision = (p.classRevision ?? 0) + 1;
}
export const classSkillCooldown = (p: Player) =>
  WEAPON_SKILL.cooldown - (p.classId ? (p.classTalents?.discipline ?? 0) * 100 : 0);
export function classSkillEvolution(p: Player) {
  const base = weaponSkillProgression(p.weapon),
    rank = p.classId ? (p.classTalents?.signature ?? 0) : 0;
  return {
    ...base,
    damageMultiplier: base.damageMultiplier * (1 + rank * 0.04),
    flurryMultiplier: base.flurryMultiplier * (1 + rank * 0.04),
    meleeReach: base.meleeReach + (p.classId === 'knight' ? rank * 6 : 0),
    arrowRangeMultiplier: base.arrowRangeMultiplier + (p.classId === 'archer' ? rank * 0.1 : 0),
    burstRadius: base.burstRadius + (p.classId === 'mage' ? rank * 20 : 0),
    maxTargets:
      base.maxTargets +
      (['knight', 'archer', 'mage'].includes(p.classId ?? '') ? Math.floor(rank / 3) : 0),
    flurryStrikes: base.flurryStrikes + (p.classId === 'rogue' ? Math.floor(rank / 3) : 0),
  };
}

export const playerClassName = (p: Pick<Player, 'classId'>) =>
  p.classId ? CLASS_PATHS[p.classId].name : 'Civilian';
