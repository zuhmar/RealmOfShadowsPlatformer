import Phaser from 'phaser';
import type { GameMap } from '@ros/game-data';
import {
  WOODS_PROPS,
  WOODS_PLATFORM_FRAMES,
  platformArtwork,
  backgroundArtwork,
} from './woods-layout';
type ArtManifest = {
  background: { image: string; width: number; height: number };
  atlases: Record<
    string,
    { image: string; atlas: string; alignmentHints?: Record<string, { surfaceY: number }> }
  >;
};
export function preloadWoods(scene: Phaser.Scene) {
  scene.load.json('woods-art', '/assets/maps/whispering-woods-art.json');
  scene.load.image('woods-background', '/assets/backgrounds/whispering-woods.png');
  for (const [name, folder] of [
    ['platforms', 'tilesets'],
    ['ladders', 'tilesets'],
    ['props', 'props'],
  ])
    scene.load.atlas(
      `woods-${name}`,
      `/assets/${folder}/whispering-woods-${name}.png`,
      `/assets/${folder}/whispering-woods-${name}.json`,
    );
}
export class WoodsScenery {
  background: Phaser.GameObjects.Image;
  soil?: Phaser.GameObjects.Rectangle;
  platforms: Phaser.GameObjects.Image[] = [];
  ladders: Phaser.GameObjects.Image[] = [];
  props: Phaser.GameObjects.Image[] = [];
  manifest: ArtManifest;
  constructor(
    private scene: Phaser.Scene,
    private map: GameMap,
  ) {
    this.manifest = scene.cache.json.get('woods-art') as ArtManifest;
    this.background = scene.add.image(0, 0, 'woods-background').setDepth(-30);
    const ground = map.platforms.find((p) => !p.oneWay);
    if (ground)
      this.soil = scene.add
        .rectangle(0, ground.y + 60, map.width, map.height + 1400, 0x483024)
        .setOrigin(0, 0)
        .setDepth(-1);
    for (const platform of map.platforms) {
      const name =
        WOODS_PLATFORM_FRAMES[platform.id] ?? (platform.oneWay ? 'platform-wide' : 'ground');
      const frame = scene.textures.getFrame('woods-platforms', name);
      const surface = this.manifest.atlases.platforms.alignmentHints?.[name]?.surfaceY ?? 0;
      const rect = platformArtwork(
        platform,
        map,
        { width: frame.width, height: frame.height },
        surface,
      );
      const image = scene.add
        .image(rect.x, rect.y, 'woods-platforms', name)
        .setOrigin(0, 0)
        .setDisplaySize(rect.width, rect.height)
        .setDepth(0)
        .setData({ platformId: platform.id, surfaceY: platform.y });
      this.platforms.push(image);
    }
    map.ladders.forEach((ladder, i) => {
      const frame = i % 2 === 0 ? 'ladder-short' : 'ladder-tall';
      this.ladders.push(
        scene.add
          .image(ladder.x, ladder.top - 7, 'woods-ladders', frame)
          .setOrigin(0.5, 0)
          .setDisplaySize(42, ladder.bottom - ladder.top + 14)
          .setDepth(3)
          .setData({ top: ladder.top, bottom: ladder.bottom }),
      );
    });
    for (const prop of WOODS_PROPS) {
      const platform = map.platforms.find((p) => p.id === prop.platform);
      if (!platform) continue;
      const frame = scene.textures.getFrame('woods-props', prop.frame);
      this.props.push(
        scene.add
          .image(platform.x + prop.offset, platform.y + 1, 'woods-props', prop.frame)
          .setOrigin(0.5, 1)
          .setDisplaySize((prop.height * frame.width) / frame.height, prop.height)
          .setDepth(2),
      );
    }
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
    const image = backgroundArtwork(view, this.map, this.manifest.background);
    this.background.setPosition(image.x, image.y).setDisplaySize(image.width, image.height);
  }
}
