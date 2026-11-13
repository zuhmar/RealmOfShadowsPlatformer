import type Phaser from 'phaser';
import {
  canEquipSkin,
  GATHERING_TOOLS,
  starterTool,
  toolDurationMultiplier,
  type ResourceNode,
} from '@ros/game-data';
import type { Player } from '@ros/shared';
import { assetUrl } from './assets';
import { guardAtlasSampling } from './atlas-sampling';
import { fishingCast } from './island-traversal';
import base from '../public/assets/characters/gathering/skins/base.json';
import knight from '../public/assets/characters/gathering/skins/knight.json';
import archer from '../public/assets/characters/gathering/skins/archer.json';
import mage from '../public/assets/characters/gathering/skins/mage.json';
import rogue from '../public/assets/characters/gathering/skins/rogue.json';
import tools from '../public/assets/equipment/gathering-held-tools.json';
const atlases = { base, knight, archer, mage, rogue };
export const gatheringSkin = (p: Pick<Player, 'skin' | 'classId'>): keyof typeof atlases =>
  p.skin && p.skin in atlases && canEquipSkin(p.classId, p.skin)
    ? (p.skin as keyof typeof atlases)
    : 'base';
const pending = new WeakMap<Phaser.Scene, Map<string, number>>();
function ensure(scene: Phaser.Scene, p: Player, start: boolean) {
  const skin = gatheringSkin(p),
    key = `gather-skin-${skin}`;
  let requests = pending.get(scene);
  if (!requests) {
    requests = new Map();
    pending.set(scene, requests);
  }
  for (const [texture, path, atlas] of [
    [key, `/assets/characters/gathering/skins/${skin}.png`, atlases[skin]],
    ['held-gathering-tools', '/assets/equipment/gathering-held-tools.png', tools],
  ] as const) {
    if (!scene.textures.exists(texture) && (requests.get(texture) ?? -Infinity) <= scene.time.now) {
      requests.set(texture, scene.time.now + 15000);
      scene.load.atlas(texture, assetUrl(path), atlas);
    }
  }
  if (
    start &&
    !scene.load.isLoading() &&
    (!scene.textures.exists(key) || !scene.textures.exists('held-gathering-tools'))
  )
    scene.load.start();
  return scene.textures.exists(key) && scene.textures.exists('held-gathering-tools')
    ? { skin, key, atlas: atlases[skin] }
    : null;
}
export function preloadGatheringSkin(scene: Phaser.Scene, p: Player) {
  ensure(scene, p, false);
}
export function drawGatheringSkin(
  scene: Phaser.Scene,
  body: Phaser.GameObjects.Sprite,
  item: Phaser.GameObjects.Image,
  line: Phaser.GameObjects.Graphics,
  p: Player,
  node: ResourceNode,
  now: number,
) {
  const ready = ensure(scene, p, true);
  if (!ready) return false;
  const { key, atlas } = ready,
    activity = node.skill.toLowerCase() as keyof typeof atlas.meta.animations;
  for (const [name, clip] of Object.entries(atlas.meta.animations))
    if (!scene.anims.exists(`${key}-${name}`))
      scene.anims.create({
        key: `${key}-${name}`,
        frames: clip.frames.map((frame) => ({ key, frame })),
        frameRate: clip.frameRate,
        repeat: clip.repeat,
      });
  guardAtlasSampling(scene.textures.get(key));
  guardAtlasSampling(scene.textures.get('held-gathering-tools'));
  const f = atlas.meta.sourceFrame;
  if (body.texture.key !== key) body.stop().setTexture(key, `${activity}-0`);
  body
    .setOrigin(0.5, f.baseline / f.height)
    .setScale(f.scale)
    .play(`${key}-${activity}`, true);
  const tool =
    GATHERING_TOOLS.find((t) => t.id === p.gathering?.toolId && t.skill === node.skill) ??
    starterTool(node.skill);
  body.anims.timeScale = Math.min(2, 1 / toolDurationMultiplier(tool.material));
  const anchor = (
    atlas.meta.anchors as Record<string, { hand: { x: number; y: number }; toolAngle: number }>
  )[String(body.frame.name)];
  const grip = (
      tools.meta.grips as Record<
        string,
        { x: number; y: number; tip: { x: number; y: number }; worldHeight: number }
      >
    )[tool.id],
    frame = scene.textures.getFrame('held-gathering-tools', tool.id),
    scale = grip.worldHeight / frame.height;
  item
    .setVisible(true)
    .setTexture('held-gathering-tools', tool.id)
    .setOrigin(grip.x / frame.width, grip.y / frame.height)
    .setScale(scale)
    .setPosition((anchor.hand.x - f.width / 2) * f.scale, (anchor.hand.y - f.baseline) * f.scale)
    .setAngle(anchor.toolAngle)
    .setData({
      itemId: tool.id,
      skin: p.skin,
      gatheringSkill: node.skill,
      gripX: grip.x,
      gripY: grip.y,
    });
  const container = body.parentContainer;
  container.moveTo(item, 0);
  container.bringToTop(line);
  line.clear();
  if (node.skill === 'Fishing') {
    const cast = fishingCast(p),
      angle = (anchor.toolAngle * Math.PI) / 180,
      dx = (grip.tip.x - grip.x) * scale,
      dy = (grip.tip.y - grip.y) * scale;
    line
      .lineStyle(1, 0xf4e3ff)
      .lineBetween(
        item.x + dx * Math.cos(angle) - dy * Math.sin(angle),
        item.y + dx * Math.sin(angle) + dy * Math.cos(angle),
        cast.x,
        cast.y + Math.sin(now / 180) * 2,
      );
    line.fillStyle(0xca9dff).fillCircle(cast.x, cast.y + Math.sin(now / 180) * 2, 3);
  }
  body.setData({
    gatheringSkill: node.skill,
    gatheringSkin: ready.skin,
    gatheringTool: tool.id,
    integratedHeadwear: true,
    integratedWeapon: null,
    skin: p.skin,
  });
  return true;
}
