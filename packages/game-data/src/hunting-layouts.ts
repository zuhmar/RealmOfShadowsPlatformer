import type { GameMap } from './index';
/** Deliberately different silhouettes, ladder routes and monster perches in every Woods area. */
export const WOODS_HUNTING_LAYOUTS: Record<
  string,
  Pick<GameMap, 'platforms' | 'ladders' | 'spawns'>
> = {
  'woods-2': {
    platforms: [
      { id: 'ground', x: 0, y: 760, width: 2400, oneWay: false },
      { id: 'silk-left', x: 200, y: 565, width: 480, oneWay: true },
      { id: 'silk-right', x: 1370, y: 565, width: 470, oneWay: true },
      { id: 'silk-bridge', x: 600, y: 370, width: 900, oneWay: true },
      { id: 'silk-crown', x: 1400, y: 190, width: 550, oneWay: true },
    ],
    ladders: [
      { x: 350, bottom: 760, top: 565, from: 'ground', to: 'silk-left' },
      { x: 1500, bottom: 760, top: 565, from: 'ground', to: 'silk-right' },
      { x: 640, bottom: 565, top: 370, from: 'silk-left', to: 'silk-bridge' },
      { x: 1450, bottom: 565, top: 370, from: 'silk-right', to: 'silk-bridge' },
      { x: 1460, bottom: 370, top: 190, from: 'silk-bridge', to: 'silk-crown' },
    ],
    spawns: [
      { x: 900, y: 760, platform: 'ground' },
      { x: 430, y: 565, platform: 'silk-left' },
      { x: 1730, y: 565, platform: 'silk-right' },
      { x: 1000, y: 370, platform: 'silk-bridge' },
      { x: 1800, y: 190, platform: 'silk-crown' },
      { x: 1220, y: 760, platform: 'ground' },
      { x: 600, y: 565, platform: 'silk-left' },
      { x: 1510, y: 565, platform: 'silk-right' },
      { x: 1260, y: 370, platform: 'silk-bridge' },
      { x: 1560, y: 190, platform: 'silk-crown' },
    ],
  },
  'woods-3': {
    platforms: [
      { id: 'ground', x: 0, y: 760, width: 2400, oneWay: false },
      { id: 'root-bank', x: 300, y: 590, width: 480, oneWay: true },
      { id: 'mud-rim', x: 1050, y: 570, width: 520, oneWay: true },
      { id: 'boar-rise', x: 1650, y: 450, width: 380, oneWay: true },
      { id: 'boss-perch', x: 1920, y: 285, width: 440, oneWay: true },
    ],
    ladders: [
      { x: 430, bottom: 760, top: 590, from: 'ground', to: 'root-bank' },
      { x: 1170, bottom: 760, top: 570, from: 'ground', to: 'mud-rim' },
      { x: 1740, bottom: 760, top: 450, from: 'ground', to: 'boar-rise' },
      { x: 1980, bottom: 450, top: 285, from: 'boar-rise', to: 'boss-perch' },
    ],
    spawns: [
      { x: 860, y: 760, platform: 'ground' },
      { x: 1450, y: 760, platform: 'ground' },
      { x: 580, y: 590, platform: 'root-bank' },
      { x: 1380, y: 570, platform: 'mud-rim' },
      { x: 1830, y: 450, platform: 'boar-rise' },
      { x: 1050, y: 760, platform: 'ground' },
      { x: 1710, y: 760, platform: 'ground' },
      { x: 390, y: 590, platform: 'root-bank' },
      { x: 1180, y: 570, platform: 'mud-rim' },
      { x: 1950, y: 450, platform: 'boar-rise' },
    ],
  },
  'woods-boss': {
    platforms: [
      { id: 'ground', x: 0, y: 760, width: 2400, oneWay: false },
      { id: 'den-left', x: 260, y: 530, width: 380, oneWay: true },
      { id: 'den-right', x: 1690, y: 575, width: 500, oneWay: true },
      { id: 'den-overlook', x: 990, y: 360, width: 360, oneWay: true },
    ],
    ladders: [
      { x: 400, bottom: 760, top: 530, from: 'ground', to: 'den-left' },
      { x: 1860, bottom: 760, top: 575, from: 'ground', to: 'den-right' },
      { x: 1130, bottom: 760, top: 360, from: 'ground', to: 'den-overlook' },
    ],
    spawns: [{ x: 1250, y: 760, platform: 'ground' }],
  },
};
