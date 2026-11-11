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
  if (!scene.textures.exists('display-stand-effects'))
    scene.load.atlas(
      'display-stand-effects',
      assetUrl('/assets/ui/display-stand-effects.png'),
      '/assets/ui/display-stand-effects.json',
    );
}
/** Uniform scaling preserves each front-facing sprite and anchors its feet to the floor. */
export function displayStand(scene: Phaser.Scene, item: string) {
  const theme = displayStandTheme(item);
  const stand = scene.add.container(0, 0).setName('display-stand').setData('theme', theme);
  const sprite = scene.add
    .image(0, 0, 'island-display-stands', theme)
    .setOrigin(0.5, 1)
    .setName('display-stand-sprite');
  sprite.setScale(64 / sprite.width);
  stand.add(sprite);
  if (theme === 'celestial' || theme === 'shadow') {
    const key = `display-stand-${theme}`;
    if (!scene.anims.exists(key))
      scene.anims.create({
        key,
        frames: Array.from({ length: 8 }, (_, i) => ({
          key: 'display-stand-effects',
          frame: `${theme}-${i}`,
        })),
        frameRate: 6,
        repeat: -1,
      });
    const effect = scene.add
      .sprite(0, -25, 'display-stand-effects', `${theme}-0`)
      .setOrigin(0.5, 0.68)
      .setScale(88 / 300)
      .setName('display-stand-effect');
    effect.play(key);
    stand.add(effect);
  }
  return stand;
}
export function itemDisplay(scene: Phaser.Scene, item: string) {
  const stand = displayStand(scene, item);
  const icon = lootIcon(scene, item, 60).setPosition(0, -58);
  return scene.add.container(0, 0, [stand, icon]).setName('house-display');
}
