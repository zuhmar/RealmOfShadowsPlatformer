import {
  CARPENTRY_RECIPES,
  HOUSING_PLOTS,
  HOUSING_PLATFORM,
  houseStageCost,
  gatheringXpNeeded,
  type PlotSize,
} from '@ros/game-data';
import type { Player } from './index';
export type Housing = {
  size: PlotSize;
  stage: number;
  invited: string[];
  furniture: { id: string; item: string; x: number }[];
};
export type HousingView = {
  ownerId: string;
  ownerName: string;
  size: PlotSize;
  stage: number;
  furniture: Housing['furniture'];
};
export function nearHousing(p: Pick<Player, 'mapId' | 'x' | 'y'>) {
  return (
    p.mapId === 'village' &&
    p.x >= HOUSING_PLATFORM.x - 40 &&
    p.x <= HOUSING_PLATFORM.x + HOUSING_PLATFORM.width + 40 &&
    Math.abs(p.y - HOUSING_PLATFORM.y) <= 85
  );
}
export function housingView(owner: Player, viewer: Player): HousingView | undefined {
  if (!owner.housing || (owner.id !== viewer.id && !owner.housing.invited.includes(viewer.id)))
    return;
  return {
    ownerId: owner.id,
    ownerName: owner.name,
    size: owner.housing.size,
    stage: owner.housing.stage,
    furniture: structuredClone(owner.housing.furniture),
  };
}
function spend(p: Player, cost: Record<string, number>) {
  if (!Object.entries(cost).every(([id, n]) => (p.inventory[id] ?? 0) >= n))
    throw new Error('Gather the required building materials first.');
  for (const [id, n] of Object.entries(cost)) p.inventory[id] -= n;
}
function train(p: Player, xp: number) {
  const s = (p.carpentry ??= { level: 1, xp: 0 });
  s.xp += xp;
  while (s.level < 100 && s.xp >= gatheringXpNeeded(s.level)) {
    s.xp -= gatheringXpNeeded(s.level);
    s.level++;
  }
  if (s.level >= 100) s.xp = 0;
}
export function changeHousing(
  p: Player,
  value: { action?: unknown; id?: unknown; x?: unknown; quantity?: unknown },
) {
  if (!nearHousing(p)) throw new Error('Climb to the housing platform in central Elderwood.');
  const id = typeof value.id === 'string' ? value.id : '';
  const level = p.carpentry?.level ?? 1;
  if (value.action === 'plot') {
    if (!Object.hasOwn(HOUSING_PLOTS, id)) throw new Error('Choose a valid plot size.');
    const size = id as PlotSize,
      def = HOUSING_PLOTS[size],
      old = p.housing;
    if (old && def.width <= HOUSING_PLOTS[old.size].width)
      throw new Error('You already own this size or a larger plot.');
    if (level < def.level) throw new Error(`Requires Carpentry level ${def.level}.`);
    if (!(p.unlockedRecipes ?? []).includes(`house-${size}`))
      throw new Error('Find this house blueprint on Whispering Woods monsters.');
    spend(p, def.cost);
    p.housing = {
      size,
      stage: old?.stage ?? 0,
      invited: old?.invited ?? [],
      furniture: old?.furniture ?? [],
    };
    train(p, 40);
  } else if (value.action === 'build') {
    if (!p.housing || p.housing.stage >= 3)
      throw new Error('Choose a plot or finish decorating your completed house.');
    spend(p, houseStageCost(p.housing.size, p.housing.stage));
    p.housing.stage++;
    train(p, 40 * p.housing.stage);
  } else if (value.action === 'craft') {
    const r = CARPENTRY_RECIPES.find((r) => r.id === id);
    if (!r || !(p.unlockedRecipes ?? []).includes(id))
      throw new Error('Find this Carpentry recipe on Whispering Woods monsters.');
    if (level < r.level) throw new Error(`Requires Carpentry level ${r.level}.`);
    const quantity = value.quantity === undefined ? 1 : Number(value.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000)
      throw new Error('Choose a quantity from 1 to 1000.');
    spend(p, Object.fromEntries(Object.entries(r.cost).map(([item, n]) => [item, n * quantity])));
    p.inventory[id] = (p.inventory[id] ?? 0) + quantity;
    train(p, r.xp * quantity);
  } else if (value.action === 'place') {
    const h = p.housing,
      r = CARPENTRY_RECIPES.find((r) => r.id === id);
    if (!h || h.stage !== 3 || !r?.width || (p.inventory[id] ?? 0) < 1)
      throw new Error('Finish your house and craft furniture first.');
    const x = Number(value.x),
      half = HOUSING_PLOTS[h.size].width / 2;
    if (!Number.isFinite(x) || Math.abs(x) > half - r.width / 2 || !Number.isInteger(x))
      throw new Error('Place furniture within your plot.');
    if (h.furniture.length >= 24) throw new Error('This plot holds up to 24 decorations.');
    if (
      h.furniture.some((f) => {
        const other = CARPENTRY_RECIPES.find((r) => r.id === f.item)!;
        return Math.abs(f.x - x) < (other.width + r.width) / 2 + 4;
      })
    )
      throw new Error('Leave space between furniture pieces.');
    p.inventory[id]--;
    h.furniture.push({ id: `f${(p.housingRevision ?? 0) + 1}-${h.furniture.length}`, item: id, x });
  } else if (value.action === 'remove') {
    const h = p.housing,
      i = h?.furniture.findIndex((f) => f.id === id) ?? -1;
    if (!h || i < 0) throw new Error('Unknown furniture.');
    const [f] = h.furniture.splice(i, 1);
    p.inventory[f.item] = (p.inventory[f.item] ?? 0) + 1;
  } else if (value.action === 'invite' || value.action === 'revoke') {
    if (!p.housing || !id || id === p.id || id.length > 100)
      throw new Error('Choose another adventurer.');
    if (value.action === 'invite') {
      if (p.housing.invited.length >= 20) throw new Error('Up to 20 guests can be invited.');
      if (!p.housing.invited.includes(id)) p.housing.invited.push(id);
    } else p.housing.invited = p.housing.invited.filter((v) => v !== id);
  } else throw new Error('Unknown housing action.');
  p.housingRevision = (p.housingRevision ?? 0) + 1;
}
