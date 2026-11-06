import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CLASS_SKINS, validSkin } from '@ros/game-data';
import { createPlayer, chooseClass, playerAttributes } from '@ros/shared';
const root = new URL('../apps/web/public/assets/', import.meta.url);
test('all class skins have male/female animation atlases, headwear views, bounded frames and pose anchors', () => {
  const heads = JSON.parse(readFileSync(new URL('characters/skins/headwear.json', root), 'utf8'));
  assert.equal(Object.keys(heads.frames).length, 16);
  for (const skin of Object.keys(CLASS_SKINS))
    for (const appearance of ['male', 'female']) {
      const atlas = JSON.parse(
        readFileSync(new URL(`characters/skins/${appearance}-${skin}.json`, root), 'utf8'),
      );
      assert.equal(Object.keys(atlas.frames).length, 42);
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
        assert.ok(Number.isFinite(atlas.meta.anchors[name].head.x));
        assert.ok(Number.isFinite(atlas.meta.anchors[name].hand.y));
      }
      for (const angle of ['idle', 'climb', 'attack', 'death'])
        assert.ok(heads.frames[`${skin}-${angle}`]);
    }
});
test('class choice suggests a first skin without overwriting an explicit cosmetic; skin switches have no gameplay cost or attributes', () => {
  const p = createPlayer('p', 'Hero', 'crystal');
  p.quests = { 'crystal-class-trial': { claimed: true, progress: 90 } };
  p.gold = 1000;
  chooseClass(p, 'knight');
  assert.equal(p.skin, 'knight');
  const before = playerAttributes(p),
    gold = p.gold;
  for (const id of [null, ...Object.keys(CLASS_SKINS)]) {
    assert.ok(validSkin(id));
    p.skin = id as typeof p.skin;
    assert.deepEqual(playerAttributes(p), before);
    assert.equal(p.gold, gold);
  }
  p.skin = 'mage';
  chooseClass(p, 'rogue');
  assert.equal(p.skin, 'mage');
  assert.equal(p.classId, 'rogue');
  assert.equal(p.gold, 500);
  assert.equal(validSkin('dragon'), false);
  assert.equal(validSkin({ skin: 'mage' }), false);
});
