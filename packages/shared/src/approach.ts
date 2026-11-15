import { idleInput, platformRoute, type Player, type Input } from './index';
import type { GameMap } from '@ros/game-data';
export type ApproachRequest = {
  kind: 'npc' | 'resource' | 'portal' | 'house-enter' | 'house-exit' | 'chest' | 'monster';
  id?: string;
};
export type ApproachPoint = { x: number; y: number; platform: string; range: number; name: string };
export function approachArrived(p: Player, target: ApproachPoint) {
  return (
    p.grounded &&
    !p.climbing &&
    p.platform === target.platform &&
    Math.abs(p.y - target.y) < 5 &&
    Math.abs(p.x - target.x) <= target.range
  );
}
/** Uses the same ladder graph and ordinary movement inputs as hunting AUTO. */
export function approachInput(p: Player, map: GameMap, target: ApproachPoint): Input {
  const input = idleInput();
  if (approachArrived(p, target)) return input;
  const route = platformRoute(map, p.platform, target.platform);
  if (p.platform !== target.platform) {
    if (!route.length) throw Error(`There is no connected route to ${target.name}.`);
    const step = route[0],
      ladder = map.ladders[step.ladder];
    if (Math.abs(p.x - ladder.x) > 8) {
      input.left = p.x > ladder.x;
      input.right = p.x < ladder.x;
    } else {
      input.up = step.up;
      input.down = !step.up;
    }
  } else if (p.climbing) {
    const ladder = map.ladders.find(
      (l) => Math.abs(p.x - l.x) < 30 && p.y >= l.top && p.y <= l.bottom,
    );
    if (ladder) {
      input.up = target.platform === ladder.to;
      input.down = !input.up;
    }
  } else if (p.grounded) {
    input.left = p.x > target.x + target.range;
    input.right = p.x < target.x - target.range;
  }
  return input;
}
