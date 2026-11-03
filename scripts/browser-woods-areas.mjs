import { chromium, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://realm:realm@localhost:5432/realm',
  }),
});
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 750 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('/assets/')) errors.push(`${r.status()} ${r.url()}`);
});
let userId;
try {
  for (const [mapId, monster] of [
    ['woods-2', 'thorn-spider'],
    ['woods-3', 'wild-boar'],
    ['woods-boss', 'forest-bear'],
  ]) {
    await page.goto('http://localhost:5173');
    await page.evaluate(
      async ({ mapId, shared }) => {
        const { mountGame } = await import('/src/game.ts');
        const { World } = await import(shared);
        const data = await import(shared.replace('shared/src/index.ts', 'game-data/src/index.ts'));
        const world = new World(data.MAPS[mapId]);
        const host = document.createElement('div');
        Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 999 });
        document.body.appendChild(host);
        const bridge = {
          id: 'test',
          held: {},
          send: () => {},
          snapshot: {
            mapId,
            players: [],
            wolves: world.wolves,
            drops: [],
            projectiles: [],
            time: Date.now(),
          },
        };
        window.areaTest = { host, bridge, game: mountGame(host, bridge), frames: [] };
      },
      {
        mapId,
        shared: '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
      },
    );
    await page.waitForFunction(() => window.areaTest.host.getAttribute('aria-busy') === 'false');
    await expect
      .poll(() => page.evaluate(() => window.areaTest.game.scene.getScene('realm').wolves.size))
      .toBeGreaterThan(0);
    await page.evaluate(() => {
      const t = window.areaTest,
        s = t.game.scene.getScene('realm');
      s.sys.sceneUpdate = () => s.woods?.refresh();
      const v = [...s.wolves.values()][0];
      s.cameras.main.centerOn(v.container.x, 620);
      s.time.addEvent({
        delay: 25,
        loop: true,
        callback: () => t.frames.push(v.sprite.frame.name),
      });
    });
    for (const clip of ['idle', 'walk', 'attack', 'death']) {
      await page.evaluate(
        ({ monster, clip }) => {
          const t = window.areaTest,
            v = [...t.game.scene.getScene('realm').wolves.values()][0];
          t.frames = [];
          v.sprite.play(`${monster}-${clip}`);
        },
        { monster, clip },
      );
      await expect
        .poll(() => page.evaluate(() => new Set(window.areaTest.frames).size), { timeout: 4000 })
        .toBe(4);
    }
    await page.evaluate((monster) => {
      const s = window.areaTest.game.scene.getScene('realm');
      [...s.wolves.values()][0].sprite.play(`${monster}-idle`);
    }, monster);
    const backdrop = await page.evaluate(() => {
      const s = window.areaTest.game.scene.getScene('realm'),
        b = s.woods.background.getBounds(),
        v = s.cameras.main.worldView;
      return {
        left: b.left,
        right: b.right,
        top: b.top,
        bottom: b.bottom,
        viewLeft: v.left,
        viewRight: v.right,
        viewTop: v.top,
        viewBottom: v.bottom,
      };
    });
    expect(backdrop.left).toBeLessThanOrEqual(backdrop.viewLeft);
    expect(backdrop.right).toBeGreaterThanOrEqual(backdrop.viewRight);
    expect(backdrop.top).toBeLessThanOrEqual(backdrop.viewTop);
    expect(backdrop.bottom).toBeGreaterThanOrEqual(backdrop.viewBottom);
    await page.screenshot({ path: `artifacts/${mapId}-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `artifacts/${mapId}-mobile.png` });
    await page.setViewportSize({ width: 1100, height: 750 });
  }
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: 'Play as guest' }).click();
  await page
    .getByRole('button', { name: /A story unwritten/ })
    .first()
    .click();
  await page.getByLabel('Character name', { exact: true }).fill('AreaTester');
  await page.getByRole('button', { name: 'Create adventurer' }).click();
  const token = await page.evaluate(() => localStorage.getItem('ros-session'));
  const result = await fetch('http://localhost:2567/api/characters', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const c = result.characters[0];
  userId = c.userId;
  await db.character.update({
    where: { id: c.id },
    data: {
      data: {
        ...c.data,
        mapId: 'woods',
        x: 2300,
        y: 760,
        platform: 'ground',
        grounded: true,
        level: 50,
        hp: 1000,
        weapon: 'elderwood-blade',
        inventory: { 'forest-bear-key': 1 },
      },
    },
  });
  await page.reload();
  await page.getByRole('button', { name: /Continue adventure/ }).click();
  await page.getByRole('button', { name: 'Enter world' }).click();
  const ready = () => page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await ready();
  await page.getByRole('button', { name: 'Interact', exact: true }).click();
  await expect(page.locator('.world-title h1')).toContainText('Silkshade Glade');
  await ready();
  for (const title of ['Brambleboar Run', 'Forest Bear Den']) {
    await page.keyboard.down('d');
    await page.waitForTimeout(11000);
    await page.keyboard.up('d');
    await page.getByRole('button', { name: 'Interact', exact: true }).click();
    await expect(page.locator('.world-title h1')).toContainText(title);
    await ready();
  }
  // The key was consumed on boss entry and survives return/reconnect as spent.
  await page.screenshot({ path: 'artifacts/boss-entry-live.png' });
  await page.getByRole('button', { name: 'Interact', exact: true }).click();
  await expect(page.locator('.world-title h1')).toContainText('Brambleboar Run');
  await ready();
  await expect(page.locator('.world-hint')).toContainText('0 key(s)');
  await page.getByRole('button', { name: 'Interact', exact: true }).click();
  await page.waitForTimeout(300);
  await expect(page.locator('.world-title h1')).toContainText('Brambleboar Run');
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  await expect(page.locator('.site-header')).toBeVisible();
  const saved = await db.character.findUnique({ where: { id: c.id } });
  expect(saved.data.inventory['forest-bear-key'] ?? 0).toBe(0);
  expect(saved.data.mapId).toBe('woods-3');
  expect(errors).toEqual([]);
  console.log(
    'PASS: all48 monster poses, three new backgrounds, desktop/mobile, four-area live route, server key consumption and denial on second entry, durable save.',
  );
} finally {
  await browser.close();
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
