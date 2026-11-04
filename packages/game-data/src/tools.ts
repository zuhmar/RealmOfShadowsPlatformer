import { GATHERING_SKILLS, type GatheringSkill } from './gathering';
export const TOOL_MATERIALS = [
  { id: 'wood', name: 'Wooden', ore: null },
  { id: 'iron', name: 'Iron', ore: 'iron-ore' },
  { id: 'crystal', name: 'Crystal', ore: 'crystal-ore' },
  { id: 'mire', name: 'Mire', ore: 'mire-ore' },
  { id: 'frost', name: 'Frost', ore: 'frost-ore' },
  { id: 'ember', name: 'Ember', ore: 'ember-ore' },
  { id: 'celestial', name: 'Celestial', ore: 'celestial-ore' },
  { id: 'shadow', name: 'Shadow', ore: 'shadow-ore' },
] as const;
export const TOOL_TYPES: Record<GatheringSkill, { id: string; name: string }> = {
  Mining: { id: 'pickaxe', name: 'Pickaxe' },
  Woodcutting: { id: 'axe', name: 'Axe' },
  Fishing: { id: 'rod', name: 'Fishing Rod' },
  Herbalism: { id: 'sickle', name: 'Sickle' },
};
export const toolDurationMultiplier = (material: string) =>
  ({
    wood: 1,
    iron: 0.8,
    crystal: 0.65,
    mire: 0.6,
    frost: 0.55,
    ember: 0.5,
    celestial: 0.45,
    shadow: 0.4,
  })[material] ?? 1;
export const GATHERING_TOOLS = TOOL_MATERIALS.flatMap((material) =>
  GATHERING_SKILLS.map((skill) => ({
    id: `${material.id}-${TOOL_TYPES[skill].id}`,
    name: `${material.name} ${TOOL_TYPES[skill].name}`,
    material: material.id,
    level: {
      wood: 1,
      iron: 1,
      crystal: 11,
      mire: 21,
      frost: 31,
      ember: 41,
      celestial: 51,
      shadow: 61,
    }[material.id],
    skill,
    ore: material.ore,
    starter: material.id === 'wood',
  })),
);
export const starterTool = (skill: GatheringSkill) =>
  GATHERING_TOOLS.find((tool) => tool.starter && tool.skill === skill)!;
