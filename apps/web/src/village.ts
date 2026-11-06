import { assetUrl } from './assets';
import Phaser from 'phaser';
import type { GameMap } from '@ros/game-data';
import { backgroundArtwork } from './woods-layout';

export function preloadVillage(scene: Phaser.Scene) {
  scene.load.image('village-background', assetUrl('/assets/backgrounds/elderwood-village.png'));
  for (const [name, folder] of [
    ['buildings', 'props'],
    ['platforms', 'tilesets'],
    ['props', 'props'],
  ])
    scene.load.atlas(
      `village-${name}`,
      assetUrl(`/assets/${folder}/elderwood-village-${name}.png`),
      `/assets/${folder}/elderwood-village-${name}.json`,
    );
}

export class VillageScenery {
  background: Phaser.GameObjects.Image;
  platforms: Phaser.GameObjects.Image[] = [];
  buildings: Phaser.GameObjects.Image[] = [];
  props: Phaser.GameObjects.Image[] = [];
  ladders: Phaser.GameObjects.Image[] = [];
  constructor(
    private scene: Phaser.Scene,
    private map: GameMap,
  ) {
    this.background = scene.add.image(0, 0, 'village-background').setDepth(-30);
    const ground = map.platforms.find((p) => !p.oneWay)!;
    scene.add
      .rectangle(0, ground.y + 110, map.width, map.height + 1400, 0x654326)
      .setOrigin(0)
      .setDepth(-1);
    for (const p of map.platforms) {
      const name = p.oneWay ? 'timber-terrace' : 'grass-ground';
      const frame = scene.textures.getFrame('village-platforms', name);
      const height = p.oneWay ? 38 : 150;
      const surfaceY = p.oneWay ? 5 : 18;
      this.platforms.push(
        scene.add
          .image(p.x, p.y - (surfaceY * height) / frame.height, 'village-platforms', name)
          .setOrigin(0)
          .setDisplaySize(p.width, height)
          .setDepth(0)
          .setData({ platformId: p.id, surfaceY: p.y, artSurfaceY: surfaceY }),
      );
    }
    const place = (
      texture: string,
      frame: string,
      x: number,
      y: number,
      height: number,
      depth: number,
    ) => {
      const f = scene.textures.getFrame(texture, frame);
      return scene.add
        .image(x, y, texture, frame)
        .setOrigin(0.5, 1)
        .setDisplaySize((height * f.width) / f.height, height)
        .setDepth(depth);
    };
    for (const [frame, x, height] of [
      ['guide-cottage', 430, 195],
      ['blacksmith', 960, 185],
      ['inn', 1250, 260],
      ['market-stall', 1450, 160],
    ] as const)
      this.buildings.push(place('village-buildings', frame, x, ground.y + 2, height, -5));
    for (const [frame, x, height] of [
      ['noticeboard', 100, 90],
      ['bench', 215, 40],
      ['well', 310, 78],
      ['lantern-post', 560, 125],
      ['barrel', 750, 43],
      ['crate', 800, 40],
      ['anvil', 1020, 48],
      ['training-target', 1100, 82],
      ['flower-planter', 1310, 38],
      ['signpost', 1670, 66],
      ['shrub', 1760, 48],
    ] as const)
      this.props.push(place('village-props', frame, x, ground.y + 2, height, 2));
    for (const ladder of map.ladders)
      this.ladders.push(
        scene.add
          .image(ladder.x, ladder.top - 6, 'village-props', 'ladder')
          .setOrigin(0.5, 0)
          .setDisplaySize(42, ladder.bottom - ladder.top + 12)
          .setDepth(3),
      );
    // Decorative paving and bridge deck lie on the existing ground, with no new colliders.
    for (const [frame, x, width] of [
      ['stone-walkway', 335, 190],
      ['wooden-bridge', 1380, 145],
    ] as const)
      this.props.push(
        scene.add
          .image(x, ground.y - 1, 'village-platforms', frame)
          .setOrigin(0, 0)
          .setDisplaySize(width, 15)
          .setDepth(1),
      );
    const camera = scene.cameras.main;
    camera.on(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, this.refresh, this);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.refresh, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      camera.off(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, this.refresh, this);
      scene.scale.off(Phaser.Scale.Events.RESIZE, this.refresh, this);
    });
    this.refresh();
  }
  refresh() {
    const camera = this.scene.cameras.main;
    const width = camera.width / camera.zoom,
      height = camera.height / camera.zoom;
    const view = {
      x: camera.scrollX + camera.width / 2 - width / 2,
      y: camera.scrollY + camera.height / 2 - height / 2,
      width,
      height,
    };
    const image = backgroundArtwork(view, this.map, { width: 1536, height: 1024 });
    this.background.setPosition(image.x, image.y).setDisplaySize(image.width, image.height);
  }
}
