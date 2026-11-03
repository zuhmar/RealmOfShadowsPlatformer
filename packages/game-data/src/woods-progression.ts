import { BOSS_QUEST_KILLS } from './monsters';
export const WOODS_ITEMS = {
  'wolf-pelt': {
    id: 'wolf-pelt',
    name: 'Wolf Pelt',
    rarity: 'Common',
    type: 'resource',
    description: 'A thick pelt from Wolf Hollow. A future crafting material.',
    sellValue: 3,
    level: 1,
    bonus: 0,
    icon: '✦',
  },
  'thorn-silk': {
    id: 'thorn-silk',
    name: 'Thorn Silk',
    rarity: 'Common',
    type: 'resource',
    description: 'Strong silk gathered from Thorn Spiders.',
    sellValue: 5,
    level: 1,
    bonus: 0,
    icon: '✦',
  },
  'boar-tusk': {
    id: 'boar-tusk',
    name: 'Boar Tusk',
    rarity: 'Common',
    type: 'resource',
    description: 'A sturdy Wild Boar tusk. A future crafting material.',
    sellValue: 8,
    level: 1,
    bonus: 0,
    icon: '✦',
  },
  'bear-claw': {
    id: 'bear-claw',
    name: 'Forest Bear Claw',
    rarity: 'Uncommon',
    type: 'resource',
    description: 'A claw earned by defeating the Forest Bear.',
    sellValue: 25,
    level: 1,
    bonus: 0,
    icon: '✦',
  },
  'forest-guardian-ring': {
    id: 'forest-guardian-ring',
    name: 'Forest Guardian Ring',
    rarity: 'Rare',
    type: 'accessory',
    description:
      'A rare Forest Bear drop. Equip in Character for +4 attack with every class weapon.',
    sellValue: 100,
    level: 1,
    bonus: 4,
    icon: '◉',
  },
  'forest-bear-trophy': {
    id: 'forest-bear-trophy',
    name: 'Forest Bear Trophy',
    rarity: 'Rare',
    type: 'resource',
    description: 'One-time proof of your first Forest Bear victory. Crystal Caverns access earned.',
    sellValue: 0,
    level: 1,
    bonus: 0,
    icon: '★',
  },
} as const;
export const WOODS_QUESTS = {
  'mira-spiders': {
    id: 'mira-spiders',
    title: 'Silk and shadows',
    prerequisite: 'mira-wolves',
    npcId: 'mira',
    target: { monsterId: 'thorn-spider', mapId: 'woods-2', count: 30 },
    description:
      'Defeat 30 Thorn Spiders in Silkshade Glade after accepting this quest, then return to Mira.',
    reward: { gold: 100, items: [{ itemId: 'greenleaf', quantity: 5 }] },
  },
  'mira-boars': {
    id: 'mira-boars',
    title: 'Break the bramble line',
    prerequisite: 'mira-spiders',
    npcId: 'mira',
    target: { monsterId: 'wild-boar', mapId: 'woods-3', count: 60 },
    description:
      'Defeat 60 Wild Boars in Brambleboar Run after accepting this quest, then return to Mira. Earn a guaranteed boss key.',
    reward: { gold: 200, items: [{ itemId: 'forest-bear-key', quantity: 1 }] },
  },
  'mira-bear': {
    id: 'mira-bear',
    title: 'The guardian of the woods',
    prerequisite: 'mira-boars',
    npcId: 'mira',
    target: { monsterId: 'forest-bear', mapId: 'woods-boss', count: BOSS_QUEST_KILLS },
    description:
      'Use a key at the totem high above Brambleboar Run. Defeat Forest Bear once, dodge its Ground Slam, then return to Mira.',
    reward: { gold: 500, items: [] },
  },
} as const;
export type WoodsQuestId = keyof typeof WOODS_QUESTS;
export const FOREST_BEAR_RING_CHANCE = 0.1;
export const FOREST_BEAR_FIRST_CLEAR_GOLD = 100;
