import Phaser from 'phaser';
import { CARPENTRY_RECIPES, HOUSE_LAYOUTS, houseSize, type GameMap } from '@ros/game-data';
import { furniturePlacement, type Player } from '@ros/shared';
export type FurnitureTarget = { x: number; floor: number; valid: boolean; reason: string };
export type FurnitureSelection = { item: string; onTarget: (target: FurnitureTarget) => void };
/** World-space preview shared by mouse and touch; actual placement stays server-authoritative. */
export class FurniturePlacement {
  private ghost?: Phaser.GameObjects.Image;
  private outline: Phaser.GameObjects.Graphics;
  private point?: { x: number; y: number };
  private item = '';
  private signature = '';
  private active = false;
  constructor(
    private scene: Phaser.Scene,
    private map: GameMap,
  ) {
    this.outline = scene.add.graphics().setDepth(12).setName('furniture-placement-guide');
    const target = (pointer: Phaser.Input.Pointer) => {
      if (!this.active) return;
      const world = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.point = { x: world.x, y: world.y };
    };
    scene.input.on('pointerdown', target);
    scene.input.on('pointermove', target);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off('pointerdown', target);
      scene.input.off('pointermove', target);
    });
  }
  update(p: Player | undefined, selection: FurnitureSelection | undefined) {
    const recipe = CARPENTRY_RECIPES.find((r) => r.id === selection?.item);
    if (!p || !selection || !recipe?.width || p.houseOwnerId !== p.id || !houseSize(p.mapId)) {
      this.active = false;
      this.item = '';
      this.point = undefined;
      this.signature = '';
      this.ghost?.setVisible(false);
      this.outline.clear();
      return;
    }
    this.active = true;
    if (this.item !== selection.item) {
      this.ghost?.destroy();
      this.item = selection.item;
      this.signature = '';
      this.point = { x: p.x + 90, y: p.y - 10 };
      this.ghost = this.scene.add
        .image(0, 0, 'housing-art', recipe.id)
        .setOrigin(0.5, 1)
        .setDepth(11)
        .setAlpha(0.65)
        .setName('furniture-placement-preview');
      this.ghost.setScale(
        Math.min(recipe.width / this.ghost.width, recipe.height / this.ghost.height),
      );
    }
    const layout = HOUSE_LAYOUTS[houseSize(this.map.id)!];
    const point = this.point!;
    const floor = layout.floors.findIndex((y) => point.y <= y + 25 && point.y > y - 260);
    const half = (layout.width - 160 - recipe.width) / 2;
    const x = Math.max(
      -Math.floor(half),
      Math.min(Math.floor(half), Math.round((point.x - layout.width / 2) / 5) * 5),
    );
    let valid = true,
      reason = 'Ready to place';
    try {
      const check = furniturePlacement(p, recipe.id, x);
      if (floor !== check.floor) throw new Error('Choose a spot on the floor you are standing on.');
    } catch (e) {
      valid = false;
      reason = e instanceof Error ? e.message : 'Choose another spot.';
    }
    const y = layout.floors[Math.max(0, floor)];
    const color = valid ? 0xa6e16a : 0xf27b85;
    this.ghost!.setPosition(layout.width / 2 + x, y)
      .setVisible(true)
      .setTint(color);
    this.outline
      .clear()
      .lineStyle(2, color, 0.9)
      .strokeRect(
        layout.width / 2 + x - recipe.width / 2 - 3,
        y - recipe.height - 3,
        recipe.width + 6,
        recipe.height + 6,
      );
    const next = { x, floor, valid, reason },
      signature = JSON.stringify(next);
    if (signature !== this.signature) {
      this.signature = signature;
      selection.onTarget(next);
    }
  }
}
