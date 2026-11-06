import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CLASS_SKINS, validSkin, canEquipSkin } from '@ros/game-data';
import { createPlayer, chooseClass, playerAttributes, equipSkin, normalizeSkin } from '@ros/shared';
const root = new URL('../apps/web/public/assets/characters/skins/integrated/', import.meta.url);
test('every class has integrated headwear in both unarmed bodies and starter/Woods/Crystal weapon sheets', () => {
  for (const skin of Object.keys(CLASS_SKINS))
    for (const appearance of ['male', 'female'])
      for (const tier of [null, 'starter', 'woods', 'crystal']) {
        const path = `${tier ? `armed/${tier}/` : ''}${appearance}-${skin}`;
        const atlas = JSON.parse(readFileSync(new URL(`${path}.json`, root), 'utf8'));
        assert.equal(Object.keys(atlas.frames).length, tier ? 30 : 42);
        assert.equal(atlas.meta.integratedHeadwear, true);
        assert.ok(atlas.meta.sourceFrame.scale > 0);
        assert.ok(atlas.meta.sourceFrame.baseline < atlas.meta.sourceFrame.height);
        if (tier) assert.deepEqual(atlas.meta.integratedWeapon, { skin, tier });
        else assert.equal(atlas.meta.integratedWeapon, null);
        for (const [name, entry] of Object.entries(atlas.frames) as [
          string,
          { frame: { x: number; y: number; w: number; h: number } },
        ][]) {
          const f = entry.frame;
          assert.ok(
            f.x >= 0 &&
              f.y >= 0 &&
              f.w > 0 &&
              f.h > 0 &&
              f.x + f.w <= atlas.meta.size.w &&
              f.y + f.h <= atlas.meta.size.h,
          );
          assert.ok(Number.isFinite(atlas.meta.anchors[name].hand.x));
        }
        for (const name of Object.keys(atlas.meta.animations)) {
          for (let i = 0; i < 5; i++) {
            const left = atlas.frames[`${name}-${i}`].frame,
              right = atlas.frames[`${name}-${i + 1}`].frame;
            assert.ok(
              left.x + left.w < right.x,
              `${path}:${name}-${i} must not touch the next pose`,
            );
          }
        }
        const png = readFileSync(new URL(`${path}.png`, root));
        assert.equal(png[25], 6, 'True-alpha PNG required');
        assert.equal(atlas.meta.animations.hurt, undefined);
        assert.equal(!!atlas.meta.animations.climb, !tier);
      }
});
test('class skins require the matching class and switching to an allowed look is free and cosmetic', () => {
  const p = createPlayer('p', 'Hero', 'crystal');
  p.quests = { 'crystal-class-trial': { claimed: true, progress: 90 } };
  p.gold = 1000;
  for (const id of Object.keys(CLASS_SKINS)) assert.equal(canEquipSkin(undefined, id), false);
  chooseClass(p, 'knight');
  assert.equal(p.skin, 'knight');
  const before = playerAttributes(p),
    gold = p.gold;
  for (const id of Object.keys(CLASS_SKINS)) {
    assert.equal(canEquipSkin(p.classId, id), id === p.classId);
    if (id !== p.classId) assert.throws(() => equipSkin(p, id), /matching class/);
  }
  equipSkin(p, null);
  assert.equal(p.skin, null);
  equipSkin(p, 'knight');
  assert.equal(p.skin, 'knight');
  assert.deepEqual(playerAttributes(p), before);
  assert.equal(p.gold, gold);
  chooseClass(p, 'rogue');
  assert.equal(p.skin, 'rogue');
  assert.equal(p.gold, 500);
  equipSkin(p, null);
  chooseClass(p, 'mage');
  assert.equal(p.skin, null);
  assert.equal(p.gold, 0);
  assert.equal(validSkin('dragon'), false);
  assert.equal(canEquipSkin(p.classId, { skin: 'mage' }), false);
});
test('previously unrestricted saved class skins migrate without affecting gold, training or equipment', () => {
  const p = createPlayer('p', 'Hero', 'crystal');
  p.classId = 'knight';
  p.skin = 'mage';
  p.gold = 420;
  const before = playerAttributes(p);
  assert.equal(normalizeSkin(p), true);
  assert.equal(p.skin, 'knight');
  assert.equal(p.gold, 420);
  assert.deepEqual(playerAttributes(p), before);
  assert.equal(normalizeSkin(p), false);
  delete p.classId;
  p.skin = 'rogue';
  assert.equal(normalizeSkin(p), true);
  assert.equal(p.skin, null);
});
