import type Phaser from 'phaser';
import { craftingStation } from './crafting-stations';
export function provisionStation(scene: Phaser.Scene, x: number, y: number, cooking: boolean) {
  return craftingStation(scene, cooking ? 'cooking' : 'alchemy', x, y).setName(
    cooking ? 'cooking-station' : 'alchemy-station',
  );
}
