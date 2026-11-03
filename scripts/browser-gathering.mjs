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
const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let userId, characterId;
try {
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: 'Play as guest' }).click();
  await page
    .getByRole('button', { name: /A story unwritten/ })
    .first()
    .click();
  await page.getByLabel('Character name', { exact: true }).fill('FishTester');
  await page.getByRole('button', { name: 'Create adventurer' }).click();
  const token = await page.evaluate(() => localStorage.getItem('ros-session'));
  const result = await fetch('http://localhost:2567/api/characters', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const c = result.characters[0];
  userId = c.userId;
  characterId = c.id;
  await db.character.update({
    where: { id: c.id },
    data: {
      data: { ...c.data, mapId: 'woods', x: 140, y: 760, platform: 'ground', grounded: true },
    },
  });
  await page.reload();
  await page.getByRole('button', { name: /Continue adventure/ }).click();
  await page.getByRole('button', { name: 'Enter world' }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await page.keyboard.down('w');
  await page.waitForTimeout(1700);
  await page.keyboard.up('w');
  await page.keyboard.down('d');
  await page.waitForTimeout(550);
  await page.keyboard.up('d');
  await expect(page.locator('.world-hint')).toContainText('E • Fishing', { timeout: 5000 });
  await page.getByRole('button', { name: 'Interact', exact: true }).click();
  await expect(page.locator('.world-hint')).toContainText('Fishing…');
  await page.screenshot({ path: 'artifacts/fishing-active-desktop.png' });
  await page.waitForTimeout(4300);
  await page.getByRole('button', { name: 'Bag', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Brook Trout', exact: true })).toBeVisible();
  await page.screenshot({ path: 'artifacts/fishing-inventory.png' });
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Character', exact: true }).click();
  await expect(page.locator('.stat-grid').filter({ hasText: 'Fishing' })).toContainText(
    'Lv. 1 · 10/20 XP',
  );
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  await page.screenshot({ path: 'artifacts/fishing-pond-mobile.png' });
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  await expect(page.locator('.site-header')).toBeVisible();
  const saved = await db.character.findUnique({ where: { id: characterId } });
  expect(saved.data.inventory['brook-trout']).toBe(1);
  expect(saved.data.gatheringSkills.Fishing.xp).toBe(10);
  expect(errors).toEqual([]);
  console.log(
    'PASS: player climbs to fishing dock, catches a trout, sees resource sprite and skill XP, mobile pond renders, inventory/skills save on logout.',
  );
} finally {
  await browser.close();
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
