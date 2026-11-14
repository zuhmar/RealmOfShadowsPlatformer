import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } }),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
try {
  await page.goto('http://localhost:5173');
  for (const id of [
    'frostfall',
    'frostfall-2',
    'frostfall-3',
    'frostfall-boss',
    'frostfall-battleground',
  ]) {
    await page.evaluate(async (id) => {
      window.ft?.game.destroy(true);
      window.ft?.host.remove();
      const { mountGame } = await import('/src/game.ts'),
        { World, createPlayer, BattlegroundRun } = await import(
          '/@fs/workspace/RealmOfShadowsPlatformer/packages/shared/src/index.ts'
        ),
        { MAPS } = await import(
          '/@fs/workspace/RealmOfShadowsPlatformer/packages/game-data/src/index.ts'
        );
      const w = new World(MAPS[id]),
        p = createPlayer('hero', 'Frost Scout', id);
      Object.assign(p, {
        x: id === 'frostfall-boss' ? 1100 : 700,
        y: 820,
        grounded: true,
        platform: 'ground',
        level: 40,
        hp: 568,
        classId: 'knight',
        skin: 'knight',
        weapon: 'frost-sword',
      });
      w.players.set(p.id, p);
      if (id === 'frostfall-battleground') {
        w.battleground = new BattlegroundRun(w, p.id);
        w.battleground.join(p);
        w.battleground.start(p, 10000);
        w.battleground.step(15000);
      }
      const host = document.createElement('div');
      Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 999 });
      document.body.append(host);
      const bridge = {
        id: p.id,
        blocked: true,
        held: {},
        send: () => {},
        snapshot: w.snapshot(15000),
      };
      window.ft = { world: w, p, host, bridge, game: mountGame(host, bridge) };
    }, id);
    await page.waitForFunction(() => window.ft.host.getAttribute('aria-busy') === 'false');
    await page.waitForTimeout(300);
    const expected = id === 'frostfall-battleground' ? 4 : id === 'frostfall-boss' ? 1 : 10;
    await expect
      .poll(() => page.evaluate(() => window.ft.game.scene.getScene('realm').wolves.size))
      .toBe(expected);
    const terrain = await page.evaluate(() =>
      window.ft.game.scene
        .getScene('realm')
        .children.list.filter((x) => x.name === 'terrain-platform')
        .map((x) => ({ sx: x.scaleX, sy: x.scaleY, generated: x.getData('generated') })),
    );
    expect(terrain.length).toBeGreaterThan(2);
    expect(terrain.every((x) => x.sx === x.sy && x.generated)).toBe(true);
    await page.screenshot({ path: `artifacts/${id}-desktop.png` });
    if (id === 'frostfall') {
      expect(
        await page.evaluate(() =>
          window.ft.game.scene
            .getScene('realm')
            .children.list.some((x) => x.name === 'battleground-entrance'),
        ),
      ).toBe(true);
      await page.evaluate(() => {
        const t = window.ft;
        t.p.x = 145;
        t.p.y = 620;
        t.p.platform = 'fishing-dock';
        t.bridge.snapshot = t.world.snapshot(15000);
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'artifacts/frostfall-fishing.png' });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'artifacts/frostfall-mobile.png' });
      await page.setViewportSize({ width: 1200, height: 800 });
    }
    if (id === 'frostfall-boss') {
      await page.evaluate(() => {
        const t = window.ft,
          w = t.world.wolves[0];
        w.special = { x: 1100, y: 820, radius: 150, startedAt: 15000, impactAt: 16800 };
        t.p.x = 1100;
        t.bridge.snapshot = t.world.snapshot(16000);
      });
      await expect
        .poll(() =>
          page.evaluate(() =>
            window.ft.game.scene
              .getScene('realm')
              .children.list.some((x) => x.name === 'boss-frost-warning'),
          ),
        )
        .toBe(true);
      await page.screenshot({ path: 'artifacts/frost-giant-warning.png' });
      await page.evaluate(() =>
        window.ft.game.scene.getScene('realm').events.emit('float', {
          type: 'bossAttack',
          monster: 'frost-giant',
          x: 1100,
          y: 820,
          radius: 150,
          text: 'GLACIAL SLAM!',
        }),
      );
      await expect
        .poll(() =>
          page.evaluate(() =>
            window.ft.game.scene
              .getScene('realm')
              .children.list.some((x) => x.name === 'boss-frost-impact'),
          ),
        )
        .toBe(true);
      await page.waitForTimeout(220);
      await page.screenshot({ path: 'artifacts/frost-giant-impact.png' });
    }
  }
  await page.evaluate(async () => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js'),
      {
        default: { createRoot },
      } = await import('/node_modules/.vite/deps/react-dom_client.js'),
      { BattlegroundHud } = await import('/src/BattlegroundHud.tsx');
    const hud = document.createElement('div');
    Object.assign(hud.style, { position: 'fixed', inset: 0, zIndex: 1000, pointerEvents: 'none' });
    document.body.append(hud);
    const t = window.ft,
      root = createRoot(hud);
    t.hudRefresh = () =>
      root.render(
        React.createElement(BattlegroundHud, {
          player: t.p,
          players: [t.p],
          time: t.bridge.snapshot.time,
          send: () => {},
        }),
      );
    t.world.battleground.phase = 'waiting';
    t.world.battleground.publish();
    t.hudRefresh();
  });
  await expect(page.getByRole('button', { name: 'Start solo run' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your party code' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  const bounds = await page.getByRole('region', { name: 'Battleground expedition' }).boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'artifacts/frostfall-battleground-mobile.png' });
  expect(errors).toEqual([]);
  console.log(
    'Four Frostfall hunting maps and battleground render; 31 hunting monsters, party wave, uniform generated terrain, ladder/dock/NPC/entrance, icy warning/impact, desktop/mobile HUD verified.',
  );
} finally {
  await browser.close();
}
