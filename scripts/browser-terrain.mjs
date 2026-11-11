import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } }),
  errors = [],
  report = [];
page.on('pageerror', (e) => {
  errors.push(e.message);
  console.log(e.stack);
});
page.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('/assets/')) errors.push(`${r.status()} ${r.url()}`);
});
try {
  await mkdir('artifacts', { recursive: true });
  await page.goto('http://localhost:5173');
  await page.evaluate(
    async (shared) => {
      const { mountGame } = await import('/src/game.ts');
      const { World, createPlayer } = await import(shared);
      const { MAPS } = await import(
        shared.replace('shared/src/index.ts', 'game-data/src/index.ts')
      );
      const snapshot = (id) => {
        const w = new World(MAPS[id]),
          l = MAPS[id].ladders[0];
        const p = Object.assign(createPlayer('hero', 'Hero', id), {
          level: 30,
          classId: 'knight',
          skin: 'knight',
          weapon: 'woods-sword',
          x: l?.x ?? 300,
          y: l?.bottom ?? MAPS[id].spawn.y,
          grounded: true,
        });
        w.players.set(p.id, p);
        return w.snapshot(Date.now());
      };
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;inset:0;z-index:99999';
      document.body.append(host);
      const bridge = {
        id: 'hero',
        held: {},
        blocked: true,
        send: () => {},
        snapshot: snapshot('village'),
      };
      window.terrainTest = { host, bridge, snapshot, game: mountGame(host, bridge) };
    },
    '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
  );
  for (const id of [
    'village',
    'woods',
    'woods-2',
    'woods-3',
    'woods-boss',
    'crystal',
    'crystal-2',
    'crystal-3',
    'crystal-boss',
  ]) {
    console.log('Reviewing', id);
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.evaluate((id) => {
      const t = window.terrainTest;
      t.bridge.snapshot = t.snapshot(id);
    }, id);
    await page.waitForFunction(
      (id) => {
        const t = window.terrainTest,
          s = t.game.scene.getScene('realm');
        return (
          s?.map?.id === id &&
          s.characters.size === 1 &&
          t.host.getAttribute('aria-busy') === 'false'
        );
      },
      id,
      { timeout: 45000 },
    );
    const state = await page.evaluate(() => {
      const t = window.terrainTest,
        s = t.game.scene.getScene('realm'),
        art = s.woods ?? s.crystal ?? s.village;
      s.cameras.main.stopFollow();
      const update = s.sys.sceneUpdate;
      s.sys.sceneUpdate = (time, delta) => {
        update.call(s, time, delta);
        const view = s.reviewCamera;
        if (view && s.sys.isActive()) s.cameras.main.setZoom(view.zoom).centerOn(view.x, view.y);
      };
      return {
        map: s.map.id,
        platforms: art.platforms.map((p) => ({
          id: p.getData('platformId'),
          x: p.x,
          y: p.y,
          width: p.getData('terrainWidth'),
          surface: p.getData('surfaceY'),
          continuous: p.getData('continuous'),
          generated: p.getData('generated'),
          rasterDensity: p.getData('rasterDensity'),
          rasterWidth: p.texture.getSourceImage().width,
          sourceAtlas: p.getData('sourceAtlas'),
          textureKey: p.texture.key,
          wholeSpan: p.getData('wholeSpan'),
          joinY: p.getData('surfaceJoinY'),
          boundsWidth: p.getBounds().width,
          scaleX: p.scaleX,
          scaleY: p.scaleY,
        })),
        ladders: art.ladders.map((l) => ({
          x: l.x,
          top: l.getData('top'),
          bottom: l.getData('bottom'),
          railTop: l.getData('railTop'),
          railBottom: l.getData('railBottom'),
          continuous: l.getData('continuous'),
          generated: l.getData('generated'),
        })),
        soilJoin: s.children.getByName('terrain-soil')?.getData('surfaceJoinY'),
        expected: s.map.platforms,
        expectedLadders: s.map.ladders,
        bodies: s.floor.getChildren().length,
      };
    });
    expect(state.platforms.length).toBe(state.expected.length);
    expect(state.bodies).toBe(state.expected.length);
    expect(state.ladders.length).toBe(state.expectedLadders.length);
    for (const p of state.platforms) {
      const c = state.expected.find((c) => c.id === p.id);
      expect(p.continuous).toBe(true);
      if (id === 'village' || id.startsWith('woods')) {
        expect(p.generated).toBe(true);
        const theme = id === 'village' ? 'village' : 'woods';
        expect(p.sourceAtlas).toBe(
          c.id === 'fishing-dock' ? `${theme}-terrain-art` : `${theme}-platform-spans`,
        );
        if (c.oneWay) {
          expect(p.wholeSpan).toBe(true);
          expect(p.textureKey).toBe(p.sourceAtlas);
          expect(p.boundsWidth).toBeCloseTo(c.width, 4);
        } else expect(p.joinY).toBe(state.soilJoin);
      }
      expect(p.x).toBe(c.x);
      expect(p.surface).toBe(c.y);
      expect(p.width).toBe(c.width);
      expect(p.scaleX).toBeCloseTo(1 / (p.rasterDensity ?? 1), 8);
      expect(p.scaleY).toBe(p.scaleX);
      if (p.generated) {
        expect(p.rasterDensity).toBeGreaterThan(1);
        expect(p.rasterWidth).toBeLessThanOrEqual(4096);
      }
    }
    for (const [i, l] of state.ladders.entries()) {
      const c = state.expectedLadders[i];
      expect(l.continuous).toBe(true);
      if (id === 'village' || id.startsWith('woods')) expect(l.generated).toBe(true);
      expect(l.x).toBe(c.x);
      expect(l.top).toBe(c.top);
      expect(l.bottom).toBe(c.bottom);
      expect(l.railTop).toBeLessThan(l.top);
      expect(l.railBottom).toBeGreaterThan(l.bottom);
    }
    await page.evaluate(() => {
      const s = window.terrainTest.game.scene.getScene('realm');
      s.reviewCamera = {
        zoom: Math.min(1400 / s.map.width, 900 / s.map.height) * 0.93,
        x: s.map.width / 2,
        y: s.map.height / 2,
      };
    });
    await page.waitForTimeout(80);
    await page.screenshot({ path: `artifacts/terrain-${id}-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      const s = window.terrainTest.game.scene.getScene('realm'),
        l = s.map.ladders[0];
      s.reviewCamera = { zoom: 0.85, x: l?.x ?? 500, y: l ? (l.top + l.bottom) / 2 : 600 };
    });
    await page.waitForTimeout(100);
    await page.screenshot({ path: `artifacts/terrain-${id}-mobile.png` });
    report.push({
      map: id,
      platforms: state.platforms.length,
      ladders: state.ladders.length,
      colliders: state.bodies,
    });
  }
  expect(errors).toEqual([]);
  await writeFile('artifacts/terrain-review.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(
    'PASS: all nine maps have one continuous world-scale platform per collider and one connected full-height ladder per route; desktop/mobile screenshots recorded.',
  );
} catch (e) {
  console.log('ORIGINAL ERROR', e.stack);
  console.log(
    'STATE',
    await page.evaluate(() => {
      const t = window.terrainTest,
        s = t.game.scene.getScene('realm');
      return {
        map: s?.map?.id,
        active: s?.sys?.isActive(),
        status: s?.sys?.settings.status,
        busy: t.host.getAttribute('aria-busy'),
        snapshot: t.bridge.snapshot?.mapId,
        actors: s?.characters?.size,
      };
    }),
  );
  throw e;
} finally {
  await browser.close();
}
