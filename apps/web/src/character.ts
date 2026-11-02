import Phaser from 'phaser';
import type { Player } from '@ros/shared';
import { itemDefinition, weaponKind, type WeaponKind, type GameMap } from '@ros/game-data';
import {
  APPEARANCES,
  OUTFITS,
  characterKey,
  appearanceOf,
  outfitOf,
  recolorOutfit,
  type Atlas,
} from './character-art';
import {
  characterMotion,
  characterAction,
  jumpFrame,
  type CharacterState,
} from './character-animation';

type Clips = {
  animations: Record<string, { frames: string[]; frameRate: number; repeat: number }>;
};
export function preloadCharacters(scene: Phaser.Scene) {
  scene.load.json('citizen-clips', '/assets/characters/citizen-animations.json');
  for (const a of APPEARANCES)
    scene.load.atlas(
      `citizen-${a}-sage`,
      `/assets/characters/citizen-${a}.png`,
      `/assets/characters/citizen-${a}.json`,
    );
  // Retain the atlas definitions to register the color variants with identical frame geometry.
  for (const a of APPEARANCES)
    scene.load.json(`citizen-atlas-${a}`, `/assets/characters/citizen-${a}.json`);
}
export function registerCharacters(scene: Phaser.Scene) {
  const clips = scene.cache.json.get('citizen-clips') as Clips;
  for (const a of APPEARANCES) {
    const atlas = scene.cache.json.get(`citizen-atlas-${a}`) as Atlas;
    const original = scene.textures
      .get(characterKey(a, 'sage'))
      .getSourceImage() as HTMLImageElement;
    for (const outfit of OUTFITS) {
      const key = characterKey(a, outfit);
      if (outfit !== 'sage') {
        const texture = scene.textures.addCanvas(
          key,
          recolorOutfit(original, atlas.meta.size.w, atlas.meta.size.h, outfit),
        );
        if (!texture) throw new Error('Cannot prepare character outfit texture');
        scene.textures.addAtlas(key, texture, atlas);
      }
      for (const [name, clip] of Object.entries(clips.animations)) {
        if (name === 'hurt') continue;
        scene.anims.create({
          key: `${key}-${name}`,
          frames: clip.frames.map((frame) => ({ key, frame })),
          frameRate: clip.frameRate,
          repeat: clip.repeat,
        });
      }
    }
  }
}
export class CharacterVisual {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  weapon: Phaser.GameObjects.Graphics;
  previous?: CharacterState;
  key: string;
  drawnWeapon?: WeaponKind;
  landedUntil = 0;
  launchUntil = 0;
  constructor(
    private scene: Phaser.Scene,
    public player: Player,
  ) {
    this.key = characterKey(player.appearance, player.outfit);
    this.container = scene.add.container(player.x, player.y).setDepth(10);
    this.sprite = new Phaser.GameObjects.Sprite(scene, 0, 0, this.key, 'idle-0')
      .setOrigin(0.5, 224 / 256)
      .setScale(0.36);
    this.weapon = scene.add.graphics();
    this.container.add([this.sprite, this.weapon]);
  }
  sync(p: Player, map: GameMap, now: number) {
    const key = characterKey(p.appearance, p.outfit);
    if (key !== this.key) {
      this.key = key;
      this.sprite.stop().setTexture(key, 'idle-0');
      this.previous = undefined;
    }
    const action = characterAction(p, this.previous);
    const motion = characterMotion(p, map);
    if (this.previous?.grounded && !p.grounded && p.vy < 0 && !p.climbing)
      this.launchUntil = now + 70;
    if (this.previous && !this.previous.grounded && p.grounded && Math.abs(this.previous.vy) > 160)
      this.landedUntil = now + 100;
    const playing = this.sprite.anims.isPlaying;
    const clip = this.sprite.anims.currentAnim?.key ?? '';
    const oneShot = playing && clip.endsWith('-attack');
    if (action) this.sprite.play(`${key}-${action}`);
    else if (!oneShot) {
      if (motion === 'air' || now < this.landedUntil) {
        this.sprite
          .stop()
          .setFrame(now < this.launchUntil ? 'jump-0' : jumpFrame(p, now < this.landedUntil));
      } else if (motion === 'climb') {
        if (
          this.sprite.anims.currentAnim?.key !== `${key}-climb` ||
          (!this.sprite.anims.isPlaying && !this.sprite.anims.isPaused)
        )
          this.sprite.play(`${key}-climb`, true);
        if (Math.abs(p.vy) < 1) this.sprite.anims.pause();
        else this.sprite.anims.resume();
      } else this.sprite.play(`${key}-${motion}`, true);
    }
    // The supplied attack is unarmed. Add the equipped blade as a separate visual layer.
    const kind = weaponKind(p.weapon);
    if (kind !== this.drawnWeapon) {
      this.drawWeapon(kind);
      this.drawnWeapon = kind;
    }
    const frame = String(this.sprite.frame.name);
    const attack = frame.startsWith('attack-');
    const index = Number(frame.split('-').at(-1));
    const reach = attack ? ([12, 9, 11, 24, 15, 12][index] ?? 12) : 12;
    this.weapon
      .setVisible(itemDefinition(p.weapon)?.type === 'weapon' && motion !== 'climb')
      .setPosition(reach, -27)
      .setRotation(attack && index === 3 && kind !== 'bow' ? Math.PI / 2 : 0);
    this.container.scaleX = p.facing;
    this.container.x = Phaser.Math.Linear(this.container.x, p.x, 0.55);
    this.container.y = Phaser.Math.Linear(this.container.y, p.y, 0.55);
    // Respawn teleports are server-authoritative; do not glide across the whole map.
    if (Math.abs(this.container.x - p.x) > 150 || Math.abs(this.container.y - p.y) > 200)
      this.container.setPosition(p.x, p.y);
    this.previous = {
      hp: p.hp,
      lastAttack: p.lastAttack,
      lastSkill: p.lastSkill,
      lastHit: p.lastHit,
      x: p.x,
      y: p.y,
      vx: p.vx,
      vy: p.vy,
      grounded: p.grounded,
    };
    this.player = { ...p };
  }
  drawWeapon(kind: WeaponKind) {
    const g = this.weapon;
    g.clear();
    if (kind === 'unarmed') return;
    if (kind === 'bow') {
      g.lineStyle(3, 0x9c693d);
      g.beginPath();
      g.arc(0, -14, 17, -Math.PI / 2, Math.PI / 2, false);
      g.strokePath();
      g.lineStyle(1, 0xebdfb8);
      g.lineBetween(0, -31, 0, 3);
      g.lineStyle(1.5, 0xb4c6ba);
      g.lineBetween(0, -14, 22, -14);
      return;
    }
    if (kind === 'staff') {
      g.lineStyle(4, 0x8a5f3f);
      g.lineBetween(0, 3, 0, -37);
      g.fillStyle(0x789fbf);
      g.fillCircle(0, -40, 6);
      g.fillStyle(0xbbeefa);
      g.fillCircle(-2, -42, 2);
      return;
    }
    const length = kind === 'dagger' ? 18 : 30;
    g.lineStyle(2, 0x344239);
    g.fillStyle(0xcddbd7);
    g.fillTriangle(-3, -5, 0, -length, 4, -5);
    g.strokeTriangle(-3, -5, 0, -length, 4, -5);
    g.lineStyle(3, 0x927447);
    g.lineBetween(-6, -5, 7, -5);
    g.lineBetween(0, -5, 0, 3);
  }
  die(x = this.container.x, y = this.container.y) {
    const corpse = this.scene.add
      .sprite(x, y, this.key, 'death-0')
      .setOrigin(0.5, 224 / 256)
      .setScale(0.36)
      .setFlipX(this.player.facing < 0)
      .setDepth(9);
    corpse.play(`${this.key}-death`);
    corpse.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () =>
      this.scene.tweens.add({
        targets: corpse,
        alpha: 0,
        delay: 300,
        duration: 400,
        onComplete: () => corpse.destroy(),
      }),
    );
  }
  destroy() {
    this.container.destroy();
  }
}
