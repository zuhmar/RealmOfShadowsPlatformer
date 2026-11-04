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
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
let userId, id;
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const ready = async () => page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
const open = async () => page.getByRole('button', { name: 'World map', exact: true }).click();
const close = async () => page.getByRole('button', { name: 'Close panel', exact: true }).click();
const enter = async () => {
  await page.getByRole('button', { name: 'Enter world' }).click();
  await ready();
};
const leave = async () => {
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  await expect(page.locator('.site-header')).toBeVisible();
};
const teleport = async (name, map) => {
  await page.getByRole('button', { name: `Teleport to ${name}`, exact: true }).click();
  await expect
    .poll(async () => (await db.character.findUnique({ where: { id } })).data.mapId)
    .toBe(map);
  await expect(page.locator('.world-title h1')).toContainText(name);
  await open();
  await expect(page.locator('.map-destination.current')).toContainText(name);
};
try {
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: 'Play as guest' }).click();
  await page
    .getByRole('button', { name: /A story unwritten/ })
    .first()
    .click();
  await page.getByLabel('Character name', { exact: true }).fill('MapTraveler');
  await page.getByRole('button', { name: 'Create adventurer' }).click();
  const token = await page.evaluate(() => localStorage.getItem('ros-session'));
  const list = await fetch('http://localhost:2567/api/characters', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const c = list.characters[0];
  userId = c.userId;
  id = c.id;
  await db.character.update({
    where: { id },
    data: {
      data: { ...c.data, x: 900, y: 650, gold: 100, visitedAreas: ['village', 'woods', 'woods-2'] },
    },
  });
  await enter();
  await open();
  await expect(page.locator('.map-crystals')).toContainText('3 Teleport Crystals');
  await expect(page.locator('.map-island-marker')).toHaveCount(7);
  for (const island of [
    'Whispering Woods',
    'Crystal Caverns',
    'Murkmire Swamp',
    'Frostfall Tundra',
    'Ember Peaks',
    'Celestial Realm',
    'Shadow Fortress',
  ]) {
    await page.getByRole('button', { name: `Explore ${island}`, exact: true }).click();
    await expect(page.locator('.map-area-list .map-destination')).toHaveCount(4);
    if (island !== 'Whispering Woods')
      for (const button of await page.locator('.map-area-list .map-destination').all())
        await expect(button).toBeDisabled();
  }
  await page.getByRole('button', { name: 'Explore Whispering Woods', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Teleport to Brambleboar Run', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Buy Teleport Crystal · 25 gold', exact: true }).click();
  await expect(page.locator('.map-crystals')).toContainText('4 Teleport Crystals');
  await page.locator('.world-map-chart > img').evaluate((img) => img.decode());
  await page.locator('.world-map-modal').evaluate((el) => (el.scrollTop = 0));
  await page.screenshot({ path: 'artifacts/world-map-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.world-map-modal').evaluate((el) => (el.scrollTop = 0));
  await page.screenshot({ path: 'artifacts/world-map-mobile.png' });
  const box = await page.locator('.world-map-chart').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await teleport('Silkshade Glade', 'woods-2');
  await expect(page.locator('.map-crystals')).toContainText('3 Teleport Crystals');
  await teleport('Elderwood Village', 'village');
  await expect(page.locator('.map-crystals')).toContainText('2 Teleport Crystals');
  await close();
  await leave();
  let saved = (await db.character.findUnique({ where: { id } })).data;
  expect(saved.gold).toBe(75);
  expect(saved.teleportStarterGranted).toBe(true);
  await db.character.update({
    where: { id },
    data: {
      data: {
        ...saved,
        visitedAreas: [...saved.visitedAreas, 'woods-boss'],
        inventory: { ...saved.inventory, 'forest-bear-key': 1 },
      },
    },
  });
  await page.reload();
  await page.getByRole('button', { name: /Continue adventure/ }).click();
  await enter();
  await open();
  await teleport('Forest Bear Den', 'woods-boss');
  await expect(page.locator('.map-crystals')).toContainText('1 Teleport Crystal');
  saved = (await db.character.findUnique({ where: { id } })).data;
  expect(saved.inventory['forest-bear-key']).toBeUndefined();
  await teleport('Elderwood Village', 'village');
  await expect(page.locator('.map-crystals')).toContainText('0 Teleport Crystals');
  await expect(
    page.getByRole('button', { name: 'Teleport to Silkshade Glade', exact: true }),
  ).toBeDisabled();
  await close();
  await leave();
  await enter();
  await open();
  await expect(page.locator('.map-crystals')).toContainText('0 Teleport Crystals');
  await close();
  await leave();
  saved = (await db.character.findUnique({ where: { id } })).data;
  expect(saved.inventory['teleport-crystal']).toBeUndefined();
  expect(saved.visitedAreas).toContain('woods-2');
  expect(saved.mapId).toBe('village');
  expect(errors).toEqual([]);
  console.log(
    'PASS: seven illustrated islands and 28 areas, discovery locks, starter grant once, Bram purchase, crystal charges, boss key cost, mobile map and saved room travel.',
  );
} finally {
  await browser.close();
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
