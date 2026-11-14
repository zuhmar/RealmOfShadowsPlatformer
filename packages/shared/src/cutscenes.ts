import {
  CUTSCENES,
  QUESTS,
  cutsceneById,
  houseSize,
  type GameMap,
  type Cutscene,
} from '@ros/game-data';
import { nearNpc, type Player } from './index';
export const CINEMATIC_LEASE_MS = 90000;
export type CinematicState = {
  id: string;
  endsAt: number;
  replay?: boolean;
  resumeNodeId?: string;
};
export type CutsceneContext = { panel?: string | null; recipeSkill?: string; storage?: boolean };
/** The client suggests a scene; authoritative state and location decide eligibility. */
export function cutsceneEligible(p: Player, map: GameMap, id: string, replay = false) {
  const s = cutsceneById(id);
  if (!s || p.cinematic || !p.grounded || p.climbing || p.hp <= 0) return false;
  if (p.arena && id !== 'feature-arena') return false;
  if (p.battleground && id !== 'feature-battlegrounds') return false;
  if (s.spoiler && !p.originRevelation) return false;
  if (replay) return map.id === 'village' && !!p.seenCutscenes?.includes(id);
  if (p.seenCutscenes?.includes(id)) return false;
  if (s.future && (!s.quest || !Object.hasOwn(QUESTS, s.quest))) return false;
  if (s.map && map.id !== s.map) return false;
  if (s.npc && !nearNpc(p, map, s.npc)) return false;
  if (s.quest && !p.quests?.[s.quest]) return false;
  if (s.kind === 'chapter' || s.kind === 'boss') return true;
  switch (id) {
    case 'feature-classes':
      return !p.classId && !!p.quests?.['crystal-class-trial']?.claimed;
    case 'feature-gathering':
      return (
        !!p.gathering &&
        !!map.resources?.some(
          (n) =>
            n.id === p.gathering?.nodeId && Math.abs(p.x - n.x) < 140 && Math.abs(p.y - n.y) < 70,
        )
      );
    case 'feature-identification':
      return !!p.gear?.some((g) => !g.identified && g.source !== 'crafted');
    case 'feature-housing':
      return map.id === 'village' || !!houseSize(map.id);
    case 'feature-arena':
      return p.arena?.phase === 'waiting' && !p.arena.ready;
    case 'feature-battlegrounds':
      return p.battleground?.phase === 'waiting';
    default:
      return !p.arena && !p.battleground;
  }
}
export function nextCutscene(p: Player, map: GameMap, context: CutsceneContext = {}) {
  const chapter = CUTSCENES.find((s) => s.kind === 'chapter' && cutsceneEligible(p, map, s.id));
  if (chapter) return chapter;
  const specific = CUTSCENES.find(
    (s) =>
      (s.kind === 'boss' ||
        ['feature-arena', 'feature-battlegrounds', 'feature-classes'].includes(s.id)) &&
      cutsceneEligible(p, map, s.id),
  );
  if (specific) return specific;
  const ids: string[] = [];
  if (p.gathering) ids.push('feature-gathering');
  if (context.panel === 'bram') ids.push('feature-forging');
  if (context.panel === 'recipes')
    ids.push(context.recipeSkill === 'Alchemy' ? 'feature-alchemy' : 'feature-cooking');
  if (context.panel === 'inventory' || context.panel === 'bag') ids.push('feature-identification');
  if (context.panel === 'map') ids.push('feature-travel');
  if (context.panel === 'skills') ids.push('feature-training');
  if (['housing', 'decorate', 'storage'].includes(context.panel ?? '') || context.storage)
    ids.push('feature-housing');
  return ids.map(cutsceneById).find((s): s is Cutscene => !!s && cutsceneEligible(p, map, s.id));
}
export function beginCinematic(p: Player, map: GameMap, id: string, now: number, replay = false) {
  if (!cutsceneEligible(p, map, id, replay))
    throw new Error('This cutscene is not available here.');
  p.cinematic = { id, endsAt: now + CINEMATIC_LEASE_MS, replay, resumeNodeId: p.gathering?.nodeId };
  p.auto = false;
  p.vx = 0;
  p.vy = 0;
  delete p.gathering;
  if (!replay) {
    p.seenCutscenes ??= [];
    if (!p.seenCutscenes.includes(id)) p.seenCutscenes.push(id);
  }
  return p.cinematic;
}
