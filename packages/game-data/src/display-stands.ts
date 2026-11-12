import { EQUIPMENT_TIERS, equipmentDefinition } from './island-equipment';
import { recipeFromScroll } from './recipes';
export type DisplayStandTheme = (typeof EQUIPMENT_TIERS)[number]['id'];
const resources: Record<DisplayStandTheme, readonly string[]> = {
  woods: ['oak-logs', 'oak-plank', 'greenleaf', 'brook-trout', 'silver-minnow', 'golden-carp'],
  crystal: [
    'crystalwood',
    'glowcap',
    'crystal-fish',
    'glowfin',
    'prismatic-eel',
    'bat-wing',
    'golem-core',
    'shard-stinger',
    'wyrm-scale',
    'crystal-boss-key',
    'crystal-wyrm-trophy',
  ],
  swamp: [
    'slime-glob',
    'lurker-bark',
    'toad-gland',
    'hydra-fang',
    'murkmire-boss-key',
    'hydra-trophy',
    'bogwood',
    'mirebloom',
    'mudfish',
    'bog-catfish',
    'venomfin',
  ],
  frost: ['frostpine', 'frostleaf', 'icefin', 'frost-salmon', 'glacier-pike'],
  ember: ['emberwood', 'fireblossom', 'lavafin', 'ember-snapper', 'inferno-eel'],
  celestial: ['starwood', 'moonbloom', 'starfish', 'moonfin', 'celestial-koi'],
  shadow: ['shadowwood', 'nightshade', 'shadow-eel', 'nightfin', 'abyssal-leviathan'],
};
/** Use the item's content origin, never its rarity or the house owner's current island. */
export function displayStandTheme(item: string): DisplayStandTheme {
  const tier = equipmentDefinition(item)?.tier ?? recipeFromScroll(item)?.tier;
  if (tier && EQUIPMENT_TIERS.some((t) => t.id === tier)) return tier as DisplayStandTheme;
  for (const t of EQUIPMENT_TIERS) {
    if (
      resources[t.id].includes(item) ||
      item === t.ore ||
      item.startsWith(`${t.material}-`) ||
      item.startsWith(`${t.id}-`)
    )
      return t.id;
  }
  // Starter loot, village crafts and shared items use the simple oak stand.
  return 'woods';
}
