import {
  MAPS,
  QUESTS,
  ISLAND_AREAS,
  TELEPORT_CRYSTAL,
  TELEPORT_CRYSTAL_PRICE,
} from '@ros/game-data';
import type { Player } from './index';
export function visitArea(p: Player, id: string) {
  p.visitedAreas ??= [];
  if (Object.hasOwn(MAPS, id) && !p.visitedAreas.includes(id)) p.visitedAreas.push(id);
}
export function initializeTeleport(p: Player) {
  const before = JSON.stringify([p.visitedAreas, p.teleportStarterGranted]);
  visitArea(p, 'village');
  visitArea(p, p.mapId);
  for (const [id, state] of Object.entries(p.quests ?? {}))
    if (state.progress > 0 || state.claimed) {
      const quest = QUESTS[id as keyof typeof QUESTS];
      if (quest) visitArea(p, quest.target.mapId);
    }
  if ((p.bossKills?.['forest-bear'] ?? 0) > 0) visitArea(p, 'woods-boss');
  if (!p.teleportStarterGranted) {
    p.inventory[TELEPORT_CRYSTAL] = (p.inventory[TELEPORT_CRYSTAL] ?? 0) + 3;
    p.teleportStarterGranted = true;
  }
  return before !== JSON.stringify([p.visitedAreas, p.teleportStarterGranted]);
}
export function teleportKey(target: string) {
  return ISLAND_AREAS.find((island) => island.areas[3] === target)?.bossKey;
}
export function teleportBlock(p: Player, id: string): string | null {
  const target = Object.hasOwn(MAPS, id) ? MAPS[id] : undefined;
  if (!target) return 'This area is coming in a future island update.';
  if (p.mapId === id) return 'You are here.';
  if (p.level < target.requiredLevel) return `Requires level ${target.requiredLevel}.`;
  if (!p.visitedAreas?.includes(id)) return 'Visit this area through its portal first.';
  if (!((p.inventory[TELEPORT_CRYSTAL] ?? 0) >= 1)) return 'Requires 1 Teleport Crystal.';
  const key = teleportKey(id);
  if (key && !((p.inventory[key] ?? 0) >= 1)) return 'Requires 1 boss key as well as a crystal.';
  return null;
}
export function useTeleport(p: Player, id: string) {
  const blocked = teleportBlock(p, id);
  if (blocked) throw new Error(blocked);
  const target = MAPS[id],
    key = teleportKey(id);
  for (const item of [TELEPORT_CRYSTAL, ...(key ? [key] : [])]) {
    p.inventory[item]--;
    if (p.inventory[item] === 0) delete p.inventory[item];
  }
  p.mapId = id;
  p.x = target.spawn.x;
  p.y = target.spawn.y;
  p.vx = 0;
  p.vy = 0;
  p.platform =
    target.platforms.find((f) => Math.abs(f.y - p.y) < 1 && p.x >= f.x && p.x <= f.x + f.width)
      ?.id ?? 'ground';
  p.grounded = true;
  p.climbing = false;
  p.auto = false;
  p.targetId = null;
  delete p.gathering;
  return id;
}
export function buyTeleportCrystal(p: Player) {
  if (p.gold < TELEPORT_CRYSTAL_PRICE)
    throw new Error(`A Teleport Crystal costs ${TELEPORT_CRYSTAL_PRICE} gold.`);
  p.gold -= TELEPORT_CRYSTAL_PRICE;
  p.inventory[TELEPORT_CRYSTAL] = (p.inventory[TELEPORT_CRYSTAL] ?? 0) + 1;
}
