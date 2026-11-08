export type ProvisionSkill = 'Cooking' | 'Alchemy';
export type ProvisionEffect = 'damage' | 'regen' | 'crit' | 'health' | 'mana';
export const PROVISION_IDS = [
  'trout-skewers',
  'minnow-broth',
  'golden-carp-feast',
  'crystal-fish-roast',
  'glowfin-soup',
  'prismatic-eel-banquet',
  'greenleaf-health-potion',
  'greenleaf-mana-potion',
  'glowcap-health-potion',
  'glowcap-mana-potion',
] as const;
export type ProvisionId = (typeof PROVISION_IDS)[number];
export type ProvisionRecipe = {
  id: ProvisionId;
  name: string;
  skill: ProvisionSkill;
  level: number;
  characterLevel: number;
  cost: Record<string, number>;
  xp: number;
  effect: ProvisionEffect;
  amount: number;
  duration?: number;
  description: string;
};
export const POTION_COOLDOWN = 10000;
export const PROVISION_RECIPES: readonly ProvisionRecipe[] = [
  {
    id: 'trout-skewers',
    name: 'Trout Skewers',
    skill: 'Cooking',
    level: 1,
    characterLevel: 1,
    cost: { 'brook-trout': 10 },
    xp: 20,
    effect: 'damage',
    amount: 0.1,
    duration: 600000,
    description: '+10% attack damage for 10 minutes.',
  },
  {
    id: 'minnow-broth',
    name: 'Silver Minnow Broth',
    skill: 'Cooking',
    level: 5,
    characterLevel: 1,
    cost: { 'silver-minnow': 15 },
    xp: 35,
    effect: 'regen',
    amount: 2,
    duration: 600000,
    description: '+2 out-of-combat health regeneration per second for 10 minutes.',
  },
  {
    id: 'golden-carp-feast',
    name: 'Golden Carp Feast',
    skill: 'Cooking',
    level: 10,
    characterLevel: 1,
    cost: { 'golden-carp': 20 },
    xp: 55,
    effect: 'crit',
    amount: 0.1,
    duration: 1200000,
    description:
      '+10 percentage points of critical chance for 20 minutes. The normal crit cap applies.',
  },
  {
    id: 'crystal-fish-roast',
    name: 'Crystal Fish Roast',
    skill: 'Cooking',
    level: 11,
    characterLevel: 11,
    cost: { 'crystal-fish': 20 },
    xp: 60,
    effect: 'damage',
    amount: 0.2,
    duration: 900000,
    description: '+20% attack damage for 15 minutes.',
  },
  {
    id: 'glowfin-soup',
    name: 'Glowfin Soup',
    skill: 'Cooking',
    level: 15,
    characterLevel: 11,
    cost: { glowfin: 25 },
    xp: 85,
    effect: 'regen',
    amount: 4,
    duration: 900000,
    description: '+4 out-of-combat health regeneration per second for 15 minutes.',
  },
  {
    id: 'prismatic-eel-banquet',
    name: 'Prismatic Eel Banquet',
    skill: 'Cooking',
    level: 20,
    characterLevel: 11,
    cost: { 'prismatic-eel': 30 },
    xp: 110,
    effect: 'crit',
    amount: 0.15,
    duration: 1800000,
    description:
      '+15 percentage points of critical chance for 30 minutes. The normal crit cap applies.',
  },
  {
    id: 'greenleaf-health-potion',
    name: 'Greenleaf Health Potion',
    skill: 'Alchemy',
    level: 1,
    characterLevel: 1,
    cost: { greenleaf: 10 },
    xp: 20,
    effect: 'health',
    amount: 40,
    description: 'Restores 40 health. Shares a 10-second cooldown with all potions.',
  },
  {
    id: 'greenleaf-mana-potion',
    name: 'Greenleaf Mana Potion',
    skill: 'Alchemy',
    level: 1,
    characterLevel: 1,
    cost: { greenleaf: 20 },
    xp: 30,
    effect: 'mana',
    amount: 25,
    description: 'Restores 25 mana. Shares a 10-second cooldown with all potions.',
  },
  {
    id: 'glowcap-health-potion',
    name: 'Glowcap Health Potion',
    skill: 'Alchemy',
    level: 11,
    characterLevel: 11,
    cost: { glowcap: 20 },
    xp: 60,
    effect: 'health',
    amount: 100,
    description: 'Restores 100 health. Shares a 10-second cooldown with all potions.',
  },
  {
    id: 'glowcap-mana-potion',
    name: 'Glowcap Mana Potion',
    skill: 'Alchemy',
    level: 15,
    characterLevel: 11,
    cost: { glowcap: 30 },
    xp: 90,
    effect: 'mana',
    amount: 60,
    description: 'Restores 60 mana. Shares a 10-second cooldown with all potions.',
  },
];
export function provisionRecipe(id: unknown): ProvisionRecipe | undefined {
  return typeof id === 'string' ? PROVISION_RECIPES.find((r) => r.id === id) : undefined;
}
export const PROVISION_STATIONS = [
  {
    id: 'cooking-station',
    skill: 'Cooking',
    name: 'Cooking Campfire',
    role: 'Cooking recipes',
    x: 1360,
    y: 650,
  },
  {
    id: 'alchemy-station',
    skill: 'Alchemy',
    name: 'Alchemy Table',
    role: 'Potion recipes',
    x: 1100,
    y: 650,
  },
] as const;
export const PROVISION_ITEMS = Object.fromEntries(
  PROVISION_RECIPES.map((r) => [
    r.id,
    {
      id: r.id,
      name: r.name,
      type: r.skill === 'Cooking' ? 'food' : 'potion',
      level: r.characterLevel,
      icon: r.skill === 'Cooking' ? '🍲' : '⚗',
      description: r.description,
    },
  ]),
) as Record<
  ProvisionId,
  {
    id: ProvisionId;
    name: string;
    type: 'food' | 'potion';
    level: number;
    icon: string;
    description: string;
  }
>;
