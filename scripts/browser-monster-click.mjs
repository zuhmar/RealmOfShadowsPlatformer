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
    row = await api('/characters', guest.token, { name: 'MonsterClick' });
  userId = row.userId;
  await db.character.update({
    where: { id: row.id },
    data: {
      data: {
        ...row.data,
        mapId: 'woods',
        x: 180,
        y: 760,
        platform: 'ground',
        grounded: true,
        level: 10,
        hp: 208,
        inventory: { 'elderwood-blade': 1 },
        weapon: 'elderwood-blade',
      },
    },
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/src/game.ts*', async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    if (!body.includes('return game;')) throw Error('Cannot instrument scene');
    await route.fulfill({
      response,
      body: body.replace(
        'return game;',
        'window.__monsterGame = game; window.__monsterBridge = bridge; return game;',
      ),
    });
  });
  await page.addInitScript((token) => localStorage.setItem('ros-session', token), guest.token);
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: /Continue adventure/ }).click();
  await page.getByRole('button', { name: /Enter world/ }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor({ timeout: 60000 });
  await page.waitForTimeout(500);
  const state = () =>
    page.evaluate(() => {
      const b = window.__monsterBridge;
      return { me: b.snapshot.players.find((p) => p.id === b.id), wolves: b.snapshot.wolves };
    });
  const point = (id) =>
    page.evaluate((id) => {
      const scene = window.__monsterGame.scene.getScene('realm'),
        sprite = scene.wolves.get(id).sprite;
      const frame = sprite.frame,
        texture = sprite.texture.key;
      for (let y = Math.floor(frame.height * 0.55); y < frame.height * 0.75; y += 2) {
        for (let x = Math.floor(frame.width * 0.5); x < frame.width * 0.7; x += 2) {
          if (
            [
              [0, 0],
              [-8, 0],
              [8, 0],
              [0, -8],
              [0, 8],
            ].some(
              ([dx, dy]) => scene.textures.getPixelAlpha(x + dx, y + dy, texture, frame.name) < 150,
            )
          )
            continue;
          const localX = (sprite.flipX ? frame.width - x : x) - sprite.displayOriginX;
          const world = sprite
            .getWorldTransformMatrix()
            .transformPoint(localX, y - sprite.displayOriginY);
          const camera = scene.cameras.main;
          return {
            x: (world.x - camera.worldView.x) * camera.zoom,
            y: (world.y - camera.worldView.y) * camera.zoom,
          };
        }
      }
      throw Error('No opaque monster pixel');
    }, id);
  const first = (await state()).wolves.find((w) => w.hp > 0 && w.platform === 'ground').id;
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/click-monster-before.png' });
  let click = await point(first);
  await page.mouse.click(click.x, click.y);
  await expect.poll(async () => (await state()).me.targetId).toBe(first);
  await expect.poll(async () => (await state()).me.x).toBeGreaterThan(200);
  const alternate = (await state()).wolves.find((w) => w.hp > 0 && w.platform === 'moss').id;
  const switched = await point(alternate);
  await page.mouse.click(switched.x, switched.y);
  await expect.poll(async () => (await state()).me.targetId).toBe(alternate);
  await page.keyboard.down('a');
  await page.waitForTimeout(150);
  await page.keyboard.up('a');
  await expect.poll(async () => (await state()).me.targetId).toBe(null);
  const stopped = (await state()).me.x;
  await page.waitForTimeout(450);
  expect(Math.abs((await state()).me.x - stopped)).toBeLessThan(12);
  await page.screenshot({ path: 'artifacts/click-monster-touch.png' });
  click = await point(first);
  await page.touchscreen.tap(click.x, click.y);
  // A nearly defeated monster may die and clear selection before the next snapshot.
  await expect
    .poll(async () => {
      const s = await state();
      return (
        s.me.targetId === first || (s.me.kills > 0 && s.wolves.find((w) => w.id === first).hp <= 0)
      );
    })
    .toBe(true);
  await expect.poll(async () => (await state()).me.kills, { timeout: 20000 }).toBeGreaterThan(0);
  await expect.poll(async () => (await state()).me.targetId).toBe(null);
  const done = await state();
  expect(done.me.auto).toBe(false);
  expect(done.me.lastSkill).toBe(0);
  await page.waitForTimeout(1200);
  expect((await state()).me.kills).toBe(done.me.kills);
  // Invalid targets must neither move nor restart combat.
  await page.evaluate(() =>
    window.__monsterBridge.send('approach', { kind: 'monster', id: 'not-a-monster' }),
  );
  await page.waitForTimeout(250);
  expect((await state()).me.targetId).toBe(null);
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/click-monster-combat.png' });
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  expect(errors).toEqual([]);
  console.log(
    'PASS: real mouse/touch monster clicks walk into range, manual movement cancels, basic attacks kill the selected enemy, and combat stops without retargeting or spending mana. Invalid targets are rejected.',
  );
} finally {
  await browser.close();
  await new Promise((r) => setTimeout(r, 200));
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
