import {
  MAPS,
  WOODS_MONSTERS,
  RULES,
  weaponProfile,
  toolDurationMultiplier,
  gatheringXpNeeded,
  type GatheringSkill,
} from '@ros/game-data';
import { activeGatheringTool, grantXp, offlineReward, type Player } from './index';
import { attackPower, trainCombat, activeCombatSkill } from './combat-skills';
export type ActivityReward = {
  seconds: number;
  xp: number;
  gold: number;
  items?: Record<string, number>;
  skill?: string;
  skillXp?: number;
};
export function offlineActivities(p: Player) {
  const choices = [{ id: 'training', label: 'General training · XP and gold' }];
  for (const map of Object.values(MAPS)) {
    if (p.level < map.requiredLevel || !(p.visitedAreas?.includes(map.id) || p.mapId === map.id))
      continue;
    const monsterId = map.monster ?? (map.id === 'woods' ? 'wolf' : undefined);
    if (monsterId && !WOODS_MONSTERS[monsterId].boss)
      choices.push({
        id: `hunt:${map.id}`,
        label: `${WOODS_MONSTERS[monsterId!].name} hunting · XP, gold and combat training`,
      });
    for (const node of (map.resources ?? []).filter(
      (n) => (p.gatheringSkills?.[n.skill]?.level ?? 1) >= (n.level ?? 1),
    ))
      choices.push({ id: `gather:${map.id}:${node.id}`, label: `${node.skill} · ${map.name}` });
  }
  return choices;
}
/** Whole minutes, capped duration and deterministic yields prevent claim-time rerolls. */
export function activityReward(
  p: Player,
  kind: string,
  start: number,
  now: number,
): ActivityReward {
  const legacy = offlineReward(start, now);
  if (kind === 'training') return legacy;
  const empty = { seconds: legacy.seconds, xp: 0, gold: 0 };
  if (!offlineActivities(p).some((a) => a.id === kind)) return empty;
  const [job, mapId, nodeId] = kind.split(':');
  const map = MAPS[mapId];
  const minutes = Math.floor(legacy.seconds / 60);
  const monsterId = map.monster ?? (map.id === 'woods' ? 'wolf' : undefined);
  if (job === 'hunt' && monsterId) {
    const monster = WOODS_MONSTERS[monsterId];
    const dps =
      (attackPower({ ...p, foodBuff: undefined }) * 1000) / weaponProfile(p.weapon).cooldown;
    const kills = Math.floor(minutes * Math.min(8, (dps * 60) / monster.hp) * 0.35);
    const skill = activeCombatSkill(p);
    return {
      ...empty,
      xp: kills * monster.xp,
      gold: kills * monster.gold,
      ...(skill ? { skill, skillXp: kills * 3 } : {}),
    };
  }
  const node = map.resources?.find((n) => n.id === nodeId);
  if (!node) return empty;
  const speed = toolDurationMultiplier(activeGatheringTool(p, node.skill).material);
  const cycles = Math.floor(((minutes * 60000) / (node.duration * speed)) * 0.35);
  // Rare fishing tables are rolled while actively fishing; offline jobs collect the area's common catch.
  const commonFish = map.id.startsWith('crystal') ? 'crystal-fish' : 'brook-trout';
  const item = node.item ?? commonFish;
  return {
    ...empty,
    items: cycles ? { [item]: cycles * (node.skill === 'Fishing' ? 1 : 2) } : {},
    skill: node.skill,
    skillXp: cycles * 10,
  };
}
export function applyActivityReward(p: Player, reward: ActivityReward) {
  grantXp(p, reward.xp);
  p.gold += reward.gold;
  for (const [item, quantity] of Object.entries(reward.items ?? {}))
    p.inventory[item] = (p.inventory[item] ?? 0) + quantity;
  if (!reward.skill || !reward.skillXp) return;
  if (['Melee', 'Magic', 'Distance'].includes(reward.skill)) {
    trainCombat(p, reward.skill as 'Melee' | 'Magic' | 'Distance', reward.skillXp);
  } else {
    const state = ((p.gatheringSkills ??= {})[reward.skill as GatheringSkill] ??= {
      level: 1,
      xp: 0,
    });
    state.xp += reward.skillXp;
    while (state.level < 100 && state.xp >= gatheringXpNeeded(state.level)) {
      state.xp -= gatheringXpNeeded(state.level);
      state.level++;
    }
    if (state.level >= 100) state.xp = 0;
  }
}
