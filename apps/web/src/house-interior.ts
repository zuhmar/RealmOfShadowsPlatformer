import type Phaser from 'phaser';
import { HOUSE_LAYOUTS, houseSize, CARPENTRY_RECIPES, type GameMap } from '@ros/game-data';
import type { Player } from '@ros/shared';
import { assetUrl } from './assets';
import { preloadHousing } from './housing';
export function preloadHouseInterior(scene: Phaser.Scene) {
  preloadHousing(scene);
  if (!scene.textures.exists('house-interior'))
    scene.load.atlas(
      'house-interior',
      assetUrl('/assets/props/house-interiors.png'),
      '/assets/props/house-interiors.json',
    );
}
export class HouseInterior {
  private items: Phaser.GameObjects.Image[] = [];
  private signature = '';
  constructor(
    private scene: Phaser.Scene,
    private map: GameMap,
    exit: () => void,
  ) {
    const layout = HOUSE_LAYOUTS[houseSize(map.id)!];
    scene.add.rectangle(0, 0, map.width, map.height, 0x291a28).setOrigin(0).setDepth(-40);
    for (const y of layout.floors) {
      scene.add
        .rectangle(40, y - 260, map.width - 80, 260, 0x76502f)
        .setOrigin(0)
        .setDepth(-35);
      scene.add
        .rectangle(40, y, map.width - 80, 28, 0x895428)
        .setOrigin(0)
        .setDepth(-1);
      const f = scene.textures.getFrame('house-interior', 'wall'),
        scale = 260 / f.height;
      scene.add
        .tileSprite(40, y - 260, map.width - 80, 260, 'house-interior', 'wall')
        .setOrigin(0)
        .setTileScale(scale)
        .setDepth(-30)
        .setName('house-wall');
      const floor = scene.textures.getFrame('house-interior', 'floor');
      scene.add
        .tileSprite(40, y, map.width - 80, 28, 'house-interior', 'floor')
        .setOrigin(0)
        .setTileScale(28 / floor.height)
        .setDepth(0)
        .setName('house-floor');
      for (const x of [40, map.width - 40]) {
        const beam = scene.add.image(x, y, 'house-interior', 'beam').setOrigin(0.5, 1);
        beam
          .setScale(270 / beam.height)
          .setDepth(-15)
          .setName('house-beam');
      }
      for (let x = 360; x < map.width - 200; x += 400) {
        const im = scene.add.image(x, y - 100, 'house-interior', 'window').setOrigin(0.5, 1);
        im.setScale(110 / im.height).setDepth(-20);
      }
    }
    for (const l of map.ladders) {
      scene.add
        .rectangle(l.x, l.top + 12, 60, 24, 0x3d271e)
        .setDepth(1)
        .setName('house-floor-hatch');
      const im = scene.add.image(l.x, l.bottom, 'house-interior', 'ladder').setOrigin(0.5, 1);
      im.setScale((l.bottom - l.top) / im.height)
        .setDepth(3)
        .setName('house-ladder');
    }
    const door = scene.add.image(110, layout.floors[0], 'house-interior', 'door').setOrigin(0.5, 1);
    door
      .setScale(135 / door.height)
      .setDepth(-10)
      .setName('house-exit');
    scene.add
      .zone(110, layout.floors[0] - 65, 100, 140)
      .setDepth(5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', exit);
    scene.add
      .text(110, layout.floors[0] - 155, 'Exit · E', {
        fontFamily: 'Georgia',
        fontSize: '18px',
        color: '#ffe4b5',
        stroke: '#24152f',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(6);
  }
  update(p: Player | undefined) {
    const furniture = p?.housingView?.furniture ?? p?.housing?.furniture ?? [],
      key = JSON.stringify(furniture);
    if (key === this.signature) return;
    this.signature = key;
    this.items.forEach((i) => i.destroy());
    this.items = [];
    const layout = HOUSE_LAYOUTS[houseSize(this.map.id)!];
    for (const f of furniture) {
      const r = CARPENTRY_RECIPES.find((r) => r.id === f.item),
        y = layout.floors[f.floor ?? 0];
      if (!r || y === undefined) continue;
      const im = this.scene.add
        .image(this.map.width / 2 + f.x, y, 'housing-art', f.item)
        .setOrigin(0.5, 1);
      im.setScale(Math.min(r.width / im.width, r.height / im.height))
        .setDepth(3)
        .setName('house-furniture');
      this.items.push(im);
    }
  }
}
