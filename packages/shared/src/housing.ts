import {
  CARPENTRY_RECIPES,
  HOUSING_PLOTS,
  HOUSE_LAYOUTS,
  houseSize,
  HOUSING_PLATFORM,
  houseStageCost,
  gatheringXpNeeded,
  itemDefinition,
  provisionRecipe,
  GATHERING_TOOLS,
  equipmentDefinition,
  weaponKind,
  type PlotSize,
} from '@ros/game-data';
import type { Player } from './index';
import type { Gear } from './equipment';
export type Housing = {
  size: PlotSize;
  stage: number;
  invited: string[];
  furniture: {
    id: string;
    item: string;
    x: number;
    floor?: number;
    display?: boolean;
    gear?: Gear;
    storage?: { items: Record<string, number>; gear: Gear[] };
  }[];
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
    !!houseSize(p.mapId) ||
    (p.mapId === 'village' &&
      p.x >= HOUSING_PLATFORM.x - 40 &&
      p.x <= HOUSING_PLATFORM.x + HOUSING_PLATFORM.width + 40 &&
      Math.abs(p.y - HOUSING_PLATFORM.y) <= 85)
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
    furniture: owner.housing.furniture.map(({ storage: _storage, ...f }) => structuredClone(f)),
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
const DISPLAY_LOOT = new Set([
  'fang',
  'oak-plank',
  'teleport-crystal',
  'forest-bear-key',
  'wolf-pelt',
  'thorn-silk',
  'boar-tusk',
  'bear-claw',
  'forest-guardian-ring',
  'forest-bear-trophy',
  'bat-wing',
  'golem-core',
  'shard-stinger',
  'wyrm-scale',
  'crystal-boss-key',
  'crystal-wyrm-trophy',
  'iron-ore',
  'oak-logs',
  'greenleaf',
  'brook-trout',
  'silver-minnow',
  'golden-carp',
  'crystal-ore',
  'crystalwood',
  'glowcap',
  'crystal-fish',
  'glowfin',
  'prismatic-eel',
]);
export function decorationSize(item: string, display = false) {
  const furniture = CARPENTRY_RECIPES.find((r) => r.id === item && r.width > 0);
  return !display && furniture ? furniture : { id: item, width: 64, height: 90 };
}
export function decorationSelection(p: Player, id: string) {
  if (id.startsWith('gear:')) {
    const gear = p.gear?.find((g) => g.id === id.slice(5));
    if (!gear || !gear.identified) throw new Error('Identify your equipment before displaying it.');
    if (
      Object.values(p.equippedGear ?? {}).includes(gear.id) ||
      (gear.slot === 'weapon' && !p.equippedGear?.weapon && p.weapon === gear.base)
    )
      throw new Error('Unequip this equipment before displaying it.');
    return { ...decorationSize(gear.base, true), display: true, gear };
  }
  if (id.startsWith('display:')) {
    const item = id.slice(8),
      definition = itemDefinition(item);
    if (
      !definition ||
      !['resource', 'material', 'weapon', 'armor', 'accessory'].includes(definition.type) ||
      !(
        DISPLAY_LOOT.has(item) ||
        equipmentDefinition(item) ||
        weaponKind(item) !== 'unarmed' ||
        item.endsWith('-bar')
      ) ||
      CARPENTRY_RECIPES.some((r) => r.id === item && r.width > 0) ||
      provisionRecipe(item) ||
      GATHERING_TOOLS.some((t) => t.id === item) ||
      item.startsWith('recipe:') ||
      (p.inventory[item] ?? 0) < 1
    )
      throw new Error('Choose an owned loot item or unequipped equipment to display.');
    if ((p.weapon === item || p.accessory === item) && p.inventory[item] < 2)
      throw new Error('Unequip this item before displaying it.');
    return { ...decorationSize(item, true), display: true, gear: undefined };
  }
  const r = CARPENTRY_RECIPES.find((r) => r.id === id && r.width > 0);
  if (!r || (p.inventory[id] ?? 0) < 1) throw new Error('Craft furniture before placing it.');
  return { ...r, display: false, gear: undefined };
}
export function furniturePlacement(p: Player, id: string, position: unknown) {
  if (p.houseOwnerId !== p.id) throw new Error('Only the owner can change this house.');
  const h = p.housing,
    r = decorationSelection(p, id);
  if (!h || h.stage !== 3) throw new Error('Finish your house and craft furniture first.');
  const size = houseSize(p.mapId);
  if (!size || p.houseOwnerId !== p.id) throw new Error('Enter your house to place furniture.');
  const layout = HOUSE_LAYOUTS[size],
    floor = layout.floors.findIndex((y) => Math.abs(y - p.y) <= 50);
  if (floor < 0 || !p.grounded) throw new Error('Stand on a house floor to place furniture.');
  const x = Number(position),
    half = (layout.width - 160) / 2;
  if (!Number.isFinite(x) || Math.abs(x) > half - r.width / 2 || !Number.isInteger(x))
    throw new Error('Place furniture within your plot.');
  if (h.furniture.length >= layout.capacity)
    throw new Error(`This house holds up to ${layout.capacity} decorations.`);
  if (
    h.furniture.some((f) => {
      const other = decorationSize(f.item, f.display);
      return (f.floor ?? 0) === floor && Math.abs(f.x - x) < (other.width + r.width) / 2 + 4;
    })
  )
    throw new Error('Leave space between furniture pieces.');
  return { h, r, x, floor, layout };
}
export function changeHousing(
  p: Player,
  value: { action?: unknown; id?: unknown; x?: unknown; quantity?: unknown; item?: unknown },
) {
  if (!nearHousing(p)) throw new Error('Return to your house or the Elderwood housing platform.');
  if (houseSize(p.mapId) && p.houseOwnerId !== p.id)
    throw new Error('Only the owner can change this house.');
  const id = typeof value.id === 'string' ? value.id : '';
  const level = p.carpentry?.level ?? 1;
  if (value.action === 'plot') {
    if (houseSize(p.mapId)) throw new Error('Upgrade your plot from Elderwood Village.');
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
    const { h, r, x, floor } = furniturePlacement(p, id, value.x);
    if (r.gear) p.gear = p.gear!.filter((g) => g.id !== r.gear!.id);
    else p.inventory[r.id]--;
    h.furniture.push({
      id: `f${(p.housingRevision ?? 0) + 1}-${h.furniture.length}`,
      item: r.id,
      x,
      floor,
      ...(r.display ? { display: true } : {}),
      ...(r.gear ? { gear: structuredClone(r.gear) } : {}),
    });
  } else if (value.action === 'deposit' || value.action === 'withdraw') {
    const chest = storageChest(p, id);
    const item = typeof value.item === 'string' ? value.item : '';
    const quantity = value.quantity === undefined ? 1 : value.quantity;
    if (!Number.isSafeInteger(quantity) || (quantity as number) < 1)
      throw new Error('Choose a positive whole quantity.');
    const n = quantity as number;
    const stored = chest.storage ?? { items: {}, gear: [] };
    const depositing = value.action === 'deposit';
    if (item.startsWith('gear:')) {
      const source = depositing ? (p.gear ?? []) : stored.gear;
      const g = source.find((g) => g.id === item.slice(5));
      if (!g || n !== 1) throw new Error('Choose available equipment.');
      if (
        depositing &&
        (Object.values(p.equippedGear ?? {}).includes(g.id) ||
          (g.slot === 'weapon' && !p.equippedGear?.weapon && p.weapon === g.base))
      )
        throw new Error('Unequip equipment before storing it.');
      if (depositing && storageSlots(stored) >= CHEST_CAPACITY) throw new Error('Chest is full.');
      if (!depositing && (p.gear ?? []).some((x) => x.id === g.id))
        throw new Error('Equipment is already in your bag.');
      source.splice(source.indexOf(g), 1);
      (depositing ? stored.gear : (p.gear ??= [])).push(structuredClone(g));
    } else {
      const source = depositing ? p.inventory : stored.items;
      const target = depositing ? stored.items : p.inventory;
      if (!itemDefinition(item) || !Object.hasOwn(source, item) || (source[item] ?? 0) < n)
        throw new Error('Not enough items.');
      if (depositing && (p.weapon === item || p.accessory === item) && source[item] - n < 1)
        throw new Error('Unequip this item before storing it.');
      if (depositing && !(stored.items[item] > 0) && storageSlots(stored) >= CHEST_CAPACITY)
        throw new Error('Chest is full.');
      const total = (target[item] ?? 0) + n;
      if (!Number.isSafeInteger(total)) throw new Error('Stack is too large.');
      source[item] -= n;
      target[item] = total;
      if (!depositing && !source[item]) delete source[item];
    }
    chest.storage = stored;
  } else if (value.action === 'remove') {
    const h = p.housing,
      i = h?.furniture.findIndex((f) => f.id === id) ?? -1;
    if (!h || i < 0) throw new Error('Unknown furniture.');
    const f = h.furniture[i];
    if (f.storage && storageSlots(f.storage))
      throw new Error('Empty the chest before picking it up.');
    if (f.gear && (p.gear ?? []).some((g) => g.id === f.gear!.id))
      throw new Error('Equipment is already in your bag.');
    h.furniture.splice(i, 1);
    if (f.gear) {
      (p.gear ??= []).push(structuredClone(f.gear));
    } else p.inventory[f.item] = (p.inventory[f.item] ?? 0) + 1;
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

export const CHEST_CAPACITY = 40;
export function storageSlots(storage: { items: Record<string, number>; gear: Gear[] }) {
  return Object.values(storage.items).filter((n) => n > 0).length + storage.gear.length;
}
export function storageChest(p: Player, id: string) {
  const size = houseSize(p.mapId);
  const chest = p.housing?.furniture.find(
    (f) => f.id === id && f.item === 'oak-chest' && !f.display,
  );
  if (!size || p.houseOwnerId !== p.id || p.housing?.stage !== 3 || !chest)
    throw new Error('Enter your own house and choose a placed chest.');
  const y = HOUSE_LAYOUTS[size].floors[chest.floor ?? 0];
  if (Math.abs(p.x - (HOUSE_LAYOUTS[size].width / 2 + chest.x)) > 150 || Math.abs(p.y - y) > 70)
    throw new Error('Walk closer to the chest.');
  return chest;
}
