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
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let userId, id;
const ready = () => page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
const enter = async () => {
  await page.reload();
  await page.getByRole('button', { name: /Continue adventure/ }).click();
  await page.getByRole('button', { name: 'Enter world' }).click();
  await ready();
};
const leave = async () => {
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  await expect(page.locator('.site-header')).toBeVisible();
};
try {
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: 'Play as guest' }).click();
  await page
    .getByRole('button', { name: /A story unwritten/ })
    .first()
    .click();
  await page.getByLabel('Character name', { exact: true }).fill('RewardTester');
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
      data: {
        ...c.data,
        x: 500,
        y: 650,
        bossKills: { 'forest-bear': 1 },
        inventory: {
          'wolf-pelt': 1,
          'thorn-silk': 1,
          'boar-tusk': 1,
          'bear-claw': 1,
          'forest-guardian-ring': 1,
        },
      },
    },
  });
  for (const questId of ['mira-wolves', 'mira-wolves-weapon-kit-v1']) {
    await db.quest.upsert({
      where: { id: questId },
      create: { id: questId, definition: {} },
      update: {},
    });
    await db.questProgress.create({
      data: { characterId: id, questId, progress: 5, claimed: true },
    });
  }
  await enter();
  await page.getByRole('button', { name: 'Bag', exact: true }).click();
  for (const name of [
    'Wolf Pelt',
    'Thorn Silk',
    'Boar Tusk',
    'Forest Bear Claw',
    'Forest Guardian Ring',
    'Forest Bear Trophy',
  ])
    await expect(page.getByRole('img', { name, exact: true })).toBeVisible();
  await page.screenshot({ path: 'artifacts/woods-loot-bag.png' });
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Character', exact: true }).click();
  await page.getByRole('button', { name: 'Equip Forest Guardian Ring', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Unequip Forest Guardian Ring', exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('.modal-backdrop').getByText('Attack', { exact: true }).locator('..'),
  ).toContainText('18');
  await page.screenshot({ path: 'artifacts/guardian-ring-equipped.png' });
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'World map', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Crystal Caverns', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Crystal Caverns access earned' })).toBeVisible();
  await expect(
    page.getByText('Access earned · four areas coming next', { exact: false }),
  ).toBeVisible();
  await page.screenshot({ path: 'artifacts/crystal-access-earned.png' });
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Interact', exact: true }).click();
  await page.getByRole('button', { name: 'Accept Silk and shadows', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Whispering Woods quest chain' })).toContainText(
    '0 / 30',
  );
  await expect(
    page.getByRole('button', { name: 'Accept Break the bramble line', exact: true }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/woods-quests-mobile.png' });
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await leave();
  let saved = await db.character.findUnique({ where: { id } });
  expect(saved.data.inventory['forest-bear-trophy']).toBe(1);
  expect(saved.data.gold).toBe(100);
  expect(saved.data.accessory).toBe('forest-guardian-ring');
  await db.questProgress.update({
    where: { characterId_questId: { characterId: id, questId: 'mira-spiders' } },
    data: { progress: 30 },
  });
  await enter();
  await page.getByRole('button', { name: 'Interact', exact: true }).click();
  await page.getByRole('button', { name: 'Claim Silk and shadows', exact: true }).click();
  await page.getByRole('button', { name: 'Accept Break the bramble line', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Whispering Woods quest chain' })).toContainText(
    '0 / 60',
  );
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await leave();
  saved = await db.character.findUnique({ where: { id } });
  expect(saved.data.gold).toBe(200);
  expect(saved.data.inventory.greenleaf).toBe(5);
  expect(saved.data.inventory['forest-bear-trophy']).toBe(1);
  expect(saved.data.quests['mira-boars'].progress).toBe(0);
  expect(errors).toEqual([]);
  console.log(
    'PASS: six loot sprites, legacy first-clear award exactly once, Crystal unlock display, ring equip/attack/save, gated 30→60 quest progression and durable turn-in.',
  );
} finally {
  await browser.close();
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
