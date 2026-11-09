import Phaser from 'phaser';
import { CARPENTRY_RECIPES, HOUSING_PLOTS, HOUSING_PLATFORM } from '@ros/game-data';
import type { Player } from '@ros/shared';
import { assetUrl } from './assets';
export function preloadHousing(scene: Phaser.Scene) {
  if (!scene.textures.exists('housing-art'))
    scene.load.atlas('housing-art', assetUrl('/assets/ui/housing.png'), '/assets/ui/housing.json');
}
export class HousingScenery {
  private objects: Phaser.GameObjects.GameObject[] = [];
  private signature = '';
  constructor(private scene: Phaser.Scene) {}
  update(p: Player | undefined) {
    const view =
        p?.housingView ??
        (p?.housing
          ? {
              ownerId: p.id,
              ownerName: p.name,
              size: p.housing.size,
              stage: p.housing.stage,
              furniture: p.housing.furniture,
            }
          : undefined),
      signature = JSON.stringify(view ?? null);
    if (signature === this.signature) return;
    this.signature = signature;
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
    const center = HOUSING_PLATFORM.x + HOUSING_PLATFORM.width / 2,
      y = HOUSING_PLATFORM.y;
    const label = this.scene.add
      .text(
        center,
        y + 12,
        view
          ? `${view.ownerName} · ${HOUSING_PLOTS[view.size].name} plot`
          : 'Private housing · Small / Medium / Large',
        {
          fontFamily: 'Georgia',
          fontSize: '16px',
          color: '#ffe9af',
          stroke: '#24152f',
          strokeThickness: 4,
        },
      )
      .setOrigin(0.5, 0)
      .setDepth(6);
    this.objects.push(label);
    if (!view) return;
    const width = HOUSING_PLOTS[view.size].width;
    if (view.stage === 0) {
      const markers = this.scene.add.graphics().setDepth(3).setName('housing-plot-markers');
      markers
        .lineStyle(2, 0xe4bb6b, 0.8)
        .lineBetween(center - width / 2, y - 4, center + width / 2, y - 4);
      for (const x of [center - width / 2, center + width / 2]) {
        markers.fillStyle(0x5c3826).fillRect(x - 5, y - 30, 10, 30);
        markers.lineStyle(2, 0x26182a).strokeRect(x - 5, y - 30, 10, 30);
        markers.fillStyle(0xf4cd7c).fillTriangle(x, y - 30, x + 24, y - 23, x, y - 16);
      }
      const hint = this.scene.add
        .text(center, y + 38, 'Plot claimed · Build Foundation in Home', {
          fontFamily: 'Georgia',
          fontSize: '14px',
          color: '#ffe9af',
          stroke: '#24152f',
          strokeThickness: 4,
        })
        .setOrigin(0.5, 0)
        .setDepth(6)
        .setName('housing-build-hint');
      this.objects.push(markers, hint);
    }
    const add = (
      id: string,
      x: number,
      baseY: number,
      maxW: number,
      maxH: number,
      depth: number,
    ) => {
      const f = this.scene.textures.getFrame('housing-art', id),
        scale = Math.min(maxW / f.width, maxH / f.height);
      const image = this.scene.add
        .image(x, baseY, 'housing-art', id)
        .setOrigin(0.5, 1)
        .setScale(scale)
        .setDepth(depth);
      this.objects.push(image);
      return image;
    };
    if (view.stage > 0) {
      const house = add(
        view.stage === 3 ? `house-${view.size}` : 'house-frame',
        center,
        y,
        width - 30,
        view.size === 'large' ? 220 : view.size === 'medium' ? 205 : 160,
        -3,
      );
      if (view.stage === 1) {
        const f = house.frame;
        house.setCrop(0, f.height * 0.82, f.width, f.height * 0.18);
      }
    }
    for (const f of view.furniture) {
      const r = CARPENTRY_RECIPES.find((r) => r.id === f.item);
      if (r) add(f.item, center + f.x, y, r.width, r.height, 3);
    }
  }
}
