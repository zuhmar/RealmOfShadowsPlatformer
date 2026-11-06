import { assetUrl } from './assets';
import Phaser from 'phaser';
import type { Event } from '@ros/shared';
import { equipmentDefinition, weaponSkillProgression } from '@ros/game-data';
const kinds = ['sword', 'bow', 'staff', 'dagger'] as const;
// A shared neutral atlas keeps the exact same movement and timing for every equipment tier.
const themes: Record<string, { color: number; highlight: number }> = {
  woods: { color: 0x81c94c, highlight: 0xf3ffe4 },
  crystal: { color: 0x67dbed, highlight: 0xeafaff },
  swamp: { color: 0x9bc53d, highlight: 0xf0ffd0 },
  frost: { color: 0x6cbaff, highlight: 0xf1fcff },
  ember: { color: 0xff7924, highlight: 0xffedaf },
  celestial: { color: 0xe5bc63, highlight: 0xfff9e5 },
  shadow: { color: 0xae60ed, highlight: 0xf4ddff },
};
export function themeWeaponEffect(sprite: Phaser.GameObjects.Sprite, weapon?: string | null) {
  const tier = equipmentDefinition(weapon)?.tier ?? 'woods';
  const theme = themes[tier];
  const evolution = weaponSkillProgression(weapon);
  sprite.setScale(sprite.scaleX * evolution.visualScale, sprite.scaleY * evolution.visualScale);
  sprite.setData('skillRank', evolution.rank);
  // Vertex colors retain the bright highlights while coloring the silver trails.
  sprite.setTint(theme.color, theme.highlight, theme.color, theme.highlight);
  sprite.setData('weaponTheme', tier);
  return sprite;
}
export function preloadWeaponEffects(scene: Phaser.Scene) {
  for (const kind of kinds)
    scene.load.atlas(
      `special-${kind}`,
      assetUrl(`/assets/effects/weapon-specials/${kind}.png`),
      `/assets/effects/weapon-specials/${kind}.json`,
    );
}
export function registerWeaponEffects(scene: Phaser.Scene) {
  for (const kind of kinds) {
    if (!scene.anims.exists(`special-${kind}`))
      scene.anims.create({
        key: `special-${kind}`,
        frames: Array.from({ length: 8 }, (_, i) => ({ key: `special-${kind}`, frame: `fx-${i}` })),
        frameRate: kind === 'dagger' ? 24 : 20,
        repeat: 0,
      });
  }
  for (const kind of ['bow', 'staff'] as const)
    if (!scene.anims.exists(`special-${kind}-flight`))
      scene.anims.create({
        key: `special-${kind}-flight`,
        frames: [2, 3, 4].map((i) => ({ key: `special-${kind}`, frame: `fx-${i}` })),
        frameRate: 15,
        repeat: -1,
      });
}
export function skillEffect(scene: Phaser.Scene, event: Event) {
  const kind = event.skill === 'unarmed' ? 'sword' : event.skill;
  if (!kind || !kinds.includes(kind)) return;
  const impact = event.phase === 'impact';
  // Flurry's full sequence already shows three strikes; do not stack another full burst per server strike.
  if (kind === 'dagger' && impact) return;
  const facing = event.facing ?? 1;
  const size =
    kind === 'staff' ? (impact ? 280 : 72) : kind === 'sword' ? 240 : kind === 'bow' ? 160 : 150;
  const x =
    event.x +
    (kind === 'sword'
      ? facing * 60
      : kind === 'bow'
        ? facing * 65
        : kind === 'dagger'
          ? facing * 40
          : 0);
  const sprite = scene.add
    .sprite(x, event.y, `special-${kind}`, 'fx-0')
    .setDisplaySize(size, size)
    .setDepth(18)
    .setFlipX(facing < 0)
    .setName('weapon-skill-effect')
    .setData('skill', kind)
    .setData('phase', event.phase ?? 'cast');
  themeWeaponEffect(sprite, event.weapon);
  sprite.play(`special-${kind}`);
  sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy());
}
