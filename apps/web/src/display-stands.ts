import Phaser from 'phaser';
import { displayStandTheme, type DisplayStandTheme } from '@ros/game-data';
import { lootIcon } from './loot-effects';
const palette: Record<DisplayStandTheme, [number, number, number]> = {
  woods: [0x593420, 0xb78043, 0xe3b675],
  crystal: [0x302653, 0x7262aa, 0xa7f5ff],
  swamp: [0x293f35, 0x557153, 0xa4d764],
  frost: [0x254c71, 0x72bbd5, 0xe0ffff],
  ember: [0x342833, 0x77443c, 0xffad4d],
  celestial: [0x82718f, 0xeee9f9, 0xffd674],
  shadow: [0x171225, 0x4d2c70, 0xca7aff],
};
/** All geometry is a front elevation with a fixed 64px footprint and floor baseline. */
export function displayStand(scene: Phaser.Scene, item: string) {
  const theme = displayStandTheme(item),
    [dark, body, trim] = palette[theme];
  const stand = scene.add.container(0, 0).setName('display-stand').setData('theme', theme);
  const art = scene.add.graphics();
  stand.add(art);
  const rect = (x: number, y: number, w: number, h: number, color: number) => {
    art.fillStyle(color).fillRoundedRect(x, y, w, h, 2);
    art.lineStyle(1, 0x160f24, 0.9).strokeRoundedRect(x, y, w, h, 2);
  };
  const gem = (x: number, y: number, color: number, size = 4) => {
    art.fillStyle(color).fillPoints(
      [
        { x, y: y - size },
        { x: x + size, y },
        { x, y: y + size },
        { x: x - size, y },
      ],
      true,
    );
    art.lineStyle(1, 0xffffff, 0.45).lineBetween(x, y - size + 1, x - size + 1, y);
  };
  if (theme === 'woods') {
    rect(-27, -20, 8, 18, dark);
    rect(19, -20, 8, 18, dark);
    rect(-32, -26, 64, 8, body);
    art.lineStyle(1, trim).lineBetween(-28, -24, 28, -24);
    art.lineStyle(1, body).lineBetween(-24, -15, -24, -5).lineBetween(23, -15, 23, -5);
  } else {
    rect(-28, -6, 56, 6, dark);
    rect(-22, -21, 44, 15, body);
    rect(-32, -28, 64, 7, dark);
    rect(-30, -27, 60, 3, trim);
    if (theme === 'crystal') {
      gem(-17, -13, trim, 5);
      gem(17, -13, trim, 5);
      art.lineStyle(1, trim, 0.6).lineBetween(-7, -21, -4, -7).lineBetween(8, -21, 4, -7);
    } else if (theme === 'swamp') {
      rect(-29, -9, 58, 4, body);
      art
        .lineStyle(2, trim)
        .beginPath()
        .moveTo(-19, -23)
        .lineTo(-15, -16)
        .lineTo(-18, -10)
        .strokePath();
      art
        .lineStyle(2, trim)
        .beginPath()
        .moveTo(19, -23)
        .lineTo(15, -16)
        .lineTo(18, -10)
        .strokePath();
      gem(0, -14, trim, 4);
    } else if (theme === 'frost') {
      for (const x of [-24, -12, 12, 24])
        art.fillStyle(trim).fillTriangle(x - 3, -23, x + 3, -23, x, -13);
      gem(0, -13, trim, 6);
      rect(-31, -4, 62, 3, trim);
    } else if (theme === 'ember') {
      rect(-30, -7, 60, 3, trim);
      art
        .lineStyle(2, trim)
        .beginPath()
        .moveTo(-12, -21)
        .lineTo(-5, -17)
        .lineTo(-9, -10)
        .lineTo(2, -7)
        .strokePath();
      gem(15, -14, trim, 5);
      for (const x of [-25, 25]) art.fillStyle(trim).fillCircle(x, -24, 2);
    } else {
      rect(-30, -8, 60, 3, trim);
      for (const x of [-17, 17]) {
        rect(x - 3, -22, 6, 14, dark);
        art.lineStyle(1, trim).lineBetween(x, -21, x, -9);
      }
      gem(0, -14, trim, 6);
      if (theme === 'celestial') {
        for (const x of [-27, 27]) {
          art.fillStyle(trim).fillTriangle(x - 4, -26, x + 4, -26, x, -37);
          art.fillStyle(body).fillTriangle(x - 3, -26, x + 3, -26, x, -32);
        }
      } else {
        for (const x of [-26, 26]) art.fillStyle(dark).fillTriangle(x - 6, -24, x + 6, -24, x, -40);
      }
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
