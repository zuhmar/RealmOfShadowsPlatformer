import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '@ros/game-data';
import { World, createPlayer, autoInput } from '@ros/shared';
test('basic melee prioritizes the selected monster only among legal targets', () => {
  const world = new World(MAPS.woods),
    p = createPlayer('p', 'Clicker', 'woods');
  p.weapon = 'elderwood-blade';
  p.x = 500;
  p.y = 760;
  p.facing = 1;
  const first = world.wolves[0],
    selected = world.wolves[1];
  world.wolves = [first, selected];
  Object.assign(first, { x: 520, y: 760, hp: 100 });
  Object.assign(selected, { x: 540, y: 760, hp: 100 });
  p.targetId = selected.id;
  world.attack(p, false, 100000);
  assert.equal(first.hp, 100);
  assert.ok(selected.hp < 100);
  selected.x = 1800;
  const hp = selected.hp;
  world.attack(p, false, 102000);
  assert.equal(selected.hp, hp, 'clicking never bypasses attack reach');
  assert.ok(first.hp < 100);
});
test('a single-monster pursuit uses ladders and faces the selected target in attack range', () => {
  const world = new World(MAPS.woods),
    p = createPlayer('p', 'Clicker', 'woods');
  p.weapon = 'elderwood-blade';
  const target = world.wolves.find((w) => w.platform === 'moss')!;
  const route = autoInput(p, [target], MAPS.woods, 100000, []);
  assert.equal(route.attack, false);
  assert.ok(route.right || route.left || route.up || route.down);
  p.platform = target.platform;
  p.x = target.x + 20;
  p.y = target.y;
  const attack = autoInput(p, [target], MAPS.woods, 100000, []);
  assert.equal(attack.attack, true);
  assert.equal(p.facing, -1);
  assert.equal(p.targetId, target.id);
});
