import { generatedPlatform, generatedLadder } from './generated-terrain';
import type Phaser from 'phaser';
import type { GameMap, Ladder, Platform } from '@ros/game-data';
export type TerrainTheme = 'woods' | 'village' | 'crystal';
/** All island terrain uses authored artwork with uniform scaling and intact silhouettes. */
export function terrainPlatform(
  scene: Phaser.Scene,
  map: GameMap,
  platform: Platform,
  theme: TerrainTheme,
) {
  return generatedPlatform(scene, map, platform, theme);
}
export function terrainLadder(scene: Phaser.Scene, ladder: Ladder, theme: TerrainTheme) {
  return generatedLadder(scene, ladder, theme);
}
