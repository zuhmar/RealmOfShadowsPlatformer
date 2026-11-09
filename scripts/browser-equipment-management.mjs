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
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
let userId, id;
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const enter = async () => {
  await page.getByRole('button', { name: 'Enter world' }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
};
const leave = async () => {
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  await expect(page.locator('.site-header')).toBeVisible();
};
const openBag = async () => page.getByRole('button', { name: 'Bag', exact: true }).click();
const close = async () => {
  if (await page.getByRole('button', { name: 'Close item details', exact: true }).count())
    await page.getByRole('button', { name: 'Close item details', exact: true }).click();
  await page.getByRole('button', { name: 'Close bag', exact: true }).click();
};
try {
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: 'Play as guest' }).click();
  await page
    .getByRole('button', { name: /A story unwritten/ })
    .first()
    .click();
  await page.getByLabel('Character name', { exact: true }).fill('GearManager');
  await page.getByRole('button', { name: 'Create adventurer' }).click();
  const token = await page.evaluate(() => localStorage.getItem('ros-session'));
  const list = await fetch('http://localhost:2567/api/characters', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const c = list.characters[0];
  userId = c.userId;
  id = c.id;
  const gear = [
    {
      id: 'equipped',
      base: 'woods-armor',
      slot: 'armor',
      name: 'Ironwood Chestplate',
      level: 1,
      rarity: 'Common',
      source: 'crafted',
      identified: true,
      attributes: { health: 40, armor: 5 },
    },
    {
      id: 'compare',
      base: 'woods-armor',
      slot: 'armor',
      name: 'Ironwood Chestplate',
      level: 1,
      rarity: 'Rare',
      source: 'monster',
      identified: true,
      attributes: { health: 20, armor: 2, critChance: 0.1 },
    },
    {
      id: 'hidden',
      base: 'woods-helmet',
      slot: 'helmet',
      name: 'Ironwood Helmet',
      level: 1,
      rarity: 'Epic',
      source: 'monster',
      identified: false,
    },
  ];
  await db.character.update({
    where: { id },
    data: {
      data: {
        ...c.data,
        x: 500,
        y: 650,
        mapId: 'village',
        gold: 100,
        gear,
        equippedGear: { armor: 'equipped' },
      },
    },
  });
  await enter();
  await openBag();
  await expect(
    page.getByRole('button', { name: 'Chest: Ironwood Chestplate', exact: true }),
  ).toBeVisible();
  const rare = page.locator('.gear-card[data-rarity="Rare"]'),
    common = page.locator('.gear-card[data-rarity="Common"]');
  await page.getByRole('button', { name: 'Chest: Ironwood Chestplate', exact: true }).click();
  await expect(common.getByRole('button', { name: /Sell to Bram/ })).toBeDisabled();
  if (await page.getByRole('button', { name: 'Close item details', exact: true }).count())
    await page.getByRole('button', { name: 'Close item details', exact: true }).click();
  await page.getByRole('button', { name: 'Ironwood Chestplate, 1, Rare', exact: true }).click();
  await expect(rare.getByRole('button', { name: /Sell to Bram/ })).toBeDisabled();
  await expect(rare.getByLabel('Compare Ironwood Chestplate')).toContainText(
    'Maximum health −20.0',
  );
  await expect(rare.getByLabel('Compare Ironwood Chestplate')).toContainText('Crit chance +10.0%');
  await page.getByRole('button', { name: 'Close item details', exact: true }).click();
  await page
    .getByRole('button', { name: 'Ironwood Helmet, 1, Epic unidentified', exact: true })
    .click();
  await expect(page.locator('.gear-card[data-rarity="Epic"] .gear-comparison')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close item details', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Chest: Ironwood Chestplate', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'artifacts/equipment-management-mobile.png' });
  await close();
  await leave();
  const saved = await db.character.findUnique({ where: { id } });
  await db.character.update({ where: { id }, data: { data: { ...saved.data, x: 900, y: 650 } } });
  await page.reload();
  await page.getByRole('button', { name: /Continue adventure/ }).click();
  await enter();
  await openBag();
  if (await page.getByRole('button', { name: 'Close item details', exact: true }).count())
    await page.getByRole('button', { name: 'Close item details', exact: true }).click();
  await page.getByRole('button', { name: 'Ironwood Chestplate, 1, Rare', exact: true }).click();
  await rare.getByRole('button', { name: 'Sell to Bram · 25 gold', exact: true }).click();
  await rare.getByRole('button', { name: 'Cancel sale', exact: true }).click();
  await expect(rare).toBeVisible();
  await rare.getByRole('button', { name: 'Sell to Bram · 25 gold', exact: true }).click();
  await rare.getByRole('button', { name: 'Confirm sale · 25 gold', exact: true }).click();
  await expect(rare).toHaveCount(0);
  await expect(page.locator('.bag-heading')).toContainText('125 gold');
  if (await page.getByRole('button', { name: 'Close item details', exact: true }).count())
    await page.getByRole('button', { name: 'Close item details', exact: true }).click();
  await page.getByRole('button', { name: 'Chest: Ironwood Chestplate', exact: true }).click();
  await expect(common.getByRole('button', { name: /Sell to Bram/ })).toBeDisabled();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: 'artifacts/equipment-management-desktop.png' });
  await close();
  await leave();
  const final = (await db.character.findUnique({ where: { id } })).data;
  expect(final.gold).toBe(125);
  expect(final.gear.map((g) => g.id)).toEqual(['equipped', 'hidden']);
  expect(final.equippedGear.armor).toBe('equipped');
  await enter();
  await openBag();
  await expect(
    page.getByRole('button', { name: 'Chest: Ironwood Chestplate', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Ironwood Helmet, 1, Epic unidentified', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.bag-heading')).toContainText('125 gold');
  await close();
  await leave();
  expect(errors).toEqual([]);
  console.log(
    'PASS: equipped slots, real gains/losses, hidden attributes, inventory slots, Bram-only confirmed sales, equipped protection and saved gold.',
  );
} finally {
  await browser.close();
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
