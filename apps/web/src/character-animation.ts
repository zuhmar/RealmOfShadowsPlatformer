import type { Player } from '@ros/shared';
import type { GameMap } from '@ros/game-data';
export type CharacterMotion = 'idle' | 'walk' | 'climb' | 'air';
export type CharacterState = Pick<
  Player,
  'hp' | 'lastAttack' | 'lastHit' | 'lastSkill' | 'x' | 'y' | 'vx' | 'vy' | 'grounded'
>;
export function characterMotion(p: Player, map: GameMap): CharacterMotion {
  if (!p.grounded) {
    if (p.climbing === true) return 'climb';
    return 'air';
  }
  return Math.abs(p.vx) > 1 ? 'walk' : 'idle';
}
export function characterAction(
  p: Player,
  previous: CharacterState | undefined,
): 'attack' | 'hurt' | null {
  if (!previous) return null;
  if (p.lastHit > previous.lastHit && p.hp < previous.hp) return 'hurt';
  if (p.lastAttack > previous.lastAttack || p.lastSkill > previous.lastSkill) return 'attack';
  return null;
}
export function jumpFrame(p: Pick<Player, 'vy' | 'grounded'>, landed: boolean) {
  if (landed) return 'jump-5';
  if (p.vy < -350) return 'jump-1';
  if (p.vy < -60) return 'jump-2';
  if (p.vy < 80) return 'jump-3';
  return 'jump-4';
}
