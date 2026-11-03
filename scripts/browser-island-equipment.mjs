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
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let userId, characterId;
const tiers = [
  ['woods', 'iron', 5],
  ['crystal', 'crystal', 10],
  ['swamp', 'mire', 20],
  ['frost', 'frost', 35],
  ['ember', 'ember', 55],
  ['celestial', 'celestial', 80],
  ['shadow', 'shadow', 120],
];
try {
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: 'Play as guest' }).click();
  await page
    .getByRole('button', { name: /A story unwritten/ })
    .first()
    .click();
  await page.getByLabel('Character name', { exact: true }).fill('IslandSmith');
  await page.getByRole('button', { name: 'Create adventurer' }).click();
  const token = await page.evaluate(() => localStorage.getItem('ros-session'));
  const list = await fetch('http://localhost:2567/api/characters', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const c = list.characters[0];
  userId = c.userId;
  characterId = c.id;
  const inventory = Object.fromEntries(
    tiers.flatMap(([id, material, bars]) => [
      [`${material}-ore`, 20],
      [`${material}-bar`, id === 'woods' ? 40 : bars],
    ]),
  );
  await db.character.update({
    where: { id: c.id },
    data: {
      data: {
        ...c.data,
        x: 900,
        y: 650,
        level: 100,
        blacksmithing: { level: 100, xp: 0 },
        inventory,
      },
    },
  });
  await page.getByRole('button', { name: 'Enter world' }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await page.getByRole('button', { name: 'Interact', exact: true }).click();
  await page.getByRole('button', { name: 'Accept Bram’s quest', exact: true }).click();
  await expect(page.getByLabel('Equipment island')).toBeVisible();
  for (const [tier, material] of tiers) {
    await page.getByLabel('Equipment island').selectOption(tier);
    await expect(
      page
        .locator('.forge-recipes section')
        .filter({ has: page.locator('svg image[href*="/islands/"]') }),
    ).toHaveCount(8);
    const imageLoaded = await page.evaluate(async (path) => {
      const image = new Image();
      image.src = path;
      await image.decode();
      return image.naturalWidth > 1000;
    }, `/assets/equipment/islands/${tier}.png`);
    expect(imageLoaded).toBe(true);
    const smelt = page
      .locator('.forge-recipes section')
      .filter({ has: page.getByRole('button', { name: 'Smelt', exact: true }) });
    await smelt.getByRole('button', { name: 'Smelt', exact: true }).click();
    const parts =
      tier === 'woods'
        ? ['Sword', 'Bow', 'Staff', 'Dagger', 'Helmet', 'Chestplate', 'Leggings', 'Boots']
        : ['Sword'];
    for (const part of parts) {
      const card = page
        .locator('.forge-recipes section')
        .filter({ has: page.locator('b').filter({ hasText: new RegExp(`${part}$`) }) });
      await card.getByRole('button', { name: 'Forge', exact: true }).click();
      await page.waitForTimeout(250);
    }
    await page.screenshot({ path: `artifacts/equipment-recipes-${tier}.png` });
  }
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Bag', exact: true }).click();
  await expect(page.locator('.gear-card')).toHaveCount(14);
  await expect(page.getByRole('button', { name: /^Identify / })).toHaveCount(0);
  await expect(page.locator('.equipment-panel')).toContainText('Crafted · Fixed stats');
  for (const part of ['Helmet', 'Chestplate', 'Leggings', 'Boots', 'Sword']) {
    const card = page
      .locator('.gear-card')
      .filter({ has: page.getByRole('heading', { name: `Ironwood ${part}`, exact: true }) });
    await card.getByRole('button', { name: `Equip Ironwood ${part}`, exact: true }).click();
    await expect(
      card.getByRole('button', { name: `Unequip Ironwood ${part}`, exact: true }),
    ).toBeVisible();
  }
  await page.screenshot({ path: 'artifacts/island-crafted-gear-mobile.png' });
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Skills', exact: true }).click();
  await expect(page.getByLabel('Combat attributes')).toContainText('1308');
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  await expect(page.locator('.site-header')).toBeVisible();
  const saved = (await db.character.findUnique({ where: { id: c.id } })).data;
  expect(saved.gear).toHaveLength(14);
  expect(saved.gear.every((g) => g.source === 'crafted' && g.identified)).toBe(true);
  expect(Object.keys(saved.equippedGear)).toHaveLength(5);
  expect(saved.forgeQuest.barsSmelted).toBe(1);
  expect(saved.forgeQuest.toolsCrafted).toBe(0);
  expect(errors).toEqual([]);
  console.log(
    'PASS: all 56 sprites, all seven ore/bar tiers, crafting, five equipment slots, fixed attributes and persistence on mobile.',
  );
} finally {
  await browser.close();
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
