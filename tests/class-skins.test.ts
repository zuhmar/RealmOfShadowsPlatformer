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
        assert.equal(atlas.meta.framingVersion, 2);
        for (const entry of Object.values(atlas.frames) as any[]) {
          assert.equal(
            entry.spriteSourceSize.y + entry.frame.h,
            atlas.meta.sourceFrame.baseline,
            `${path}: feet must remain on the baseline across pose changes`,
          );
        }
        const idleHeight = Array.from(
          { length: 6 },
          (_, i) => atlas.frames[`idle-${i}`].frame.h,
        ).sort((a: number, b: number) => a - b);
        assert.ok(
          Math.abs(((idleHeight[2] + idleHeight[3]) / 2) * atlas.meta.sourceFrame.scale - 80) <
            0.01,
        );

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
  assert.equal(p.skin, 'golden-test');
  equipSkin(p, 'knight');
  assert.equal(p.skin, 'knight');
  assert.deepEqual(playerAttributes(p), before);
  assert.equal(p.gold, gold);
  chooseClass(p, 'rogue');
  assert.equal(p.skin, 'rogue');
  assert.equal(p.gold, 500);
  equipSkin(p, null);
  chooseClass(p, 'mage');
  assert.equal(p.skin, 'mage');
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
  assert.equal(p.skin, 'golden-test');
});

test('Crystal knight jump crops exclude the detached strips from the next row', () => {
  const atlas = JSON.parse(readFileSync(new URL('armed/crystal/female-knight.json', root), 'utf8'));
  for (const name of ['jump-2', 'jump-3']) {
    const f = atlas.frames[name].frame;
    assert.ok(f.y + f.h < 660, `${name} includes the neighboring helmet strip`);
  }
});

test('golden test figure is free for civilians and every class and preserves stats', () => {
  const p = createPlayer('test', 'Tester');
  const stats = playerAttributes(p);
  equipSkin(p, 'golden-test');
  assert.equal(p.skin, 'golden-test');
  assert.equal(normalizeSkin(p), false);
  assert.deepEqual(playerAttributes(p), stats);
  p.gold = 1000;
  p.quests = { 'crystal-class-trial': { progress: 1, claimed: true } };
  chooseClass(p, 'knight');
  equipSkin(p, 'golden-test');
  assert.equal(p.skin, 'golden-test');
  for (const cls of ['knight', 'archer', 'mage', 'rogue'] as const)
    assert.equal(canEquipSkin(cls, 'golden-test'), true);
  equipSkin(p, null);
  assert.equal(p.skin, 'golden-test');
});

test('golden figure atlas contains 36 contained frames and six playable clips without hurt', () => {
  const atlas = JSON.parse(readFileSync(new URL('../golden-test.json', root), 'utf8'));
  assert.equal(Object.keys(atlas.frames).length, 36);
  assert.deepEqual(Object.keys(atlas.meta.animations), [
    'idle',
    'walk',
    'jump',
    'climb',
    'attack',
    'death',
  ]);
  for (const [name, clip] of Object.entries(atlas.meta.animations) as [string, any][]) {
    assert.equal(clip.frames.length, 6);
    for (const id of clip.frames) {
      const f = atlas.frames[id];
      assert.ok(
        f.frame.x >= 0 &&
          f.frame.y >= 0 &&
          f.frame.x + f.frame.w <= atlas.meta.size.w &&
          f.frame.y + f.frame.h <= atlas.meta.size.h,
      );
      assert.equal(f.spriteSourceSize.y + f.frame.h, atlas.meta.sourceFrame.baseline);
      assert.ok(atlas.meta.anchors[id].hand);
    }
    assert.equal(clip.repeat, ['idle', 'walk', 'climb'].includes(name) ? -1 : 0);
  }
  assert.ok(atlas.meta.sourceFrame.scale > 0);
});
