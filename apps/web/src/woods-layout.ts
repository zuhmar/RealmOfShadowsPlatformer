import type { GameMap, Platform } from '@ros/game-data';
export const WOODS_PLATFORM_FRAMES: Record<string, string> = {
  ground: 'ground',
  moss: 'platform-wide',
  canopy: 'platform-medium',
  ridge: 'platform-small',
};
export const WOODS_PROPS = [
  { frame: 'trail-sign', platform: 'ground', offset: 300, height: 52 },
  { frame: 'fern', platform: 'ground', offset: 370, height: 40 },
  { frame: 'lantern-post', platform: 'ground', offset: 430, height: 112 },
  { frame: 'mushrooms', platform: 'ground', offset: 715, height: 32 },
  { frame: 'tree-stump', platform: 'ground', offset: 885, height: 48 },
  { frame: 'moss-boulder', platform: 'ground', offset: 1240, height: 64 },
  { frame: 'hollow-log', platform: 'ground', offset: 1470, height: 50 },
  { frame: 'stone-arch', platform: 'ground', offset: 1850, height: 104 },
  { frame: 'leafy-bush', platform: 'ground', offset: 2110, height: 58 },
  { frame: 'waystone', platform: 'ground', offset: 2290, height: 82 },
  { frame: 'fern', platform: 'moss', offset: 395, height: 30 },
  { frame: 'treasure-chest', platform: 'canopy', offset: 385, height: 32 },
  { frame: 'berry-bush', platform: 'ridge', offset: 470, height: 43 },
  { frame: 'mushrooms', platform: 'canopy', offset: 100, height: 25 },
] as const;
export function platformArtwork(
  p: Platform,
  map: GameMap,
  frame: { width: number; height: number },
  surfaceY: number,
) {
  const height = p.oneWay
    ? (p.width * frame.height) / frame.width
    : Math.max(170, map.height - p.y + surfaceY + 16);
  const scaleY = height / frame.height;
  return { x: p.x, y: p.y - surfaceY * scaleY, width: p.width, height, surfaceY: p.y };
}
export function backgroundArtwork(
  view: { x: number; y: number; width: number; height: number },
  map: GameMap,
  image: { width: number; height: number },
) {
  const scale = Math.max((view.width * 1.14) / image.width, (view.height * 1.14) / image.height);
  const width = image.width * scale,
    height = image.height * scale;
  const progressX = Math.max(0, Math.min(1, view.x / Math.max(1, map.width - view.width)));
  const progressY = Math.max(0, Math.min(1, view.y / Math.max(1, map.height - view.height)));
  return {
    x: view.x + view.width / 2 - (progressX - 0.5) * (width - view.width) * 0.3,
    y: view.y + view.height / 2 - (progressY - 0.5) * (height - view.height) * 0.2,
    width,
    height,
  };
}
