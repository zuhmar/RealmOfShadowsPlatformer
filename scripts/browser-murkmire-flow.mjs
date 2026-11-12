import { chromium, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let userId;
try {
  const guest = await fetch('http://localhost:2567/api/guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  }).then((r) => r.json());
  const c = await fetch('http://localhost:2567/api/characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${guest.token}` },
    body: JSON.stringify({ name: 'MireScout', appearance: 'male', outfit: 'sage' }),
  }).then((r) => r.json());
  userId = c.userId;
  await db.quest.upsert({
    where: { id: 'crystal-wyrm' },
    create: { id: 'crystal-wyrm', definition: {} },
    update: {},
  });
  await db.questProgress.create({
    data: { characterId: c.id, questId: 'crystal-wyrm', progress: 1, claimed: true },
  });
  await db.character.update({
    where: { id: c.id },
    data: {
      data: {
        ...c.data,
        mapId: 'murkmire',
        x: 340,
        y: 420,
        platform: 'warden-ledge',
        grounded: true,
        level: 30,
        hp: 500,
        bossKills: { 'crystal-wyrm': 1 },
        unlockedIslands: ['woods', 'crystal', 'murkmire'],
        quests: { 'crystal-wyrm': { progress: 1, claimed: true } },
      },
    },
  });
  await page.addInitScript((token) => localStorage.setItem('ros-session', token), guest.token);
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: /Continue adventure/ }).click();
  await page.getByRole('button', { name: /Enter world/ }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await page.keyboard.press('e');
  await expect(
    page.getByRole('heading', { name: 'Mire Warden · Murkmire Swamp', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.crystal-quests')).toContainText('180 Bog Slimes');
  await page.getByRole('button', { name: 'Accept quest', exact: true }).click();
  await expect(page.locator('.quest-card').first()).toContainText('In progress');
  await page.screenshot({ path: 'artifacts/murkmire-warden-quest.png' });
  await page.getByRole('button', { name: 'Close panel' }).click();
  await page.keyboard.down('s');
  await page.keyboard.down('Space');
  await page.waitForTimeout(250);
  await page.keyboard.up('Space');
  await page.keyboard.up('s');
  await page.waitForTimeout(1000);
  await page.keyboard.down('s');
  await page.keyboard.down('Space');
  await page.waitForTimeout(250);
  await page.keyboard.up('Space');
  await page.keyboard.up('s');
  await page.waitForTimeout(1200);
  // The live server accepted and saved the new NPC quest from its required ledge.
  const saved = await db.questProgress.findUnique({
    where: { characterId_questId: { characterId: c.id, questId: 'murkmire-slimes' } },
  });
  expect(saved?.claimed).toBe(false);
  expect(saved?.progress).toBe(0);
  expect(errors).toEqual([]);
  console.log(
    'Live Murkmire NPC interaction opens the quest dialog and accepts/persists the gated quest.',
  );
} finally {
  await browser.close();
  await new Promise((r) => setTimeout(r, 400));
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
