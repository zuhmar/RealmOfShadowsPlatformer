import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAPS } from '@ros/game-data';
import { World, createPlayer } from '@ros/shared';
test('playable-island fishing starts on its dock and faces the upper pool; remote starts leave state intact', () => {
  for (const id of ['woods', 'crystal', 'murkmire']) {
    const map = MAPS[id],
      world = new World(map),
      node = map.resources!.find((n) => n.skill === 'Fishing')!,
      p = createPlayer('angler', 'Angler', id);
    Object.assign(p, {
      level: 30,
      x: node.x + 73,
      y: node.y,
      grounded: true,
      platform: node.platform,
      facing: -1,
      gatheringSkills: { Fishing: { level: 30, xp: 0 } },
    });
    const before = structuredClone(p);
    assert.equal(world.startGathering(p, node.id, 10000), false);
    assert.deepEqual(p, before);
    p.x = node.x + 20;
    assert.equal(world.startGathering(p, node.id, 10000), true);
    assert.equal(p.x, node.x);
    assert.equal(p.facing, 1);
    assert.equal(p.gathering?.nodeId, node.id);
    assert.equal(p.gathering?.toolId, 'wood-rod');
    const deck = map.platforms.find((f) => f.id === node.platform)!;
    assert.ok(p.x > deck.x + deck.width * 0.2 && p.x < deck.x + deck.width * 0.45);
    const root = new URL(`../apps/web/public/assets/tilesets/traversal/${id}`, import.meta.url),
      atlas = JSON.parse(readFileSync(new URL(root + '.json'), 'utf8')),
      png = readFileSync(new URL(root + '.png'));
    assert.equal(atlas.meta.size.w, png.readUInt32BE(16));
    assert.equal(atlas.meta.size.h, png.readUInt32BE(20));
    for (const { frame: f } of Object.values(atlas.frames) as {
      frame: { x: number; y: number; w: number; h: number };
    }[])
      assert.ok(
        f.x >= 0 && f.y >= 0 && f.x + f.w <= atlas.meta.size.w && f.y + f.h <= atlas.meta.size.h,
      );
    assert.ok(atlas.meta.pond.waterSurface >= atlas.meta.pond.walkSurface);
    assert.ok(atlas.meta.pond.castX > 0.6);
    assert.ok(
      atlas.meta.ladder.rungStart + atlas.meta.ladder.rungHeight < atlas.frames.ladder.frame.h,
    );
  }
});
