import outfits from '../public/assets/characters/skins/npc-outfits.json';
import Phaser from 'phaser';
import type { GameMap } from '@ros/game-data';
import gold from '../public/assets/characters/skins/golden-test.json';
import shadow from '../public/assets/characters/skins/shadow-being.json';
import { assetUrl } from './assets';
import { guardAtlasSampling } from './atlas-sampling';
export type Allegiance = 'celestial' | 'shadow';
const sheet = (kind: Allegiance) => (kind === 'shadow' ? 'shadow-being' : 'golden-test');
const definition = (kind: Allegiance) => (kind === 'shadow' ? shadow : gold);
const hasOutfit = (id: string | undefined) => !!id && Object.hasOwn(outfits.frames, id);
export function preloadFactionFigures(scene: Phaser.Scene, map: GameMap) {
  if (
    map.npcs.some((n) => n.allegiance !== 'shadow' && hasOutfit(n.id)) &&
    !scene.textures.exists('npc-outfits')
  )
    scene.load.atlas(
      'npc-outfits',
      assetUrl('/assets/characters/skins/npc-outfits.png'),
      '/assets/characters/skins/npc-outfits.json',
    );
  for (const kind of new Set(
    map.npcs
      .filter(
        (n) =>
          !['cooking-station', 'alchemy-station'].includes(n.id ?? '') &&
          (n.allegiance === 'shadow' || !hasOutfit(n.id)),
      )
      .map((n) => n.allegiance ?? 'celestial'),
  )) {
    const key = `npc-${kind}`;
    if (!scene.textures.exists(key))
      scene.load.atlas(
        key,
        assetUrl(`/assets/characters/skins/${sheet(kind)}.png`),
        `/assets/characters/skins/${sheet(kind)}.json`,
      );
  }
}
export function factionFigure(
  scene: Phaser.Scene,
  x: number,
  y: number,
  kind: Allegiance = 'celestial',
  height = 80,
  npcId?: string,
) {
  if (kind === 'celestial' && hasOutfit(npcId)) {
    guardAtlasSampling(scene.textures.get('npc-outfits'));
    const sprite = scene.add.sprite(x, y, 'npc-outfits', npcId!).setOrigin(0.5, 1);
    return sprite
      .setScale(height / sprite.height)
      .setData({ allegiance: kind, npcId, outfit: npcId })
      .setName('celestial-npc');
  }
  const key = `npc-${kind}`,
    atlas = definition(kind),
    f = atlas.meta.sourceFrame;
  guardAtlasSampling(scene.textures.get(key));
  if (!scene.anims.exists(`${key}-idle`))
    scene.anims.create({
      key: `${key}-idle`,
      frames: atlas.meta.animations.idle.frames.map((frame) => ({ key, frame })),
      frameRate: 6,
      repeat: -1,
    });
  return scene.add
    .sprite(x, y, key, 'idle-0')
    .setOrigin(0.5, f.baseline / f.height)
    .setScale((f.scale * height) / 80)
    .play(`${key}-idle`)
    .setData('allegiance', kind)
    .setName(`${kind}-npc`);
}
