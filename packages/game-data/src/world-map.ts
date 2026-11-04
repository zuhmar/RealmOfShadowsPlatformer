export const TELEPORT_CRYSTAL = 'teleport-crystal';
export const TELEPORT_CRYSTAL_PRICE = 25;
export const TELEPORT_CRYSTAL_DROP_CHANCE = 0.05;
export const WORLD_MAP_ISLANDS = [
  {
    id: 'woods',
    x: 18,
    y: 22,
    areas: ['Wolf Hollow', 'Silkshade Glade', 'Brambleboar Run', 'Forest Bear Den'],
  },
  {
    id: 'crystal',
    x: 50,
    y: 22,
    areas: ['Cave Bat Roost', 'Crystal Golem Gallery', 'Shard Scorpion Nest', 'Crystal Wyrm Lair'],
  },
  {
    id: 'murkmire',
    x: 82,
    y: 22,
    areas: ['Bog Slime Pools', 'Swamp Lurker Marsh', 'Venom Toad Mire', 'Hydra Basin'],
  },
  {
    id: 'frostfall',
    x: 18,
    y: 57,
    areas: ['Frost Wolf Trail', 'Ice Troll Ridge', 'Frozen Wraith Hollow', 'Frost Giant Throne'],
  },
  {
    id: 'ember',
    x: 50,
    y: 57,
    areas: [
      'Fire Imp Fields',
      'Magma Golem Caldera',
      'Ember Salamander Crags',
      'Infernal Drake Summit',
    ],
  },
  {
    id: 'celestial',
    x: 82,
    y: 57,
    areas: [
      'Fallen Sprite Gardens',
      'Celestial Sentinel Court',
      'Astral Wisp Crossing',
      'Fallen Seraph Sanctum',
    ],
  },
  {
    id: 'fortress',
    x: 50,
    y: 85,
    areas: [
      'Shadow Knight Ramparts',
      'Shadow Lich Crypt',
      'Void Stalker Rift',
      'Shadow Dragon Throne',
    ],
  },
] as const;
