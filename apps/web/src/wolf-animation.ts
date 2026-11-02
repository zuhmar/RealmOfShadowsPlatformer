import type { Wolf } from '@ros/shared';

export type WolfAnimation = 'idle' | 'walk' | 'attack' | 'hurt' | 'death';
export type WolfVisualState = { hp: number; x: number; lastAttack: number; dead: boolean };

// Snapshot edges trigger one-shot clips once; render frames never restart them.
export function wolfAnimation(
  wolf: Wolf,
  previous: WolfVisualState | undefined,
  oneShotPlaying: boolean,
): WolfAnimation | null {
  if (wolf.hp <= 0) return previous?.dead ? null : 'death';
  if (previous?.dead) return 'idle';
  if (previous && wolf.hp < previous.hp) return 'hurt';
  if (previous && wolf.lastAttack > previous.lastAttack) return 'attack';
  if (oneShotPlaying) return null;
  return ['wandering', 'chasing', 'returning'].includes(wolf.state) ? 'walk' : 'idle';
}

export function wolfFacing(wolf: Wolf, previousX: number, players: { x: number; y: number }[]) {
  if (wolf.state === 'attacking') {
    const target = players
      .filter((p) => Math.abs(p.y - wolf.y) < 55)
      .sort((a, b) => Math.abs(a.x - wolf.x) - Math.abs(b.x - wolf.x))[0];
    if (target) return target.x < wolf.x;
  }
  return Math.abs(wolf.x - previousX) > 0.05 ? wolf.x < previousX : null;
}
