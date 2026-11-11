import { preloadGeneratedTerrain, generatedSoil } from './generated-terrain';
import { terrainPlatform, terrainLadder } from './terrain';
import { assetUrl } from './assets';
import Phaser from 'phaser';
import type { GameMap } from '@ros/game-data';
import { WOODS_PROPS, WOODS_AREA_PROPS, backgroundArtwork } from './woods-layout';
export function preloadWoods(scene: Phaser.Scene, map?: GameMap) {
  preloadGeneratedTerrain(scene, 'woods');
  scene.load.atlas(
    'woods-resources',
    assetUrl('/assets/props/woods-resource-nodes.png'),
    '/assets/props/woods-resource-nodes.json',
  );
  scene.load.image(
    `woods-background:${map?.background ?? '/assets/backgrounds/whispering-woods.png'}`,
    assetUrl(map?.background ?? '/assets/backgrounds/whispering-woods.png'),
  );
  for (const [name, folder] of [['props', 'props']])
    scene.load.atlas(
      `woods-${name}`,
      assetUrl(`/assets/${folder}/whispering-woods-${name}.png`),
      `/assets/${folder}/whispering-woods-${name}.json`,
    );
}
export class WoodsScenery {
  background: Phaser.GameObjects.Image;
  platforms: Phaser.GameObjects.Image[] = [];
  ladders: Phaser.GameObjects.Image[] = [];
  props: Phaser.GameObjects.Image[] = [];
  resources: Phaser.GameObjects.GameObject[] = [];
  constructor(
    private scene: Phaser.Scene,
    private map: GameMap,
    onGather: (id: string) => void = () => {},
  ) {
    this.background = scene.add
      .image(
        0,
        0,
        `woods-background:${map.background ?? '/assets/backgrounds/whispering-woods.png'}`,
      )
      .setDepth(-30);
    generatedSoil(scene, map, 'woods');
    for (const platform of map.platforms)
      this.platforms.push(terrainPlatform(scene, map, platform, 'woods'));
    for (const ladder of map.ladders) this.ladders.push(terrainLadder(scene, ladder, 'woods'));
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
    const detach = () => {
      camera.off(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, this.refresh, this);
      scene.scale.off(Phaser.Scale.Events.RESIZE, this.refresh, this);
      scene.events.off(Phaser.Scenes.Events.SHUTDOWN, detach);
      scene.events.off(Phaser.Scenes.Events.DESTROY, detach);
    };
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, detach);
    scene.events.once(Phaser.Scenes.Events.DESTROY, detach);
    this.refresh();
  }
  refresh() {
    if (!this.background.scene || !this.scene.cameras.main) return;
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
