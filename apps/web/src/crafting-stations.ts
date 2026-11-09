import type Phaser from 'phaser';
import { assetUrl } from './assets';
export type CraftingStation = 'smelting' | 'blacksmithing' | 'carpentry' | 'cooking' | 'alchemy';
export function preloadCraftingStations(scene: Phaser.Scene) {
  if (!scene.textures.exists('crafting-stations'))
    scene.load.atlas(
      'crafting-stations',
      assetUrl('/assets/props/crafting-stations.png'),
      '/assets/props/crafting-stations.json',
    );
}
export function craftingStation(
  scene: Phaser.Scene,
  kind: CraftingStation,
  x: number,
  y: number,
  height = 90,
  maxWidth = 130,
) {
  const image = scene.add.image(x, y, 'crafting-stations', kind).setOrigin(0.5, 1);
  image.setScale(Math.min(height / image.height, maxWidth / image.width));
  return image.setName(`${kind}-bench`).setData('craftingStation', kind);
}
