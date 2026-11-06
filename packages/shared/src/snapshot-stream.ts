import type { Snapshot } from './index';

const collections = ['players', 'wolves', 'drops', 'projectiles'] as const;
type Collection = (typeof collections)[number];
type Entity = { id: string; [key: string]: unknown };
type Change = { id: string; set: Record<string, unknown>; unset?: string[] };
export type SnapshotDelta = {
  sequence: number;
  base: number;
  time: number;
  changes: Partial<Record<Collection, { upsert: Change[]; remove: string[] }>>;
};
export type SnapshotKeyframe = Snapshot & { sequence?: number };

/** Field-level changes keep inventories and equipment off the movement hot path. */
export class SnapshotEncoder {
  private previous = new Map<Collection, Map<string, Record<string, unknown>>>();
  private sequence = 0;
  private keyframeAt = -Infinity;
  private mapId = '';
  encode(
    snapshot: Snapshot,
    force = false,
  ): { type: 'snapshot'; data: SnapshotKeyframe } | { type: 'snapshotDelta'; data: SnapshotDelta } {
    const full =
      force ||
      !this.sequence ||
      snapshot.mapId !== this.mapId ||
      snapshot.time - this.keyframeAt >= 5000;
    const base = this.sequence++;
    const changes: SnapshotDelta['changes'] = {};
    for (const name of collections) {
      const before = this.previous.get(name) ?? new Map();
      const next = new Map<string, Record<string, unknown>>();
      const upsert: Change[] = [];
      for (const entity of (snapshot[name] ?? []) as unknown as Entity[]) {
        const old = before.get(entity.id);
        const fields: Record<string, unknown> = {};
        const set: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(entity)) {
          if (value === undefined) continue;
          const encoded =
            value !== null && typeof value === 'object' ? JSON.stringify(value) : value;
          fields[key] = encoded;
          if (!old || old[key] !== encoded) set[key] = value;
        }
        const unset = old ? Object.keys(old).filter((key) => !(key in fields)) : [];
        if (Object.keys(set).length || unset.length)
          upsert.push({ id: entity.id, set, ...(unset.length ? { unset } : {}) });
        next.set(entity.id, fields);
      }
      const remove = [...before.keys()].filter((id) => !next.has(id));
      if (upsert.length || remove.length) changes[name] = { upsert, remove };
      this.previous.set(name, next);
    }
    this.mapId = snapshot.mapId;
    if (full) {
      this.keyframeAt = snapshot.time;
      return { type: 'snapshot', data: { ...snapshot, sequence: this.sequence } };
    }
    return {
      type: 'snapshotDelta',
      data: { base, sequence: this.sequence, time: snapshot.time, changes },
    };
  }
}

/** Never apply a delta to an unknown base; ask for a fresh keyframe instead. */
export class SnapshotDecoder {
  private sequence = 0;
  private current?: Snapshot;
  full(frame: SnapshotKeyframe) {
    this.sequence = frame.sequence ?? 0;
    this.current = frame;
    return frame;
  }
  delta(frame: SnapshotDelta): Snapshot | undefined {
    if (!this.current || frame.base !== this.sequence || frame.sequence !== frame.base + 1) return;
    const next = { ...this.current, time: frame.time };
    for (const name of collections) {
      const patch = frame.changes[name];
      if (!patch) continue;
      const entities = new Map(
        ((this.current[name] ?? []) as unknown as Entity[]).map((e) => [e.id, e]),
      );
      for (const id of patch.remove) entities.delete(id);
      for (const change of patch.upsert) {
        const entity: Entity = { ...entities.get(change.id), ...change.set, id: change.id };
        for (const key of change.unset ?? []) delete entity[key];
        entities.set(change.id, entity);
      }
      (next as unknown as Record<string, unknown>)[name] = [...entities.values()];
    }
    this.sequence = frame.sequence;
    this.current = next;
    return next;
  }
}
