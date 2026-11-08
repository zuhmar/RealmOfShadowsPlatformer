import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, STORY, QUESTS } from '@ros/game-data';
import { createPlayer, World, normalizeSkin } from '@ros/shared';
import { revealOrigin } from '../apps/server/src/story';
test('Celestial is the default and old saves migrate only appearance', () => {
  const p = createPlayer('p', 'Hero');
  assert.equal(p.skin, 'golden-test');
  p.skin = 'rogue';
  p.inventory = { fang: 12 };
  p.gold = 350;
  p.level = 15;
  const before = structuredClone(p);
  assert.equal(normalizeSkin(p), true);
  assert.deepEqual(p, { ...before, skin: 'golden-test' });
  assert.equal(normalizeSkin(p), false);
});
test('opening story and early quests do not disclose the origin or spell', () => {
  const opening = JSON.stringify({ STORY, QUESTS });
  assert.match(STORY.prologue, /trained|training/);
  assert.match(STORY.prologue, /Shadow Dragon/);
  for (const spoiler of [
    'taken from the Shadow',
    'stolen',
    'hidden Shadow nature',
    'enchantment gave',
    'bound you to goodness',
  ])
    assert.ok(!opening.includes(spoiler));
});
test('only authoritative Celestial Realm entry reveals origin, once, and keeps the white hero', () => {
  const p = createPlayer('p', 'Hero');
  p.level = 100;
  p.unlockedIslands = ['celestial'];
  for (const map of Object.values(MAPS)) assert.equal(revealOrigin(p, map), false);
  assert.equal(p.originRevelation, undefined);
  assert.equal(revealOrigin(p, { island: 'Celestial Realm' }), true);
  assert.match(p.originRevelation!.text, /taken from the Shadow people/);
  assert.match(p.originRevelation!.text, /protected you/);
  assert.equal(p.skin, 'golden-test');
  const saved = JSON.parse(JSON.stringify(p));
  assert.equal(revealOrigin(saved, { island: 'Celestial Realm' }), false);
  const world = new World(MAPS.woods);
  world.players.set(p.id, p);
  const other = createPlayer('other', 'Other');
  world.players.set(other.id, other);
  assert.equal(
    world.snapshot(1000, other.id).players.find((q) => q.id === p.id)?.originRevelation,
    undefined,
  );
  assert.ok(world.snapshot(1000, p.id).players.find((q) => q.id === p.id)?.originRevelation);
});
