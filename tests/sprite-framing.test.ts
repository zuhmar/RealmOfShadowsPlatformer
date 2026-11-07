import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { guardAtlasSampling } from '../apps/web/src/atlas-sampling';

test('linear atlas sampling stays inside the pose without changing its drawing dimensions', () => {
  const calls: number[][] = [];
  const frame = {
    cutX: 10,
    cutY: 20,
    cutWidth: 30,
    cutHeight: 40,
    source: { width: 200, height: 100 },
    rotated: false,
    setUVs(...values: number[]) {
      calls.push(values);
    },
  };
  const texture = { frameTotal: 2, getFrameNames: () => ['idle-0'], get: () => frame };
  guardAtlasSampling(texture as any);
  guardAtlasSampling(texture as any);
  assert.deepEqual(calls, [[30, 40, 10.5 / 200, 20.5 / 100, 39.5 / 200, 59.5 / 100]]);
});

test('original Crystal sword jumps exclude the preceding walk row and preserve virtual placement', () => {
  const path = new URL(
    '../apps/web/public/assets/characters/armed/islands/crystal/citizen-male-sword.json',
    import.meta.url,
  );
  const atlas = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(atlas.meta.isolatedPoseBounds, true);
  for (const name of ['jump-0', 'jump-5']) {
    const f = atlas.frames[name];
    assert.ok(f.frame.y > 450, `${name} contains the preceding walk pose`);
    assert.deepEqual(f.sourceSize, { w: 384, h: 384 });
    assert.equal(f.frame.w, f.spriteSourceSize.w);
    assert.equal(f.frame.h, f.spriteSourceSize.h);
  }
});
