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
export function validSkin(value: unknown): value is ClassId | null {
  return value === null || (typeof value === 'string' && Object.hasOwn(CLASS_SKINS, value));
}
export function canEquipSkin(classId: ClassId | undefined, skin: unknown) {
  return (
    validSkin(skin) &&
    (skin === null ||
      !CLASS_SKINS[skin].requiredClass ||
      CLASS_SKINS[skin].requiredClass === classId)
  );
}
