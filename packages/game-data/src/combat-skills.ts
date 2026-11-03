export const COMBAT_SKILLS = {
  Melee: { description: 'Knight and Rogue weapon hits train Melee: base damage.' },
  Magic: { description: 'Mage staff hits train Magic: base damage.' },
  Distance: { description: 'Archer bow hits train Distance: base damage.' },
} as const;
export type CombatSkill = keyof typeof COMBAT_SKILLS | 'Defense' | 'Evasion' | 'Vitality' | 'Focus';
export type OffensiveSkill = 'Melee' | 'Magic' | 'Distance';
export const combatSkillXpNeeded = (level: number) => level * 30;
