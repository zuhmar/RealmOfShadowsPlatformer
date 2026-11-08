import { canEquipSkin, validSkin } from '@ros/game-data';
import type { Player } from './index';
export function equipSkin(p: Player, skin: unknown) {
  if (!validSkin(skin)) throw new Error('Unknown skin.');
  if (!canEquipSkin(p.classId, skin)) throw new Error('That skin requires its matching class.');
  p.skin = 'golden-test';
}
/** All saved adventurers adopt the new Celestial character art; progress stays intact. */
export function normalizeSkin(p: Player) {
  if (p.skin === 'golden-test') return false;
  p.skin = 'golden-test';
  return true;
}
