import Phaser from 'phaser';
import { islandArmedKey, preloadIslandArmed } from './island-armed';
import type { Player } from '@ros/shared';
import { weaponKind, type WeaponKind, type GameMap } from '@ros/game-data';
import {
  APPEARANCES,
  OUTFITS,
  characterKey,
  appearanceOf,
  recolorOutfit,
  type Atlas,
} from './character-art';
import {
  characterMotion,
  characterAction,
  jumpFrame,
  type CharacterState,
} from './character-animation';

const gatheringKey = (appearance: string, outfit: string, material = 'wood') =>
  `${characterKey(appearance, outfit)}-gathering${material === 'wood' ? '' : `-${material}`}`;
const WEAPONS = ['sword', 'bow', 'staff', 'dagger'] as const;
const armedKey = (appearance: string, outfit: string, weapon: string) =>
  `${characterKey(appearance, outfit)}-${weapon}`;

type Clips = {
  animations: Record<string, { frames: string[]; frameRate: number; repeat: number }>;
};
export function preloadCharacters(scene: Phaser.Scene, players: Player[] = []) {
  preloadIslandArmed(scene, players);
  scene.load.atlas(
    'woods-equipment',
    '/assets/equipment/islands/woods.png',
    '/assets/equipment/islands/woods.json',
  );
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
  for (const a of APPEARANCES)
    for (const material of ['wood', 'iron', 'crystal']) {
      const suffix = material === 'wood' ? '' : `-${material}`;
      const path = `/assets/characters/gathering/citizen-${a}${suffix}`;
      scene.load.atlas(gatheringKey(a, 'sage', material), `${path}.png`, `${path}.json`);
      scene.load.json(`gathering-atlas-${a}${suffix}`, `${path}.json`);
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
    for (const outfit of ['sage'] as const) {
      const key = characterKey(a, outfit);

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
      for (const outfit of ['sage'] as const) {
        const key = armedKey(a, outfit, weapon);

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
  for (const a of APPEARANCES)
    for (const material of ['wood', 'iron', 'crystal']) {
      const suffix = material === 'wood' ? '' : `-${material}`;
      const atlas = scene.cache.json.get(`gathering-atlas-${a}${suffix}`) as Atlas;
      const original = scene.textures
        .get(gatheringKey(a, 'sage', material))
        .getSourceImage() as HTMLImageElement;
      for (const outfit of ['sage'] as const) {
        const key = gatheringKey(a, outfit, material);

        for (const name of ['mining', 'woodcutting', 'fishing', 'herbalism'])
          scene.anims.create({
            key: `${key}-${name}`,
            frames: Array.from({ length: 6 }, (_, i) => ({ key, frame: `${name}-${i}` })),
            frameRate: name === 'fishing' ? 4 : 7,
            repeat: -1,
          });
      }
    }
}

/** Prepare just the outfit that a visible character needs, rather than every color variant on startup. */
function ensureOutfit(
  scene: Phaser.Scene,
  appearance: string,
  outfit: string,
  mode: 'body' | 'armed' | 'gathering',
  part = '',
) {
  const a = appearanceOf(appearance);
  const base =
    mode === 'body'
      ? characterKey(a, 'sage')
      : mode === 'armed'
        ? armedKey(a, 'sage', part)
        : gatheringKey(a, 'sage', part);
  const key =
    mode === 'body'
      ? characterKey(a, outfit)
      : mode === 'armed'
        ? armedKey(a, outfit, part)
        : gatheringKey(a, outfit, part);
  if (scene.textures.exists(key)) return;
  const suffix = part === 'wood' ? '' : `-${part}`;
  const atlasKey =
    mode === 'body'
      ? `citizen-atlas-${a}`
      : mode === 'armed'
        ? `armed-atlas-${a}-${part}`
        : `gathering-atlas-${a}${suffix}`;
  const atlas = scene.cache.json.get(atlasKey) as Atlas;
  const original = scene.textures.get(base).getSourceImage() as HTMLImageElement;
  const texture = scene.textures.addCanvas(
    key,
    recolorOutfit(original, atlas.meta.size.w, atlas.meta.size.h, outfit as 'ember' | 'tide'),
  );
  if (!texture) throw new Error('Cannot prepare character outfit');
  scene.textures.addAtlas(key, texture, atlas);
  const clips: Clips =
    mode === 'gathering'
      ? {
          animations: Object.fromEntries(
            ['mining', 'woodcutting', 'fishing', 'herbalism'].map((name) => [
              name,
              {
                frames: Array.from({ length: 6 }, (_, i) => `${name}-${i}`),
                frameRate: name === 'fishing' ? 4 : 7,
                repeat: -1,
              },
            ]),
          ),
        }
      : scene.cache.json.get(mode === 'body' ? 'citizen-clips' : 'armed-clips');
  for (const [name, clip] of Object.entries(clips.animations)) {
    if (name === 'hurt' || (mode === 'armed' && name === 'climb')) continue;
    scene.anims.create({
      key: `${key}-${name}`,
      frames: clip.frames.map((frame) => ({ key, frame })),
      frameRate: clip.frameRate,
      repeat: clip.repeat,
    });
  }
}

export class CharacterVisual {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  gatheringVisual: Phaser.GameObjects.Graphics;
  previous?: CharacterState;
  key: string;
  drawnWeapon?: WeaponKind;
  landedUntil = 0;
  launchUntil = 0;
  constructor(
    private scene: Phaser.Scene,
    public player: Player,
  ) {
    ensureOutfit(scene, player.appearance, player.outfit, 'body');
    this.key = characterKey(player.appearance, player.outfit);
    this.container = scene.add.container(player.x, player.y).setDepth(10);
    this.sprite = new Phaser.GameObjects.Sprite(scene, 0, 0, this.key, 'idle-0')
      .setOrigin(0.5, 224 / 256)
      .setScale(0.36);
    this.gatheringVisual = new Phaser.GameObjects.Graphics(scene);
    this.container.add([this.gatheringVisual, this.sprite]);
  }
  sync(p: Player, map: GameMap, now: number) {
    const motion = characterMotion(p, map);
    const gathering =
      p.gathering && motion !== 'climb' && p.grounded
        ? map.resources?.find((n) => n.id === p.gathering?.nodeId)
        : undefined;
    const kind = weaponKind(p.weapon);
    const armed = kind !== 'unarmed' && motion !== 'climb' && !p.gathering;
    const gatheringMaterial = p.gathering?.toolId?.startsWith('crystal-')
      ? 'crystal'
      : p.gathering?.toolId?.startsWith('iron-')
        ? 'iron'
        : 'wood';
    const islandKey = armed ? islandArmedKey(this.scene, p) : null;
    if (!islandKey)
      ensureOutfit(
        this.scene,
        p.appearance,
        p.outfit,
        gathering ? 'gathering' : armed ? 'armed' : 'body',
        gathering ? gatheringMaterial : kind,
      );
    const key = gathering
      ? gatheringKey(p.appearance, p.outfit, gatheringMaterial)
      : armed
        ? (islandKey ?? armedKey(p.appearance, p.outfit, kind))
        : characterKey(p.appearance, p.outfit);
    this.drawnWeapon = armed ? kind : 'unarmed';
    if (key !== this.key) {
      this.key = key;
      this.sprite
        .stop()
        .setTexture(key, gathering ? `${gathering.skill.toLowerCase()}-0` : 'idle-0');
    }
    const action = characterAction(p, this.previous);
    this.sprite.setOrigin(0.5, 0.875).setScale(gathering ? 0.32 : armed ? 0.4 : 0.36);
    if (this.previous?.grounded && !p.grounded && p.vy < 0 && !p.climbing)
      this.launchUntil = now + 70;
    if (this.previous && !this.previous.grounded && p.grounded && Math.abs(this.previous.vy) > 160)
      this.landedUntil = now + 100;
    const playing = this.sprite.anims.isPlaying;
    const clip = this.sprite.anims.currentAnim?.key ?? '';
    const oneShot = playing && clip.endsWith('-attack') && motion !== 'climb';
    if (gathering) this.sprite.play(`${key}-${gathering.skill.toLowerCase()}`, true);
    else if (action && motion !== 'climb') this.sprite.play(`${key}-${action}`);
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
    this.gatheringVisual.clear();
    if (gathering?.skill === 'Fishing') {
      const g = this.gatheringVisual,
        x = (gathering.x + 22 - p.x) * p.facing,
        y = 30 + Math.sin(now / 180) * 2;
      const atlas = this.scene.cache.json.get(
        `gathering-atlas-${appearanceOf(p.appearance)}${gatheringMaterial === 'wood' ? '' : `-${gatheringMaterial}`}`,
      ) as Atlas & { meta: { rodTips: Record<string, { x: number; y: number }> } };
      const tip = atlas.meta.rodTips[String(this.sprite.frame.name)];
      if (tip) {
        g.lineStyle(1, 0xf3e1ff);
        g.lineBetween((tip.x - 192) * this.sprite.scaleX, (tip.y - 336) * this.sprite.scaleY, x, y);
      }
      g.fillStyle(0xd7a4ff);
      g.fillCircle(x, y, 3);
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
    ensureOutfit(
      this.scene,
      this.player.appearance,
      this.player.outfit,
      kind === 'unarmed' ? 'body' : 'armed',
      kind,
    );
    const key =
      kind === 'unarmed'
        ? characterKey(this.player.appearance, this.player.outfit)
        : (islandArmedKey(this.scene, this.player) ??
          armedKey(this.player.appearance, this.player.outfit, kind));
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
