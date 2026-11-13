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
import { bakedGatheringAtlases } from './baked-gathering-atlases';
type Skin = 'base' | 'knight' | 'archer' | 'mage' | 'rogue';
type Atlas = {
  meta: {
    sourceFrame: { width: number; height: number; baseline: number; scale: number };
    skin: Skin;
    material: string;
    integratedTools: Record<string, string>;
    anchors: Record<string, { foot: { x: number; y: number }; rodTip?: { x: number; y: number } }>;
    animations: Record<string, { frames: string[]; frameRate: number; repeat: number }>;
  };
};
const atlases = bakedGatheringAtlases as Record<string, Atlas>;
export const gatheringSkin = (p: Pick<Player, 'skin' | 'classId'>): Skin =>
  p.skin &&
  ['knight', 'archer', 'mage', 'rogue'].includes(p.skin) &&
  canEquipSkin(p.classId, p.skin)
    ? (p.skin as Skin)
    : 'base';
const pending = new WeakMap<Phaser.Scene, Map<string, number>>();
function ensure(scene: Phaser.Scene, p: Player, material: string, start: boolean) {
  const skin = gatheringSkin(p),
    id = `${skin}-${material}`,
    atlas = atlases[id],
    key = `gather-baked-${id}`;
  if (!atlas) return null;
  let requests = pending.get(scene);
  if (!requests) {
    requests = new Map();
    pending.set(scene, requests);
  }
  if (!scene.textures.exists(key) && (requests.get(key) ?? -Infinity) <= scene.time.now) {
    requests.set(key, scene.time.now + 15000);
    scene.load.atlas(key, assetUrl(`/assets/characters/gathering/baked/${id}.png`), atlas);
  }
  if (start && !scene.load.isLoading() && !scene.textures.exists(key)) scene.load.start();
  return scene.textures.exists(key) ? { skin, key, atlas } : null;
}
export function preloadGatheringSkin(scene: Phaser.Scene, p: Player) {
  const equipped = p.gathering?.toolId ?? Object.values(p.equippedTools ?? {}).find(Boolean);
  const material = GATHERING_TOOLS.find((t) => t.id === equipped)?.material ?? 'wood';
  ensure(scene, p, material, false);
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
  const tool =
      GATHERING_TOOLS.find((t) => t.id === p.gathering?.toolId && t.skill === node.skill) ??
      starterTool(node.skill),
    ready = ensure(scene, p, tool.material, true);
  if (!ready) return false;
  const { key, atlas } = ready,
    activity = node.skill.toLowerCase();
  for (const [name, clip] of Object.entries(atlas.meta.animations))
    if (!scene.anims.exists(`${key}-${name}`))
      scene.anims.create({
        key: `${key}-${name}`,
        frames: clip.frames.map((frame) => ({ key, frame })),
        frameRate: clip.frameRate,
        repeat: clip.repeat,
      });
  guardAtlasSampling(scene.textures.get(key));
  const f = atlas.meta.sourceFrame;
  if (body.texture.key !== key) body.stop().setTexture(key, `${activity}-0`);
  body
    .setOrigin(0.5, f.baseline / f.height)
    .setScale(f.scale)
    .play(`${key}-${activity}`, true);
  body.anims.timeScale = Math.min(2, 1 / toolDurationMultiplier(tool.material));
  // Every frame already contains the character AND held tool; never draw a second tool.
  item.setVisible(false).setData('itemId', null);
  body.parentContainer.bringToTop(line);
  line.clear();
  if (node.skill === 'Fishing') {
    const tip = atlas.meta.anchors[String(body.frame.name)].rodTip!,
      cast = fishingCast(p);
    line
      .lineStyle(1, 0xf4e3ff)
      .lineBetween(
        (tip.x - f.width / 2) * f.scale,
        (tip.y - f.baseline) * f.scale,
        cast.x,
        cast.y + Math.sin(now / 180) * 2,
      );
    line.fillStyle(0xca9dff).fillCircle(cast.x, cast.y + Math.sin(now / 180) * 2, 3);
  }
  body.setData({
    gatheringSkill: node.skill,
    gatheringSkin: ready.skin,
    gatheringTool: tool.id,
    integratedGatheringTool: true,
    integratedHeadwear: true,
    integratedWeapon: null,
    skin: p.skin,
  });
  return true;
}
