import platformAtlas from '../public/assets/tilesets/murkmire-platforms.json';
import Phaser from 'phaser';
import type { GameMap, Platform } from '@ros/game-data';
import { assetUrl } from './assets';
import { preloadTraversal, islandLadder, islandPond } from './island-traversal';
import { groundProp } from './prop-grounding';
import { backgroundArtwork } from './woods-layout';
export function preloadMurkmire(scene: Phaser.Scene, map: GameMap) {
  preloadTraversal(scene, 'murkmire');
  scene.load.image(`murkmire-background:${map.background}`, assetUrl(map.background!));
  for (const name of ['murkmire-scenery', 'murkmire-platforms'])
    if (!scene.textures.exists(name))
      scene.load.atlas(
        name,
        assetUrl(`/assets/tilesets/${name}.png`),
        `/assets/tilesets/${name}.json`,
      );
  if (map.monster === 'hydra')
    scene.load.atlas(
      'hydra-venom',
      assetUrl('/assets/effects/hydra-venom.png'),
      '/assets/effects/hydra-venom.json',
    );
}
function platform(scene: Phaser.Scene, map: GameMap, p: Platform) {
  if (p.id === 'fishing-dock') return islandPond(scene, p, 'murkmire');
  let atlas = 'murkmire-platforms',
    name = 'long';
  if (p.id === 'fishing-dock') {
    atlas = 'murkmire-scenery';
    name = 'fishing';
  } else if (p.oneWay)
    name = ['short', 'medium', 'long'].reduce((a, b) => {
      const fa = scene.textures.getFrame(atlas, a),
        fb = scene.textures.getFrame(atlas, b);
      return Math.abs((fb.height * p.width) / fb.width - 70) <
        Math.abs((fa.height * p.width) / fa.width - 70)
        ? b
        : a;
    });
  if (!p.oneWay) {
    // Repeat only the bank's interior; its lower earth is continued from the same generated art.
    const f = scene.textures.getFrame(atlas, 'ground');
    const key = `murkmire-ground-bank-v2:${p.width}`;
    if (!scene.textures.exists(key)) {
      const h = map.height - p.y + 400;
      const tex = scene.textures.createCanvas(key, p.width, h)!;
      const ctx = tex.context;
      const spec = platformAtlas.meta.ground;
      const scale = spec.worldHeight / f.height,
        start = spec.repeatStart,
        sw = spec.repeatEnd - spec.repeatStart,
        length = sw * scale;
      const image = f.source.image as HTMLImageElement;
      for (let x = 0; x < p.width; x += length) {
        const w = Math.min(length, p.width - x);
        ctx.drawImage(
          image,
          f.cutX + start,
          f.cutY,
          w / scale,
          f.height,
          x,
          0,
          w,
          spec.worldHeight,
        );
      }
      const fill = spec.fill;
      const fillCanvas = document.createElement('canvas');
      fillCanvas.width = fill.w;
      fillCanvas.height = fill.h;
      fillCanvas
        .getContext('2d')!
        .drawImage(image, f.cutX + fill.x, f.cutY + fill.y, fill.w, fill.h, 0, 0, fill.w, fill.h);
      ctx.fillStyle = ctx.createPattern(fillCanvas, 'repeat')!;
      ctx.fillRect(0, spec.worldHeight - 1, p.width, h - spec.worldHeight + 1);
      tex.refresh();
    }
    return scene.add
      .image(p.x, p.y, key)
      .setOrigin(0)
      .setDepth(0)
      .setName('terrain-platform')
      .setData({
        platformId: p.id,
        surfaceY: p.y,
        terrainWidth: p.width,
        generated: true,
        material: 'terrain',
        theme: 'murkmire',
        continuous: true,
      });
  }
  const f = scene.textures.getFrame(atlas, name);
  return scene.add
    .image(p.x, p.y, atlas, name)
    .setOrigin(0, p.id === 'fishing-dock' ? 0.16 : 0)
    .setScale(p.width / f.width)
    .setDepth(0)
    .setName('terrain-platform')
    .setData({
      platformId: p.id,
      surfaceY: p.y,
      terrainWidth: p.width,
      generated: true,
      material: p.id === 'fishing-dock' ? 'fishing' : 'terrain',
      theme: 'murkmire',
      continuous: true,
      wholeSpan: true,
    });
}
export function mireWarden(scene: Phaser.Scene, x: number, y: number) {
  const image = scene.add
    .image(x, y, 'murkmire-scenery', 'warden')
    .setOrigin(0.5, 1)
    .setName('mire-warden');
  image.setScale(90 / image.height);
  return groundProp(scene, image, x, y, 'warden-ledge');
}
export class MurkmireScenery {
  background: Phaser.GameObjects.Image;
  constructor(
    private scene: Phaser.Scene,
    private map: GameMap,
    onGather: (id: string) => void,
  ) {
    this.background = scene.add.image(0, 0, `murkmire-background:${map.background}`).setDepth(-30);
    for (const p of map.platforms) platform(scene, map, p);
    for (const l of map.ladders) islandLadder(scene, l, 'murkmire');
    const props =
      map.id === 'murkmire-arena'
        ? []
        : map.id === 'murkmire-2'
          ? ['root-arch', 'stump', 'boat']
          : map.id === 'murkmire-3'
            ? ['pillar', 'mushrooms', 'basin']
            : map.id === 'murkmire-boss'
              ? ['pillar', 'basin', 'pillar']
              : ['cattails', 'stump', 'mushrooms'];
    const ground = map.platforms[0];
    props.forEach((name, i) => {
      const x = 650 + (i * (map.width - 1000)) / 3;
      const image = scene.add
        .image(x, ground.y, 'murkmire-scenery', name)
        .setOrigin(0.5, 1)
        .setDepth(2);
      image.setScale((name === 'root-arch' ? 150 : 80) / image.height);
      groundProp(scene, image, x, ground.y, 'ground');
    });
    for (const node of map.resources ?? []) {
      if (node.skill !== 'Fishing') {
        const image = scene.add
          .image(node.x, node.y, 'murkmire-scenery', node.frame)
          .setOrigin(0.5, 1)
          .setDepth(2);
        image
          .setScale(node.height / image.height)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => onGather(node.id));
        groundProp(scene, image, node.x, node.y, node.platform);
      }
      scene.add
        .text(node.x, node.y - (node.height || 55) - 24, `${node.skill} · Lv. ${node.level}`, {
          fontSize: '12px',
          color: '#e8dbff',
          stroke: '#18182d',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(4)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => onGather(node.id));
      if (node.skill === 'Fishing')
        scene.add
          .zone(node.x, node.y - 25, 150, 90)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => onGather(node.id));
    }
    this.refresh();
  }
  refresh() {
    const c = this.scene.cameras.main,
      width = c.width / c.zoom,
      height = c.height / c.zoom;
    const image = backgroundArtwork(
      {
        x: c.scrollX + c.width / 2 - width / 2,
        y: c.scrollY + c.height / 2 - height / 2,
        width,
        height,
      },
      this.map,
      { width: this.background.width, height: this.background.height },
    );
    this.background.setPosition(image.x, image.y).setScale(image.width / this.background.width);
  }
}
