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
let userId, characterId;
try {
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: 'Play as guest' }).click();
  await page
    .getByRole('button', { name: /A story unwritten/ })
    .first()
    .click();
  await page.getByLabel('Character name', { exact: true }).fill('ForgeTester');
  await page.getByRole('button', { name: 'Create adventurer' }).click();
  const token = await page.evaluate(() => localStorage.getItem('ros-session'));
  const chars = await fetch('http://localhost:2567/api/characters', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const c = chars.characters[0];
  userId = c.userId;
  characterId = c.id;
  await db.character.update({
    where: { id: c.id },
    data: {
      data: {
        ...c.data,
        unlockedRecipes: [
          'iron-bar',
          'iron-pickaxe',
          'woods-sword',
          'trout-skewers',
          'greenleaf-health-potion',
          'greenleaf-mana-potion',
        ],
        x: 900,
        y: 650,
        inventory: { 'iron-ore': 100, 'oak-logs': 20 },
      },
    },
  });
  await page.reload();
  await page.getByRole('button', { name: /Continue adventure/ }).click();
  await page.getByRole('button', { name: 'Enter world' }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await page.getByRole('button', { name: 'Interact', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bram’s Forge' })).toBeVisible();
  await page.getByRole('button', { name: 'Accept Bram’s quest', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Forge recipes/ })).toBeVisible();
  for (let i = 1; i <= 5; i++) {
    await page.getByRole('button', { name: 'Smelt', exact: true }).click();
    await expect(page.locator('.forge-panel')).toContainText(`Iron Bars smelted: ${i}/5`);
  }
  const pickaxe = page.locator('.forge-recipes section').filter({ hasText: 'Iron Pickaxe' });
  await pickaxe.getByRole('button', { name: 'Forge', exact: true }).click();
  await expect(pickaxe.getByRole('button', { name: 'Owned', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Claim Bram’s reward', exact: true }).click();
  await expect(page.locator('.forge-panel')).toContainText('Quest complete.');
  await page.screenshot({ path: 'artifacts/bram-forge-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/bram-forge-mobile.png' });
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Character', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Equip wooden Pickaxe', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Equip iron Pickaxe', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Equip iron Pickaxe', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: 'artifacts/iron-tool-equipped.png' });
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  await expect(page.locator('.site-header')).toBeVisible();
  let saved = await db.character.findUnique({ where: { id: characterId } });
  expect(saved.data.inventory['iron-ore'] ?? 0).toBe(0);
  expect(saved.data.inventory['iron-bar'] ?? 0).toBe(0);
  expect(saved.data.inventory['oak-logs'] ?? 0).toBe(0);
  expect(saved.data.gold).toBe(25);
  expect(saved.data.equippedTools.Mining).toBe('iron-pickaxe');
  expect(saved.data.ownedTools).toEqual(['iron-pickaxe']);
  expect(saved.data.forgeQuest.claimed).toBe(true);
  await db.character.update({
    where: { id: characterId },
    data: {
      data: {
        ...saved.data,
        mapId: 'woods',
        x: 2250,
        y: 555,
        platform: 'mining-ledge',
        grounded: true,
      },
    },
  });
  await page.reload();
  await page.getByRole('button', { name: /Continue adventure/ }).click();
  await page.getByRole('button', { name: 'Enter world' }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await page.getByRole('button', { name: 'Interact', exact: true }).click();
  await expect(page.locator('.world-hint')).toContainText('Mining…');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'artifacts/iron-pickaxe-mining.png' });
  await page.waitForTimeout(2200);
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  await expect(page.locator('.site-header')).toBeVisible();
  saved = await db.character.findUnique({ where: { id: characterId } });
  expect(saved.data.inventory['iron-ore']).toBeGreaterThanOrEqual(1);
  expect(saved.data.inventory['iron-ore']).toBeLessThanOrEqual(3);
  expect(saved.data.forgeQuest.claimed).toBe(true);
  expect(errors).toEqual([]);
  console.log(
    'PASS: Bram quest,5 smelts at20ore each,5bar/20log tool cost,manual equip, durable quest/tool state and upgraded mining.',
  );
} finally {
  await browser.close();
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
