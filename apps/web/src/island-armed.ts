import { guardAtlasSampling } from './atlas-sampling';
import { assetUrl } from './assets';
import Phaser from 'phaser';
import { equipmentDefinition } from '@ros/game-data';
import type { Player } from '@ros/shared';
import { appearanceOf, characterKey, recolorOutfit, type Atlas } from './character-art';
import clips from '../public/assets/characters/armed/manifest.json';

type Sheet = { base: string; path: string; lastUsed: number; variants: Set<string> };
const managers = new WeakMap<Phaser.Scene, IslandArmedSheets>();
function manager(scene: Phaser.Scene) {
  let value = managers.get(scene);
  if (!value) {
    value = new IslandArmedSheets(scene);
    managers.set(scene, value);
  }
  return value;
}
export function preloadIslandArmed(scene: Phaser.Scene, players: Player[]) {
  for (const p of players) manager(scene).key(p, false);
}
export function islandArmedKey(scene: Phaser.Scene, p: Player) {
  return manager(scene).key(p, true);
}
/** Load only equipped sheets; build outfit variants only when actually displayed. */
class IslandArmedSheets {
  sheets = new Map<string, Sheet>();
  retryAfter = new Map<string, number>();
  lastPrune = 0;
  constructor(private scene: Phaser.Scene) {
    scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, this.failed, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, this.failed, this);
      managers.delete(scene);
    });
  }
  failed(file: Phaser.Loader.File) {
    for (const [id, sheet] of this.sheets) {
      if (file.key !== sheet.base && file.key !== `${sheet.base}-atlas`) continue;
      this.sheets.delete(id);
      this.retryAfter.set(id, this.scene.time.now + 15000);
    }
  }
  key(p: Player, start: boolean) {
    const gear = equipmentDefinition(p.weapon);
    if (!gear?.weaponKind) return null;
    const a = appearanceOf(p.appearance);
    const id = `${a}-${gear.id}`;
    const key = `${characterKey(a, p.outfit)}-island-${gear.tier}-${gear.weaponKind}`;
    const base = `${characterKey(a, 'sage')}-island-${gear.tier}-${gear.weaponKind}`;
    let sheet = this.sheets.get(id);
    if (!sheet) {
      if ((this.retryAfter.get(id) ?? 0) > this.scene.time.now) return null;
      const path = `/assets/characters/armed/islands/${gear.tier}/citizen-${a}-${gear.weaponKind}`;
      sheet = { base, path, lastUsed: this.scene.time.now, variants: new Set([base]) };
      this.sheets.set(id, sheet);
      if (!this.scene.textures.exists(base)) {
        this.scene.load.atlas(base, assetUrl(`${path}.png`), `${path}.json`);
      }
      if (!this.scene.cache.json.has(`${base}-atlas`))
        this.scene.load.json(`${base}-atlas`, `${path}.json`);
      if (start && !this.scene.load.isLoading()) this.scene.load.start();
    }
    sheet.lastUsed = this.scene.time.now;
    if (!this.scene.textures.exists(base) || !this.scene.cache.json.has(`${base}-atlas`))
      return null;
    if (!this.scene.textures.exists(key)) {
      const atlas = this.scene.cache.json.get(`${base}-atlas`) as Atlas;
      const source = this.scene.textures.get(base).getSourceImage() as HTMLImageElement;
      const texture = this.scene.textures.addCanvas(
        key,
        recolorOutfit(
          source,
          atlas.meta.size.w,
          atlas.meta.size.h,
          p.outfit as 'ember' | 'tide',
          this.scene.textures
            .get(`${characterKey(a, 'sage')}-${gear.weaponKind}`)
            .getSourceImage() as HTMLImageElement,
        ),
      );
      if (!texture) return null;
      this.scene.textures.addAtlas(key, texture, atlas);
      sheet.variants.add(key);
    }
    guardAtlasSampling(this.scene.textures.get(key));
    for (const [name, clip] of Object.entries(clips.animations)) {
      if (name === 'climb' || this.scene.anims.exists(`${key}-${name}`)) continue;
      this.scene.anims.create({
        key: `${key}-${name}`,
        frames: clip.frames.map((frame) => ({ key, frame })),
        frameRate: clip.frameRate,
        repeat: clip.repeat,
      });
    }
    this.prune();
    return key;
  }
  prune() {
    const now = this.scene.time.now;
    if (now - this.lastPrune < 5000 || this.sheets.size <= 12) return;
    this.lastPrune = now;
    const inUse = new Set<string>();
    const visit = (node: Phaser.GameObjects.GameObject) => {
      if (node instanceof Phaser.GameObjects.Sprite || node instanceof Phaser.GameObjects.Image)
        inUse.add(node.texture.key);
      if (node instanceof Phaser.GameObjects.Container) node.list.forEach(visit);
    };
    this.scene.children.list.forEach(visit);
    for (const [id, sheet] of [...this.sheets].sort((a, b) => a[1].lastUsed - b[1].lastUsed)) {
      if (this.sheets.size <= 12) break;
      // A generous grace period also protects short-lived death sprites.
      if (now - sheet.lastUsed < 10000) continue;
      if (
        !this.scene.textures.exists(sheet.base) ||
        [...sheet.variants].some((key) => inUse.has(key))
      )
        continue;
      for (const key of sheet.variants) {
        for (const name of Object.keys(clips.animations)) this.scene.anims.remove(`${key}-${name}`);
        if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
      }
      this.scene.cache.json.remove(`${sheet.base}-atlas`);
      this.sheets.delete(id);
    }
  }
}
