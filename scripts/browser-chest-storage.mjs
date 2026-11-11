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
          furniture: [{ id: 'old-chest', item: 'oak-chest', x: 0, floor: 0 }],
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
  await page.getByRole('button', { name: 'Housing', exact: true }).click();
  await page.getByRole('button', { name: 'Storage', exact: true }).click();
  await page.getByRole('button', { name: 'Chest 1 · Floor 1', exact: true }).click();
  const bag = page.getByRole('region', { name: 'Bag items', exact: true });
  const chest = page.getByRole('region', { name: 'Chest items', exact: true });
  await bag.getByRole('button', { name: 'Deposit 1', exact: true }).first().click();
  await expect(chest.getByText('×1', { exact: true })).toBeVisible();
  await page.waitForTimeout(850);
  await bag.getByRole('button', { name: 'Deposit equipment', exact: true }).click();
  await expect(chest.getByText('Cavern Keepsake', { exact: true })).toBeVisible();
  await expect
    .poll(async () => {
      const d = (await db.character.findUnique({ where: { id: c.id } })).data;
      return d.housing.furniture[0].storage?.gear.length;
    })
    .toBe(1);
  let stored = (await db.character.findUnique({ where: { id: c.id } })).data;
  expect(stored.housing.furniture[0].storage.gear[0]).toEqual(gear);
  await page.screenshot({ path: 'artifacts/chest-storage-desktop.png' });
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  await expect(page.locator('.site-header')).toBeVisible();
  await page.getByRole('button', { name: /Enter world/ }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await page.getByRole('button', { name: 'Housing', exact: true }).click();
  await page.getByRole('button', { name: 'Storage', exact: true }).click();
  await page.getByRole('button', { name: 'Chest 1 · Floor 1', exact: true }).click();
  await expect(chest.getByText('Cavern Keepsake', { exact: true })).toBeVisible();
  await chest.getByRole('button', { name: 'Withdraw equipment', exact: true }).click();
  await expect(bag.getByText('Cavern Keepsake', { exact: true })).toBeVisible();
  await page.waitForTimeout(850);
  await chest.getByRole('button', { name: 'Withdraw 1', exact: true }).click();
  await expect(chest.getByText('Empty', { exact: true })).toBeVisible();
  stored = (await db.character.findUnique({ where: { id: c.id } })).data;
  expect(stored.gear[0]).toEqual(gear);
  expect(stored.inventory.fang).toBe(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/chest-storage-mobile.png' });
  expect(errors).toEqual([]);
  console.log(
    'PASS chest deposits, withdrawals, full gear preservation, saved re-entry and desktop/mobile UI.',
  );
} finally {
  await browser.close();
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
