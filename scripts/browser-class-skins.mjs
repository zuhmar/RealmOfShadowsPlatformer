import { chromium, expect } from '@playwright/test';
import { db } from '../apps/server/src/db.ts';
import { createPlayer } from '../packages/shared/src/index.ts';
import { QUESTS } from '../packages/game-data/src/index.ts';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } }),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('/assets/')) errors.push(`${r.status()} ${r.url()}`);
});
let userId;
async function api(path, token, body) {
  const r = await fetch(`http://localhost:2567/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error);
  return d;
}
try {
  await mkdir('artifacts', { recursive: true });
  const guest = await api('/guest', undefined, {}),
    c = await api('/characters', guest.token, { name: 'ClassCarousel' });
  userId = c.userId;
  const p = createPlayer(c.id, c.name, 'crystal');
  Object.assign(p, {
    level: 20,
    gold: 1000,
    x: 350,
    y: 400,
    platform: 'mentor-ledge',
    grounded: true,
    bossKills: { 'forest-bear': 1 },
    unlockedIslands: ['crystal'],
    visitedAreas: ['village', 'woods', 'crystal'],
    inventory: { 'elderwood-blade': 1 },
  });
  await db.character.update({ where: { id: p.id }, data: { data: JSON.parse(JSON.stringify(p)) } });
  for (const id of ['mira-bear', 'crystal-class-trial']) {
    const q = QUESTS[id];
    await db.quest.upsert({ where: { id }, create: { id, definition: q }, update: {} });
    await db.questProgress.create({
      data: {
        characterId: p.id,
        questId: id,
        progress: q.target.count,
        claimed: id === 'mira-bear',
      },
    });
  }
  await page.addInitScript((token) => localStorage.setItem('ros-session', token), guest.token);
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: /Continue adventure/ }).click();
  await page.getByRole('button', { name: 'Enter world' }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await expect(page.getByRole('dialog', { name: 'Choose your class' })).toHaveCount(0);
  await page.keyboard.press('e');
  await page.getByRole('button', { name: 'Claim reward', exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Choose your class' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Knight', exact: true })).toBeVisible();
  await expect(dialog.getByRole('img', { name: 'male knight skin' })).toHaveAttribute(
    'aria-busy',
    'false',
  );
  await page.screenshot({ path: 'artifacts/class-carousel-knight.png' });
  await dialog.getByRole('button', { name: 'Next class', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Archer', exact: true })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByRole('heading', { name: 'Mage', exact: true })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByRole('heading', { name: 'Rogue', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/class-carousel-mobile.png' });
  expect(await dialog.evaluate((el) => el.getBoundingClientRect().right <= innerWidth)).toBe(true);
  const goldBeforeChoice = (await db.character.findUniqueOrThrow({ where: { id: p.id } })).data
    .gold;
  await dialog.getByRole('button', { name: 'View Knight', exact: true }).click();
  await dialog.getByRole('button', { name: 'Choose this class' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Character', exact: true }).click();
  await page.getByRole('button', { name: 'Change skin', exact: true }).click();
  const skins = page.getByRole('dialog', { name: 'Change your skin' });
  await skins.getByRole('button', { name: 'View Mage', exact: true }).click();
  await skins.getByRole('button', { name: 'Wear this skin' }).click();
  await expect(skins).toBeHidden();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  const saved = (await db.character.findUniqueOrThrow({ where: { id: p.id } })).data;
  expect(saved.classId).toBe('knight');
  expect(saved.skin).toBe('mage');
  expect(saved.gold).toBe(goldBeforeChoice);
  await page.getByRole('button', { name: 'Enter world' }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await page.screenshot({ path: 'artifacts/class-skin-live-mobile.png' });
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  expect(errors).toEqual([]);
  console.log(
    'PASS: quest claim opens class carousel, keyboard/mobile browsing, free class choice, free independent skin switch and save/re-entry.',
  );
} finally {
  await browser.close();
  await new Promise((r) => setTimeout(r, 250));
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
