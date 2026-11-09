import { chromium, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { mkdir } from 'node:fs/promises';
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://realm:realm@localhost:5432/realm',
  }),
});
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
let userId;
const errors = [];
async function api(path, token, body) {
  const r = await fetch('http://localhost:2567/api' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error);
  return data;
}
try {
  await mkdir('artifacts', { recursive: true });
  const guest = await api('/guest', null, {});
  for (const name of ['CarouselOne', 'CarouselTwo']) {
    const c = await api('/characters', guest.token, { name, appearance: 'male', outfit: 'sage' });
    userId = c.userId;
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, hasTouch: true });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((token) => localStorage.setItem('ros-session', token), guest.token);
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: /Continue adventure/ }).click();
  const carousel = page.getByRole('region', { name: 'Character selection', exact: true });
  await expect(carousel.locator('.character-card')).toHaveCount(1);
  await expect(carousel.getByRole('heading', { name: 'CarouselOne', exact: true })).toBeVisible();
  const backgrounds = await carousel.locator('.character-card').evaluate((e) => {
    const c = getComputedStyle(e);
    return [c.backgroundImage, c.backgroundColor, c.boxShadow, c.borderTopWidth];
  });
  expect(backgrounds).toEqual(['none', 'rgba(0, 0, 0, 0)', 'none', '0px']);
  await page.waitForFunction(
    () => document.querySelector('.class-sprite')?.getAttribute('aria-busy') === 'false',
  );
  await page.screenshot({ path: 'artifacts/character-carousel-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Next adventurer', exact: true }).click();
  await expect(carousel.getByRole('heading', { name: 'CarouselTwo', exact: true })).toBeVisible();
  await carousel.focus();
  await page.keyboard.press('ArrowRight');
  await expect(carousel.locator('.empty-slot')).toHaveCount(1);
  await page.keyboard.press('ArrowLeft');
  await expect(carousel.getByRole('heading', { name: 'CarouselTwo', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Show character slot 3', exact: true }).click();
  await page.getByRole('button', { name: /A story unwritten/ }).click();
  await page.getByLabel('Character name', { exact: true }).fill('CarouselThree');
  await page.getByRole('button', { name: /Create adventurer/ }).click();
  await expect(carousel.getByRole('heading', { name: 'CarouselThree', exact: true })).toBeVisible();
  await expect(carousel.getByRole('status')).toContainText('Slot 3 of 3');
  await expect(carousel.getByRole('button', { name: 'Assign activity', exact: true })).toHaveCount(
    1,
  );
  await page.getByRole('button', { name: 'Delete CarouselThree', exact: true }).click();
  await page.getByLabel('Confirm character name').fill('CarouselThree');
  await page.getByRole('button', { name: 'Delete permanently', exact: true }).click();
  await expect(carousel.locator('.empty-slot')).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Show character slot 1', exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector('.class-sprite')?.getAttribute('aria-busy') === 'false',
  );
  await page.screenshot({ path: 'artifacts/character-carousel-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const box = await carousel.locator('.portrait-big').boundingBox();
  const cdp = await page.context().newCDPSession(page),
    x = box.x + box.width * 0.75,
    y = box.y + box.height * 0.5;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: x - 100, y }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(carousel.getByRole('heading', { name: 'CarouselTwo', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Enter world/ }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await expect(page.locator('.world-title')).toContainText('Elderwood Village');
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  await expect(carousel.getByRole('heading', { name: 'CarouselTwo', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'PASS one visible slot, panel-free styling, arrows, dots, keyboard, mobile swipe, creation selects new character, deletion, offline controls, world entry and return.',
  );
} finally {
  await browser.close();
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
