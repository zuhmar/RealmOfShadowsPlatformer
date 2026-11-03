export const COMBAT_SKILLS = {
  Melee: { description: 'Knight and Rogue weapon hits train Melee: attack and critical chance.' },
  Magic: { description: 'Mage staff hits train Magic: attack and critical chance.' },
  Distance: { description: 'Archer bow hits train Distance: attack and critical chance.' },
  Defense: { description: 'Taking basic attack damage trains Defense: armor and block.' },
  Evasion: { description: 'Moving under attack and moving clear of boss slams train Evasion.' },
  Vitality: { description: 'Taking combat damage trains Vitality: maximum health.' },
  Focus: { description: 'Landing weapon specials trains Focus: critical damage and maximum mana.' },
} as const;
export type CombatSkill = keyof typeof COMBAT_SKILLS;
export type OffensiveSkill = 'Melee' | 'Magic' | 'Distance';
export const combatSkillXpNeeded = (level: number) => level * 30;
