import test from 'node:test';
import assert from 'node:assert/strict';
import {
  World,
  createPlayer,
  SnapshotEncoder,
  SnapshotDecoder,
  type SnapshotKeyframe,
} from '@ros/shared';
import { MAPS } from '@ros/game-data';
const wire = <T>(v: T): T => JSON.parse(JSON.stringify(v));
test('delta stream reconstructs movement, nested mutations, deleted fields and removed actors without mutating past frames', () => {
  const world = new World(MAPS.woods),
    p = createPlayer('p', 'Hero', 'woods');
  world.players.set(p.id, p);
  p.inventory['iron-ore'] = 100;
  const encoder = new SnapshotEncoder(),
    decoder = new SnapshotDecoder();
  const first = encoder.encode(world.snapshot(10000, p.id));
  assert.equal(first.type, 'snapshot');
  decoder.full(wire(first.data as SnapshotKeyframe));
  p.x += 20;
  p.inventory['iron-ore']++;
  p.gathering = { nodeId: 'test', startedAt: 10000, finishAt: 14000 };
  const next = encoder.encode(world.snapshot(10067, p.id));
  assert.equal(next.type, 'snapshotDelta');
  if (next.type !== 'snapshotDelta') throw new Error('Expected delta');
  const decoded = decoder.delta(wire(next.data))!;
  assert.deepEqual(wire(decoded.players), wire(world.snapshot(10067, p.id).players));
  assert.equal(decoded.players[0].inventory['iron-ore'], 101);
  delete p.gathering;
  world.wolves.pop();
  const removed = encoder.encode(world.snapshot(10134, p.id));
  if (removed.type !== 'snapshotDelta') throw new Error('Expected delta');
  const final = decoder.delta(wire(removed.data))!;
  assert.equal(final.players[0].gathering, undefined);
  assert.equal(final.wolves.length, world.wolves.length);
  assert.ok(decoded.players[0].gathering);
  assert.equal(decoded.wolves.length, world.wolves.length + 1);
  assert.deepEqual(final.players[0].inventory, decoded.players[0].inventory);
});
test('missing or duplicate deltas require a keyframe; periodic, forced and map-change keyframes recover', () => {
  const world = new World(MAPS.woods),
    encoder = new SnapshotEncoder(),
    decoder = new SnapshotDecoder();
  const first = encoder.encode(world.snapshot(10000));
  decoder.full(wire(first.data as SnapshotKeyframe));
  encoder.encode(world.snapshot(10067)); // Deliberately drop a frame.
  const missed = encoder.encode(world.snapshot(10134));
  if (missed.type !== 'snapshotDelta') throw new Error('Expected delta');
  assert.equal(decoder.delta(missed.data), undefined);
  const forced = encoder.encode(world.snapshot(10200), true);
  assert.equal(forced.type, 'snapshot');
  decoder.full(wire(forced.data as SnapshotKeyframe));
  const next = encoder.encode(world.snapshot(10267));
  if (next.type !== 'snapshotDelta') throw new Error('Expected delta');
  assert.ok(decoder.delta(wire(next.data)));
  assert.equal(decoder.delta(wire(next.data)), undefined);
  assert.equal(encoder.encode(world.snapshot(15200)).type, 'snapshot');
  assert.equal(encoder.encode({ ...world.snapshot(15267), mapId: 'village' }).type, 'snapshot');
});
test('movement deltas omit large unchanged inventories and private progression', () => {
  const world = new World(MAPS.woods),
    p = createPlayer('p', 'Hero', 'woods');
  p.inventory = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`material-${i}`, 100]));
  world.players.set(p.id, p);
  const encoder = new SnapshotEncoder();
  const full = encoder.encode(world.snapshot(10000, p.id));
  p.x += 10;
  const delta = encoder.encode(world.snapshot(10067, p.id));
  assert.ok(JSON.stringify(delta).length < JSON.stringify(full).length * 0.1);
  assert.ok(!JSON.stringify(delta).includes('inventory'));
});
