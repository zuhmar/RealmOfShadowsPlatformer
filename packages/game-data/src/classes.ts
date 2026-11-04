export const CLASS_PATHS = {
  knight: {
    name: 'Knight',
    weapon: 'sword',
    description: 'Wide melee sweeps and extra reach.',
    signature: 'Sweeping Edge',
  },
  archer: {
    name: 'Archer',
    weapon: 'bow',
    description: 'Long-range arrows that pierce more enemies.',
    signature: 'Piercing Power',
  },
  mage: {
    name: 'Mage',
    weapon: 'staff',
    description: 'Magic bursts with growing area coverage.',
    signature: 'Expanding Nova',
  },
  rogue: {
    name: 'Rogue',
    weapon: 'dagger',
    description: 'Rapid close-range combinations.',
    signature: 'Relentless Flurry',
  },
} as const;
export type ClassId = keyof typeof CLASS_PATHS;
export type ClassTalent = 'mastery' | 'signature' | 'discipline';
export const CLASS_CHANGE_GOLD = 500;
export const CLASS_TALENTS = {
  mastery: { name: 'Weapon Mastery', description: '+2 base damage per rank.', max: 5 },
  signature: {
    name: 'Signature Technique',
    description: '+4% special damage per rank and improved class-specific reach or coverage.',
    max: 5,
  },
  discipline: {
    name: 'Discipline',
    description: 'Special cooldown reduced by 0.1 seconds per rank.',
    max: 5,
  },
} as const;

export const WEAPON_DAMAGE_SCALE = {
  unarmed: 1,
  sword: 1,
  bow: 1.1,
  staff: 1.2,
  dagger: 0.7,
} as const;
