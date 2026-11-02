import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAPS } from '@ros/game-data';
import {
  WOODS_PROPS,
  WOODS_PLATFORM_FRAMES,
  platformArtwork,
  backgroundArtwork,
} from '../apps/web/src/woods-layout';
const root = new URL('../apps/web/public/assets/', import.meta.url);
const atlas = JSON.parse(
  readFileSync(new URL('tilesets/whispering-woods-platforms.json', root), 'utf8'),
);
const manifest = JSON.parse(readFileSync(new URL('maps/whispering-woods-art.json', root), 'utf8'));
test('every painted walking surface aligns with the authoritative platform and ground covers the bottom', () => {
  for (const platform of MAPS.woods.platforms) {
    const name = WOODS_PLATFORM_FRAMES[platform.id],
      frame = atlas.frames[name].frame,
      surface = manifest.atlases.platforms.alignmentHints[name].surfaceY;
    const art = platformArtwork(platform, MAPS.woods, { width: frame.w, height: frame.h }, surface);
    assert.ok(Math.abs(art.y + (surface * art.height) / frame.h - platform.y) < 0.001);
    assert.equal(art.x, platform.x);
    assert.equal(art.width, platform.width);
    if (!platform.oneWay) assert.ok(art.y + art.height > MAPS.woods.height);
  }
});
test('forest panorama covers desktop/mobile viewports at map edges and all zoom levels without stretching', () => {
  for (const [width, height] of [
    [390, 844],
    [1440, 600],
    [844, 390],
  ])
    for (const zoom of [0.85, 1, 1.05])
      for (const x of [0, 1000, 2400 - width])
        for (const y of [0, 350, 760]) {
          const view = { x, y, width: width / zoom, height: height / zoom };
          const image = backgroundArtwork(view, MAPS.woods, { width: 1536, height: 1024 });
          assert.ok(image.x - image.width / 2 <= view.x);
          assert.ok(image.x + image.width / 2 >= view.x + view.width);
          assert.ok(image.y - image.height / 2 <= view.y);
          assert.ok(image.y + image.height / 2 >= view.y + view.height);
          assert.ok(Math.abs(image.width / image.height - 1.5) < 0.00001);
        }
});
test('all twelve named props are placed within their supporting platforms', () => {
  const props = JSON.parse(
    readFileSync(new URL('props/whispering-woods-props.json', root), 'utf8'),
  );
  assert.equal(new Set(WOODS_PROPS.map((p) => p.frame)).size, 12);
  for (const prop of WOODS_PROPS) {
    const p = MAPS.woods.platforms.find((p) => p.id === prop.platform);
    assert.ok(p);
    const frame = props.frames[prop.frame].frame;
    const halfWidth = (prop.height * frame.w) / frame.h / 2;
    assert.ok(prop.offset - halfWidth > 0);
    assert.ok(prop.offset + halfWidth < p.width);
  }
});
