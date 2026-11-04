import { visitArea } from './teleport';
import { MAPS, itemDefinition, type GameMap } from '@ros/game-data';
import type { Player } from './index';
/** Validate everything before consuming a boss key or changing any player state. */
export function usePortal(p: Player, source: GameMap) {
  const portal = source.portals.find((q) => Math.abs(q.x - p.x) < 110 && Math.abs(q.y - p.y) < 65);
  if (!portal) throw new Error('Walk close to a portal first.');
  const target = MAPS[portal.target];
  if (!target) throw new Error('That area is not open yet.');
  if (
    target.island === 'Crystal Caverns' &&
    !p.unlockedIslands?.includes('crystal') &&
    !p.bossKills?.['forest-bear']
  )
    throw new Error('Defeat the Forest Bear to earn Crystal Caverns access.');
  if (p.level < target.requiredLevel) throw new Error(`Reach level ${target.requiredLevel} first.`);
  if (portal.key && !(p.inventory[portal.key] >= 1))
    throw new Error(
      `Requires 1 ${itemDefinition(portal.key)?.name ?? portal.key}. The preceding monster area drops these keys.`,
    );
  if (portal.key) {
    p.inventory[portal.key]--;
    if (!p.inventory[portal.key]) delete p.inventory[portal.key];
  }
  const arrival = target.portals.find((q) => q.target === source.id);
  visitArea(p, source.id);
  visitArea(p, target.id);
  p.mapId = target.id;
  p.x = arrival && arrival.x > target.width / 2 ? arrival.x - 100 : target.spawn.x;
  p.y = arrival?.y ?? target.spawn.y;
  p.vx = 0;
  p.vy = 0;
  p.platform =
    target.platforms.find((f) => Math.abs(f.y - p.y) < 1 && p.x >= f.x && p.x <= f.x + f.width)
      ?.id ?? 'ground';
  p.grounded = true;
  p.climbing = false;
  p.auto = false;
  delete p.gathering;
  return target.id;
}
