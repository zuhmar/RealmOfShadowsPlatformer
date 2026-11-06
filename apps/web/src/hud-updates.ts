import { MAPS } from '@ros/game-data';
import { classSkillCooldown, nearNpc, type Snapshot } from '@ros/shared';

/** Position and animation updates belong to Phaser, not the React panel tree. */
export function hudSignature(s: Snapshot, id: string) {
  const p = s.players.find((p) => p.id === id);
  if (!p) return s.mapId;
  const { x, y, vx, vy, lastAttack, lastHit, nextAttackAt, dropUntil, facing, ...stats } = p;
  const map = MAPS[s.mapId];
  return JSON.stringify([
    s.mapId,
    s.players.length,
    stats,
    map.npcs.filter((n) => n.id && nearNpc(p, map, n.id)).map((n) => n.id),
    map.portals.findIndex((q) => Math.abs(q.x - x) < 110 && Math.abs(q.y - y) < 65),
    map.resources?.findIndex(
      (n) =>
        p.grounded &&
        p.platform === n.platform &&
        Math.abs(x - n.x) <= 72 &&
        Math.abs(y - n.y) < 40,
    ),
    s.wolves.find((w) => w.special)?.special,
    Math.max(0, Math.ceil((classSkillCooldown(p) - (s.time - p.lastSkill)) / 1000)),
    p.gathering ? Math.max(0, Math.ceil((p.gathering.finishAt - s.time) / 1000)) : 0,
  ]);
}

/** Coalesce bursts and stop publishing UI work while the document is hidden. */
export class HudUpdates {
  private pending?: Snapshot;
  private timer?: ReturnType<typeof setTimeout>;
  private signature = '';
  private lastMap = '';
  constructor(
    private id: string,
    private publish: (s: Snapshot) => void,
  ) {}
  push(s: Snapshot) {
    this.pending = s;
    if (s.mapId !== this.lastMap) {
      this.lastMap = s.mapId;
      this.flush();
    } else if (!this.timer)
      this.timer = setTimeout(() => {
        this.timer = undefined;
        this.flush();
      }, 100);
  }
  flush() {
    if (typeof document !== 'undefined' && document.hidden) return;
    const s = this.pending;
    if (!s) return;
    this.pending = undefined;
    const signature = hudSignature(s, this.id);
    if (signature === this.signature) return;
    this.signature = signature;
    this.publish(s);
  }
  stop() {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.pending = undefined;
  }
}
