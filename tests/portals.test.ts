import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PORTAL_THEMES, ISLANDS, MAPS, portalThemeFor } from '@ros/game-data';
const root = new URL('../apps/web/public/assets/effects/island-portals/', import.meta.url);
test('every island has its own destination theme; purple is reserved for Shadow Fortress', () => {
  assert.deepEqual(
    PORTAL_THEMES,
    ISLANDS.map((i) => i.id),
  );
  for (const theme of PORTAL_THEMES) {
    assert.equal(portalThemeFor('village', theme), theme);
    assert.equal(portalThemeFor(theme, 'village'), theme);
  }
  assert.equal(portalThemeFor('fortress', 'woods'), 'woods');
  assert.equal(portalThemeFor('village', 'unknown'), 'woods');
  for (const map of Object.values(MAPS))
    for (const p of map.portals) assert.equal(portalThemeFor(map.id, p.target), 'woods');
});
test('all seven portal sheets have eight bounded frames and measured anchors', () => {
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));
  for (const theme of PORTAL_THEMES) {
    const png = readFileSync(new URL(`${theme}.png`, root));
    const width = png.readUInt32BE(16),
      height = png.readUInt32BE(20);
    assert.equal(png[25], 6, 'RGBA sprite sheet required');
    const atlas = JSON.parse(readFileSync(new URL(`${theme}.json`, root), 'utf8'));
    assert.equal(Object.keys(atlas.frames).length, 8);
    assert.equal(manifest[theme].origins.length, 8);
    for (let i = 0; i < 8; i++) {
      const f = atlas.frames[`idle-${i}`].frame;
      assert.ok(f.x >= 0 && f.y >= 0 && f.x + f.w <= width && f.y + f.h <= height);
      const origin = manifest[theme].origins[i];
      assert.ok(origin.x > 0 && origin.x < 1 && origin.y > 0.7 && origin.y <= 1);
    }
  }
});
