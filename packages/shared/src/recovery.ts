import type { Player } from './index';
export const RECOVERY_COMBAT_DELAY = 10_000;
export const RECOVERY_COOLDOWN = 60_000;
/** Recovery cannot bypass a duel, expedition, or combat retreat rules. */
export function recoveryBlock(p: Player, now: number): string | null {
  if (p.arena || p.mapId === 'murkmire-arena')
    return 'Use Leave arena to return. Leaving an active duel forfeits it.';
  if (p.battleground || p.mapId === 'frostfall-battleground')
    return 'Use Leave expedition to return. Leaving ends your participation.';
  if (p.mapId === 'village')
    return 'You are already in Elderwood. Use Unstuck to return to the village entrance.';
  return unstuckBlock(p, now);
}
export function unstuckBlock(p: Player, now: number): string | null {
  if (p.arena || p.battleground || ['murkmire-arena', 'frostfall-battleground'].includes(p.mapId))
    return 'Use the arena or expedition Leave button to return.';
  if (p.cinematic) return 'Finish or skip the cutscene first.';
  if (p.hp <= 0) return 'Wait for your character to respawn.';
  const combatWait = Math.max(p.lastHit, p.lastAttack) + RECOVERY_COMBAT_DELAY - now;
  if (combatWait > 0)
    return `Leave combat for ${Math.ceil(combatWait / 1000)} more seconds before recovering.`;
  const cooldown = (p.lastRecoveryAt ?? -RECOVERY_COOLDOWN) + RECOVERY_COOLDOWN - now;
  if (cooldown > 0) return `Recovery available in ${Math.ceil(cooldown / 1000)} seconds.`;
  return null;
}
