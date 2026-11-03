import Phaser from 'phaser';
import { BOSS_ENTRANCE_PROPS, type GameMap, type PortalTheme } from '@ros/game-data';
import manifest from '../public/assets/props/boss-entrances/manifest.json';
type Art = { origin: { x: number; y: number }; height: number };
const art = manifest as Record<PortalTheme, Art>;
export function preloadBossProp(scene: Phaser.Scene, theme: PortalTheme) {
  const key = `boss-prop-${theme}`;
  if (!scene.textures.exists(key))
    scene.load.image(key, `/assets/props/boss-entrances/${theme}.png`);
}
export function preloadBossEntrance(scene: Phaser.Scene, map: GameMap) {
  if (map.bossEntrance) preloadBossProp(scene, map.bossEntrance.theme);
}
export function addBossProp(scene: Phaser.Scene, theme: PortalTheme, x: number, y: number) {
  const config = art[theme];
  return scene.add
    .image(x, y, `boss-prop-${theme}`)
    .setOrigin(config.origin.x, config.origin.y)
    .setScale(BOSS_ENTRANCE_PROPS[theme].height / config.height)
    .setDepth(5)
    .setName('boss-entrance-prop')
    .setData({ theme, label: BOSS_ENTRANCE_PROPS[theme].name });
}
export function addBossEntrance(scene: Phaser.Scene, map: GameMap) {
  if (!map.bossEntrance) return;
  const { theme, x, y, platform } = map.bossEntrance;
  return addBossProp(scene, theme, x, y).setData('platformId', platform);
}
