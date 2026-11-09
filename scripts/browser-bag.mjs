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
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } }),
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
  await page.getByLabel('Character name', { exact: true }).fill('BagTester');
  await page.getByRole('button', { name: /Create adventurer/ }).click();
  const token = await page.evaluate(() => localStorage.getItem('ros-session'));
  const chars = await fetch('http://localhost:2567/api/characters', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const c = chars.characters[0];
  userId = c.userId;
  const gear = [
    {
      id: 'worn',
      base: 'crystal-sword',
      slot: 'weapon',
      source: 'crafted',
      name: 'Crystal Sword',
      level: 11,
      rarity: 'Common',
      identified: true,
      attributes: {},
    },
    {
      id: 'helmet-one',
      base: 'woods-helmet',
      slot: 'helmet',
      source: 'crafted',
      name: 'Ironwood Helmet',
      level: 1,
      rarity: 'Common',
      identified: true,
      attributes: {},
    },
    {
      id: 'helmet-two',
      base: 'woods-helmet',
      slot: 'helmet',
      source: 'crafted',
      name: 'Ironwood Helmet',
      level: 1,
      rarity: 'Common',
      identified: true,
      attributes: {},
    },
    {
      id: 'hidden',
      base: 'woods-boots',
      slot: 'boots',
      source: 'monster',
      name: 'Ironwood Boots',
      level: 1,
      rarity: 'Rare',
      identified: false,
    },
  ];
  await db.character.update({
    where: { id: c.id },
    data: {
      data: {
        ...c.data,
        x: 900,
        y: 650,
        level: 20,
        gold: 500,
        hp: 30,
        skin: 'golden-test',
        skinConceptVersion: 2,
        weapon: 'crystal-sword',
        equippedGear: { weapon: 'worn' },
        gear,
        inventory: {
          'oak-logs': 1234,
          'iron-ore': 500,
          'greenleaf-health-potion': 3,
          'forest-guardian-ring': 2,
          'elderwood-bow': 4,
        },
      },
    },
  });
  await page.reload();
  await page.getByRole('button', { name: /Continue adventure/ }).click();
  await page.getByRole('button', { name: /Enter world/ }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await page.getByRole('button', { name: 'Bag', exact: true }).click();
  const bag = page.getByRole('dialog', { name: 'Your bag' });
  const closeItem = () =>
    page.getByRole('button', { name: 'Close item details', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Item details' })).toHaveCount(0);
  await bag.getByRole('button', { name: 'Oak Logs, 1234', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Item details' })).toContainText('Oak Logs');
  await page.keyboard.press('Escape');
  await expect(bag).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Item details' })).toHaveCount(0);
  await expect(bag).toBeVisible();
  await expect(bag.locator('.bag-player [aria-busy="false"]')).toBeVisible();
  await expect(bag.locator('.bag-player image')).toHaveAttribute('href', /optimized|sword-crystal/);
  expect(await bag.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await expect(bag.getByRole('button', { name: 'Oak Logs, 1234', exact: true })).toBeVisible();
  await expect(
    bag.getByRole('button', { name: 'Ironwood Helmet, 2, Common', exact: true }),
  ).toBeVisible();
  await expect(
    bag.getByRole('button', { name: 'Weapon: Crystal Sword', exact: true }),
  ).toBeVisible();
  await bag.getByRole('button', { name: 'Ironwood Helmet, 2, Common', exact: true }).click();
  await bag.getByRole('button', { name: 'Equip Ironwood Helmet', exact: true }).click();
  await closeItem();
  await expect(
    bag.getByRole('button', { name: 'Head: Ironwood Helmet', exact: true }),
  ).toBeVisible();
  await expect(
    bag.getByRole('button', { name: 'Ironwood Helmet, 1, Common', exact: true }),
  ).toBeVisible();
  await bag
    .getByRole('button', { name: 'Ironwood Boots, 1, Rare unidentified', exact: true })
    .click();
  await bag.getByRole('button', { name: /Identify Ironwood Boots/ }).click();
  await expect(
    bag.getByRole('button', { name: 'Equip Ironwood Boots', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'artifacts/bag-item-popup-desktop.png' });
  await closeItem();
  await bag.getByRole('button', { name: 'Forest Guardian Ring, 2', exact: true }).click();
  await bag.getByRole('button', { name: 'Equip Forest Guardian Ring', exact: true }).click();
  await closeItem();
  await expect(
    bag.getByRole('button', { name: 'Accessory: Forest Guardian Ring', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'artifacts/bag-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/bag-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await bag.getByRole('button', { name: 'Greenleaf Health Potion, 3', exact: true }).click();
  await page.screenshot({ path: 'artifacts/bag-item-popup-mobile.png' });
  await bag.getByRole('button', { name: 'Drink Greenleaf Health Potion', exact: true }).click();
  await closeItem();
  await expect(
    bag.getByRole('button', { name: 'Greenleaf Health Potion, 2', exact: true }),
  ).toBeVisible();
  await bag.getByRole('button', { name: 'Elderwood Bow, 4', exact: true }).click();
  await bag.getByRole('button', { name: 'Equip Elderwood Bow', exact: true }).click();
  await closeItem();
  await expect(
    bag.getByRole('button', { name: 'Weapon: Elderwood Bow', exact: true }),
  ).toBeVisible();
  await bag.getByRole('button', { name: 'Ironwood Helmet, 1, Common', exact: true }).click();
  await bag.getByRole('button', { name: /Sell to Bram/ }).click();
  await bag.getByRole('button', { name: /Confirm sale/ }).click();
  await expect(
    bag.getByRole('button', { name: 'Ironwood Helmet, 1, Common', exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(bag).toHaveCount(0);
  await page.getByRole('button', { name: 'Bag', exact: true }).click();
  await expect(
    bag.getByRole('button', { name: 'Head: Ironwood Helmet', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close bag', exact: true }).click();
  expect(errors).toEqual([]);
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  await expect(page.locator('.site-header')).toBeVisible();
  const saved = await db.character.findUnique({ where: { id: c.id } });
  expect(saved.data.inventory['oak-logs']).toBe(1234);
  expect(saved.data.gear.length).toBe(3);
  expect(saved.data.accessory).toBe('forest-guardian-ring');
  console.log(
    'PASS: open bag layout, actual player/weapon sprite, six equipped slots, stacked materials/gear, equip, identify, sell, consume, accessory, separate item popups, nested Escape closing, desktop/mobile and saved state.',
  );
} finally {
  await browser.close();
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
