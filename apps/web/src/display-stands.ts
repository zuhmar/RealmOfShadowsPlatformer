import Phaser from 'phaser';
import { displayStandTheme, type DisplayStandTheme } from '@ros/game-data';
import { lootIcon } from './loot-effects';
import { assetUrl } from './assets';
const palette: Record<DisplayStandTheme, [number, number, number]> = {
  woods: [0x593420, 0xb78043, 0xe3b675],
  crystal: [0x302653, 0x7262aa, 0xa7f5ff],
  swamp: [0x293f35, 0x557153, 0xa4d764],
  frost: [0x254c71, 0x72bbd5, 0xe0ffff],
  ember: [0x342833, 0x77443c, 0xffad4d],
  celestial: [0x82718f, 0xeee9f9, 0xffd674],
  shadow: [0x171225, 0x4d2c70, 0xca7aff],
};
export function preloadDisplayStands(scene: Phaser.Scene) {
  if (!scene.textures.exists('island-display-stands'))
    scene.load.atlas(
      'island-display-stands',
      assetUrl('/assets/ui/island-display-stands.png'),
      '/assets/ui/island-display-stands.json',
    );
}
/** Uniform scaling preserves each front-facing sprite and anchors its feet to the floor. */
export function displayStand(scene: Phaser.Scene, item: string) {
  const theme = displayStandTheme(item),
    trim = palette[theme][2];
  const stand = scene.add.container(0, 0).setName('display-stand').setData('theme', theme);
  const sprite = scene.add
    .image(0, 0, 'island-display-stands', theme)
    .setOrigin(0.5, 1)
    .setName('display-stand-sprite');
  sprite.setScale(64 / sprite.width);
  stand.add(sprite);
  if (theme === 'celestial' || theme === 'shadow') {
    const halo = scene.add.ellipse(0, -30, 52, 7, trim, 0.12).setStrokeStyle(1, trim, 0.85);
    stand.add(halo);
    scene.tweens.add({
      targets: halo,
      y: -34,
      alpha: 0.45,
      duration: 1400,
      yoyo: true,
      repeat: -1,
    });
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * 15;
      const glow =
        theme === 'celestial'
          ? scene.add.star(x, -30 - (i % 2) * 3, 4, 1, 3, trim, 0.9)
          : scene.add.ellipse(x, -28, 6, 15, trim, 0.4);
      stand.add(glow);
      scene.tweens.add({
        targets: glow,
        y: glow.y - (theme === 'shadow' ? 21 : 12),
        alpha: 0,
        scaleX: theme === 'shadow' ? 1.8 : 0.4,
        duration: 1500 + i * 220,
        delay: i * 300,
        repeat: -1,
        yoyo: theme === 'celestial',
        ease: 'Sine.easeInOut',
      });
    }
  }
  for (const child of stand.list) {
    child.once(Phaser.GameObjects.Events.DESTROY, () => scene.tweens.killTweensOf(child));
  }
  return stand;
}
export function itemDisplay(scene: Phaser.Scene, item: string) {
  const stand = displayStand(scene, item);
  const icon = lootIcon(scene, item, 60).setPosition(0, -58);
  return scene.add.container(0, 0, [stand, icon]).setName('house-display');
}
