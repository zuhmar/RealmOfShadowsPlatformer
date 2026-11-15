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
    const v = await r.json();
    if (!r.ok) throw Error(v.error);
    return v;
  };
  const guest = await api('/guest', undefined, {}),
    row = await api('/characters', guest.token, { name: 'ClickWalker' });
  userId = row.userId;
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, hasTouch: true });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/src/game.ts*', async (route) => {
    const response = await route.fetch(),
      body = await response.text();
    if (!body.includes('return game;')) throw Error('Cannot instrument scene');
    await route.fulfill({
      response,
      body: body.replace(
        'return game;',
        'window.__moveGame=game; window.__moveBridge=bridge; return game;',
      ),
    });
  });
  await page.addInitScript((token) => localStorage.setItem('ros-session', token), guest.token);
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: /Continue adventure/ }).click();
  await page.getByRole('button', { name: /Enter world/ }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor({ timeout: 60000 });
  await page.waitForTimeout(500);
  const me = () =>
    page.evaluate(() => {
      const b = window.__moveBridge;
      return b.snapshot.players.find((p) => p.id === b.id);
    });
  const point = (x, y) =>
    page.evaluate(
      ({ x, y }) => {
        const c = window.__moveGame.scene.getScene('realm').cameras.main;
        const p = c.matrix.transformPoint(x, y);
        return { x: p.x - c.scrollX * c.zoom, y: p.y - c.scrollY * c.zoom };
      },
      { x, y },
    );
  const click = async (x, y, touch = false) => {
    const p = await point(x, y);
    expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, p)).toBe(
      'CANVAS',
    );
    if (touch) await page.touchscreen.tap(p.x, p.y);
    else await page.mouse.click(p.x, p.y);
  };
  const arrived = async (x, platform) => {
    await expect
      .poll(
        async () => {
          const p = await me();
          return p.platform === platform && p.grounded && !p.climbing && Math.abs(p.x - x) <= 9;
        },
        { timeout: 20000 },
      )
      .toBe(true);
  };
  await click(700, 690);
  await arrived(700, 'ground');
  const stopped = (await me()).x;
  await page.waitForTimeout(400);
  expect(Math.abs((await me()).x - stopped)).toBeLessThan(2);
  await click(620, 455, true);
  await arrived(620, 'terrace');
  expect((await me()).y).toBe(450);
  // A new destination replaces the old route instead of queuing behind it.
  await click(1050, 690);
  await page.waitForTimeout(100);
  await click(680, 455);
  await arrived(680, 'terrace');
  await click(1050, 690, true);
  await arrived(1050, 'ground');
  await click(1250, 690);
  await expect.poll(async () => (await me()).x).toBeGreaterThan(1070);
  await page.keyboard.down('a');
  await page.waitForTimeout(150);
  await page.keyboard.up('a');
  await page.waitForTimeout(200);
  const cancelled = (await me()).x;
  await page.waitForTimeout(450);
  expect(Math.abs((await me()).x - cancelled)).toBeLessThan(3);
  // Coordinates never move the character instantly, and invalid requests cannot teleport.
  await page.evaluate(() =>
    window.__moveBridge.send('approach', { kind: 'move', x: Infinity, y: 650 }),
  );
  await page.waitForTimeout(250);
  expect(Math.abs((await me()).x - cancelled)).toBeLessThan(3);
  expect((await me()).auto).toBe(false);
  expect((await me()).targetId).toBe(null);
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/click-to-move.png' });
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  expect(errors).toEqual([]);
  console.log(
    'PASS: actual mouse/touch world clicks walk to positions, use ladders between platforms in both directions, replace destinations, stop on arrival, cancel on manual input, and reject invalid coordinates.',
  );
} finally {
  await browser.close();
  await new Promise((r) => setTimeout(r, 200));
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
