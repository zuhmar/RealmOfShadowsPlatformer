import Phaser from 'phaser';
import { HOUSE_LAYOUTS, houseSize, CARPENTRY_RECIPES, type GameMap } from '@ros/game-data';
import type { Player } from '@ros/shared';
import { assetUrl } from './assets';
import { preloadHousing } from './housing';
export function preloadHouseInterior(scene: Phaser.Scene) {
  preloadHousing(scene);
  if (!scene.textures.exists('house-sky'))
    scene.load.image('house-sky', assetUrl('/assets/backgrounds/house-sky.png'));
  for (const key of ['house-wall-edge', 'house-roof']) {
    if (!scene.textures.exists(key))
      scene.load.atlas(key, assetUrl(`/assets/props/${key}.png`), `/assets/props/${key}.json`);
  }
  if (!scene.textures.exists('house-plaster'))
    scene.load.image('house-plaster', assetUrl('/assets/backgrounds/house-plaster.png'));
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
  private backdrop: Phaser.GameObjects.TileSprite;
  private sky: Phaser.GameObjects.Image;
  private roofBase: number;
  constructor(
    private scene: Phaser.Scene,
    private map: GameMap,
    exit: () => void,
  ) {
    const layout = HOUSE_LAYOUTS[houseSize(map.id)!];
    const bounds = map.interiorBounds!;
    this.roofBase = bounds.top - 10;
    this.sky = scene.add.image(0, 0, 'house-sky').setOrigin(0).setDepth(-41).setName('house-sky');
    this.backdrop = scene.add
      .tileSprite(0, 0, scene.scale.width, scene.scale.height, 'house-plaster')
      .setOrigin(0)
      .setDepth(-40)
      .setTileScale(0.6)
      .setName('house-backdrop');
    const strip = (
      x: number,
      y: number,
      width: number,
      height: number,
      frame: string,
      depth: number,
      name: string,
    ) => {
      const f = scene.textures.getFrame('house-interior', frame);
      return scene.add
        .tileSprite(x, y, width, height, 'house-interior', frame)
        .setOrigin(0)
        .setTileScale(height / f.height)
        .setDepth(depth)
        .setName(name);
    };
    strip(32, bounds.top - 28, map.width - 64, 28, 'floor-strip', 1, 'house-ceiling');
    const edgeTop = bounds.top - 28;
    const edgeHeight = bounds.bottom + 28 - edgeTop;
    const edgeFrame = scene.textures.getFrame('house-wall-edge', 'main');
    for (const x of [32, map.width - 64]) {
      scene.add
        .tileSprite(x, edgeTop, 32, edgeHeight, 'house-wall-edge', 'main')
        .setOrigin(0)
        .setTileScale(32 / edgeFrame.width)
        .setDepth(4)
        .setName('house-wall-edge');
    }
    const roof = scene.add
      .image(map.width / 2, this.roofBase, 'house-roof', 'main')
      .setOrigin(0.5, 1)
      .setDepth(5)
      .setName('house-roof');
    roof.setScale(map.width / roof.width);
    const cameraTop = Math.min(0, this.roofBase - roof.displayHeight - 80);
    scene.cameras.main.setBounds(0, cameraTop, map.width, map.height - cameraTop);
    for (const y of layout.floors) {
      strip(64, y - 80, map.width - 128, 80, 'wainscot-strip', -25, 'house-wainscot');
      strip(64, y - 86, map.width - 128, 8, 'floor-strip', -24, 'house-wall-trim');
      scene.add
        .rectangle(32, y, map.width - 64, 28, 0x895428)
        .setOrigin(0)
        .setDepth(-1);
      strip(32, y, map.width - 64, 28, 'floor-strip', 0, 'house-floor');
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
    const refresh = () => this.refresh();
    const camera = scene.cameras.main;
    camera.on(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, refresh);
    scene.scale.on(Phaser.Scale.Events.RESIZE, refresh);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      camera.off(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, refresh);
      scene.scale.off(Phaser.Scale.Events.RESIZE, refresh);
    });
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
  refresh() {
    const camera = this.scene.cameras.main;
    if (!camera || !this.backdrop.scene) return;
    const view = camera.worldView;
    const w = Math.ceil((view.width || camera.width / camera.zoom) + 128),
      h = Math.ceil((view.height || camera.height / camera.zoom) + 128);
    this.sky.setPosition(view.x - 64, view.y - 64);
    this.sky.setScale(Math.max(w / this.sky.width, h / this.sky.height));
    const plasterTop = Math.max(view.y - 64, this.roofBase - 8);
    const plasterHeight = Math.max(1, view.y - 64 + h - plasterTop);
    this.backdrop.setPosition(view.x - 64, plasterTop);
    if (this.backdrop.width !== w || this.backdrop.height !== plasterHeight)
      this.backdrop.setSize(w, plasterHeight);
    this.backdrop.tilePositionX = this.backdrop.x;
    this.backdrop.tilePositionY = this.backdrop.y;
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
