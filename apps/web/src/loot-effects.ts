import murkmireProvisions from '../public/assets/ui/murkmire-provisions.json';
import murkmireItems from '../public/assets/ui/murkmire-items.json';
import frontFurniture from '../public/assets/ui/front-furniture.json';
import housing from '../public/assets/ui/housing.json';
import { preloadHousing } from './housing';
import { recipeFromScroll, GATHERING_TOOLS } from '@ros/game-data';
import bars from '../public/assets/ui/recipe-bars.json';
import { assetUrl } from './assets';
import crystalResources from '../public/assets/ui/crystal-resources.json';
import crystalDrops from '../public/assets/ui/crystal-loot.json';
import Phaser from 'phaser';
import {
  equipmentDefinition,
  weaponKind,
  EQUIPMENT_TIERS,
  type GameMap,
  houseSize,
} from '@ros/game-data';
import { GEAR_RARITY_COLORS, type Drop, type Event, type GearRarity } from '@ros/shared';
import lootAtlas from '../public/assets/ui/woods-loot.json';
import resourcesAtlas from '../public/assets/ui/woods-resources.json';
export function preloadLoot(scene: Phaser.Scene, map: GameMap) {
  preloadHousing(scene);
  if (map.island === 'Murkmire Swamp' || houseSize(map.id))
    scene.load.atlas(
      'murkmire-provisions',
      assetUrl('/assets/ui/murkmire-provisions.png'),
      '/assets/ui/murkmire-provisions.json',
    );
  if (map.island === 'Murkmire Swamp' || houseSize(map.id))
    scene.load.atlas(
      'loot-murkmire-items',
      assetUrl('/assets/ui/murkmire-items.png'),
      '/assets/ui/murkmire-items.json',
    );
  for (const name of ['recipe-scrolls', 'recipe-bars'])
    if (!scene.textures.exists(name))
      scene.load.atlas(name, assetUrl(`/assets/ui/${name}.png`), `/assets/ui/${name}.json`);
  if (!scene.textures.exists('recipe-tools'))
    scene.load.atlas(
      'recipe-tools',
      assetUrl('/assets/equipment/gathering-tools.png'),
      '/assets/equipment/gathering-tools.json',
    );
  scene.load.atlas(
    'loot-materials',
    assetUrl('/assets/ui/woods-loot.png'),
    '/assets/ui/woods-loot.json',
  );
  scene.load.atlas(
    'loot-resources',
    assetUrl('/assets/ui/woods-resources.png'),
    '/assets/ui/woods-resources.json',
  );
  scene.load.atlas(
    'loot-basics',
    assetUrl('/assets/ui/loot-basics.png'),
    '/assets/ui/loot-basics.json',
  );
  if (map.island === 'Crystal Caverns' || houseSize(map.id)) {
    scene.load.atlas(
      'loot-crystal-resources',
      assetUrl('/assets/ui/crystal-resources.png'),
      '/assets/ui/crystal-resources.json',
    );
    scene.load.atlas(
      'loot-crystal-drops',
      assetUrl('/assets/ui/crystal-loot.png'),
      '/assets/ui/crystal-loot.json',
    );
  }
  scene.load.image('loot-crystal', assetUrl('/assets/ui/teleport-crystal.png'));
  scene.load.image('forest-bear-key', assetUrl('/assets/ui/forest-bear-key.png'));
  const tier = EQUIPMENT_TIERS.find((t) => t.island === map.island || t.islandName === map.island);
  for (const selectedTier of houseSize(map.id) ? EQUIPMENT_TIERS : tier ? [tier] : []) {
    if (selectedTier.id === 'woods') continue;
    scene.load.atlas(
      `loot-equipment-${selectedTier.id}`,
      assetUrl(`/assets/equipment/islands/${selectedTier.id}.png`),
      `/assets/equipment/islands/${selectedTier.id}.json`,
    );
  }
}
export function lootIcon(
  scene: Phaser.Scene,
  item: string,
  size = 28,
): Phaser.GameObjects.Container | Phaser.GameObjects.Image {
  const recipe = recipeFromScroll(item);
  if (recipe) {
    const parchment = scene.add.image(
      0,
      0,
      'recipe-scrolls',
      recipe.category === 'carpentry'
        ? 'tool'
        : recipe.category === 'housing'
          ? 'armor'
          : recipe.category,
    );
    parchment.setScale(size / Math.max(parchment.width, parchment.height));
    const badge = lootIcon(scene, recipe.id, size * 0.56).setPosition(0, size * 0.05);
    return scene.add
      .container(0, 0, [parchment, badge])
      .setName('loot-item-sprite')
      .setData('item', item);
  }
  const gear = equipmentDefinition(item),
    kind = weaponKind(item);
  let key = 'loot-basics',
    frame: string | undefined = 'fang';
  if (Object.hasOwn(murkmireProvisions.frames, item)) {
    key = 'murkmire-provisions';
    frame = item;
  } else if (Object.hasOwn(murkmireItems.frames, item)) {
    key = 'loot-murkmire-items';
    frame = item;
  } else if (Object.hasOwn(frontFurniture.frames, item)) {
    key = 'front-furniture';
    frame = item;
  } else if (Object.hasOwn(housing.frames, item)) {
    key = 'housing-art';
    frame = item;
  } else if (item === 'oak-plank') {
    key = 'loot-resources';
    frame = 'oak-logs';
  } else if (item === 'gold' || item === 'fang') {
    frame = item;
  } else if (Object.hasOwn(bars.frames, item)) {
    key = 'recipe-bars';
    frame = item;
  } else if (GATHERING_TOOLS.some((t) => t.id === item)) {
    key = 'recipe-tools';
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
    ...(drop.gear
      ? [
          {
            item: drop.gear.base,
            quantity: 1,
            rarity: drop.gear.identified ? drop.gear.rarity : undefined,
          },
        ]
      : []),
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
