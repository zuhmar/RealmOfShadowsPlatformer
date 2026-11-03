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
const page = await browser.newPage({ viewport: { width: 1100, height: 650 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('/assets/')) errors.push(r.url());
});
let userId;
try {
  for (const mapId of ['village', 'woods']) {
    await page.goto('http://localhost:5173');
    await page.evaluate(async (mapId) => {
      const { mountGame } = await import('/src/game.ts');
      const host = document.createElement('div');
      Object.assign(host.style, { position: 'fixed', inset: '0', zIndex: 999 });
      document.body.appendChild(host);
      const game = mountGame(host, {
        id: 'test',
        held: {},
        send: () => {},
        snapshot: { mapId, players: [], wolves: [], drops: [], projectiles: [], time: Date.now() },
      });
      window.portalTest = { host, game, seen: [] };
    }, mapId);
    await page.waitForFunction(() => window.portalTest.host.getAttribute('aria-busy') === 'false');
    await page.evaluate(() => {
      const t = window.portalTest,
        s = t.game.scene.getScene('realm'),
        portal = s.children.list.find((c) => c.name === 'travel-portal');
      s.cameras.main.centerOn(portal.x, portal.y - 70);
      s.time.addEvent({ delay: 30, loop: true, callback: () => t.seen.push(portal.frame.name) });
    });
    await expect
      .poll(() => page.evaluate(() => new Set(window.portalTest.seen).size), { timeout: 5000 })
      .toBe(8);
    const info = await page.evaluate(() => {
      const s = window.portalTest.game.scene.getScene('realm'),
        p = s.children.list.find((c) => c.name === 'travel-portal');
      return {
        x: p.x,
        y: p.y,
        target: p.getData('target'),
        origin: p.originY,
        anim: p.anims.currentAnim.key,
        label: s.children.list.find((c) => c.text === s.map.portals[0].label)?.y,
      };
    });
    expect(info.y).toBe(mapId === 'village' ? 650 : 760);
    expect(info.target).toBe(mapId === 'village' ? 'woods' : 'village');
    expect(info.origin).toBe(444 / 512);
    expect(info.anim).toBe('purple-portal-idle');
    expect(info.label).toBe(info.y - 164);
    await page.screenshot({ path: `artifacts/purple-portal-${mapId}.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    await page.screenshot({ path: `artifacts/purple-portal-${mapId}-mobile.png` });
    await page.setViewportSize({ width: 1100, height: 650 });
  }
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: 'Play as guest' }).click();
  await page
    .getByRole('button', { name: /A story unwritten/ })
    .first()
    .click();
  await page.getByLabel('Character name', { exact: true }).fill('PortalTester');
  await page.getByRole('button', { name: 'Create adventurer' }).click();
  const token = await page.evaluate(() => localStorage.getItem('ros-session'));
  const chars = await fetch('http://localhost:2567/api/characters', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  userId = chars.characters[0].userId;
  await page.getByRole('button', { name: 'Enter world' }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await page.keyboard.down('d');
  await page.waitForTimeout(6500);
  await page.keyboard.up('d');
  await page.keyboard.press('e');
  await expect(page.locator('.world-title h1')).toContainText('Wolf Hollow', { timeout: 10000 });
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await page.waitForTimeout(200);
  await page.keyboard.press('e');
  await expect(page.locator('.world-title h1')).toContainText('Elderwood Village', {
    timeout: 10000,
  });
  expect(errors).toEqual([]);
  console.log(
    'PASS: all8 portal frames loop in both maps, stable baseline and labels, desktop/mobile render, and E travel works in both directions.',
  );
} finally {
  await browser.close();
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
