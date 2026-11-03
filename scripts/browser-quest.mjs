import { chromium, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { mkdir } from 'node:fs/promises';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://realm:realm@localhost:5432/realm',
  }),
});
let userId;
const ready = () => page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
const close = () => page.getByRole('button', { name: 'Close panel' }).click();
async function walk(key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  await page.waitForTimeout(100);
}
try {
  await page.goto('http://localhost:5173');
  await expect(page.locator('.hero p')).toContainText('Shadow Dragon');
  await page.getByRole('button', { name: 'Play as guest' }).click();
  await page
    .getByRole('button', { name: /A story unwritten/ })
    .first()
    .click();
  await page.getByLabel('Character name', { exact: true }).fill('Survivor');
  await page.getByRole('button', { name: 'Create adventurer' }).click();
  const token = await page.evaluate(() => localStorage.getItem('ros-session'));
  const cs = await fetch('http://localhost:2567/api/characters', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  userId = cs.characters[0].userId;
  await page.getByRole('button', { name: 'Enter world' }).click();
  await ready();
  await walk('d', 1000);
  await page.keyboard.press('e');
  await expect(page.getByRole('heading', { name: 'Mira · Village guide' })).toBeVisible();
  await expect(page.locator('.npc-dialog')).toContainText('trained for years');
  await page.screenshot({ path: 'artifacts/mira-quest-offer.png', fullPage: true });
  await page.getByRole('button', { name: 'Accept quest', exact: true }).click();
  await expect(page.locator('.quest-status')).toHaveText('In progress');
  await close();
  await walk('d', 5750);
  await page.keyboard.press('e');
  await expect(page.getByRole('heading', { name: 'Wolf Hollow' })).toBeVisible({ timeout: 10000 });
  await ready();
  await page.getByRole('button', { name: /AUTO OFF/ }).click();
  await expect(page.locator('.objective')).toContainText('Return to Mira · reward ready', {
    timeout: 120000,
  });
  await page.getByRole('button', { name: /AUTO ON/ }).click();
  await expect(page.getByRole('button', { name: /AUTO OFF/ })).toBeVisible();
  // Return through the actual map and portal, dropping through any upper platforms first.
  for (let i = 0; i < 4; i++) {
    const y = await page.locator('.mini-map b').evaluate((el) => parseFloat(el.style.top));
    if (y >= 84.3) break;
    await page.keyboard.down('s');
    await page.keyboard.down('Space');
    await page.waitForTimeout(250);
    await page.keyboard.up('Space');
    await page.keyboard.up('s');
    await page.waitForTimeout(1100);
  }
  await walk('a', 12000);
  await page.keyboard.press('e');
  await expect(page.getByRole('heading', { name: 'Elderwood Village' })).toBeVisible({
    timeout: 10000,
  });
  await ready();
  await walk('d', 1000);
  await page.keyboard.press('e');
  await expect(page.locator('.quest-status')).toHaveText('Ready to turn in');
  const gold = Number((await page.locator('.wallet b').innerText()).replaceAll(',', ''));
  await page.getByRole('button', { name: 'Claim rewards', exact: true }).click();
  await expect(page.locator('.quest-status')).toHaveText('Completed');
  await expect(page.locator('.wallet b')).toHaveText(String(gold + 75));
  await page.screenshot({ path: 'artifacts/mira-quest-complete.png', fullPage: true });
  await close();
  for (const [name, trial] of [
    ['Elderwood Blade', 'Knight'],
    ['Elderwood Bow', 'Archer'],
    ['Elderwood Staff', 'Mage'],
    ['Elderwood Dagger', 'Rogue'],
    ['Elderwood Blade', 'Knight'],
  ]) {
    await page.getByRole('button', { name: /Bag/ }).click();
    const cell = page.locator('.inventory-cell').filter({ hasText: name });
    await cell.click();
    await cell.getByRole('button', { name: 'Equip', exact: true }).click();
    await expect(page.locator('.inventory-summary')).toContainText(name);
    await close();
    await expect(page.locator('.player-name span')).toHaveText(`${trial} trial`);
  }
  await page.screenshot({ path: 'artifacts/mira-blade-equipped.png', fullPage: true });
  await page.getByRole('button', { name: 'Leave world' }).click();
  await expect(page.getByRole('heading', { name: /Your adventurers/ })).toBeVisible();
  await page.getByRole('button', { name: 'Enter world' }).click();
  await ready();
  await expect(page.locator('.objective')).toContainText('First trial complete');
  await page.keyboard.press('e');
  await expect(page.locator('.quest-status')).toHaveText('Completed');
  await expect(page.getByRole('button', { name: 'Claim rewards', exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/mira-quest-mobile.png', fullPage: true });
  await close();
  await page.getByRole('button', { name: 'Leave world' }).click();
  expect(errors).toEqual([]);
  console.log(
    'PASS: storyline, live Mira dialogue/acceptance, real portal travel, fifteen AUTO Wolf kills, return trip, single reward, all four weapons equipped, saved completion and mobile journal.',
  );
} catch (e) {
  await page.screenshot({ path: 'artifacts/quest-browser-failure.png', fullPage: true });
  console.error('Quest browser failure:', await page.locator('h1').allTextContents(), errors);
  throw e;
} finally {
  await browser.close();
  if (userId) {
    await new Promise((r) => setTimeout(r, 500));
    await db.user.delete({ where: { id: userId } });
  }
  await db.$disconnect();
}
