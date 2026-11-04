import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('/assets/')) errors.push(`${r.status()} ${r.url()}`);
});
try {
  await page.goto('http://localhost:5173');
  for (const mapId of ['crystal', 'crystal-2', 'crystal-3', 'crystal-boss']) {
    await page.evaluate(
      async ({ shared, mapId }) => {
        window.crystalTest?.game.destroy(true);
        window.crystalTest?.host.remove();
        const { mountGame } = await import('/src/game.ts');
        const { World, createPlayer } = await import(shared);
        const { MAPS, maxHp } = await import(
          shared.replace('shared/src/index.ts', 'game-data/src/index.ts')
        );
        const world = new World(MAPS[mapId]);
        const p = createPlayer('hero', 'CrystalTester', mapId);
        Object.assign(p, {
          level: 20,
          hp: maxHp(20),
          weapon: 'crystal-staff',
          classId: 'mage',
          x: mapId === 'crystal-boss' ? 1300 : 800,
          y: 800,
        });
        world.players.set(p.id, p);
        const host = document.createElement('div');
        Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 999 });
        document.body.append(host);
        const bridge = {
          id: p.id,
          blocked: true,
          held: {},
          send: () => {},
          snapshot: world.snapshot(10000),
        };
        window.crystalTest = { host, world, p, bridge, game: mountGame(host, bridge) };
      },
      {
        shared: '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
        mapId,
      },
    );
    await page.waitForFunction(
      () => window.crystalTest?.host.getAttribute('aria-busy') === 'false',
    );
    await expect
      .poll(() => page.evaluate(() => window.crystalTest.game.scene.getScene('realm').wolves.size))
      .toBe(mapId === 'crystal-boss' ? 1 : 10);
    expect(
      await page.evaluate(() =>
        [...window.crystalTest.game.scene.getScene('realm').wolves.values()].every(
          (v) => v.sprite.texture.key === window.crystalTest.world.map.monster,
        ),
      ),
    ).toBe(true);
    await page.evaluate(() => {
      window.crystalTest.game.scene.getScene('realm').cameras.main.centerOn(1300, 620);
    });
    await page.screenshot({ path: `artifacts/${mapId}-desktop.png` });
    if (mapId === 'crystal') {
      expect(
        await page.evaluate(() =>
          window.crystalTest.game.scene
            .getScene('realm')
            .children.list.some((n) => n.name === 'cavern-mentor' && n.anims.isPlaying),
        ),
      ).toBe(true);
      expect(await page.evaluate(() => window.crystalTest.world.map.resources.length)).toBe(4);
    }
    if (mapId === 'crystal-3')
      expect(
        await page.evaluate(() =>
          window.crystalTest.game.scene
            .getScene('realm')
            .children.list.some(
              (n) => n.name === 'boss-entrance-prop' && n.getData('target') === 'crystal-boss',
            ),
        ),
      ).toBe(true);
    if (mapId === 'crystal-boss') {
      await page.evaluate(() => {
        const t = window.crystalTest;
        const boss = t.world.wolves[0];
        boss.nextSpecialAt = 10000;
        t.world.step(0.02, 10000, new Map());
        t.bridge.snapshot = t.world.snapshot(10000);
      });
      await page.waitForFunction(() =>
        window.crystalTest.game.scene
          .getScene('realm')
          .children.list.some(
            (n) => n.name === 'boss-danger-label' && n.text.includes('CRYSTAL ERUPTION'),
          ),
      );
      await page.screenshot({ path: 'artifacts/crystal-wyrm-warning.png' });
      const outcome = await page.evaluate(() => {
        const t = window.crystalTest,
          boss = t.world.wolves[0],
          zone = boss.special;
        t.p.x = zone.x;
        t.p.y = zone.y;
        const before = t.p.hp;
        t.world.resolveBossSpecial(boss, zone.impactAt);
        t.bridge.snapshot = t.world.snapshot(zone.impactAt);
        const scene = t.game.scene.getScene('realm');
        for (const e of t.world.events) scene.events.emit('float', e);
        return { damage: before - t.p.hp, slam: boss.lastSlamAt };
      });
      expect(outcome.damage).toBe(192);
      expect(outcome.slam).toBe(11800);
      await page.waitForTimeout(100);
      await page.screenshot({ path: 'artifacts/crystal-wyrm-eruption.png' });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    await page.screenshot({ path: `artifacts/${mapId}-mobile.png` });
    await page.setViewportSize({ width: 1200, height: 800 });
  }
  expect(errors).toEqual([]);
  console.log(
    'PASS: four Crystal maps, 10/10/10/1 animated monsters, mentor, gathering nodes, upper key prop, doubled Wyrm and animated damaging eruption on desktop/mobile.',
  );
} finally {
  await browser.close();
}
