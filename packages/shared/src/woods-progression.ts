import { weaponBonus, FOREST_BEAR_FIRST_CLEAR_GOLD, WOODS_ITEMS } from '@ros/game-data';
import type { Player } from './index';
export function applyWoodsMilestones(p: Player) {
  if (!((p.bossKills?.['forest-bear'] ?? 0) > 0)) return false;
  p.unlockedIslands ??= [];
  if (!p.unlockedIslands.includes('crystal')) p.unlockedIslands.push('crystal');
  p.firstClearRewards ??= [];
  if (p.firstClearRewards.includes('forest-bear')) return false;
  p.firstClearRewards.push('forest-bear');
  p.inventory['forest-bear-trophy'] = (p.inventory['forest-bear-trophy'] ?? 0) + 1;
  p.gold += FOREST_BEAR_FIRST_CLEAR_GOLD;
  return true;
}
export function attackBonus(p: Pick<Player, 'weapon' | 'accessory' | 'inventory'>) {
  return (
    weaponBonus(p.weapon) +
    (p.accessory === 'forest-guardian-ring' && (p.inventory[p.accessory] ?? 0) > 0
      ? WOODS_ITEMS['forest-guardian-ring'].bonus
      : 0)
  );
}
