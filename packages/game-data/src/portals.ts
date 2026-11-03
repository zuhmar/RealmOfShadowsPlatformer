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
