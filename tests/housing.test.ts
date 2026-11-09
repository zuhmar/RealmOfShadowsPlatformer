import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAPS,
  ALL_RECIPES,
  CARPENTRY_RECIPES,
  HOUSING_PLOTS,
  HOUSING_PLATFORM,
} from '@ros/game-data';
import {
  createPlayer,
  changeHousing,
  housingView,
  nearHousing,
  World,
  collectRecipe,
} from '@ros/shared';
function owner() {
  const p = createPlayer('owner', 'Owner', 'village');
  p.x = 900;
  p.y = 240;
  p.platform = 'housing';
  p.inventory = { 'oak-logs': 2000, 'oak-plank': 2000, 'iron-bar': 100 };
  p.unlockedRecipes = ALL_RECIPES.map((r) => r.id);
  return p;
}
test('housing uses the central reachable platform and all blueprints are hunting discoveries', () => {
  const m = MAPS.village;
  assert.ok(m.platforms.some((p) => p.id === 'housing' && p.x === HOUSING_PLATFORM.x));
  assert.ok(m.ladders.some((l) => l.to === 'housing' && l.from === 'terrace'));
  for (const id of [
    ...CARPENTRY_RECIPES.map((r) => r.id),
    ...Object.keys(HOUSING_PLOTS).map((id) => `house-${id}`),
  ])
    assert.equal(ALL_RECIPES.find((r) => r.id === id)?.tier, 'woods');
});
test('construction spends materials once per stage, upgrades preserve furniture and training persists', () => {
  const p = owner();
  changeHousing(p, { action: 'plot', id: 'small' });
  assert.equal(p.inventory['oak-plank'], 1980);
  for (let i = 0; i < 3; i++) changeHousing(p, { action: 'build' });
  assert.equal(p.housing?.stage, 3);
  assert.throws(() => changeHousing(p, { action: 'build' }));
  changeHousing(p, { action: 'craft', id: 'oak-table' });
  changeHousing(p, { action: 'place', id: 'oak-table', x: 0 });
  assert.equal(p.housing?.furniture.length, 1);
  const id = p.housing!.furniture[0].id;
  p.carpentry = { level: 1, xp: 0 };
  assert.throws(() => changeHousing(p, { action: 'plot', id: 'medium' }), /level 5/);
  p.carpentry = { level: 10, xp: 0 };
  changeHousing(p, { action: 'plot', id: 'medium' });
  changeHousing(p, { action: 'plot', id: 'large' });
  assert.equal(p.housing?.furniture[0].id, id);
  assert.equal(p.housing?.stage, 3);
  changeHousing(p, { action: 'remove', id });
  assert.equal(p.inventory['oak-table'], 1);
  assert.equal(p.housing?.furniture.length, 0);
  assert.ok(p.carpentry.xp > 0);
  assert.deepEqual(JSON.parse(JSON.stringify(p)).housing, p.housing);
});
test('rejects missing recipes, insufficient materials, unknown actions, invalid placement without spending', () => {
  const p = owner();
  p.unlockedRecipes = [];
  let before = structuredClone(p);
  assert.throws(() => changeHousing(p, { action: 'plot', id: 'small' }), /blueprint/);
  assert.deepEqual(p, before);
  collectRecipe(p, 'recipe:house-small');
  changeHousing(p, { action: 'plot', id: 'small' });
  p.inventory = {};
  before = structuredClone(p);
  assert.throws(() => changeHousing(p, { action: 'build' }), /materials/);
  assert.deepEqual(p, before);
  assert.throws(() => changeHousing(p, { action: 'craft', id: 'oak-table' }), /recipe/);
  assert.throws(() => changeHousing(p, { action: 'plot', id: '__proto__' }));
  p.housing!.stage = 3;
  p.inventory['oak-table'] = 2;
  for (const x of [NaN, Infinity, -1000, 1000, 0.5])
    assert.throws(() => changeHousing(p, { action: 'place', id: 'oak-table', x }));
  changeHousing(p, { action: 'place', id: 'oak-table', x: 0 });
  assert.throws(() => changeHousing(p, { action: 'place', id: 'oak-table', x: 20 }), /space/);
  assert.equal(p.inventory['oak-table'], 1);
  p.y = 650;
  assert.equal(nearHousing(p), false);
  assert.throws(
    () => changeHousing(p, { action: 'remove', id: p.housing!.furniture[0].id }),
    /platform/,
  );
});
test('houses and invites stay private, guests see only the invited house and revocation is immediate', () => {
  const p = owner(),
    guest = createPlayer('guest', 'Guest', 'village');
  changeHousing(p, { action: 'plot', id: 'small' });
  assert.equal(housingView(p, guest), undefined);
  changeHousing(p, { action: 'invite', id: guest.id });
  const view = housingView(p, guest)!;
  assert.equal(view.ownerId, p.id);
  assert.equal('invited' in view, false);
  view.stage = 3;
  assert.equal(p.housing?.stage, 0);
  const world = new World(MAPS.village);
  world.players.set(p.id, p);
  world.players.set(guest.id, guest);
  const visible = world.snapshot(1, guest.id).players.find((v) => v.id === p.id)!;
  for (const key of ['housing', 'housingView', 'housingRevision', 'carpentry'])
    assert.equal((visible as any)[key], undefined);
  changeHousing(p, { action: 'revoke', id: guest.id });
  assert.equal(housingView(p, guest), undefined);
  assert.ok(housingView(p, p));
});
