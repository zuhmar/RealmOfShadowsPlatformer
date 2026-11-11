export const HOUSING_PLATFORM = { id: 'housing', x: 500, y: 240, width: 800 };
export const HOUSING_PLOTS = {
  small: { name: 'Small', width: 280, level: 1, cost: { 'oak-plank': 20 } },
  medium: { name: 'Medium', width: 440, level: 5, cost: { 'oak-plank': 60, 'iron-bar': 5 } },
  large: { name: 'Large', width: 620, level: 10, cost: { 'oak-plank': 120, 'iron-bar': 10 } },
} as const;
export type PlotSize = keyof typeof HOUSING_PLOTS;
export const CARPENTRY_RECIPES = [
  {
    id: 'oak-plank',
    name: 'Oak Plank',
    level: 1,
    cost: { 'oak-logs': 5 },
    xp: 5,
    width: 0,
    height: 0,
  },
  {
    id: 'oak-table',
    name: 'Oak Table',
    level: 1,
    cost: { 'oak-plank': 5 },
    xp: 20,
    width: 110,
    height: 72,
  },
  {
    id: 'oak-chair',
    name: 'Oak Chair',
    level: 1,
    cost: { 'oak-plank': 3 },
    xp: 12,
    width: 52,
    height: 82,
  },
  {
    id: 'oak-bed',
    name: 'Oak Bed',
    level: 3,
    cost: { 'oak-plank': 10 },
    xp: 35,
    width: 154,
    height: 82,
  },
  {
    id: 'oak-chest',
    name: 'Oak Chest',
    level: 5,
    cost: { 'oak-plank': 8, 'iron-bar': 1 },
    xp: 30,
    width: 94,
    height: 68,
  },
] as const;
export const CARPENTRY_ITEMS = Object.fromEntries(
  CARPENTRY_RECIPES.map((r) => [
    r.id,
    {
      id: r.id,
      name: r.name,
      type: 'material',
      rarity: 'Common',
      level: r.level,
      bonus: 0,
      sellValue: 0,
      icon: '▣',
      description:
        r.id === 'oak-plank'
          ? 'Building material for houses and furniture.'
          : 'Place on your private housing plot.',
    },
  ]),
);
export const HOUSE_STAGES = ['Unbuilt', 'Foundation', 'Walls', 'Finished'] as const;
export function houseStageCost(size: PlotSize, stage: number): Record<string, number> {
  const factor = { small: 1, medium: 2, large: 4 }[size];
  return stage === 0
    ? { 'oak-plank': 10 * factor }
    : stage === 1
      ? { 'oak-plank': 20 * factor }
      : { 'oak-plank': 15 * factor, 'iron-bar': factor };
}

export const HOUSE_LAYOUTS = {
  small: { width: 1000, height: 620, floors: [500], capacity: 24 },
  medium: { width: 1450, height: 900, floors: [780, 500], capacity: 48 },
  large: { width: 2000, height: 1200, floors: [1080, 800, 520], capacity: 80 },
} as const;
export function houseSize(mapId: string): PlotSize | undefined {
  const size = mapId.replace('house-', '');
  return mapId.startsWith('house-') && Object.hasOwn(HOUSE_LAYOUTS, size)
    ? (size as PlotSize)
    : undefined;
}

/** Shared geometry for visible walls and authoritative actor bounds. */
export function houseInteriorBounds(size: PlotSize) {
  const layout = HOUSE_LAYOUTS[size];
  return {
    left: 64,
    right: layout.width - 64,
    top: layout.floors[layout.floors.length - 1] - 260,
    bottom: layout.floors[0],
  };
}
