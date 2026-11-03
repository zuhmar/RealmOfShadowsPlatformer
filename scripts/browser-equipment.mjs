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
let userId, characterId;
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
const bag = async () => page.getByRole('button', { name: 'Bag', exact: true }).click();
try {
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: 'Play as guest' }).click();
  await page
    .getByRole('button', { name: /A story unwritten/ })
    .first()
    .click();
  await page.getByLabel('Character name', { exact: true }).fill('GearTester');
  await page.getByRole('button', { name: 'Create adventurer' }).click();
  const token = await page.evaluate(() => localStorage.getItem('ros-session'));
  const list = await fetch('http://localhost:2567/api/characters', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const c = list.characters[0];
  userId = c.userId;
  characterId = c.id;
  const gear = ['Uncommon', 'Rare', 'Epic', 'Legendary'].map((rarity, i) => ({
    id: `gear-test-${i}`,
    base: i % 2 ? 'woods-armor' : 'elderwood-blade',
    slot: i % 2 ? 'armor' : 'weapon',
    name: i % 2 ? 'Elderwood Armor' : 'Elderwood Blade',
    level: 1,
    rarity,
    identified: false,
  }));
  await db.character.update({
    where: { id: c.id },
    data: { data: { ...c.data, x: 500, y: 650, mapId: 'village', gold: 5000, gear } },
  });
  await enter();
  await bag();
  await expect(page.getByRole('button', { name: /Identify Elderwood/ })).toHaveCount(4);
  for (const button of await page.getByRole('button', { name: /Identify Elderwood/ }).all())
    await expect(button).toBeDisabled();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await leave();
  const stored = await db.character.findUnique({ where: { id: c.id } });
  await db.character.update({
    where: { id: c.id },
    data: { data: { ...stored.data, x: 900, y: 650 } },
  });
  await page.reload();
  await page.getByRole('button', { name: /Continue adventure/ }).click();
  await enter();
  await bag();
  for (const rarity of ['Uncommon', 'Rare', 'Epic', 'Legendary']) {
    const card = page.locator(`.gear-card[data-rarity="${rarity}"]`);
    await card.getByRole('button', { name: /Identify/ }).click();
    await expect(card).toContainText('Identified');
    await expect(card.locator('li')).toHaveCount(
      ['Uncommon', 'Rare', 'Epic', 'Legendary'].indexOf(rarity) + 1,
    );
  }
  const weaponCard = page.locator('.gear-card[data-rarity="Epic"]'),
    armorCard = page.locator('.gear-card[data-rarity="Legendary"]');
  await weaponCard.getByRole('button', { name: /^Equip/ }).click();
  await expect(weaponCard.getByRole('button', { name: /^Unequip/ })).toBeVisible();
  await armorCard.getByRole('button', { name: /^Equip/ }).click();
  await expect(armorCard.getByRole('button', { name: /^Unequip/ })).toBeVisible();
  await page.screenshot({ path: 'artifacts/equipment-mobile.png' });
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Skills', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Knight · Melee training' })).toBeVisible();
  await expect(page.locator('.skills-panel progress')).toHaveCount(8);
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await leave();
  const saved = (await db.character.findUnique({ where: { id: c.id } })).data;
  expect(saved.gold).toBe(4200);
  expect(saved.equippedGear).toEqual({ weapon: 'gear-test-2', armor: 'gear-test-3' });
  const rolls = saved.gear.map((g) => g.attributes);
  await page.getByRole('button', { name: 'Enter world' }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await bag();
  await expect(page.getByRole('button', { name: /^Identify / })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Unequip Elderwood/ })).toHaveCount(2);
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await leave();
  expect(
    (await db.character.findUnique({ where: { id: c.id } })).data.gear.map((g) => g.attributes),
  ).toEqual(rolls);
  expect(errors).toEqual([]);
  console.log(
    'PASS: Bram proximity, four rarity reveals, fees, equipped gear, Skills and exact rolls persist through re-entry on mobile.',
  );
} finally {
  await browser.close();
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
