import { chromium, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { MAPS, QUESTS } from '../packages/game-data/src/index.ts';
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
    const value = await r.json();
    if (!r.ok) throw Error(value.error);
    return value;
  };
  const guest = await api('/guest', undefined, {}),
    row = await api('/characters', guest.token, { name: 'JournalBrowser' });
  userId = row.userId;
  const npc = MAPS.village.npcs.find((n) => n.id === 'mira');
  const platform = MAPS.village.platforms.find(
    (f) => f.y === npc.y && npc.x >= f.x && npc.x <= f.x + f.width,
  );
  await db.character.update({
    where: { id: row.id },
    data: { data: { ...row.data, x: npc.x, y: npc.y, platform: platform.id, grounded: true } },
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((token) => localStorage.setItem('ros-session', token), guest.token);
  const enter = async () => {
    await page.goto('http://localhost:5173');
    await page.getByRole('button', { name: /Continue adventure/ }).click();
    await page.getByRole('button', { name: /Enter world/ }).click();
    await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor({ timeout: 60000 });
  };
  const openMira = async () => {
    await page.keyboard.down('e');
    await page.waitForTimeout(120);
    await page.keyboard.up('e');
    await expect(
      page.getByRole('heading', { name: 'Mira · Village guide', exact: true }),
    ).toBeVisible();
  };
  await enter();
  await openMira();
  await expect(page.getByRole('img', { name: 'Mira', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Wolf', exact: true })).toBeVisible();
  await expect(page.locator('.journal-reward')).toHaveCount(5);
  await expect(page.locator('.quest-dialogue')).toContainText('trained for years');
  await page.getByRole('button', { name: 'Accept quest', exact: true }).click();
  await expect(page.locator('.quest-status')).toHaveText('In progress');
  await expect
    .poll(
      async () =>
        (
          await db.questProgress.findUnique({
            where: { characterId_questId: { characterId: row.id, questId: 'mira-wolves' } },
          })
        )?.progress,
    )
    .toBe(0);
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Open journal', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Adventure journal', exact: true })).toBeVisible();
  for (const [island, monster] of [
    ['Crystal Caverns', 'Cave Bat'],
    ['Murkmire Swamp', 'Bog Slime'],
    ['Frostfall Tundra', 'Frost Wolf'],
  ]) {
    await page
      .getByRole('navigation', { name: 'Island chapters' })
      .getByRole('button', { name: new RegExp(island) })
      .click();
    await expect(page.getByRole('img', { name: monster, exact: true })).toBeVisible();
    await expect(page.locator('.quest-status')).toHaveText('Locked');
    await expect(page.getByRole('button', { name: /Talk to/ })).toBeDisabled();
  }
  await page
    .getByRole('navigation', { name: 'Island chapters' })
    .getByRole('button', { name: /Whispering Woods/ })
    .click();
  await page
    .getByRole('navigation', { name: 'Whispering Woods quests' })
    .getByRole('button', { name: /The first trial/ })
    .click();
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.journal-view image')].every((i) =>
      Boolean(i.getAttribute('href')),
    ),
  );
  const panelStyle = await page
    .locator('.journal-view')
    .evaluate((el) => ({
      background: getComputedStyle(el).backgroundColor,
      shadow: getComputedStyle(el).boxShadow,
    }));
  expect(panelStyle).toEqual({ background: 'rgba(0, 0, 0, 0)', shadow: 'none' });
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/journal-desktop.png' });
  await page.getByRole('button', { name: 'Your story', exact: true }).click();
  await expect(page.locator('.journal-story')).toContainText('Shadow Dragon');
  await expect(page.locator('.journal-story')).not.toContainText('stolen');
  await page.getByRole('button', { name: 'Bram’s forge', exact: true }).click();
  await expect(page.locator('.forge-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Quests', exact: true }).click();
  for (const [width, height] of [
    [390, 844],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    const overflow = await page
      .locator('.journal-view')
      .evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    expect(overflow).toBe(false);
    await page.screenshot({ path: `artifacts/journal-${width}.png` });
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('.journal-view')).toHaveCount(0);
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  await page.waitForTimeout(500);
  await db.questProgress.update({
    where: { characterId_questId: { characterId: row.id, questId: 'mira-wolves' } },
    data: { progress: QUESTS['mira-wolves'].target.count },
  });
  await page.setViewportSize({ width: 1280, height: 950 });
  await enter();
  await openMira();
  await expect(page.locator('.quest-status')).toHaveText('Ready to turn in');
  await page.getByRole('button', { name: 'Claim rewards', exact: true }).click();
  await expect(page.locator('.quest-status')).toHaveText('Completed');
  await expect(page.getByRole('button', { name: 'Claim rewards', exact: true })).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (
          await db.questProgress.findUnique({
            where: { characterId_questId: { characterId: row.id, questId: 'mira-wolves' } },
          })
        )?.claimed,
    )
    .toBe(true);
  await page.screenshot({ path: 'artifacts/journal-quest-complete.png' });
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  expect(errors).toEqual([]);
  console.log(
    'PASS: generated transparent journal, all island chapters and sprites, rewards, story spoiler gate, crafting, mobile layouts, live acceptance and durable reward claim.',
  );
} finally {
  await browser.close();
  await new Promise((r) => setTimeout(r, 200));
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
