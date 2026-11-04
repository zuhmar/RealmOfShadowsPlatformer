import { BOSS_ATTACK, WOODS_MONSTERS } from '@ros/game-data';
import type { Wolf } from '@ros/shared';
/** Use authoritative snapshot time, so poses cannot hit before server damage. */
export function groundSlamFrame(
  monster: Pick<Wolf, 'monster' | 'hp' | 'special' | 'lastSlamAt'>,
  now: number,
): number | null {
  if (!monster.monster || !WOODS_MONSTERS[monster.monster].boss || monster.hp <= 0) return null;
  if (monster.special) {
    const cast = monster.special,
      span = Math.max(1, cast.impactAt - cast.startedAt);
    return Math.max(0, Math.min(3, Math.floor(((now - cast.startedAt) / span) * 4)));
  }
  if (monster.lastSlamAt !== undefined) {
    const elapsed = now - monster.lastSlamAt;
    if (elapsed >= 0 && elapsed < BOSS_ATTACK.recovery) {
      return elapsed < 120 ? 4 : elapsed < 260 ? 5 : elapsed < 440 ? 6 : 7;
    }
  }
  return null;
}
