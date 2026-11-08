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
    description: 'Violet robes and a star-trimmed pointed hat.',
    requiredClass: 'mage',
  },
  rogue: {
    name: 'Dusk Rogue',
    description: 'Charcoal leather, plum accents and a shadow hood.',
    requiredClass: 'rogue',
  },
};
export type SkinId = ClassId | 'golden-test';
export const SKINS: Record<SkinId, { name: string; description: string; requiredClass?: ClassId }> =
  {
    ...CLASS_SKINS,
    'golden-test': {
      name: 'Golden Test Figure',
      description: 'A white training figure with a golden glow. Available to every class.',
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
