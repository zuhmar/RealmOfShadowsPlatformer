import { chromium, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { mkdir } from 'node:fs/promises';
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://realm:realm@localhost:5432/realm',
  }),
});
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 850 } }),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let userId;
try {
  await mkdir('artifacts', { recursive: true });
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: /Play as guest/ }).click();
  await page
    .getByRole('button', { name: /A story unwritten/ })
    .first()
    .click();
  await page.getByLabel('Character name', { exact: true }).fill('HouseBuilder');
  await page.getByRole('button', { name: /Create adventurer/ }).click();
  const token = await page.evaluate(() => localStorage.getItem('ros-session'));
  const chars = await fetch('http://localhost:2567/api/characters', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const c = chars.characters[0];
  userId = c.userId;
  await db.character.update({
    where: { id: c.id },
    data: {
      data: {
        ...c.data,
        x: 900,
        y: 240,
        platform: 'housing',
        carpentry: { level: 10, xp: 0 },
        unlockedRecipes: [
          'oak-plank',
          'oak-table',
          'oak-chair',
          'oak-bed',
          'oak-chest',
          'house-small',
          'house-medium',
          'house-large',
        ],
        inventory: { 'oak-logs': 500, 'oak-plank': 500, 'iron-bar': 100 },
      },
    },
  });
  await page.reload();
  await page.getByRole('button', { name: /Continue adventure/ }).click();
  await page.getByRole('button', { name: /Enter world/ }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await page.getByRole('button', { name: 'Housing', exact: true }).click();
  await expect(page.locator('.housing-panel')).toContainText('At the housing platform');
  const small = page
    .locator('.housing-options article')
    .filter({ has: page.getByRole('heading', { name: 'Small plot', exact: true }) });
  await small.getByRole('button', { name: 'Build plot', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Small plot · Unbuilt', exact: true }),
  ).toBeVisible();
  for (const stage of ['Foundation', 'Walls', 'Finished']) {
    await page.waitForTimeout(850);
    await page.getByRole('button', { name: `Build ${stage}`, exact: true }).click();
    await expect(
      page.getByRole('heading', { name: `Small plot · ${stage}`, exact: true }),
    ).toBeVisible();
  }
  const table = page
    .locator('.housing-options article')
    .filter({ has: page.getByRole('heading', { name: 'Oak Table', exact: true }) });
  await page.waitForTimeout(850);
  await table.getByRole('button', { name: 'Craft', exact: true }).click();
  await expect(table).toContainText('1 owned');
  await page.waitForTimeout(850);
  await table.getByRole('button', { name: 'Place at 0', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Return to bag', exact: true })).toBeVisible();
  await page.screenshot({ path: 'artifacts/housing-panel-desktop.png' });
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.screenshot({ path: 'artifacts/housing-small-desktop.png' });
  await page.getByRole('button', { name: 'Housing', exact: true }).click();
  const large = page
    .locator('.housing-options article')
    .filter({ has: page.getByRole('heading', { name: 'Large plot', exact: true }) });
  await large.getByRole('button', { name: 'Upgrade plot', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Large plot · Finished', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.screenshot({ path: 'artifacts/housing-large-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Housing', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Large plot · Finished', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'artifacts/housing-panel-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.screenshot({ path: 'artifacts/housing-mobile.png' });
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  await expect(page.locator('.site-header')).toBeVisible();
  const saved = await db.character.findUnique({ where: { id: c.id } });
  expect(saved.data.housing.size).toBe('large');
  expect(saved.data.housing.furniture.length).toBe(1);
  expect(saved.data.housingView).toBeUndefined();
  expect(errors).toEqual([]);
  console.log(
    'PASS: actual housing UI builds stages, crafts/places furniture, upgrades plot, saves and renders desktop/mobile without overflow.',
  );
} finally {
  await browser.close();
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
