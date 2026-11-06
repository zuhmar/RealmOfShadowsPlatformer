import { canEquipSkin, validSkin } from '@ros/game-data';
import type { Player } from './index';
export function equipSkin(p: Player, skin: unknown) {
  if (!validSkin(skin)) throw new Error('Unknown skin.');
  if (!canEquipSkin(p.classId, skin)) throw new Error('That skin requires its matching class.');
  p.skin = skin;
}
/** Migrate previously unrestricted class cosmetics without changing combat progress. */
export function normalizeSkin(p: Player) {
  if (p.skin === undefined || canEquipSkin(p.classId, p.skin)) return false;
  p.skin = p.classId ?? null;
  return true;
}
