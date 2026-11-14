import { groundProp } from './prop-grounding';
import { assetUrl } from './assets';
import Phaser from 'phaser';
import { portalThemeFor, type GameMap, type PortalTheme } from '@ros/game-data';
import manifest from '../public/assets/effects/island-portals/manifest.json';
type Art = { origins: { x: number; y: number }[]; frameRate: number };
const art = manifest as Record<PortalTheme, Art>;
const key = (theme: PortalTheme) => `island-portal-${theme}`;
const themesFor = (map: GameMap) => [
  ...new Set(map.portals.map((p) => portalThemeFor(map.id, p.target))),
];
export function preloadPortalTheme(scene: Phaser.Scene, theme: PortalTheme) {
  if (scene.textures.exists(key(theme))) return;
  scene.load.atlas(
    key(theme),
    assetUrl(`/assets/effects/island-portals/${theme}.png`),
    `/assets/effects/island-portals/${theme}.json`,
  );
}
export function preloadPortals(scene: Phaser.Scene, map: GameMap) {
  if (
    map.portals.some((p) => p.target === 'murkmire-arena') &&
    !scene.textures.exists('arena-entrance')
  )
    scene.load.image('arena-entrance', assetUrl('/assets/props/murkmire-arena-entrance.png'));
  for (const theme of themesFor(map)) preloadPortalTheme(scene, theme);
}
export function registerPortalTheme(scene: Phaser.Scene, theme: PortalTheme) {
  if (scene.anims.exists(`${key(theme)}-idle`)) return;
  scene.anims.create({
    key: `${key(theme)}-idle`,
    frames: Array.from({ length: 8 }, (_, i) => ({ key: key(theme), frame: `idle-${i}` })),
    frameRate: art[theme].frameRate,
    repeat: -1,
  });
}
export function registerPortals(scene: Phaser.Scene, map: GameMap) {
  for (const theme of themesFor(map)) registerPortalTheme(scene, theme);
}
export function addPortal(
  scene: Phaser.Scene,
  source: string,
  portal: GameMap['portals'][number],
  onEnter?: () => void,
) {
  if (portal.target === 'murkmire-arena') {
    const image = scene.add
      .image(portal.x, portal.y, 'arena-entrance')
      .setDepth(2)
      .setName('arena-entrance')
      .setData({ target: portal.target, generated: true });
    image
      .setScale(185 / image.height)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => onEnter?.());
    groundProp(scene, image, portal.x, portal.y, 'ground');
    return image;
  }
  const theme = portalThemeFor(source, portal.target);
  const sprite = scene.add
    .sprite(portal.x, portal.y, key(theme), 'idle-0')
    .setScale(0.32)
    .setDepth(6)
    .setName('travel-portal')
    .setData({ target: portal.target, theme });
  const align = () => {
    const index = Number(String(sprite.frame.name).replace('idle-', ''));
    const origin = art[theme].origins[index];
    sprite.setOrigin(origin.x, origin.y);
  };
  align();
  sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, align);
  return sprite.play(`${key(theme)}-idle`);
}
