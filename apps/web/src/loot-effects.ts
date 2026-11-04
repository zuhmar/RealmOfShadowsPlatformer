import crystalResources from '../public/assets/ui/crystal-resources.json';
import crystalDrops from '../public/assets/ui/crystal-loot.json';
import Phaser from 'phaser';
import { equipmentDefinition, weaponKind, EQUIPMENT_TIERS, type GameMap } from '@ros/game-data';
import { GEAR_RARITY_COLORS, type Drop, type Event, type GearRarity } from '@ros/shared';
import lootAtlas from '../public/assets/ui/woods-loot.json';
import resourcesAtlas from '../public/assets/ui/woods-resources.json';
export function preloadLoot(scene: Phaser.Scene, map: GameMap) {
  scene.load.atlas('loot-materials', '/assets/ui/woods-loot.png', '/assets/ui/woods-loot.json');
  scene.load.atlas(
    'loot-resources',
    '/assets/ui/woods-resources.png',
    '/assets/ui/woods-resources.json',
  );
  scene.load.atlas('loot-basics', '/assets/ui/loot-basics.png', '/assets/ui/loot-basics.json');
  if (map.island === 'Crystal Caverns') {
    scene.load.atlas(
      'loot-crystal-resources',
      '/assets/ui/crystal-resources.png',
      '/assets/ui/crystal-resources.json',
    );
    scene.load.atlas(
      'loot-crystal-drops',
      '/assets/ui/crystal-loot.png',
      '/assets/ui/crystal-loot.json',
    );
  }
  scene.load.image('loot-crystal', '/assets/ui/teleport-crystal.png');
  scene.load.image('forest-bear-key', '/assets/ui/forest-bear-key.png');
  const tier = EQUIPMENT_TIERS.find((t) => t.island === map.island || t.islandName === map.island);
  if (tier && tier.id !== 'woods')
    scene.load.atlas(
      `loot-equipment-${tier.id}`,
      `/assets/equipment/islands/${tier.id}.png`,
      `/assets/equipment/islands/${tier.id}.json`,
    );
}
export function lootIcon(scene: Phaser.Scene, item: string, size = 28) {
  const gear = equipmentDefinition(item),
    kind = weaponKind(item);
  let key = 'loot-basics',
    frame: string | undefined = 'fang';
  if (item === 'gold' || item === 'fang') {
    frame = item;
  } else if (gear) {
    key = gear.tier === 'woods' ? 'woods-equipment' : `loot-equipment-${gear.tier}`;
    frame = gear.part;
  } else if (Object.hasOwn(crystalResources.frames, item)) {
    key = 'loot-crystal-resources';
    frame = item;
  } else if (Object.hasOwn(crystalDrops.frames, item)) {
    key = 'loot-crystal-drops';
    frame = item;
  } else if (Object.hasOwn(lootAtlas.frames, item)) {
    key = 'loot-materials';
    frame = item;
  } else if (Object.hasOwn(resourcesAtlas.frames, item)) {
    key = 'loot-resources';
    frame = item;
  } else if (item === 'teleport-crystal') {
    key = 'loot-crystal';
    frame = undefined;
  } else if (item === 'forest-bear-key') {
    key = 'forest-bear-key';
    frame = undefined;
  } else if (kind !== 'unarmed') {
    key = 'elderwood-weapons';
    frame = kind;
  }
  const icon = scene.add.image(0, 0, key, frame).setName('loot-item-sprite').setData('item', item);
  icon.setScale(size / Math.max(icon.width, icon.height));
  return icon;
}
type Item = { item: string; quantity: number; rarity?: GearRarity };
function iconRow(scene: Phaser.Scene, items: Item[], size: number) {
  const row = scene.add.container(0, 0).setName('loot-sprite-row');
  items.forEach((entry, index) => {
    const x = (index - (items.length - 1) / 2) * (size + 8);
    if (entry.rarity) {
      const color = Phaser.Display.Color.HexStringToColor(GEAR_RARITY_COLORS[entry.rarity]).color;
      row.add(
        scene.add
          .circle(x, 0, size * 0.6, color, 0.16)
          .setStrokeStyle(2, color)
          .setName('loot-rarity-glow'),
      );
    }
    const icon = lootIcon(scene, entry.item, size).setPosition(x, 0);
    row.add(icon);
    if (entry.quantity > 1)
      row.add(
        scene.add
          .text(x + size * 0.32, size * 0.22, `×${entry.quantity}`, {
            fontFamily: 'Arial',
            fontSize: '11px',
            color: '#fff0c1',
            stroke: '#170c24',
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setName('loot-quantity'),
      );
  });
  return row;
}
export function groundLoot(scene: Phaser.Scene, drop: Drop, localPlayer: string) {
  const items: Item[] = [
    ...(drop.gold > 0 ? [{ item: 'gold', quantity: drop.gold }] : []),
    { item: drop.item, quantity: 1 },
    ...(drop.items ?? []).map((i) => ({ item: i.item, quantity: i.quantity })),
    ...(drop.gear ? [{ item: drop.gear.base, quantity: 1, rarity: drop.gear.rarity }] : []),
  ];
  const container = iconRow(scene, items, 26)
    .setPosition(drop.x, drop.y - 20)
    .setName('ground-loot-sprites')
    .setDepth(12)
    .setAlpha(drop.owner === localPlayer ? 1 : 0.35);
  container.setData('owner', drop.owner);
  return container;
}
export function lootPickup(scene: Phaser.Scene, event: Event) {
  if (event.lootStage === 'drop') return;
  const items: Item[] = [
    ...((event.lootGold ?? 0) > 0 ? [{ item: 'gold', quantity: event.lootGold! }] : []),
    ...(event.loot ?? []),
  ];
  if (!items.length) return;
  const row = iconRow(scene, items, 30)
    .setPosition(event.x, event.y)
    .setDepth(50)
    .setName('loot-pickup-sprites');
  scene.tweens.add({
    targets: row,
    y: event.y - 65,
    alpha: 0,
    duration: 1200,
    onComplete: () => row.destroy(),
  });
}
