import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GATHERING_TOOLS, TOOL_MATERIALS, GATHERING_SKILLS } from '@ros/game-data';
test('all five current skins have isolated gathering frames, stable baselines and hand anchors; all tools have held artwork', () => {
  for (const skin of ['base', 'knight', 'archer', 'mage', 'rogue']) {
    const root = new URL(
        `../apps/web/public/assets/characters/gathering/skins/${skin}`,
        import.meta.url,
      ),
      atlas = JSON.parse(readFileSync(new URL(root + '.json'), 'utf8')),
      png = readFileSync(new URL(root + '.png'));
    assert.equal(Object.keys(atlas.frames).length, 16);
    assert.equal(atlas.meta.size.w, png.readUInt32BE(16));
    assert.equal(atlas.meta.size.h, png.readUInt32BE(20));
    for (const activity of GATHERING_SKILLS.map((s) => s.toLowerCase())) {
      const anim = atlas.meta.animations[activity];
      assert.ok(anim && anim.repeat === -1);
      for (const name of anim.frames) {
        const e = atlas.frames[name],
          f = e.frame,
          a = atlas.meta.anchors[name];
        assert.ok(
          f.x >= 0 && f.y >= 0 && f.x + f.w <= atlas.meta.size.w && f.y + f.h <= atlas.meta.size.h,
        );
        assert.equal(e.spriteSourceSize.y + f.h, atlas.meta.sourceFrame.baseline);
        assert.ok(a.hand.x >= e.spriteSourceSize.x && a.hand.x <= e.spriteSourceSize.x + f.w);
        assert.ok(a.hand.y >= e.spriteSourceSize.y && a.hand.y <= e.spriteSourceSize.y + f.h);
      }
    }
  }
  const tools = JSON.parse(
    readFileSync(
      new URL('../apps/web/public/assets/equipment/gathering-held-tools.json', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(Object.keys(tools.frames).length, 32);
  assert.equal(TOOL_MATERIALS.length, 8);
  for (const tool of GATHERING_TOOLS) {
    const f = tools.frames[tool.id].frame,
      g = tools.meta.grips[tool.id];
    assert.ok(
      f.x >= 0 && f.y >= 0 && f.x + f.w <= tools.meta.size.w && f.y + f.h <= tools.meta.size.h,
    );
    assert.ok(g.x >= 0 && g.x < f.w && g.y >= 0 && g.y < f.h);
    assert.ok(g.worldHeight > 0);
  }
});
