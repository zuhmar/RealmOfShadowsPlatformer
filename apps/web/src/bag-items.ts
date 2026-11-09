import type { Player } from '@ros/shared';
export type BagStack = { key: string; item: string; quantity: number; gearIds?: string[] };
/** Group only equivalent equipment; preserve instance IDs for rolls, equip and sale. */
export function bagStacks(p: Pick<Player, 'inventory' | 'gear' | 'equippedGear'>): BagStack[] {
  const stacks: BagStack[] = Object.entries(p.inventory)
    .filter(([, n]) => n > 0)
    .map(([item, quantity]) => ({ key: `item:${item}`, item, quantity }));
  const groups = new Map<string, BagStack>();
  for (const g of p.gear ?? []) {
    if (p.equippedGear?.[g.slot] === g.id) continue;
    const key = JSON.stringify([
      g.base,
      g.slot,
      g.source,
      g.name,
      g.level,
      g.rarity,
      g.identified,
      Object.entries(g.attributes ?? {}).sort(([a], [b]) => a.localeCompare(b)),
    ]);
    let stack = groups.get(key);
    if (!stack) {
      stack = { key: `gear:${key}`, item: g.base, quantity: 0, gearIds: [] };
      groups.set(key, stack);
      stacks.push(stack);
    }
    stack.quantity++;
    stack.gearIds!.push(g.id);
  }
  return stacks;
}
