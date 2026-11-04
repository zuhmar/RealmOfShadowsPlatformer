import test from 'node:test';
import assert from 'node:assert/strict';
import { World, createPlayer, createCraftedGear } from '@ros/shared';
import { MAPS } from '@ros/game-data';
test('viewer snapshots retain their inventory and progression while sending only visual state for other players', () => {
  const w = new World(MAPS.woods);
  const owner = createPlayer('owner', 'Owner'),
    other = createPlayer('other', 'Other');
  other.inventory = { fang: 999 };
  other.gold = 500;
  other.gear = Array.from({ length: 40 }, () => createCraftedGear('woods-sword'));
  other.quests = { 'mira-wolves': { progress: 14, claimed: false } };
  other.weapon = 'woods-sword';
  other.classId = 'knight';
  w.players.set(owner.id, owner);
  w.players.set(other.id, other);
  const full = w.snapshot(10000),
    privateView = w.snapshot(10000, owner.id),
    remote = privateView.players.find((p) => p.id === other.id)!;
  assert.deepEqual(
    privateView.players.find((p) => p.id === owner.id),
    owner,
  );
  assert.equal(remote.gear, undefined);
  assert.equal(remote.quests, undefined);
  assert.deepEqual(remote.inventory, {});
  assert.equal(remote.gold, 0);
  assert.equal(remote.weapon, other.weapon);
  assert.equal(remote.classId, 'knight');
  assert.equal(remote.x, other.x);
  assert.equal(other.inventory.fang, 999);
  assert.equal(other.gear.length, 40);
  assert.ok(JSON.stringify(privateView).length < JSON.stringify(full).length * 0.6);
});
