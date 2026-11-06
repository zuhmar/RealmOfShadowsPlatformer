import Phaser from 'phaser';
import {
  equipmentDefinition,
  weaponKind,
  starterTool,
  validSkin,
  type GameMap,
} from '@ros/game-data';
import type { Player } from '@ros/shared';
import { assetUrl } from './assets';
import { appearanceOf } from './character-art';
import {
  characterAction,
  characterMotion,
  jumpFrame,
  type CharacterState,
} from './character-animation';
import clips from '../public/assets/characters/citizen-animations.json';
type Anchors = { head: { x: number; y: number }; hand: { x: number; y: number } };
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
export function skinKey(scene: Phaser.Scene, p: Player, start = true) {
  if (!p.skin || !validSkin(p.skin)) return null;
  const key = `skin-${appearanceOf(p.appearance)}-${p.skin}`,
    path = `/assets/characters/skins/${appearanceOf(p.appearance)}-${p.skin}`;
  const head = load(scene, 'class-headwear', '/assets/characters/skins/headwear', false, start);
  const ready = load(scene, key, path, true, start);
  if (!ready || !head) return null;
  if (scene.anims.exists(`${key}-idle`)) return key;
  for (const [name, clip] of Object.entries(clips.animations)) {
    if (name === 'hurt' || scene.anims.exists(`${key}-${name}`)) continue;
    scene.anims.create({
      key: `${key}-${name}`,
      frames: clip.frames.map((frame) => ({ key, frame })),
      frameRate: clip.frameRate,
      repeat: clip.repeat,
    });
  }
  return key;
}
function itemTexture(scene: Phaser.Scene, p: Player, map: GameMap, start = true) {
  const node = p.gathering && map.resources?.find((n) => n.id === p.gathering?.nodeId);
  if (node) {
    const id = p.gathering?.toolId ?? starterTool(node.skill).id;
    return load(scene, 'class-tools', '/assets/equipment/gathering-tools', false, start)
      ? { key: 'class-tools', frame: id, tool: true, skill: node.skill }
      : null;
  }
  const kind = weaponKind(p.weapon);
  if (kind === 'unarmed') return null;
  const gear = equipmentDefinition(p.weapon);
  if (gear) {
    const key = `class-gear-${gear.tier}`;
    return load(scene, key, `/assets/equipment/islands/${gear.tier}`, false, start)
      ? { key, frame: kind, tool: false }
      : null;
  }
  return scene.textures.exists('elderwood-weapons')
    ? { key: 'elderwood-weapons', frame: kind, tool: false }
    : null;
}
export function preloadSkins(scene: Phaser.Scene, players: Player[], map?: GameMap) {
  for (const p of players)
    if (p.skin) {
      skinKey(scene, p, false);
      if (map) itemTexture(scene, p, map, false);
    }
}
export class ClassSkinVisual {
  container: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Sprite;
  head: Phaser.GameObjects.Image;
  item: Phaser.GameObjects.Image;
  line: Phaser.GameObjects.Graphics;
  previous?: CharacterState;
  key = '';
  launchUntil = 0;
  landedUntil = 0;
  constructor(
    private scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
  ) {
    this.container = scene.add.container(0, 0).setVisible(false);
    parent.add(this.container);
    this.body = scene.add
      .sprite(0, 0, '__DEFAULT')
      .setOrigin(0.5, 0.875)
      .setScale(0.36)
      .setName('class-skin-body');
    this.head = scene.add.image(0, -60, '__DEFAULT').setName('class-skin-headwear');
    this.item = scene.add.image(0, -30, '__DEFAULT').setName('class-skin-held-item');
    this.line = scene.add.graphics();
    this.container.add([this.body, this.head, this.line, this.item]);
  }
  headPose(
    body: Phaser.GameObjects.Sprite,
    head: Phaser.GameObjects.Image,
    skin: string,
    key: string,
  ) {
    const frame = String(body.frame.name),
      anchors = this.scene.cache.json.get(`${key}-atlas`).meta.anchors[frame] as Anchors;
    if (!anchors) return;
    const pose = frame.startsWith('climb')
      ? 'climb'
      : frame.startsWith('death') && Number(frame.split('-')[1]) >= 3
        ? 'death'
        : frame.startsWith('attack') || frame.startsWith('jump')
          ? 'attack'
          : 'idle';
    head
      .setTexture('class-headwear', `${skin}-${pose}`)
      .setPosition((anchors.head.x - 128) * 0.36, (anchors.head.y - 224) * 0.36)
      .setScale(34 / head.width);
  }
  sync(p: Player, map: GameMap, now: number) {
    const key = skinKey(this.scene, p);
    if (!key) {
      this.container.setVisible(false);
      return false;
    }
    this.container.setVisible(true);
    if (key !== this.key) {
      this.key = key;
      this.body.stop().setTexture(key, 'idle-0');
    }
    const motion = characterMotion(p, map),
      gathering = !!p.gathering && p.grounded && motion !== 'climb';
    if (this.previous?.grounded && !p.grounded && p.vy < 0 && !p.climbing)
      this.launchUntil = now + 70;
    if (this.previous && !this.previous.grounded && p.grounded && Math.abs(this.previous.vy) > 160)
      this.landedUntil = now + 100;
    const action = characterAction(p, this.previous),
      playing = this.body.anims.isPlaying && this.body.anims.currentAnim?.key.endsWith('-attack');
    if (
      gathering &&
      map.resources?.find((n) => n.id === p.gathering?.nodeId)?.skill === 'Fishing'
    ) {
      this.body.play(`${key}-idle`, true);
    } else if (gathering) {
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
    else if (action) this.body.play(`${key}-attack`);
    else if (!playing) this.body.play(`${key}-${motion}`, true);
    this.headPose(this.body, this.head, p.skin!, key);
    this.line.clear();
    const item = motion === 'climb' ? null : itemTexture(this.scene, p, map);
    this.item.setVisible(!!item);
    if (item) {
      this.item
        .setTexture(item.key, item.frame)
        .setOrigin(0.5, !item.tool && weaponKind(p.weapon) === 'bow' ? 0.5 : 0.8);
      const anchors = this.scene.cache.json.get(`${key}-atlas`).meta.anchors[
        String(this.body.frame.name)
      ] as Anchors;
      this.item.setPosition((anchors.hand.x - 128) * 0.36, (anchors.hand.y - 224) * 0.36);
      const kind = weaponKind(p.weapon),
        height = item.tool ? 46 : kind === 'staff' ? 64 : kind === 'dagger' ? 34 : 52;
      this.item
        .setScale(height / this.item.height)
        .setAngle(
          item.tool
            ? item.skill === 'Fishing'
              ? -30
              : Math.sin(now / 130) * 35
            : kind === 'bow' || kind === 'staff'
              ? 0
              : String(this.body.frame.name).startsWith('attack')
                ? Math.sin((Number(String(this.body.frame.name).split('-')[1]) / 5) * Math.PI) * 75
                : 12,
        );
      this.item.setData({ itemId: item.tool ? p.gathering?.toolId : p.weapon, skin: p.skin });
      if (item.tool && item.skill === 'Fishing') {
        this.line.lineStyle(1, 0xf4e3ff);
        this.line.lineBetween(this.item.x + 20, this.item.y - 25, 65, 6);
        this.line.fillStyle(0xca9dff);
        this.line.fillCircle(65, 6 + Math.sin(now / 180) * 2, 3);
      }
    }
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
    const key = skinKey(this.scene, p);
    if (!key) return null;
    const c = this.scene.add.container(x, y).setDepth(9).setScale(p.facing, 1);
    const body = this.scene.add.sprite(0, 0, key, 'death-0').setOrigin(0.5, 0.875).setScale(0.36),
      head = this.scene.add.image(0, 0, 'class-headwear', `${p.skin}-idle`);
    c.add([body, head]);
    const update = () => this.headPose(body, head, p.skin!, key);
    body.on('animationupdate', update);
    update();
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
