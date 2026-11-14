import type { GameMap } from './index';
export const BATTLEGROUND_ID = 'frostfall-battleground';
export const BATTLEGROUND_RULES = {
  maxPlayers: 4,
  waves: 10,
  countdownMs: 5000,
  breakMs: 7000,
  runMs: 900000,
  rewardGold: 3500,
  rewardXp: 7000,
} as const;
export const BATTLEGROUND_MAP: GameMap = {
  id: BATTLEGROUND_ID,
  name: 'Frostbound Battlegrounds',
  island: 'Frostfall Tundra',
  requiredLevel: 31,
  width: 2400,
  height: 1050,
  spawn: { x: 180, y: 820 },
  background: '/assets/backgrounds/frostfall-battleground.png',
  platforms: [
    { id: 'ground', x: 0, y: 820, width: 2400, oneWay: false },
    { id: 'west', x: 250, y: 620, width: 650, oneWay: true },
    { id: 'east', x: 1500, y: 620, width: 650, oneWay: true },
    { id: 'crown', x: 780, y: 420, width: 840, oneWay: true },
  ],
  ladders: [
    { x: 450, bottom: 820, top: 620, from: 'ground', to: 'west' },
    { x: 1850, bottom: 820, top: 620, from: 'ground', to: 'east' },
    { x: 830, bottom: 620, top: 420, from: 'west', to: 'crown' },
    { x: 1550, bottom: 620, top: 420, from: 'east', to: 'crown' },
  ],
  portals: [{ x: 80, y: 820, target: 'frostfall', label: 'Leave battlegrounds' }],
  spawns: [],
  resources: [],
  npcs: [],
};
