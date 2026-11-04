import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { EQUIPMENT_TIERS } from '@ros/game-data';
const root = new URL('../apps/web/public/assets/characters/armed/', import.meta.url);
test('all 28 island weapons have distinct male and female transparent animation atlases', () => {
  const hashes = new Set<string>();
  for (const tier of EQUIPMENT_TIERS)
    for (const appearance of ['male', 'female'])
      for (const weapon of ['sword', 'bow', 'staff', 'dagger']) {
        const path = `islands/${tier.id}/citizen-${appearance}-${weapon}`;
        const png = readFileSync(new URL(`${path}.png`, root));
        assert.equal(png.subarray(1, 4).toString(), 'PNG');
        const w = png.readUInt32BE(16),
          h = png.readUInt32BE(20);
        assert.equal(png[25], 6, `${path}: RGBA required`);
        const hash = createHash('sha256').update(png).digest('hex');
        assert.ok(!hashes.has(hash), `${path}: must not alias another weapon sheet`);
        hashes.add(hash);
        const atlas = JSON.parse(readFileSync(new URL(`${path}.json`, root), 'utf8'));
        assert.equal(atlas.meta.size.w, w);
        assert.equal(atlas.meta.size.h, h);
        for (const clip of ['idle', 'walk', 'jump', 'climb', 'attack', 'death'])
          for (let i = 0; i < 6; i++) {
            const entry = atlas.frames[`${clip}-${i}`],
              f = entry?.frame;
            assert.ok(
              f && f.x >= 0 && f.y >= 0 && f.w > 0 && f.h > 0 && f.x + f.w <= w && f.y + f.h <= h,
              `${path}: ${clip}-${i}`,
            );
            assert.deepEqual(entry.sourceSize, { w: 384, h: 384 });
            assert.ok(entry.spriteSourceSize.x >= 0 && entry.spriteSourceSize.y >= 0);
            assert.ok(
              entry.spriteSourceSize.x + f.w <= 384 && entry.spriteSourceSize.y + f.h <= 384,
            );
          }
      }
  assert.equal(hashes.size, 56);
});
