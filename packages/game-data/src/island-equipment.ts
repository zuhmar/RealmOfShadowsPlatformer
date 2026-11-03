export const EQUIPMENT_TIERS = [
  {
    id: 'woods',
    island: 'woods',
    name: 'Ironwood',
    islandName: 'Whispering Woods',
    material: 'iron',
    ore: 'iron-ore',
    level: 1,
    bars: 5,
  },
  {
    id: 'crystal',
    island: 'crystal',
    name: 'Crystal',
    islandName: 'Crystal Caverns',
    material: 'crystal',
    ore: 'crystal-ore',
    level: 11,
    bars: 10,
  },
  {
    id: 'swamp',
    island: 'murkmire',
    name: 'Mireguard',
    islandName: 'Murkmire Swamp',
    material: 'mire',
    ore: 'mire-ore',
    level: 21,
    bars: 20,
  },
  {
    id: 'frost',
    island: 'frostfall',
    name: 'Frostforged',
    islandName: 'Frostfall Tundra',
    material: 'frost',
    ore: 'frost-ore',
    level: 31,
    bars: 35,
  },
  {
    id: 'ember',
    island: 'ember',
    name: 'Emberforged',
    islandName: 'Ember Peaks',
    material: 'ember',
    ore: 'ember-ore',
    level: 41,
    bars: 55,
  },
  {
    id: 'celestial',
    island: 'celestial',
    name: 'Astral',
    islandName: 'Celestial Realm',
    material: 'celestial',
    ore: 'celestial-ore',
    level: 51,
    bars: 80,
  },
  {
    id: 'shadow',
    island: 'fortress',
    name: 'Shadowforged',
    islandName: 'Shadow Fortress',
    material: 'shadow',
    ore: 'shadow-ore',
    level: 61,
    bars: 120,
  },
] as const;
export const EQUIPMENT_PARTS = [
  'sword',
  'bow',
  'staff',
  'dagger',
  'helmet',
  'armor',
  'legs',
  'boots',
] as const;
export type EquipmentPart = (typeof EQUIPMENT_PARTS)[number];
export type EquipmentSlot = 'weapon' | 'helmet' | 'armor' | 'legs' | 'boots';
const names = {
  sword: 'Sword',
  bow: 'Bow',
  staff: 'Staff',
  dagger: 'Dagger',
  helmet: 'Helmet',
  armor: 'Chestplate',
  legs: 'Leggings',
  boots: 'Boots',
};
export const ISLAND_EQUIPMENT = EQUIPMENT_TIERS.flatMap((tier, index) =>
  EQUIPMENT_PARTS.map((part, frame) => ({
    id: `${tier.id}-${part}`,
    name: `${tier.name} ${names[part]}`,
    tier: tier.id,
    island: tier.island,
    slot: (frame < 4 ? 'weapon' : part) as EquipmentSlot,
    part,
    frame,
    level: tier.level,
    bonus: frame < 4 ? 8 + index * 8 : 0,
    weaponKind: frame < 4 ? (part as 'sword' | 'bow' | 'staff' | 'dagger') : null,
  })),
);
export const equipmentDefinition = (id: string | null | undefined) =>
  ISLAND_EQUIPMENT.find((g) => g.id === id);
export const EQUIPMENT_ITEMS = Object.fromEntries(
  ISLAND_EQUIPMENT.map((g) => [
    g.id,
    {
      ...g,
      type: g.slot === 'weapon' ? ('weapon' as const) : ('equipment' as const),
      weaponKind: g.weaponKind ?? ('unarmed' as const),
      rarity: 'Common',
      description: `${EQUIPMENT_TIERS.find((t) => t.id === g.tier)!.islandName} equipment. Crafted pieces have fixed attributes; monster drops can be identified.`,
      sellValue: 0,
      icon: g.slot === 'weapon' ? '⚔' : '◈',
    },
  ]),
);
export const TIER_MINING_ITEMS = Object.fromEntries(
  EQUIPMENT_TIERS.flatMap((t) => [
    [
      t.ore,
      {
        id: t.ore,
        name: `${t.material[0].toUpperCase() + t.material.slice(1)} Ore`,
        type: 'resource' as const,
        rarity: 'Common',
        level: t.level,
        bonus: 0,
        sellValue: 1,
        icon: '◆',
        description: `Mining material from ${t.islandName}.`,
      },
    ],
    [
      `${t.material}-bar`,
      {
        id: `${t.material}-bar`,
        name: `${t.material[0].toUpperCase() + t.material.slice(1)} Bar`,
        type: 'resource' as const,
        rarity: 'Common',
        level: t.level,
        bonus: 0,
        sellValue: 2,
        icon: '▰',
        description: `Smelt 20 ${t.material} ore into one bar at Bram’s forge.`,
      },
    ],
  ]),
);
