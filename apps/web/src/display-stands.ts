import Phaser from 'phaser';
import { displayStandTheme } from '@ros/game-data';
import { lootIcon } from './loot-effects';
import { assetUrl } from './assets';
export function preloadDisplayStands(scene: Phaser.Scene) {
  if (!scene.textures.exists('island-display-stands'))
    scene.load.atlas(
      'island-display-stands',
      assetUrl('/assets/ui/island-display-stands.png'),
      '/assets/ui/island-display-stands.json',
    );
  if (!scene.textures.exists('animated-display-stands'))
    scene.load.atlas(
      'animated-display-stands',
      assetUrl('/assets/ui/animated-display-stands.png'),
      '/assets/ui/animated-display-stands.json',
    );
}
/** Uniform scaling preserves each front-facing sprite and anchors its feet to the floor. */
export function displayStand(scene: Phaser.Scene, item: string) {
  const theme = displayStandTheme(item);
  const stand = scene.add.container(0, 0).setName('display-stand').setData('theme', theme);
  if (theme === 'celestial' || theme === 'shadow') {
    const key = `combined-display-stand-${theme}`;
    if (!scene.anims.exists(key))
      scene.anims.create({
        key,
        frames: Array.from({ length: 8 }, (_, i) => ({
          key: 'animated-display-stands',
          frame: `${theme}-${i}`,
        })),
        frameRate: 6,
        repeat: -1,
      });
    const sprite = scene.add
      .sprite(0, 0, 'animated-display-stands', `${theme}-0`)
      .setOrigin(0.5, 360 / 440)
      .setScale(64 / 230)
      .setName('display-stand-sprite');
    sprite.play(key);
    stand.add(sprite);
  } else {
    const sprite = scene.add
      .image(0, 0, 'island-display-stands', theme)
      .setOrigin(0.5, 1)
      .setName('display-stand-sprite');
    sprite.setScale(64 / sprite.width);
    stand.add(sprite);
  }
  return stand;
}
export function itemDisplay(scene: Phaser.Scene, item: string) {
  const stand = displayStand(scene, item);
  const icon = lootIcon(scene, item, 60).setPosition(0, -58);
  return scene.add.container(0, 0, [stand, icon]).setName('house-display');
}
