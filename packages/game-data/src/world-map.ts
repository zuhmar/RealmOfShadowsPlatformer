export const TELEPORT_CRYSTAL = 'teleport-crystal';
export const TELEPORT_CRYSTAL_PRICE = 25;
export const TELEPORT_CRYSTAL_DROP_CHANCE = 0.05;
export const WORLD_MAP_ISLANDS = [
  {
    id: 'woods',
    image: '/assets/backgrounds/island-maps/woods.png',
    width: 1254,
    height: 1254,
    locations: [
      { x: 25, y: 28 },
      { x: 75, y: 28 },
      { x: 25, y: 72 },
      { x: 75, y: 72 },
    ],
    areas: ['Wolf Hollow', 'Silkshade Glade', 'Brambleboar Run', 'Forest Bear Den'],
  },
  {
    id: 'crystal',
    image: '/assets/backgrounds/island-maps/crystal.png',
    width: 1254,
    height: 1254,
    locations: [
      { x: 25, y: 28 },
      { x: 75, y: 28 },
      { x: 25, y: 72 },
      { x: 75, y: 72 },
    ],
    areas: ['Cave Bat Roost', 'Crystal Golem Gallery', 'Shard Scorpion Nest', 'Crystal Wyrm Lair'],
  },
  {
    id: 'murkmire',
    image: '/assets/backgrounds/island-maps/murkmire.png',
    width: 1254,
    height: 1254,
    locations: [
      { x: 25, y: 28 },
      { x: 75, y: 28 },
      { x: 25, y: 72 },
      { x: 75, y: 72 },
    ],
    areas: ['Bog Slime Pools', 'Swamp Lurker Marsh', 'Venom Toad Mire', 'Hydra Basin'],
  },
  {
    id: 'frostfall',
    image: '/assets/backgrounds/island-maps/frostfall.png',
    width: 1254,
    height: 1254,
    locations: [
      { x: 25, y: 28 },
      { x: 75, y: 28 },
      { x: 25, y: 72 },
      { x: 75, y: 72 },
    ],
    areas: ['Frost Wolf Trail', 'Ice Troll Ridge', 'Frozen Wraith Hollow', 'Frost Giant Throne'],
  },
  {
    id: 'ember',
    image: '/assets/backgrounds/island-maps/ember.png',
    width: 1254,
    height: 1254,
    locations: [
      { x: 25, y: 28 },
      { x: 75, y: 28 },
      { x: 25, y: 72 },
      { x: 75, y: 72 },
    ],
    areas: [
      'Fire Imp Fields',
      'Magma Golem Caldera',
      'Ember Salamander Crags',
      'Infernal Drake Summit',
    ],
  },
  {
    id: 'celestial',
    image: '/assets/backgrounds/island-maps/celestial.png',
    width: 1254,
    height: 1254,
    locations: [
      { x: 25, y: 28 },
      { x: 75, y: 28 },
      { x: 25, y: 72 },
      { x: 75, y: 72 },
    ],
    areas: [
      'Fallen Sprite Gardens',
      'Celestial Sentinel Court',
      'Astral Wisp Crossing',
      'Fallen Seraph Sanctum',
    ],
  },
  {
    id: 'fortress',
    image: '/assets/backgrounds/island-maps/fortress.png',
    width: 1254,
    height: 1254,
    locations: [
      { x: 25, y: 28 },
      { x: 75, y: 28 },
      { x: 25, y: 72 },
      { x: 75, y: 72 },
    ],
    areas: [
      'Shadow Knight Ramparts',
      'Shadow Lich Crypt',
      'Void Stalker Rift',
      'Shadow Dragon Throne',
    ],
  },
] as const;
