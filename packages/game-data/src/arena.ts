import type { GameMap } from './index';
export const ARENA_ID = 'murkmire-arena';
export const ARENA_RULES = { countdownMs: 5000, matchMs: 180000, resultMs: 12000 } as const;
export const ARENA_MAP: GameMap = {
  id: ARENA_ID,
  name: 'Mirebound Arena',
  island: 'Murkmire Swamp',
  requiredLevel: 21,
  width: 1800,
  height: 1050,
  spawn: { x: 280, y: 820 },
  background: '/assets/backgrounds/murkmire-arena.png',
  platforms: [
    { id: 'ground', x: 0, y: 820, width: 1800, oneWay: false },
    { id: 'west', x: 260, y: 620, width: 370, oneWay: true },
    { id: 'east', x: 1170, y: 620, width: 370, oneWay: true },
    { id: 'center', x: 600, y: 430, width: 600, oneWay: true },
  ],
  ladders: [
    { x: 440, bottom: 820, top: 620, from: 'ground', to: 'west' },
    { x: 1360, bottom: 820, top: 620, from: 'ground', to: 'east' },
    { x: 615, bottom: 620, top: 430, from: 'west', to: 'center' },
    { x: 1185, bottom: 620, top: 430, from: 'east', to: 'center' },
  ],
  portals: [{ x: 85, y: 820, target: 'murkmire', label: 'Leave arena' }],
  spawns: [],
  resources: [],
  npcs: [],
};
