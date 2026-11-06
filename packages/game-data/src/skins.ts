import type { ClassId } from './classes';
export const CLASS_SKINS: Record<ClassId, { name: string; description: string }> = {
  knight: {
    name: 'Royal Knight',
    description: 'Silver armor, royal-blue tabard and crested helmet.',
  },
  archer: { name: 'Woodland Ranger', description: 'Forest-green leathers and a ranger hood.' },
  mage: { name: 'Starlight Mage', description: 'Violet robes and a star-trimmed pointed hat.' },
  rogue: { name: 'Dusk Rogue', description: 'Charcoal leather, plum accents and a shadow hood.' },
};
export function validSkin(value: unknown): value is ClassId | null {
  return value === null || (typeof value === 'string' && Object.hasOwn(CLASS_SKINS, value));
}
