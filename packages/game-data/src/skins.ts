import { CLASS_PATHS } from './classes';
import { equipmentDefinition } from './island-equipment';
import { weaponKind } from './index';
import type { ClassId } from './classes';
export const CLASS_SKINS: Record<
  ClassId,
  { name: string; description: string; requiredClass?: ClassId }
> = {
  knight: {
    name: 'Royal Knight',
    requiredClass: 'knight',
    description: 'Silver armor, royal-blue tabard and crested helmet.',
  },
  archer: {
    name: 'Woodland Ranger',
    description: 'Forest-green leathers and a ranger hood.',
    requiredClass: 'archer',
  },
  mage: {
    name: 'Starlight Mage',
    description: 'Sapphire-blue robes, silver trim and a pointed wizard hat.',
    requiredClass: 'mage',
  },
  rogue: {
    name: 'Dusk Rogue',
    description: 'Charcoal hood and mask, brown leather and a burgundy cape.',
    requiredClass: 'rogue',
  },
};
export type SkinId = ClassId | 'golden-test';
export const SKINS: Record<SkinId, { name: string; description: string; requiredClass?: ClassId }> =
  {
    ...CLASS_SKINS,
    'golden-test': {
      name: 'Celestial',
      description:
        'A white-and-gold Celestial figure. The shared appearance of the hero and friendly characters.',
    },
  };
export function validSkin(value: unknown): value is SkinId | null {
  return value === null || (typeof value === 'string' && Object.hasOwn(SKINS, value));
}
export function canEquipSkin(classId: ClassId | undefined, skin: unknown) {
  return (
    validSkin(skin) &&
    (skin === null || !SKINS[skin].requiredClass || SKINS[skin].requiredClass === classId)
  );
}

/** Gender-neutral Celestial sheets follow equipped gear, not the current map. */
export function classSkinSheet(
  p: {
    skin?: unknown;
    classId?: ClassId;
    weapon?: string | null;
    climbing?: boolean;
    gathering?: unknown;
  },
  forceUnarmed = false,
) {
  const skin = p.skin;
  if (
    typeof skin !== 'string' ||
    skin === 'golden-test' ||
    !Object.hasOwn(CLASS_SKINS, skin) ||
    !canEquipSkin(p.classId, skin)
  )
    return baseSkinSheet(p, forceUnarmed);
  const cls = skin as ClassId,
    kind = weaponKind(p.weapon),
    tier = equipmentDefinition(p.weapon)?.tier ?? 'starter';
  const armed =
    !forceUnarmed &&
    !p.climbing &&
    !p.gathering &&
    CLASS_PATHS[cls].weapon === kind &&
    ['starter', 'woods', 'crystal'].includes(tier);
  const id = `${cls}-${armed ? 'armed' : 'unarmed'}${armed && tier !== 'starter' ? `-${tier}` : ''}`;
  return { key: `skin-celestial-${id}`, path: `/assets/characters/skins/celestial/${id}`, armed };
}

/** Base/Civilian bodies can try every weapon before class selection. */
export function baseSkinSheet(
  p: { weapon?: string | null; climbing?: boolean; gathering?: unknown },
  forceUnarmed = false,
) {
  const kind = weaponKind(p.weapon),
    tier = equipmentDefinition(p.weapon)?.tier ?? 'starter';
  if (
    forceUnarmed ||
    p.climbing ||
    p.gathering ||
    kind === 'unarmed' ||
    !['starter', 'woods', 'crystal'].includes(tier)
  )
    return { key: 'skin-golden-test', path: '/assets/characters/skins/golden-test', armed: false };
  return {
    key: `skin-base-${kind}-${tier}`,
    path: `/assets/characters/skins/base-armed/${kind}-${tier}`,
    armed: true,
  };
}
