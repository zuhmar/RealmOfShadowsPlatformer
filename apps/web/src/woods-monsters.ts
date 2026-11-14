import { assetUrl } from './assets';
import { groundSlamFrame } from './boss-animation';
import Phaser from 'phaser';
import { WOODS_MONSTERS, BOSS_ATTACK, type WoodsMonster } from '@ros/game-data';
import type { Wolf, Player } from '@ros/shared';
import { wolfAnimation, wolfFacing, type WolfVisualState } from './wolf-animation';
type Clips = {
  origins: { x: number; y: number }[];
  scale: number;
  height?: number;
  animations: Record<string, { frames: string[]; frameRate: number; repeat: number }>;
};
export function preloadWoodsMonster(scene: Phaser.Scene, monster?: WoodsMonster) {
  if (!monster || monster === 'wolf') return;
  if (monster === 'crystal-wyrm') {
    scene.load.atlas(
      'crystal-wyrm-special',
      assetUrl('/assets/monsters/crystal-wyrm-special.png'),
      '/assets/monsters/crystal-wyrm-special.json',
    );
    scene.load.json(
      'crystal-wyrm-special-clips',
      '/assets/monsters/crystal-wyrm-special-clips.json',
    );
  }
  if (monster === 'forest-bear') {
    scene.load.atlas(
      'forest-bear-slam',
      assetUrl('/assets/monsters/forest-bear-slam.png'),
      '/assets/monsters/forest-bear-slam.json',
    );
    scene.load.json('forest-bear-slam-clips', '/assets/monsters/forest-bear-slam-clips.json');
  }
  scene.load.atlas(
    monster,
    assetUrl(`/assets/monsters/${monster}.png`),
    `/assets/monsters/${monster}.json`,
  );
  scene.load.json(`${monster}-clips`, `/assets/monsters/${monster}-clips.json`);
}
export function registerWoodsMonster(scene: Phaser.Scene, monster?: WoodsMonster) {
  if (!monster || monster === 'wolf') return;
  const clips = scene.cache.json.get(`${monster}-clips`) as Clips;
  for (const [name, clip] of Object.entries(clips.animations))
    if (!scene.anims.exists(`${monster}-${name}`))
      scene.anims.create({
        key: `${monster}-${name}`,
        frames: clip.frames.map((frame) => ({ key: monster, frame })),
        frameRate: clip.frameRate,
        repeat: clip.repeat,
      });
}
export class WoodsMonsterVisual {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  previous?: WolfVisualState;
  deathCompleteAt: number | null = null;
  private monster: WoodsMonster;
  private baseScale: number;
  labelOffset = 78;
  constructor(
    private scene: Phaser.Scene,
    wolf: Wolf,
  ) {
    this.monster = wolf.monster!;
    const clips = scene.cache.json.get(`${this.monster}-clips`) as Clips;
    this.labelOffset = clips.height
      ? clips.height * (WOODS_MONSTERS[this.monster].boss ? 2 : 1) + 20
      : WOODS_MONSTERS[this.monster].boss
        ? 285
        : 78;
    this.baseScale = clips.scale * (WOODS_MONSTERS[this.monster].boss ? BOSS_ATTACK.scale : 1);
    this.container = scene.add.container(wolf.x, wolf.y).setDepth(9);
    this.sprite = new Phaser.GameObjects.Sprite(scene, 0, 0, this.monster, 'idle-0').setScale(
      this.baseScale,
    );
    this.container.add(this.sprite);
    const anchor = () => {
      if (this.sprite.texture.key !== this.monster) return;
      const [row, frame] = String(this.sprite.frame.name).split('-');
      const index = ['idle', 'walk', 'attack', 'death'].indexOf(row) * 4 + Number(frame);
      const origin = clips.origins[index];
      this.sprite.setOrigin(origin.x, origin.y);
    };
    anchor();
    this.sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, anchor);
    this.sprite.on(Phaser.Animations.Events.ANIMATION_START, anchor);
    this.sprite.on(
      Phaser.Animations.Events.ANIMATION_COMPLETE,
      (a: Phaser.Animations.Animation) => {
        if (a.key === `${this.monster}-death`) this.deathCompleteAt = this.scene.time.now;
      },
    );
  }
  sync(wolf: Wolf, players: Player[], now: number, serverTime = now) {
    const key = this.sprite.anims.currentAnim?.key ?? '';
    const oneShot =
      [`${this.monster}-attack`, `${this.monster}-hurt`].includes(key) &&
      this.sprite.anims.isPlaying;
    const animation = wolfAnimation(wolf, this.previous, oneShot);
    if (animation === 'death') this.deathCompleteAt = null;
    if (animation === 'hurt') {
      this.sprite.setTint(0xffaaaa);
      this.scene.time.delayedCall(120, () => {
        if (this.sprite.active) this.sprite.clearTint();
      });
    }
    const slam = groundSlamFrame(wolf, serverTime);
    const specialKey =
      this.monster === 'crystal-wyrm' ? 'crystal-wyrm-special' : 'forest-bear-slam';
    if (slam !== null && (this.monster === 'hydra' || this.monster === 'frost-giant')) {
      const body = this.scene.cache.json.get(`${this.monster}-clips`) as Clips;
      const frame = slam < 4 ? `idle-${slam}` : `attack-${slam - 4}`;
      const origin = body.origins[slam < 4 ? slam : slam + 4];
      this.sprite.anims.stop();
      this.sprite
        .setTexture(this.monster, frame)
        .setOrigin(origin.x, origin.y)
        .setScale(this.baseScale)
        .setFlipX(wolf.slamFacing === -1);
    } else if (slam !== null) {
      const config = this.scene.cache.json.get(`${specialKey}-clips`) as {
        origins: { x: number; y: number }[];
        scaleRatio: number;
        silhouetteHeights: number[];
      };
      this.sprite.anims.stop();
      this.sprite
        .setTexture(specialKey, `slam-${slam}`)
        .setOrigin(config.origins[slam].x, config.origins[slam].y)
        .setScale(this.baseScale * config.scaleRatio);
      this.labelOffset = config.silhouetteHeights[slam] * this.sprite.scaleY + 20;
      this.sprite.setFlipX(wolf.slamFacing === -1);
    } else {
      const body = this.scene.cache.json.get(`${this.monster}-clips`) as Clips;
      this.labelOffset = body.height
        ? body.height * (WOODS_MONSTERS[this.monster].boss ? 2 : 1) + 20
        : WOODS_MONSTERS[this.monster].boss
          ? 285
          : 78;
      if (this.sprite.texture.key !== this.monster) {
        this.sprite.setTexture(this.monster, 'idle-0').setScale(this.baseScale);
      }
      if (
        (this.monster === 'hydra' || this.monster === 'frost-giant') &&
        !this.sprite.anims.isPlaying &&
        !animation
      )
        this.sprite.play(`${this.monster}-${wolf.hp > 0 ? 'idle' : 'death'}`, true);
      if (animation) this.sprite.play(`${this.monster}-${animation}`, true);
    }
    if (wolf.special && wolf.hp > 0)
      this.sprite.setTint(this.monster === 'frost-giant' ? 0xbceeff : 0xffad75);
    else if (!this.sprite.anims.currentAnim?.key.endsWith('-hurt')) this.sprite.clearTint();
    if (wolf.hp > 0) {
      const flip = wolfFacing(wolf, this.previous?.x ?? wolf.x, players);
      if (flip !== null && slam === null) this.sprite.setFlipX(flip);
      this.container.setAlpha(1);
    } else
      this.container.setAlpha(
        this.deathCompleteAt === null
          ? 1
          : Phaser.Math.Clamp(1 - (now - this.deathCompleteAt - 350) / 400, 0, 1),
      );
    this.container.x = Phaser.Math.Linear(this.container.x, wolf.x, 0.5);
    this.container.y = wolf.y;
    this.previous = { hp: wolf.hp, x: wolf.x, lastAttack: wolf.lastAttack, dead: wolf.hp <= 0 };
  }
  destroy() {
    this.container.destroy();
  }
}
