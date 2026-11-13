import { fishingCast } from './island-traversal';
import { guardAtlasSampling } from './atlas-sampling';
import Phaser from 'phaser';
import {
  classSkinSheet,
  equipmentDefinition,
  starterTool,
  weaponKind,
  type GameMap,
} from '@ros/game-data';
import type { Player } from '@ros/shared';
import { assetUrl } from './assets';
import {
  characterAction,
  characterMotion,
  jumpFrame,
  type CharacterState,
} from './character-animation';
type SkinAtlas = {
  meta: {
    sourceFrame: { width: number; height: number; baseline: number; scale: number };
    anchors: Record<string, { hand: { x: number; y: number } }>;
    animations: Record<string, { frames: string[]; frameRate: number; repeat: number }>;
    integratedWeapon: string | { skin: string; tier: string } | null;
  };
};
const pending = new WeakMap<Phaser.Scene, Map<string, number>>();
function load(scene: Phaser.Scene, key: string, path: string, metadata = false, start = true) {
  if (scene.textures.exists(key) && (!metadata || scene.cache.json.has(`${key}-atlas`)))
    return true;
  let requests = pending.get(scene);
  if (!requests) {
    requests = new Map();
    pending.set(scene, requests);
  }
  if ((requests.get(key) ?? -Infinity) <= scene.time.now) {
    requests.set(key, scene.time.now + 15000);
    if (!scene.textures.exists(key)) scene.load.atlas(key, assetUrl(`${path}.png`), `${path}.json`);
    if (metadata && !scene.cache.json.has(`${key}-atlas`))
      scene.load.json(`${key}-atlas`, `${path}.json`);
    if (start && !scene.load.isLoading()) scene.load.start();
  }
  return false;
}
export function skinSheet(p: Player, unarmed = false) {
  return classSkinSheet(p, unarmed);
}
export function skinKey(scene: Phaser.Scene, p: Player, start = true, unarmed = false) {
  const sheet = skinSheet(p, unarmed);
  if (!sheet || !load(scene, sheet.key, sheet.path, true, start)) return null;
  guardAtlasSampling(scene.textures.get(sheet.key));
  if (!scene.anims.exists(`${sheet.key}-idle`)) {
    const atlas = scene.cache.json.get(`${sheet.key}-atlas`) as SkinAtlas;
    for (const [name, clip] of Object.entries(atlas.meta.animations)) {
      if (name === 'hurt') continue;
      scene.anims.create({
        key: `${sheet.key}-${name}`,
        frames: clip.frames.map((frame) => ({ key: sheet.key, frame })),
        frameRate: clip.frameRate,
        repeat: clip.repeat,
      });
    }
  }
  return sheet.key;
}
function geometry(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, key: string) {
  const f = (scene.cache.json.get(`${key}-atlas`) as SkinAtlas).meta.sourceFrame;
  sprite.setOrigin(0.5, f.baseline / f.height).setScale(f.scale);
  return f;
}
export function preloadSkins(scene: Phaser.Scene, players: Player[], map?: GameMap) {
  if (players.length) skinKey(scene, { ...players[0], skin: 'golden-test' }, false, true);
  for (const p of players) {
    skinKey(scene, p, false, true);
    skinKey(scene, p, false);
    if (p.gathering && map)
      load(scene, 'class-tools', '/assets/equipment/gathering-tools', false, false);
  }
}
export class ClassSkinVisual {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Sprite;
  item: Phaser.GameObjects.Image;
  line: Phaser.GameObjects.Graphics;
  previous?: CharacterState;
  key = '';
  launchUntil = 0;
  landedUntil = 0;
  pendingAction: 'attack' | 'skill' | null = null;
  constructor(
    private scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
  ) {
    this.container = scene.add.container(0, 0).setVisible(false);
    parent.add(this.container);
    this.body = scene.add.sprite(0, 0, '__DEFAULT').setName('class-skin-body');
    this.item = scene.add
      .image(0, -30, '__DEFAULT')
      .setVisible(false)
      .setName('class-skin-gathering-tool');
    this.line = scene.add.graphics();
    this.container.add([this.body, this.line, this.item]);
  }
  sync(p: Player, map: GameMap, now: number) {
    const action = characterAction(p, this.previous);
    if (action)
      this.pendingAction =
        this.previous && p.lastSkill > this.previous.lastSkill ? 'skill' : 'attack';
    const requested = skinSheet(p);
    if (!requested) {
      this.container.setVisible(false);
      return false;
    }
    const key =
      skinKey(this.scene, p) ??
      skinKey(this.scene, p, true, true) ??
      skinKey(this.scene, { ...p, skin: 'golden-test' }, true, true);
    if (!key) {
      this.container.setVisible(false);
      return false;
    }
    const exact = key === requested?.key;
    this.container.setVisible(true);
    if (key !== this.key) {
      this.key = key;
      this.body.stop().setTexture(key, 'idle-0');
    }
    const f = geometry(this.scene, this.body, key),
      motion = characterMotion(p, map),
      node =
        p.gathering && p.grounded && motion !== 'climb'
          ? map.resources?.find((n) => n.id === p.gathering?.nodeId)
          : undefined;
    if (this.previous?.grounded && !p.grounded && p.vy < 0 && !p.climbing)
      this.launchUntil = now + 70;
    if (this.previous && !this.previous.grounded && p.grounded && Math.abs(this.previous.vy) > 160)
      this.landedUntil = now + 100;
    const playing =
      this.body.anims.isPlaying &&
      (this.body.anims.currentAnim?.key.endsWith('-attack') ||
        this.body.anims.currentAnim?.key.endsWith('-skill'));
    if (node || motion === 'climb') this.pendingAction = null;
    if (node?.skill === 'Fishing') this.body.play(`${key}-idle`, true);
    else if (node) {
      if (this.body.anims.currentAnim?.key !== `${key}-attack` || !this.body.anims.isPlaying)
        this.body.play(`${key}-attack`);
    } else if (motion === 'climb') {
      this.body.play(`${key}-climb`, true);
      if (Math.abs(p.vy) < 1) this.body.anims.pause();
      else this.body.anims.resume();
    } else if (motion === 'air' || now < this.landedUntil)
      this.body
        .stop()
        .setFrame(now < this.launchUntil ? 'jump-0' : jumpFrame(p, now < this.landedUntil));
    else if (this.pendingAction && exact) {
      const clip =
        this.pendingAction === 'skill' && this.scene.anims.exists(`${key}-skill`)
          ? 'skill'
          : 'attack';
      this.body.play(`${key}-${clip}`);
      this.pendingAction = null;
    } else if (!playing) this.body.play(`${key}-${motion}`, true);
    this.item.setVisible(false);
    this.line.clear();
    if (node && load(this.scene, 'class-tools', '/assets/equipment/gathering-tools')) {
      const tool = p.gathering?.toolId ?? starterTool(node.skill).id,
        atlas = this.scene.cache.json.get(`${key}-atlas`) as SkinAtlas,
        anchor = atlas.meta.anchors[String(this.body.frame.name)]?.hand;
      if (anchor) {
        this.item
          .setVisible(true)
          .setTexture('class-tools', tool)
          .setOrigin(0.5, 0.8)
          .setPosition((anchor.x - f.width / 2) * f.scale, (anchor.y - f.baseline) * f.scale)
          .setScale(46 / this.item.height)
          .setAngle(node.skill === 'Fishing' ? -30 : Math.sin(now / 130) * 35)
          .setData({ itemId: tool, skin: p.skin });
        if (node.skill === 'Fishing') {
          this.line.lineStyle(1, 0xf4e3ff);
          const bobX = fishingCast(p).x;
          const bobY = fishingCast(p).y + Math.sin(now / 180) * 2;
          this.line.lineBetween(this.item.x + 20, this.item.y - 25, bobX, bobY);
          this.line.fillStyle(0xca9dff);
          this.line.fillCircle(bobX, bobY, 3);
        }
      }
    }
    if (
      !(exact && requested.armed) &&
      !node &&
      motion !== 'climb' &&
      weaponKind(p.weapon) !== 'unarmed'
    ) {
      const gear = equipmentDefinition(p.weapon);
      const weaponKey = gear ? `test-weapon-${gear.tier}` : 'elderwood-weapons';
      const ready = !gear || load(this.scene, weaponKey, `/assets/equipment/islands/${gear.tier}`);
      const atlas = this.scene.cache.json.get(`${key}-atlas`) as SkinAtlas;
      const anchor = atlas.meta.anchors[String(this.body.frame.name)]?.hand;
      if (ready && anchor) {
        this.item
          .setVisible(true)
          .setTexture(weaponKey, gear?.part ?? weaponKind(p.weapon))
          .setOrigin(0.5, 0.8)
          .setPosition((anchor.x - f.width / 2) * f.scale, (anchor.y - f.baseline) * f.scale)
          .setScale(40 / this.item.height)
          .setAngle(playing ? -60 : 0)
          .setData({ itemId: p.weapon, skin: p.skin });
      }
    }
    this.body.setData({
      integratedHeadwear: true,
      integratedWeapon: exact && requested?.armed ? p.weapon : null,
      skin: p.skin,
    });
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
    return true;
  }
  die(x: number, y: number, p: Player) {
    const key =
      skinKey(this.scene, p) ??
      skinKey(this.scene, p, true, true) ??
      skinKey(this.scene, { ...p, skin: 'golden-test' }, true, true);
    if (!key) return null;
    const c = this.scene.add.container(x, y).setDepth(9).setScale(p.facing, 1),
      body = this.scene.add.sprite(0, 0, key, 'death-0');
    geometry(this.scene, body, key);
    c.add(body);
    body.play(`${key}-death`);
    body.once('animationcomplete', () =>
      this.scene.tweens.add({
        targets: c,
        alpha: 0,
        delay: 300,
        duration: 400,
        onComplete: () => c.destroy(),
      }),
    );
    return c;
  }
}
