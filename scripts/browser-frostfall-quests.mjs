import { chromium, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { mkdir } from 'node:fs/promises';
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
let userId;
try {
  const api = async (path, token, body) => {
    const r = await fetch('http://localhost:2567/api' + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const result = await r.json();
    if (!r.ok) throw Error(result.error);
    return result;
  };
  const guest = await api('/guest', undefined, {}),
    row = await api('/characters', guest.token, { name: 'WardenBrowser' });
  userId = row.userId;
  const { MAPS, QUESTS } = await import('../packages/game-data/src/index.ts');
  const npc = MAPS.frostfall.npcs.find((n) => n.id === 'frostwarden');
  const platform = MAPS.frostfall.platforms.find(
    (f) => f.y === npc.y && npc.x >= f.x && npc.x <= f.x + f.width,
  );
  await db.quest.upsert({
    where: { id: 'murkmire-hydra' },
    create: { id: 'murkmire-hydra', definition: QUESTS['murkmire-hydra'] },
    update: {},
  });
  await db.questProgress.create({
    data: { characterId: row.id, questId: 'murkmire-hydra', progress: 1, claimed: true },
  });
  await db.character.update({
    where: { id: row.id },
    data: {
      data: {
        ...row.data,
        mapId: 'frostfall',
        level: 40,
        x: npc.x,
        y: npc.y,
        platform: platform.id,
        grounded: true,
        bossKills: { hydra: 1 },
        quests: { 'murkmire-hydra': { progress: 1, claimed: true } },
      },
    },
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((token) => localStorage.setItem('ros-session', token), guest.token);
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: /Continue adventure/ }).click();
  await page.getByRole('button', { name: /Enter world/ }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor({ timeout: 60000 });
  await page.keyboard.down('e');
  await page.waitForTimeout(120);
  await page.keyboard.up('e');
  await expect(
    page.getByRole('heading', { name: 'Frost Warden · Frostfall Tundra', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Accept quest', exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await db.questProgress.findUnique({
            where: { characterId_questId: { characterId: row.id, questId: 'frostfall-wolves' } },
          })
        )?.progress,
    )
    .toBe(0);
  await expect(
    page
      .locator('.quest-card')
      .filter({ has: page.getByRole('heading', { name: 'Tracks beneath the snow', exact: true }) }),
  ).toContainText('In progress');
  await page.setViewportSize({ width: 390, height: 844 });
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/frost-warden-quest-mobile.png' });
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  if (errors.length) throw Error(errors.join('\n'));
  console.log(
    'PASS: real Frost Warden interaction, visible quest popup, acceptance, durable progress and mobile layout.',
  );
} finally {
  await browser.close();
  await new Promise((r) => setTimeout(r, 200));
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
