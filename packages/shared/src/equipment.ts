import { itemDefinition, weaponKind } from '@ros/game-data';
import type { Player } from './index';
export const GEAR_RARITIES = ['Uncommon', 'Rare', 'Epic', 'Legendary'] as const;
export type GearRarity = (typeof GEAR_RARITIES)[number];
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
  slot: 'weapon' | 'armor';
  name: string;
  level: number;
  rarity: GearRarity;
  identified: boolean;
  attributes?: Partial<Record<GearAttribute, number>>;
};
export const identifyCost = (g: Gear) =>
  [25, 75, 200, 500][GEAR_RARITIES.indexOf(g.rarity)] * Math.max(1, Math.ceil(g.level / 10));
export function createGear(base: string, level: number, random = Math.random): Gear {
  const roll = random(),
    rarity = roll < 0.65 ? 'Uncommon' : roll < 0.9 ? 'Rare' : roll < 0.985 ? 'Epic' : 'Legendary';
  const armor = base === 'woods-armor';
  return {
    id: crypto.randomUUID(),
    base,
    slot: armor ? 'armor' : 'weapon',
    name: armor ? 'Elderwood Armor' : (itemDefinition(base)?.name ?? 'Woodland Weapon'),
    level,
    rarity,
    identified: false,
  };
}
export function identifyGear(p: Player, id: string, random = Math.random) {
  const gear = p.gear?.find((g) => g.id === id);
  if (!gear) throw new Error('You do not own that equipment.');
  if (gear.identified) throw new Error('That equipment is already identified.');
  const cost = identifyCost(gear);
  if (p.gold < cost) throw new Error(`Identification costs ${cost} gold.`);
  const tier = GEAR_RARITIES.indexOf(gear.rarity) + 1;
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
        : g.id === p.equippedGear?.armor),
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
