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
let userId;
const errors = [];
async function api(path, token, body) {
  const r = await fetch('http://localhost:2567/api' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error);
  return d;
}
try {
  await mkdir('artifacts', { recursive: true });
  const guest = await api('/guest', null, {}),
    c = await api('/characters', guest.token, {
      name: 'DisplayBuilder',
      appearance: 'male',
      outfit: 'sage',
    });
  userId = c.userId;
  const gear = {
    id: crypto.randomUUID(),
    base: 'crystal-sword',
    name: 'Cavern Keepsake',
    slot: 'weapon',
    source: 'monster',
    level: 11,
    rarity: 'Rare',
    identified: true,
    attributes: { critChance: 0.07, health: 31 },
  };
  await db.character.update({
    where: { id: c.id },
    data: {
      data: {
        ...c.data,
        mapId: 'house-small',
        houseOwnerId: c.id,
        x: 450,
        y: 500,
        platform: 'ground',
        grounded: true,
        level: 20,
        weapon: null,
        equippedGear: {},
        gear: [gear],
        inventory: { fang: 2, 'oak-table': 1 },
        housing: {
          size: 'small',
          stage: 3,
          invited: [],
          furniture: [{ id: 'old-chest', item: 'oak-chest', x: -300, floor: 0 }],
        },
      },
    },
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (
      ['error', 'warning'].includes(m.type()) &&
      /texture.*not found|missing.*frame/i.test(m.text())
    )
      errors.push(m.text());
  });
  await page.addInitScript((t) => localStorage.setItem('ros-session', t), guest.token);
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: /Continue adventure/ }).click();
  await page.getByRole('button', { name: /Enter world/ }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await expect(page.locator('.world-title')).toContainText('Small House');
  async function decorate() {
    await page.getByRole('button', { name: 'Decorate house', exact: true }).click();
  }
  async function place(button, x) {
    await decorate();
    await page.getByRole('button', { name: button, exact: typeof button === 'string' }).click();
    await expect(page.getByLabel('Furniture placement', { exact: true })).toBeVisible();
    await page.locator('.phaser-host canvas').click({ position: { x, y: 650 } });
    await expect(page.getByRole('button', { name: 'Place furniture', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Place furniture', exact: true }).click();
    await expect(page.getByLabel('Furniture placement', { exact: true })).toHaveCount(0);
  }
  await place(/^Display .*Fang$/i, 900);
  await place('Display Cavern Keepsake', 650);
  await place('Place Oak Table', 420);
  await expect
    .poll(
      async () =>
        (await db.character.findUnique({ where: { id: c.id } })).data.housing.furniture.length,
    )
    .toBe(4);
  let stored = (await db.character.findUnique({ where: { id: c.id } })).data;
  expect(stored.inventory.fang).toBe(1);
  expect(stored.inventory['oak-table']).toBe(0);
  expect(stored.gear).toHaveLength(0);
  expect(stored.housing.furniture.find((f) => f.gear)?.gear).toEqual(gear);
  await page.screenshot({ path: 'artifacts/house-loot-equipment-displays.png' });
  await decorate();
  await expect(
    page.getByRole('button', { name: 'Display Cavern Keepsake', exact: true }),
  ).toHaveCount(0);
  const placed = page
    .locator('.housing-panel p')
    .filter({ has: page.getByRole('button', { name: 'Return to bag', exact: true }) })
    .filter({ hasText: 'Cavern Keepsake' });
  await placed.getByRole('button', { name: 'Return to bag', exact: true }).click();
  await expect
    .poll(async () => (await db.character.findUnique({ where: { id: c.id } })).data.gear.length)
    .toBe(1);
  stored = (await db.character.findUnique({ where: { id: c.id } })).data;
  expect(stored.gear[0]).toEqual(gear);
  expect(stored.housing.furniture).toHaveLength(3);
  await page.getByRole('button', { name: 'Close decorate house', exact: true }).click();
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  await expect(page.locator('.site-header')).toBeVisible();
  await page.getByRole('button', { name: /Enter world/ }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await expect(page.locator('.world-title')).toContainText('Small House');
  await page.screenshot({ path: 'artifacts/house-displays-saved.png' });
  expect(errors).toEqual([]);
  console.log(
    'PASS enlarged legacy furniture, actual loot/equipment sprites, direct placement, inventory transfer, gear rolls preserved, retrieval and saved re-entry.',
  );
} finally {
  await browser.close();
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
