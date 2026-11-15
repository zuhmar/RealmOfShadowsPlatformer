import { chromium, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { mkdir } from 'node:fs/promises';
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
let userId;
try {
  const api = async (path, token, body) => {
    const r = await fetch('http://localhost:2567/api' + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const v = await r.json();
    if (!r.ok) throw Error(v.error);
    return v;
  };
  const guest = await api('/guest', undefined, {}),
    row = await api('/characters', guest.token, { name: 'WalkBrowser' });
  userId = row.userId;
  const page = await browser.newPage({ viewport: { width: 1100, height: 750 }, hasTouch: true }),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Expose the dev scene only in this test so pointer coordinates follow the live camera.
  await page.route('**/src/game.ts*', async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    if (!body.includes('return game;')) throw Error('Cannot instrument the preview scene');
    await route.fulfill({
      response,
      body: body.replace('return game;', 'window.__walkGame = game; return game;'),
    });
  });
  const miraPoint = () =>
    page.evaluate(() => {
      const scene = window.__walkGame.scene.getScene('realm');
      const bounds = scene.children.list.find((c) => c.name === 'interact-mira').getBounds();
      const camera = scene.cameras.main;
      return {
        x: (bounds.centerX - camera.worldView.x) * camera.zoom,
        y: (bounds.centerY - camera.worldView.y) * camera.zoom,
      };
    });
  await page.addInitScript((token) => localStorage.setItem('ros-session', token), guest.token);
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: /Continue adventure/ }).click();
  await page.getByRole('button', { name: /Enter world/ }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor({ timeout: 60000 });
  await page.waitForTimeout(700);
  const dialog = page.getByRole('heading', { name: 'Mira · Village guide', exact: true });
  const mouse = await miraPoint();
  await page.mouse.click(mouse.x, mouse.y);
  await page.waitForTimeout(150);
  await expect(dialog).toHaveCount(0);
  await expect(dialog).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.keyboard.down('a');
  await page.waitForTimeout(700);
  await page.keyboard.up('a');
  await page.waitForTimeout(150);
  const touch = await miraPoint();
  await page.touchscreen.tap(touch.x, touch.y);
  await page.waitForTimeout(150);
  await expect(dialog).toHaveCount(0);
  await expect(dialog).toBeVisible({ timeout: 10000 });
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/click-walk-arrival.png' });
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  expect(errors).toEqual([]);
  console.log(
    'PASS: actual mouse and touch clicks walk to Mira before opening her dialog; no remote popup.',
  );
} finally {
  await browser.close();
  await new Promise((r) => setTimeout(r, 200));
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
