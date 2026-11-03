/** Portal appearance follows the destination; hub returns retain their island's theme. */
export const PORTAL_THEMES = [
  'woods',
  'crystal',
  'murkmire',
  'frostfall',
  'ember',
  'celestial',
  'fortress',
] as const;
export type PortalTheme = (typeof PORTAL_THEMES)[number];
export function portalThemeFor(source: string, target: string): PortalTheme {
  target = target.split('-')[0];
  source = source.split('-')[0];
  if (PORTAL_THEMES.includes(target as PortalTheme)) return target as PortalTheme;
  if (PORTAL_THEMES.includes(source as PortalTheme)) return source as PortalTheme;
  return 'woods';
}
/** One guardian marker per island, placed beside its boss portal on the highest perch. */
export const BOSS_ENTRANCE_PROPS: Record<PortalTheme, { name: string; height: number }> = {
  woods: { name: 'Forest Bear Totem', height: 126 },
  crystal: { name: 'Crystal Wyrm Obelisk', height: 140 },
  murkmire: { name: 'Hydra Root Idol', height: 128 },
  frostfall: { name: 'Frost Giant Cairn', height: 140 },
  ember: { name: 'Infernal Drake Brazier', height: 128 },
  celestial: { name: 'Fallen Seraph Shrine', height: 140 },
  fortress: { name: 'Shadow Dragon Altar', height: 136 },
};
