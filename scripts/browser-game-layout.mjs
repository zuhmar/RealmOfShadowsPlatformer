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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let userId;
try {
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: 'Play as guest' }).click();
  await page
    .getByRole('button', { name: /A story unwritten/ })
    .first()
    .click();
  await page.getByLabel('Character name', { exact: true }).fill('HudTester');
  await page.getByRole('button', { name: 'Create adventurer' }).click();
  const token = await page.evaluate(() => localStorage.getItem('ros-session'));
  const data = await fetch('http://localhost:2567/api/characters', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  userId = data.characters[0].userId;
  await page.getByRole('button', { name: 'Enter world' }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  for (const [label, width, height] of [
    ['desktop', 1440, 900],
    ['mobile', 390, 844],
    ['landscape', 844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(250);
    const geometry = await page.evaluate(() => {
      const b = document.querySelector('canvas').getBoundingClientRect();
      return {
        x: b.x,
        y: b.y,
        w: b.width,
        h: b.height,
        scroll: document.documentElement.scrollHeight,
        inner: innerHeight,
      };
    });
    expect(geometry.x).toBe(0);
    expect(geometry.y).toBe(0);
    expect(geometry.w).toBe(width);
    expect(geometry.h).toBe(height);
    await expect(page.locator('.site-header')).not.toBeVisible();
    await expect(page.locator('footer')).not.toBeVisible();
    for (const sel of ['.world-actions', '.profile-menu', '.floating-actions']) {
      const b = await page.locator(sel).boundingBox();
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(width + 1);
      expect(b.y + b.height).toBeLessThanOrEqual(height + 1);
    }
    await expect(page.locator('.game-toolbar, .mini-map, .map-hud')).toHaveCount(0);
    const profile = await page.locator('.player-hud').boundingBox();
    const menus = await page.locator('.profile-menu').boundingBox();
    expect(menus.y).toBeGreaterThanOrEqual(profile.y + profile.height);
    expect(menus.x).toBeLessThan(30);
    await expect(page.locator('.profile-menu svg image')).toHaveCount(3);
    await page.screenshot({ path: `artifacts/full-page-game-${label}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  if (!(await page.getByLabel('World chat', { exact: true }).isVisible()))
    await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await page.getByLabel('World chat', { exact: true }).fill('HUD test message');
  await page.getByRole('button', { name: 'Send chat' }).click();
  await expect(page.locator('.chat-lines')).toContainText('HUD test message');
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(page.getByLabel('World chat', { exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: /Bag/ }).click();
  await expect(page.getByRole('heading', { name: 'Your satchel.' })).toBeVisible();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  for (const label of ['Character', 'Journal']) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator('.modal-backdrop')).toBeVisible();
    await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  await expect(page.locator('.site-header')).toBeVisible();
  await expect(page.locator('.game-stage')).toHaveCount(0);
  expect(errors).toEqual([]);
  console.log(
    'PASS: real game fills desktop/mobile/landscape viewport, controls remain in bounds, chat sends/toggles and inventory opens.',
  );
} finally {
  await browser.close();
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
