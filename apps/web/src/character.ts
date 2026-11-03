import Phaser from 'phaser';
import type { Player } from '@ros/shared';
import { weaponKind, type WeaponKind, type GameMap } from '@ros/game-data';
import { APPEARANCES, OUTFITS, characterKey, recolorOutfit, type Atlas } from './character-art';
import {
  characterMotion,
  characterAction,
  jumpFrame,
  type CharacterState,
} from './character-animation';

const WEAPONS = ['sword', 'bow', 'staff', 'dagger'] as const;
const armedKey = (appearance: string, outfit: string, weapon: string) =>
  `${characterKey(appearance, outfit)}-${weapon}`;

type Clips = {
  animations: Record<string, { frames: string[]; frameRate: number; repeat: number }>;
};
export function preloadCharacters(scene: Phaser.Scene) {
  scene.load.atlas('mira', '/assets/characters/mira.png', '/assets/characters/mira.json');
  scene.load.atlas(
    'elderwood-weapons',
    '/assets/equipment/elderwood-weapons.png',
    '/assets/equipment/elderwood-weapons.json',
  );
  scene.load.json('armed-clips', '/assets/characters/armed/manifest.json');
  for (const a of APPEARANCES)
    for (const w of WEAPONS) {
      const path = `/assets/characters/armed/citizen-${a}-${w}`;
      scene.load.atlas(armedKey(a, 'sage', w), `${path}.png`, `${path}.json`);
      scene.load.json(`armed-atlas-${a}-${w}`, `${path}.json`);
    }
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
  scene.anims.create({
    key: 'mira-idle',
    frames: Array.from({ length: 6 }, (_, i) => ({ key: 'mira', frame: `idle-${i}` })),
    frameRate: 4,
    repeat: -1,
  });
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
  for (const a of APPEARANCES)
    for (const weapon of WEAPONS) {
      const atlas = scene.cache.json.get(`armed-atlas-${a}-${weapon}`) as Atlas;
      const original = scene.textures
        .get(armedKey(a, 'sage', weapon))
        .getSourceImage() as HTMLImageElement;
      for (const outfit of OUTFITS) {
        const key = armedKey(a, outfit, weapon);
        if (outfit !== 'sage') {
          const texture = scene.textures.addCanvas(
            key,
            recolorOutfit(original, atlas.meta.size.w, atlas.meta.size.h, outfit),
          );
          if (!texture) throw new Error('Cannot prepare armed outfit texture');
          scene.textures.addAtlas(key, texture, atlas);
        }
        const armedClips = scene.cache.json.get('armed-clips') as Clips;
        for (const [name, clip] of Object.entries(armedClips.animations)) {
          if (name === 'climb') continue; // Always use the original unarmed climbing poses.
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
    this.container.add(this.sprite);
  }
  sync(p: Player, map: GameMap, now: number) {
    const motion = characterMotion(p, map);
    const kind = weaponKind(p.weapon);
    const armed = kind !== 'unarmed' && motion !== 'climb';
    const key = armed
      ? armedKey(p.appearance, p.outfit, kind)
      : characterKey(p.appearance, p.outfit);
    this.drawnWeapon = armed ? kind : 'unarmed';
    if (key !== this.key) {
      this.key = key;
      this.sprite.stop().setTexture(key, 'idle-0');
    }
    const action = characterAction(p, this.previous);
    this.sprite.setOrigin(0.5, 0.875).setScale(armed ? 0.4 : 0.36);
    if (this.previous?.grounded && !p.grounded && p.vy < 0 && !p.climbing)
      this.launchUntil = now + 70;
    if (this.previous && !this.previous.grounded && p.grounded && Math.abs(this.previous.vy) > 160)
      this.landedUntil = now + 100;
    const playing = this.sprite.anims.isPlaying;
    const clip = this.sprite.anims.currentAnim?.key ?? '';
    const oneShot = playing && clip.endsWith('-attack') && motion !== 'climb';
    if (action && motion !== 'climb') this.sprite.play(`${key}-${action}`);
    else if (!oneShot) {
      if (motion === 'air' || (motion !== 'climb' && now < this.landedUntil)) {
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
  die(x = this.container.x, y = this.container.y) {
    const kind = weaponKind(this.player.weapon);
    const key =
      kind === 'unarmed'
        ? characterKey(this.player.appearance, this.player.outfit)
        : armedKey(this.player.appearance, this.player.outfit, kind);
    const corpse = this.scene.add
      .sprite(x, y, key, 'death-0')
      .setOrigin(0.5, 224 / 256)
      .setScale(kind === 'unarmed' ? 0.36 : 0.4)
      .setFlipX(this.player.facing < 0)
      .setDepth(9);
    corpse.play(`${key}-death`);
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
