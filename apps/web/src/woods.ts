import { artworkStrip } from './artwork';
import { assetUrl } from './assets';
import fishingAtlas from '../public/assets/tilesets/woods-fishing-platform.json';
import Phaser from 'phaser';
import type { GameMap } from '@ros/game-data';
import {
  WOODS_PROPS,
  woodsPlatformFrame,
  WOODS_AREA_PROPS,
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
export function preloadWoods(scene: Phaser.Scene, map?: GameMap) {
  scene.load.atlas(
    'woods-resources',
    assetUrl('/assets/props/woods-resource-nodes.png'),
    '/assets/props/woods-resource-nodes.json',
  );
  scene.load.atlas(
    'woods-fishing',
    assetUrl('/assets/tilesets/woods-fishing-platform.png'),
    '/assets/tilesets/woods-fishing-platform.json',
  );
  scene.load.json('woods-art', '/assets/maps/whispering-woods-art.json');
  scene.load.image(
    `woods-background:${map?.background ?? '/assets/backgrounds/whispering-woods.png'}`,
    assetUrl(map?.background ?? '/assets/backgrounds/whispering-woods.png'),
  );
  for (const [name, folder] of [
    ['platforms', 'tilesets'],
    ['ladders', 'tilesets'],
    ['props', 'props'],
  ])
    scene.load.atlas(
      `woods-${name}`,
      assetUrl(`/assets/${folder}/whispering-woods-${name}.png`),
      `/assets/${folder}/whispering-woods-${name}.json`,
    );
}
export class WoodsScenery {
  background: Phaser.GameObjects.Image;
  soil?: Phaser.GameObjects.Rectangle;
  platforms: Phaser.GameObjects.Image[] = [];
  ladders: Phaser.GameObjects.Image[] = [];
  props: Phaser.GameObjects.Image[] = [];
  resources: Phaser.GameObjects.GameObject[] = [];
  manifest: ArtManifest;
  constructor(
    private scene: Phaser.Scene,
    private map: GameMap,
    onGather: (id: string) => void = () => {},
  ) {
    this.manifest = scene.cache.json.get('woods-art') as ArtManifest;
    this.background = scene.add
      .image(
        0,
        0,
        `woods-background:${map.background ?? '/assets/backgrounds/whispering-woods.png'}`,
      )
      .setDepth(-30);
    const ground = map.platforms.find((p) => !p.oneWay);
    if (ground)
      this.soil = scene.add
        .rectangle(0, ground.y + 60, map.width, map.height + 1400, 0x483024)
        .setOrigin(0, 0)
        .setDepth(-1);
    for (const platform of map.platforms) {
      if (platform.id === 'fishing-dock') {
        const f = fishingAtlas.frames['fishing-dock'].frame,
          a = fishingAtlas.alignment,
          scale = platform.width / a.deckWidth;
        this.platforms.push(
          scene.add
            .image(
              platform.x - a.deckLeft * scale,
              platform.y - a.surfaceY * scale,
              'woods-fishing',
              'fishing-dock',
            )
            .setOrigin(0)
            .setDisplaySize(f.w * scale, f.h * scale)
            .setDepth(0)
            .setData({ platformId: platform.id, surfaceY: platform.y }),
        );
        continue;
      }
      const name = woodsPlatformFrame(platform);
      const frame = scene.textures.getFrame('woods-platforms', name);
      const surface = this.manifest.atlases.platforms.alignmentHints?.[name]?.surfaceY ?? 0;
      const rect = platformArtwork(
        platform,
        map,
        { width: frame.width, height: frame.height },
        surface,
      );
      if (platform.oneWay) {
        this.platforms.push(
          scene.add
            .image(rect.x, rect.y, 'woods-platforms', name)
            .setOrigin(0)
            .setScale(rect.width / frame.width)
            .setDepth(0)
            .setData({ platformId: platform.id, surfaceY: platform.y }),
        );
      } else {
        this.platforms.push(
          ...artworkStrip(scene, {
            texture: 'woods-platforms',
            frame: name,
            x: platform.x,
            y: platform.y,
            length: platform.width,
            thickness: rect.height,
            surface,
            depth: 0,
          }).map((image) => image.setData({ platformId: platform.id, surfaceY: platform.y })),
        );
      }
    }
    map.ladders.forEach((ladder, i) => {
      this.ladders.push(
        ...artworkStrip(scene, {
          texture: 'woods-ladders',
          frame: i % 2 === 0 ? 'ladder-short' : 'ladder-tall',
          x: ladder.x,
          y: ladder.top - 7,
          length: ladder.bottom - ladder.top + 14,
          thickness: 42,
          vertical: true,
          depth: 3,
        }).map((image) => image.setData({ top: ladder.top, bottom: ladder.bottom })),
      );
    });
    for (const prop of WOODS_AREA_PROPS[map.id] ?? WOODS_PROPS) {
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
    for (const node of map.resources ?? []) {
      if (node.skill !== 'Fishing') {
        const f = scene.textures.getFrame('woods-resources', node.frame);
        const image = scene.add
          .image(node.x, node.y + 1, 'woods-resources', node.frame)
          .setOrigin(0.5, 1)
          .setDisplaySize((node.height * f.width) / f.height, node.height)
          .setDepth(2)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => onGather(node.id));
        this.resources.push(image);
      } else {
        const ripple = scene.add
          .ellipse(node.x + 22, node.y + 30, 30, 7, 0xbef5f1, 0.25)
          .setStrokeStyle(1, 0xd1ffff, 0.7)
          .setDepth(2);
        scene.tweens.add({
          targets: ripple,
          scaleX: 1.4,
          alpha: 0.1,
          duration: 1100,
          yoyo: true,
          repeat: -1,
        });
        this.resources.push(ripple);
      }
      const label = scene.add
        .text(
          node.x,
          node.y + (node.skill === 'Fishing' ? 95 : -node.height - 20),
          node.skill === 'Fishing' ? 'Fishing • Lv. 1 / 5 / 10' : `${node.skill} • E`,
          {
            fontFamily: 'Georgia',
            fontSize: '12px',
            color: '#f0ddff',
            stroke: '#251233',
            strokeThickness: 3,
          },
        )
        .setOrigin(0.5)
        .setDepth(4)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => onGather(node.id));
      this.resources.push(label);
      if (node.skill === 'Fishing')
        this.resources.push(
          scene.add
            .zone(node.x, node.y - 25, 100, 70)
            .setDepth(3)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => onGather(node.id)),
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
    const image = backgroundArtwork(view, this.map, {
      width: this.background.width,
      height: this.background.height,
    });
    this.background.setPosition(image.x, image.y).setScale(image.width / this.background.width);
  }
}
