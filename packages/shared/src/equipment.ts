import { canUseClassWeapon } from './classes';
import {
  itemDefinition,
  weaponKind,
  equipmentDefinition,
  EQUIPMENT_TIERS,
  ISLAND_EQUIPMENT,
  type EquipmentSlot,
} from '@ros/game-data';
import type { Player } from './index';
export const GEAR_RARITIES = ['Uncommon', 'Rare', 'Epic', 'Legendary'] as const;
export type GearRarity = (typeof GEAR_RARITIES)[number] | 'Common';
export const GEAR_ATTRIBUTES = {
  critChance: 'Crit chance',
  critDamage: 'Crit damage',
  dodgeChance: 'Dodge chance',
  blockChance: 'Block chance',
  armor: 'Armor',
  health: 'Health',
  mana: 'Mana',
  healthRegen: 'Health regen',
  manaRegen: 'Mana regen',
} as const;
export type GearAttribute = keyof typeof GEAR_ATTRIBUTES;
export type Gear = {
  id: string;
  base: string;
  slot: EquipmentSlot;
  source?: 'monster' | 'crafted';
  name: string;
  level: number;
  rarity: GearRarity;
  identified: boolean;
  attributes?: Partial<Record<GearAttribute, number>>;
};
/** Price follows equipment level only, so the quote never reveals hidden rarity. */
export const identifyCost = (g: Gear) =>
  g.source === 'crafted' || g.rarity === 'Common' ? 0 : 75 * Math.max(1, Math.ceil(g.level / 10));
export function createGear(base: string, level: number, random = Math.random): Gear {
  const roll = random(),
    rarity = roll < 0.65 ? 'Uncommon' : roll < 0.9 ? 'Rare' : roll < 0.985 ? 'Epic' : 'Legendary';
  const armor = base === 'woods-armor',
    definition = equipmentDefinition(base);
  return {
    id: crypto.randomUUID(),
    base,
    slot: definition?.slot ?? (armor ? 'armor' : 'weapon'),
    source: 'monster',
    name:
      definition?.name ??
      (armor ? 'Elderwood Armor' : (itemDefinition(base)?.name ?? 'Woodland Weapon')),
    level,
    rarity,
    identified: false,
  };
}
export function identifyGear(p: Player, id: string, random = Math.random) {
  const gear = p.gear?.find((g) => g.id === id);
  if (!gear) throw new Error('You do not own that equipment.');
  if (gear.source === 'crafted' || gear.rarity === 'Common')
    throw new Error('Only monster-dropped equipment can be identified.');
  if (gear.identified) throw new Error('That equipment is already identified.');
  const cost = identifyCost(gear);
  if (p.gold < cost) throw new Error(`Identification costs ${cost} gold.`);
  const tier = GEAR_RARITIES.indexOf(gear.rarity as (typeof GEAR_RARITIES)[number]) + 1;
  const pool = Object.keys(GEAR_ATTRIBUTES) as GearAttribute[];
  const attributes: Partial<Record<GearAttribute, number>> = {};
  for (let i = 0; i < tier; i++) {
    const key = pool.splice(Math.min(pool.length - 1, Math.floor(random() * pool.length)), 1)[0];
    const strength = tier * (0.75 + random() * 0.5) * (1 + (gear.level - 1) / 100);
    const unit = {
      critChance: 0.01,
      critDamage: 0.04,
      dodgeChance: 0.01,
      blockChance: 0.01,
      armor: 1.5,
      health: 8,
      mana: 4,
      healthRegen: 0.15,
      manaRegen: 0.1,
    }[key];
    attributes[key] = Math.round(strength * unit * 1000) / 1000;
  }
  p.gold -= cost;
  gear.attributes = attributes;
  gear.identified = true;
  return gear;
}
export function equippedGear(p: Player) {
  return (p.gear ?? []).filter(
    (g) =>
      g.identified &&
      p.level >= g.level &&
      (g.slot === 'weapon'
        ? g.id === p.equippedGear?.weapon && p.weapon === g.base
        : g.id === p.equippedGear?.[g.slot]),
  );
}
export function gearAttributes(p: Player) {
  const result = Object.fromEntries(Object.keys(GEAR_ATTRIBUTES).map((k) => [k, 0])) as Record<
    GearAttribute,
    number
  >;
  for (const gear of equippedGear(p))
    for (const [key, value] of Object.entries(gear.attributes ?? {})) {
      if (Object.hasOwn(result, key) && Number.isFinite(value) && value > 0)
        result[key as GearAttribute] += value;
    }
  return result;
}
export function equipGear(p: Player, id: string) {
  const owned = p.gear?.find((g) => g.id === id);
  if (owned?.slot === 'weapon' && !canUseClassWeapon(p, owned.base))
    throw new Error('That weapon belongs to another class. Visit Mira to change paths.');
  const gear = p.gear?.find((g) => g.id === id);
  if (
    !gear ||
    !gear.identified ||
    p.level < gear.level ||
    (gear.slot === 'weapon' && weaponKind(gear.base) === 'unarmed')
  )
    throw new Error('Identify owned equipment and meet its level requirement first.');
  p.equippedGear ??= {};
  if (p.equippedGear[gear.slot] === id) {
    delete p.equippedGear[gear.slot];
    if (gear.slot === 'weapon') p.weapon = null;
  } else {
    p.equippedGear[gear.slot] = id;
    if (gear.slot === 'weapon') p.weapon = gear.base;
  }
}
export function formatGearAttribute(key: GearAttribute, value: number) {
  return `${GEAR_ATTRIBUTES[key]} +${key.endsWith('Chance') || key === 'critDamage' ? `${(value * 100).toFixed(1)}%` : value.toFixed(1)}`;
}

export function createCraftedGear(base: string): Gear {
  const definition = equipmentDefinition(base);
  if (!definition) throw new Error('Unknown equipment recipe.');
  const tier = EQUIPMENT_TIERS.findIndex((t) => t.id === definition.tier) + 1;
  const attributes: Gear['attributes'] =
    definition.slot === 'weapon'
      ? { critChance: tier * 0.005, critDamage: tier * 0.02 }
      : {
          armor: tier * (definition.slot === 'armor' ? 1 : 0.5),
          health: tier * (definition.slot === 'armor' ? 8 : 4),
        };
  return {
    ...createGear(base, definition.level, () => 0),
    source: 'crafted',
    rarity: 'Common',
    identified: true,
    attributes,
  };
}
export function islandGearDrop(island: string, level: number, random = Math.random): Gear {
  const tier = EQUIPMENT_TIERS.find((t) => t.island === island || t.islandName === island);
  if (!tier) throw new Error('Unknown equipment island.');
  const pool = ISLAND_EQUIPMENT.filter((g) => g.tier === tier.id);
  const base = pool[Math.floor(random() * pool.length)];
  return createGear(base.id, Math.max(tier.level, level), random);
}

export const GEAR_RARITY_COLORS: Record<GearRarity, string> = {
  Common: '#d7c9e5',
  Uncommon: '#72d77c',
  Rare: '#65adff',
  Epic: '#c879ff',
  Legendary: '#f4bf55',
};
export function gearSellValue(g: Gear) {
  const base = !g.identified
    ? 8
    : { Common: 4, Uncommon: 8, Rare: 20, Epic: 50, Legendary: 125 }[g.rarity];
  return Math.floor(
    base *
      Math.max(1, Math.ceil(g.level / 10)) *
      (g.identified && g.source !== 'crafted' ? 1.25 : 1),
  );
}
export function sellGear(p: Player, id: string) {
  const gear = p.gear?.find((g) => g.id === id);
  if (!gear) throw new Error('You do not own that equipment.');
  if (Object.values(p.equippedGear ?? {}).includes(id))
    throw new Error('Unequip that item before selling it.');
  const gold = gearSellValue(gear);
  p.gear = p.gear!.filter((g) => g.id !== id);
  p.gold += gold;
  return { gear, gold };
}
