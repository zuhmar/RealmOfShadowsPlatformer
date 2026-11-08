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
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
let userId, id;
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await mkdir('artifacts', { recursive: true });
  const guest = await fetch('http://localhost:2567/api/guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  }).then((r) => r.json());
  const c = await fetch('http://localhost:2567/api/characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${guest.token}` },
    body: JSON.stringify({ name: 'RecipeBrowser', appearance: 'female', outfit: 'sage' }),
  }).then((r) => r.json());
  userId = c.userId;
  id = c.id;
  await db.character.update({
    where: { id },
    data: {
      data: {
        ...c.data,
        x: 1360,
        y: 650,
        level: 20,
        hp: 30,
        mp: 10,
        inventory: {
          'brook-trout': 20,
          'trout-skewers': 1,
          greenleaf: 80,
          'greenleaf-mana-potion': 1,
        },
      },
    },
  });
  await page.addInitScript((token) => localStorage.setItem('ros-session', token), guest.token);
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: /Continue adventure/ }).click();
  await page.getByRole('button', { name: /Enter world/ }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await page.screenshot({ path: 'artifacts/recipe-stations-desktop.png' });
  await page.getByRole('button', { name: 'Interact', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cooking & Alchemy', exact: true })).toBeVisible();
  await expect(page.getByText('Cooking Campfire ready.', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Craft Golden Carp Feast', exact: true }),
  ).toBeDisabled();
  const trout = page.locator('.forge-recipes > section').filter({ hasText: 'Trout Skewers' });
  await page.getByRole('button', { name: 'Craft Trout Skewers', exact: true }).click();
  await expect(trout.getByText('Owned: 2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Use Trout Skewers', exact: true }).click();
  await expect(page.getByText(/Active food: Trout Skewers/)).toBeVisible();
  await expect(trout.getByText('Owned: 1', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'artifacts/cooking-recipes-desktop.png' });
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Active food buff', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bag', exact: true }).click();
  const packedFood = page
    .locator('.inventory-cell')
    .filter({ has: page.getByRole('img', { name: 'Trout Skewers', exact: true }) });
  await packedFood.click();
  await packedFood.getByRole('button', { name: 'Eat', exact: true }).click();
  await expect(
    page.locator('.inventory-grid').getByRole('img', { name: 'Trout Skewers', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  const left = await page.getByRole('button', { name: 'Move left', exact: true }).boundingBox();
  await page.mouse.move(left.x + left.width / 2, left.y + left.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1250);
  await page.mouse.up();
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: 'Interact', exact: true }).click();
  await expect(page.getByText('Alchemy Table ready.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Alchemy', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const potion = page
    .locator('.forge-recipes > section')
    .filter({ hasText: 'Greenleaf Health Potion' });
  await page.getByRole('button', { name: 'Craft Greenleaf Health Potion', exact: true }).click();
  await expect(potion.getByText('Owned: 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Use Greenleaf Health Potion', exact: true }).click();
  await expect(page.getByText(/Potion cooldown: \d+s/)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Use Greenleaf Mana Potion', exact: true }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/alchemy-recipes-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Skills', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Cooking Lv. 2/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Alchemy Lv. 2/ })).toBeVisible();
  await page.getByRole('button', { name: 'Cooking & Alchemy recipes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cooking & Alchemy', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  await expect(page.getByRole('button', { name: /Enter world/ })).toBeVisible();
  const saved = (await db.character.findUnique({ where: { id } })).data;
  expect(saved.inventory['brook-trout']).toBe(10);
  expect(saved.inventory['trout-skewers']).toBeUndefined();
  expect(saved.inventory.greenleaf).toBe(70);
  expect(saved.inventory['greenleaf-health-potion']).toBeUndefined();
  expect(saved.inventory['greenleaf-mana-potion']).toBe(1);
  expect(saved.foodBuff.recipeId).toBe('trout-skewers');
  expect(saved.craftingSkills.Cooking.level).toBe(2);
  expect(saved.craftingSkills.Cooking.xp).toBe(0);
  expect(saved.craftingSkills.Alchemy.level).toBe(2);
  expect(saved.craftingSkills.Alchemy.xp).toBe(0);
  await page.getByRole('button', { name: /Enter world/ }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await expect(page.getByRole('button', { name: 'Active food buff', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  await expect(page.getByRole('button', { name: /Enter world/ })).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'PASS: cooking/alchemy stations, real crafting and use, ingredient counts, locked recipes, temporary food HUD, shared potion cooldown, profession skills, mobile layout and durable re-entry.',
  );
} catch (e) {
  console.log(
    'Recipe UI',
    await page
      .locator('.recipes-panel')
      .textContent()
      .catch(() => ''),
  );
  if (id)
    console.log(
      'Position',
      await db.character
        .findUnique({ where: { id } })
        .then((c) => ({ x: c?.data?.x, y: c?.data?.y })),
    );
  await page.screenshot({ path: 'artifacts/recipe-error.png' });
  throw e;
} finally {
  await browser.close();
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
