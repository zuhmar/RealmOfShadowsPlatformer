import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1300, height: 850 } }),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await mkdir('artifacts', { recursive: true });
  await page.goto('http://localhost:5173');
  await page.evaluate(
    async (shared) => {
      const { mountGame } = await import('/src/game.ts'),
        { createPlayer } = await import(shared);
      const p = createPlayer('bench-preview', 'Artisan', 'village');
      p.x = 1100;
      p.y = 650;
      const host = document.createElement('div');
      Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 99999 });
      document.body.append(host);
      const calls = [],
        bridge = {
          id: p.id,
          held: {},
          send: (type, value) => calls.push({ type, value }),
          snapshot: { players: [p], wolves: [], drops: [], mapId: 'village', time: Date.now() },
        };
      window.benches = { host, bridge, calls, game: mountGame(host, bridge) };
    },
    '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
  );
  await page.waitForFunction(() => window.benches.host.getAttribute('aria-busy') === 'false');
  const stats = await page.evaluate(() => {
    const s = window.benches.game.scene.getScene('realm');
    return s.children.list
      .filter((n) => n.getData?.('craftingStation'))
      .map((n) => ({
        kind: n.getData('craftingStation'),
        texture: n.texture.key,
        frame: n.frame.name,
        feet: n.getBottomCenter().y,
        uniform: Math.abs(n.scaleX - n.scaleY) < 0.0001,
      }));
  });
  expect(stats.length).toBe(5);
  expect(stats.every((s) => s.texture === 'crafting-stations' && s.uniform)).toBe(true);
  expect(stats.find((s) => s.kind === 'carpentry').feet).toBe(240);
  expect(stats.filter((s) => s.kind !== 'carpentry').every((s) => s.feet === 650)).toBe(true);
  await page.evaluate(() => {
    const s = window.benches.game.scene.getScene('realm');
    s.cameras.main.centerOn(1050, 560);
    for (const id of ['smelting-interaction', 'blacksmithing-interaction'])
      s.children.getByName(id).emit('pointerdown');
    for (const id of ['cooking-station', 'alchemy-station', 'carpentry-station']) {
      const n = s.map.npcs.find((n) => n.id === id),
        zone = s.children.list.find((z) => z.type === 'Zone' && z.x === n.x && z.y === n.y - 45);
      if (!zone) throw new Error('Missing bench hitbox ' + id);
      zone.emit('pointerdown');
    }
  });
  expect(
    await page.evaluate(() =>
      window.benches.calls.filter((c) => c.type === 'interact').map((c) => c.value.npcId),
    ),
  ).toEqual(['bram', 'bram', 'cooking-station', 'alchemy-station', 'carpentry-station']);
  await page.screenshot({ path: 'artifacts/crafting-benches-village.png' });
  await page.evaluate(() =>
    window.benches.game.scene.getScene('realm').cameras.main.centerOn(620, 240),
  );
  await page.screenshot({ path: 'artifacts/carpentry-workbench.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() =>
    window.benches.game.scene.getScene('realm').cameras.main.centerOn(1100, 560),
  );
  await page.screenshot({ path: 'artifacts/crafting-benches-mobile.png' });
  expect(errors).toEqual([]);
  console.log(
    'PASS: five generated bench sprites, proportional scale, floor baselines, clickable forge/provision/carpentry targets, desktop/mobile.',
  );
} finally {
  await browser.close();
}
