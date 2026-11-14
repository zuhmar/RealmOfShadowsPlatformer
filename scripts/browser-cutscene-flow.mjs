import { chromium, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createPlayer } from '@ros/shared';
import { MAPS } from '@ros/game-data';
const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  }),
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] }),
  page = await browser.newPage({ viewport: { width: 1100, height: 750 } }),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let uid;
try {
  const guest = await fetch('http://localhost:2567/api/guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  }).then((r) => r.json());
  const row = await fetch('http://localhost:2567/api/characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${guest.token}` },
    body: JSON.stringify({ name: 'FilmFlow' }),
  }).then((r) => r.json());
  uid = row.userId;
  const p = createPlayer(row.id, row.name, 'village'),
    npc = MAPS.village.npcs.find((n) => n.id === 'mira');
  Object.assign(p, {
    x: npc.x,
    y: npc.y,
    platform:
      MAPS.village.platforms.find((f) => f.y === npc.y && npc.x >= f.x && npc.x <= f.x + f.width)
        ?.id ?? 'ground',
  });
  await db.character.update({ where: { id: p.id }, data: { data: JSON.parse(JSON.stringify(p)) } });
  await page.addInitScript((token) => localStorage.setItem('ros-session', token), guest.token);
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: /Continue adventure/ }).click();
  await page.getByRole('button', { name: /Enter world/ }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await page.keyboard.press('e');
  await page.getByRole('button', { name: 'Accept quest', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'The promise that survived' })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator('.cinema-loading')).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/cutscene-live-first-quest.png' });
  const watched = (await db.character.findUniqueOrThrow({ where: { id: p.id } })).data;
  expect(watched.seenCutscenes).toContain('chapter-woods');
  await page.getByRole('button', { name: 'Skip scene' }).click();
  await expect(page.locator('.cinema')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close panel' }).click();
  await page.getByRole('button', { name: 'Journal', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Memories', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'The promise that survived', exact: true }).click();
  await expect(page.locator('.cinema')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.cinema')).toHaveCount(0);
  expect(errors).toEqual([]);
  console.log(
    'Real app quest acceptance automatically starts the film, Skip returns to the NPC, the character receipt persists, and Journal replay/Escape work.',
  );
} finally {
  await browser.close();
  await new Promise((r) => setTimeout(r, 300));
  if (uid) await db.user.delete({ where: { id: uid } });
  await db.$disconnect();
}
