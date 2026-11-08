import { canEquipSkin, validSkin } from '@ros/game-data';
import type { Player } from './index';
export function equipSkin(p: Player, skin: unknown) {
  if (!validSkin(skin)) throw new Error('Unknown skin.');
  if (!canEquipSkin(p.classId, skin)) throw new Error('That skin requires its matching class.');
  p.skin = skin ?? 'golden-test';
  p.skinConceptVersion = 2;
}
/** Adopt new class artwork once, then preserve free allowed appearance choices. */
export function normalizeSkin(p: Player) {
  if (p.skinConceptVersion !== 2) {
    p.skin = p.classId ?? 'golden-test';
    p.skinConceptVersion = 2;
    return true;
  }
  if (p.skin === undefined || p.skin === null || !canEquipSkin(p.classId, p.skin)) {
    p.skin = p.classId ?? 'golden-test';
    return true;
  }
  return false;
}
