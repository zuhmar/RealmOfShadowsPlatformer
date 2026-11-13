import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TOOL_MATERIALS, GATHERING_SKILLS } from '@ros/game-data';
test('all 40 gathering sheets contain integrated tools and 16 isolated, anchored poses', () => {
  for (const skin of ['base', 'knight', 'archer', 'mage', 'rogue'])
    for (const { id: material } of TOOL_MATERIALS) {
      const root = new URL(
        `../apps/web/public/assets/characters/gathering/baked/${skin}-${material}`,
        import.meta.url,
      );
      const atlas = JSON.parse(readFileSync(new URL(root + '.json'), 'utf8'));
      const png = readFileSync(new URL(root + '.png'));
      assert.equal(Object.keys(atlas.frames).length, 16);
      assert.equal(atlas.meta.size.w, png.readUInt32BE(16));
      assert.equal(atlas.meta.size.h, png.readUInt32BE(20));
      assert.equal(atlas.meta.equippedToolLayer, false);
      assert.equal(atlas.meta.skin, skin);
      assert.equal(atlas.meta.material, material);
      for (const [i, skill] of GATHERING_SKILLS.entries()) {
        const activity = skill.toLowerCase(),
          anim = atlas.meta.animations[activity];
        assert.equal(
          atlas.meta.integratedTools[activity],
          `${material}-${['pickaxe', 'axe', 'rod', 'sickle'][i]}`,
        );
        assert.equal(anim.repeat, -1);
        assert.equal(new Set(anim.frames).size, 4);
        for (const name of anim.frames) {
          const e = atlas.frames[name],
            f = e.frame,
            a = atlas.meta.anchors[name];
          assert.ok(
            f.x >= 0 &&
              f.y >= 0 &&
              f.x + f.w <= atlas.meta.size.w &&
              f.y + f.h <= atlas.meta.size.h,
          );
          assert.equal(a.foot.y, atlas.meta.sourceFrame.baseline);
          assert.equal(a.foot.x, atlas.meta.sourceFrame.width / 2);
          assert.ok(e.spriteSourceSize.x >= 0 && e.spriteSourceSize.y >= 0);
          if (activity === 'fishing') {
            assert.ok(a.rodTip.x >= 0 && a.rodTip.x <= atlas.meta.sourceFrame.width);
            assert.ok(a.rodTip.y >= 0 && a.rodTip.y <= atlas.meta.sourceFrame.height);
          }
        }
      }
    }
});
