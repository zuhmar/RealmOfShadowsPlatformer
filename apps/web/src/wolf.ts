import Phaser from 'phaser';
import type { Wolf, Player } from '@ros/shared';
import { wolfAnimation, wolfFacing, type WolfVisualState } from './wolf-animation';

type Sheet = {
  animations: Record<string, { start: number; end: number; frameRate: number; repeat: number }>;
  footBaselines: number[];
};
export const WOLF_TEXTURE = 'forest-wolf';
export const WOLF_FRAME_SIZE = 229;
export function registerWolfAnimations(scene: Phaser.Scene) {
  const sheet = scene.cache.json.get('wolf-config') as Sheet;
  for (const [name, clip] of Object.entries(sheet.animations)) {
    if (scene.anims.exists(`wolf-${name}`)) continue;
    scene.anims.create({
      key: `wolf-${name}`,
      frames: scene.anims.generateFrameNumbers(WOLF_TEXTURE, { start: clip.start, end: clip.end }),
      frameRate: clip.frameRate,
      repeat: clip.repeat,
    });
  }
}

export class WolfVisual {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  previous?: WolfVisualState;
  deathCompleteAt: number | null = null;
  constructor(
    private scene: Phaser.Scene,
    wolf: Wolf,
  ) {
    this.container = scene.add.container(wolf.x, wolf.y).setDepth(9);
    // Let the container register the sprite once. Adding to the scene first can
    // queue a conflicting update-list removal when spawned during Scene.update.
    this.sprite = new Phaser.GameObjects.Sprite(scene, 0, 0, WOLF_TEXTURE, 0).setScale(0.42);
    this.container.add(this.sprite);
    const align = () => {
      const frame = Number(this.sprite.frame.name);
      const baseline = (scene.cache.json.get('wolf-config') as Sheet).footBaselines[frame] ?? 200;
      this.sprite.setOrigin(0.5, baseline / WOLF_FRAME_SIZE);
    };
    this.sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, align);
    this.sprite.on(Phaser.Animations.Events.ANIMATION_START, align);
    this.sprite.on(
      Phaser.Animations.Events.ANIMATION_COMPLETE,
      (animation: Phaser.Animations.Animation) => {
        if (animation.key === 'wolf-death') this.deathCompleteAt = this.scene.time.now;
      },
    );
    align();
  }
  sync(wolf: Wolf, players: Player[], now: number) {
    const oneShot =
      ['wolf-attack', 'wolf-hurt'].includes(this.sprite.anims.currentAnim?.key ?? '') &&
      this.sprite.anims.isPlaying;
    const animation = wolfAnimation(wolf, this.previous, oneShot);
    if (animation === 'death') this.deathCompleteAt = null;
    if (animation) this.sprite.play(`wolf-${animation}`, true);
    if (wolf.hp > 0) {
      if (this.previous?.dead) this.container.setPosition(wolf.x, wolf.y);
      const flip = wolfFacing(wolf, this.previous?.x ?? wolf.x, players);
      if (flip !== null) this.sprite.setFlipX(flip);
      this.container.setAlpha(1);
    } else {
      // Complete the fall before fading the corpse; retain the visual until server respawn.
      this.container.setAlpha(
        this.deathCompleteAt === null
          ? 1
          : Phaser.Math.Clamp(1 - (now - this.deathCompleteAt - 350) / 400, 0, 1),
      );
    }
    this.container.x = Phaser.Math.Linear(this.container.x, wolf.x, 0.5);
    this.container.y = wolf.y;
    this.previous = { hp: wolf.hp, x: wolf.x, lastAttack: wolf.lastAttack, dead: wolf.hp <= 0 };
  }
  destroy() {
    this.container.destroy();
  }
}
