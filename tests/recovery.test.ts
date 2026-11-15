import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, recoveryBlock, unstuckBlock } from '@ros/shared';
const now = 100_000;
test('recovery waits for combat, shares a persisted cooldown and never spends inventory or heals', () => {
  const p = createPlayer('p', 'P', 'woods');
  const before = structuredClone(p);
  assert.equal(recoveryBlock(p, now), null);
  assert.deepEqual(p, before);
  p.lastHit = now - 9_000;
  assert.match(unstuckBlock(p, now)!, /1 more seconds/);
  p.lastHit = 0;
  p.lastAttack = now - 500;
  assert.match(recoveryBlock(p, now)!, /10 more seconds/);
  p.lastAttack = 0;
  p.lastRecoveryAt = now - 59_000;
  const restored = JSON.parse(JSON.stringify(p));
  assert.match(unstuckBlock(restored, now)!, /1 seconds/);
  assert.equal(recoveryBlock(restored, now + 1_000), null);
});
test('recovery cannot bypass PvP forfeits, battleground participation, death or cutscenes', () => {
  const p = createPlayer('p', 'P', 'murkmire-arena');
  assert.match(recoveryBlock(p, now)!, /forfeits/);
  assert.ok(unstuckBlock(p, now));
  p.mapId = 'frostfall-battleground';
  assert.match(recoveryBlock(p, now)!, /participation/);
  assert.ok(unstuckBlock(p, now));
  p.mapId = 'woods';
  p.hp = 0;
  assert.match(recoveryBlock(p, now)!, /respawn/);
  p.hp = 50;
  p.cinematic = { id: 'intro', startedAt: now, endsAt: now + 10_000 } as NonNullable<
    typeof p.cinematic
  >;
  assert.match(recoveryBlock(p, now)!, /cutscene/);
  delete p.cinematic;
  p.mapId = 'village';
  assert.match(recoveryBlock(p, now)!, /already/);
  assert.equal(unstuckBlock(p, now), null);
});
