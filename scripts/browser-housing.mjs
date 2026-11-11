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
const page = await browser.newPage({ viewport: { width: 1200, height: 850 }, hasTouch: true }),
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
        x: 560,
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
  await page.getByRole('button', { name: 'Interact', exact: true }).click();
  await expect(page.locator('.housing-panel')).toContainText('At the housing platform');
  const small = page
    .locator('.housing-options article')
    .filter({ has: page.getByRole('heading', { name: 'Small plot', exact: true }) });
  await small.getByRole('button', { name: 'Build plot', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Small plot · Unbuilt', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Next house construction step')).toContainText('Plot claimed');
  await expect(page.getByRole('button', { name: 'Build Foundation', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.screenshot({ path: 'artifacts/claimed-housing-plot.png' });
  await page.getByRole('button', { name: 'Housing', exact: true }).click();
  for (const stage of ['Foundation', 'Walls', 'Finished']) {
    await page.waitForTimeout(850);
    await page.getByRole('button', { name: `Build ${stage}`, exact: true }).click();
    await expect(
      page.getByRole('heading', { name: `Small plot · ${stage}`, exact: true }),
    ).toBeVisible();
  }
  await page.getByRole('button', { name: 'Craft', exact: true }).click();
  await page.getByRole('button', { name: /^Oak Table/ }).click();
  const table = page.getByLabel('Selected Carpentry recipe');
  await page.getByLabel('Craft quantity').fill('3');
  await expect(table).toContainText('15 Oak Plank');
  await page.waitForTimeout(850);
  await page.getByRole('button', { name: 'Craft 3 × Oak Table', exact: true }).click();
  await expect(table).toContainText('3 owned');
  await page.screenshot({ path: 'artifacts/housing-batch-crafting-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/housing-batch-crafting-mobile.png' });
  expect(
    await page
      .locator('.housing-open-modal')
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe('rgba(0, 0, 0, 0)');
  await page.setViewportSize({ width: 1200, height: 850 });
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.keyboard.down('d');
  await page.waitForTimeout(1650);
  await page.keyboard.up('d');
  await page.getByRole('button', { name: 'Interact', exact: true }).click();
  await expect(page.locator('.world-title')).toContainText('Small House');
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await page.getByRole('button', { name: 'Decorate house', exact: true }).click();
  await page.waitForTimeout(850);
  await expect(page.getByLabel('Furniture position')).toHaveCount(0);
  await page.getByRole('button', { name: 'Place Oak Table', exact: true }).click();
  await expect(page.getByLabel('Furniture placement', { exact: true })).toBeVisible();
  await expect(page.locator('.housing-panel')).toHaveCount(0);
  await page.locator('.phaser-host canvas').click({ position: { x: 650, y: 480 } });
  await expect(page.getByRole('button', { name: 'Place furniture', exact: true })).toBeEnabled();
  await page.screenshot({ path: 'artifacts/furniture-preview-desktop.png' });
  await page.getByRole('button', { name: 'Place furniture', exact: true }).click();
  await expect(page.getByLabel('Furniture placement', { exact: true })).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (await db.character.findUnique({ where: { id: c.id } })).data.housing.furniture.length,
    )
    .toBe(1);
  await page.getByRole('button', { name: 'Decorate house', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Return to bag', exact: true })).toBeVisible();
  await page.screenshot({ path: 'artifacts/housing-panel-desktop.png' });
  await page.getByRole('button', { name: 'Close decorate house', exact: true }).click();
  await page.screenshot({ path: 'artifacts/housing-small-desktop.png' });
  await page.getByRole('button', { name: 'Decorate house', exact: true }).click();
  await page.getByRole('button', { name: 'Place Oak Table', exact: true }).click();
  await page.locator('.phaser-host canvas').click({ position: { x: 110, y: 650 } });
  await page.waitForTimeout(200);
  await expect(page.locator('.world-title')).toContainText('Small House');
  await expect(page.getByLabel('Furniture placement', { exact: true })).toBeVisible();
  await page.locator('.phaser-host canvas').click({ position: { x: 650, y: 480 } });
  await expect(page.getByRole('button', { name: 'Place furniture', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Furniture placement', { exact: true })).toContainText(
    'Leave space',
  );
  await page.getByRole('button', { name: 'Cancel placement', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Decorate house', exact: true }).click();
  await page.getByRole('button', { name: 'Place Oak Table', exact: true }).click();
  await page.touchscreen.tap(280, 550);
  await expect(page.getByRole('button', { name: 'Place furniture', exact: true })).toBeEnabled();
  await page.screenshot({ path: 'artifacts/furniture-preview-mobile.png' });
  await page.getByRole('button', { name: 'Place furniture', exact: true }).click();
  await expect(page.getByLabel('Furniture placement', { exact: true })).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (await db.character.findUnique({ where: { id: c.id } })).data.housing.furniture.length,
    )
    .toBe(2);
  const decorated = (await db.character.findUnique({ where: { id: c.id } })).data;
  expect(decorated.inventory['oak-table']).toBe(1);
  expect(new Set(decorated.housing.furniture.map((f) => f.x)).size).toBe(2);
  await page.setViewportSize({ width: 1200, height: 850 });

  await page.getByRole('button', { name: 'Housing', exact: true }).click();
  await page.getByRole('button', { name: 'Exit house', exact: true }).click();
  await expect(page.locator('.world-title')).toContainText('Elderwood Village');
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
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
  expect(saved.data.housing.furniture.length).toBe(2);
  expect(saved.data.housingView).toBeUndefined();
  expect(errors).toEqual([]);
  console.log(
    'PASS: carpentry bench opens actual housing UI and builds stages, enters its private interior, crafts furniture, places directly with mouse/touch, rejects overlap, cancels without spending, protects the door while decorating, upgrades plot and saves both placements without overflow.',
  );
} finally {
  await browser.close();
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
