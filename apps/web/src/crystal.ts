import { assetUrl } from './assets';
import Phaser from 'phaser';
import type { GameMap } from '@ros/game-data';
import { backgroundArtwork } from './woods-layout';
export function preloadCrystal(scene: Phaser.Scene, map: GameMap) {
  scene.load.image('crystal-background', assetUrl(map.background!));
  scene.load.atlas(
    'crystal-scenery',
    assetUrl('/assets/tilesets/crystal-scenery.png'),
    '/assets/tilesets/crystal-scenery.json',
  );
  if (map.npcs.some((n) => n.id === 'mentor')) {
    scene.load.atlas(
      'cavern-mentor',
      assetUrl('/assets/characters/cavern-mentor.png'),
      '/assets/characters/cavern-mentor.json',
    );
    scene.load.json('cavern-mentor-clips', '/assets/characters/cavern-mentor-clips.json');
  }
}
export function cavernMentor(scene: Phaser.Scene, x: number, y: number) {
  const config = scene.cache.json.get('cavern-mentor-clips');
  if (!scene.anims.exists('cavern-mentor-idle'))
    scene.anims.create({
      key: 'cavern-mentor-idle',
      frames: Array.from({ length: 6 }, (_, i) => ({ key: 'cavern-mentor', frame: `idle-${i}` })),
      frameRate: 4,
      repeat: -1,
    });
  const sprite = scene.add
    .sprite(x, y, 'cavern-mentor', 'idle-0')
    .setScale(config.scale)
    .setName('cavern-mentor');
  const anchor = () => {
    const i = Number(String(sprite.frame.name).split('-')[1]);
    sprite.setOrigin(config.origins[i].x, config.origins[i].y);
  };
  sprite.on('animationupdate', anchor);
  anchor();
  sprite.play('cavern-mentor-idle');
  return sprite;
}
export class CrystalScenery {
  background: Phaser.GameObjects.Image;
  constructor(
    private scene: Phaser.Scene,
    private map: GameMap,
    onGather: (id: string) => void,
  ) {
    this.background = scene.add.image(0, 0, 'crystal-background').setDepth(-30);
    const ground = map.platforms.find((p) => !p.oneWay)!;
    scene.add
      .rectangle(0, ground.y + 48, map.width, map.height + 1000, 0x10152e)
      .setOrigin(0)
      .setDepth(-2);
    const tile = (x: number, y: number, width: number, frame = 'platform', height = 90) =>
      scene.add
        .image(x, y - height * 0.32, 'crystal-scenery', frame)
        .setOrigin(0)
        .setDisplaySize(width, height)
        .setDepth(0)
        .setName('crystal-platform');
    for (const p of map.platforms) {
      if (p.id === 'ground')
        for (let x = 0; x < p.width; x += 340) tile(x - 18, p.y, Math.min(376, p.width - x + 36));
      else
        tile(
          p.x,
          p.y,
          p.width,
          p.id === 'fishing-dock' ? 'fishing' : 'platform',
          p.id === 'fishing-dock' ? 180 : 90,
        ).setData({ platformId: p.id, surfaceY: p.y });
    }
    for (const l of map.ladders)
      scene.add
        .image(l.x, l.top - 6, 'crystal-scenery', 'ladder')
        .setOrigin(0.5, 0)
        .setDisplaySize(40, l.bottom - l.top + 12)
        .setDepth(3)
        .setName('crystal-ladder');
    const offsets =
      map.id === 'crystal-2'
        ? [350, 1400, 2200]
        : map.id === 'crystal-3'
          ? [700, 1300, 1900]
          : map.id === 'crystal-boss'
            ? [450, 1550]
            : [1000, 1700, 2100];
    offsets.forEach((x, i) =>
      scene.add
        .image(x, ground.y, 'crystal-scenery', i % 2 ? 'cart' : 'cluster')
        .setOrigin(0.5, 1)
        .setDisplaySize(i % 2 ? 95 : 100, i % 2 ? 65 : 105)
        .setDepth(1),
    );
    for (const node of map.resources ?? []) {
      if (node.skill !== 'Fishing') {
        const image = scene.add
          .image(node.x, node.y, 'crystal-scenery', node.frame)
          .setOrigin(0.5, 1)
          .setDepth(2);
        image
          .setScale(node.height / image.height)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => onGather(node.id));
      }
      scene.add
        .text(node.x, node.y - (node.height || 55) - 24, `${node.skill} · Lv. ${node.level ?? 1}`, {
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
          .zone(node.x, node.y - 25, 120, 90)
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
      { width: 1774, height: 887 },
    );
    this.background.setPosition(image.x, image.y).setDisplaySize(image.width, image.height);
  }
}
