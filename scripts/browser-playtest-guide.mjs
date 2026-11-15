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
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let userId;
try {
  await mkdir('artifacts', { recursive: true });
  const guest = await fetch('http://localhost:2567/api/guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  }).then((r) => r.json());
  const row = await fetch('http://localhost:2567/api/characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${guest.token}` },
    body: JSON.stringify({ name: 'GuideTester' }),
  }).then((r) => r.json());
  userId = row.userId;
  await context.addInitScript((token) => localStorage.setItem('ros-session', token), guest.token);
  await page.goto('http://localhost:5173');
  console.log('Guide browser: landing loaded');
  await page
    .getByRole('button', { name: /Continue adventure|Play as guest|Continue your/ })
    .click();
  await page.getByRole('button', { name: /Enter world/ }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor({ timeout: 60000 });
  await expect(page.locator('.world-title h1')).toContainText('TEST BUILD');
  await page.getByRole('button', { name: 'Test guide and recovery', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your playtest companion.' })).toBeVisible();
  await expect(page.locator('.adventure-hint')).toContainText('Speak to Mira in Elderwood Village');
  await page.getByText('Gather and craft', { exact: true }).click();
  await expect(page.locator('.playtest-guide')).toContainText('collecting one unlocks its recipe');
  await expect(page.getByRole('link', { name: 'Report a bug in Discord' })).toHaveAttribute(
    'href',
    /1569416223228301433$/,
  );
  await page.screenshot({ path: 'artifacts/playtest-guide-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Unstuck', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Unstuck', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Return to Elderwood', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Confirm return to Elderwood' })).toContainText(
    'already in Elderwood',
  );
  await page.getByRole('button', { name: 'Stay here', exact: true }).click();
  const fits = await page
    .locator('.modal')
    .evaluate(
      (el) =>
        el.getBoundingClientRect().left >= 0 &&
        el.getBoundingClientRect().right <= innerWidth &&
        el.scrollWidth <= el.clientWidth + 1,
    );
  if (!fits) throw Error('Guide overflows mobile viewport');
  await page.screenshot({ path: 'artifacts/playtest-guide-mobile.png' });
  await page.getByRole('button', { name: 'Sound, display & AUTO settings', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Reduced visual effects', exact: true }).check();
  await page.getByRole('slider', { name: 'Effects volume', exact: true }).focus();
  await page.keyboard.press('Home');
  await page.getByRole('slider', { name: 'Music volume', exact: true }).focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('slider', { name: 'Effects volume', exact: true })).toHaveValue('0');
  await expect(page.getByRole('slider', { name: 'Music volume', exact: true })).toHaveValue('1');
  await page.screenshot({ path: 'artifacts/playtest-settings-mobile.png' });
  const second = await context.newPage();
  await second.goto('http://localhost:5173');
  const saved = await second.evaluate(async () => {
    const { realmAudio } = await import('/src/audio.ts');
    const { reducedEffects } = await import('/src/visual-settings.ts');
    return {
      effects: realmAudio.settings.effectsVolume,
      music: realmAudio.settings.musicVolume,
      reduced: reducedEffects(),
    };
  });
  if (saved.effects !== 0 || saved.music !== 0.01 || !saved.reduced)
    throw Error('Settings did not persist');
  if (errors.length) throw Error(errors.join('\n'));
  console.log(
    'Desktop/mobile guide, current quest, Discord links, recovery confirmation and independent audio/reduced effects persistence passed.',
  );
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
} finally {
  await browser.close();
  await new Promise((r) => setTimeout(r, 200));
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
