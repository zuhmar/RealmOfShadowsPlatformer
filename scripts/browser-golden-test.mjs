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
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
let userId;
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await mkdir('artifacts', { recursive: true });
  const guest = await fetch('http://localhost:2567/api/guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  }).then((r) => r.json());
  const c = await fetch('http://localhost:2567/api/characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${guest.token}` },
    body: JSON.stringify({ name: 'GoldenTester' }),
  }).then((r) => r.json());
  userId = c.userId;
  await page.addInitScript((token) => localStorage.setItem('ros-session', token), guest.token);
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: /Continue adventure/ }).click();
  await page.getByRole('button', { name: /Enter world/ }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await page.getByRole('button', { name: 'Character', exact: true }).click();
  await page.getByRole('button', { name: 'Change skin', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Change your skin' });
  await dialog.getByRole('button', { name: 'View Golden Test Figure', exact: true }).click();
  await expect(dialog.locator('svg[aria-busy="false"]')).toBeVisible();
  await page.screenshot({ path: 'artifacts/golden-test-selection.png' });
  await dialog.getByRole('button', { name: 'Wear this skin' }).click();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'artifacts/golden-test-village.png' });
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  await expect(page.locator('.site-header')).toBeVisible();
  const saved = (await db.character.findUniqueOrThrow({ where: { id: c.id } })).data;
  expect(saved.skin).toBe('golden-test');
  expect(saved.classId).toBeUndefined();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /Enter world/ }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await page.screenshot({ path: 'artifacts/golden-test-mobile.png' });
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  await expect(page.locator('.site-header')).toBeVisible();
  // Real Phaser renderer: movement, jump, climb, attack, mirrored facing and weapon overlay.
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.evaluate(
    async (shared) => {
      const { mountGame } = await import('/src/game.ts');
      const { createPlayer } = await import(shared);
      const host = document.createElement('div');
      Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 9999 });
      document.body.appendChild(host);
      const p = createPlayer('golden-preview', 'Golden Test');
      Object.assign(p, { skin: 'golden-test', x: 500, y: 760 });
      const bridge = {
        id: p.id,
        blocked: true,
        held: {},
        send: () => {},
        snapshot: { players: [p], wolves: [], drops: [], mapId: 'woods', time: Date.now() },
      };
      window.golden = { p, bridge, host, game: mountGame(host, bridge) };
    },
    '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
  );
  await page.waitForFunction(
    () =>
      window.golden?.game.scene.getScene('realm')?.characters?.get('golden-preview')?.skinVisual
        ?.body.texture.key === 'skin-golden-test',
  );
  for (const [name, changes] of [
    ['walk', { vx: 100 }],
    ['climb', { vx: 0, grounded: false, climbing: true, vy: -100 }],
    ['jump', { climbing: false, vy: -200 }],
    ['attack', { grounded: true, vy: 0, lastAttack: 100 }],
    ['idle', { lastAttack: 100, weapon: 'woods-sword', facing: -1 }],
  ]) {
    await page.evaluate((changes) => {
      const t = window.golden;
      Object.assign(t.p, changes);
      t.bridge.snapshot = { ...t.bridge.snapshot, time: Date.now() };
    }, changes);
    await page.waitForTimeout(name === 'attack' ? 220 : name === 'idle' ? 800 : 250);
    const result = await page.evaluate(() => {
      const v = window.golden.game.scene.getScene('realm').characters.get('golden-preview');
      return {
        texture: v.skinVisual.body.texture.key,
        frame: v.skinVisual.body.frame.name,
        visible: v.skinVisual.container.visible,
      };
    });
    expect(result.texture).toBe('skin-golden-test');
    expect(result.visible).toBe(true);
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              window.golden.game.scene.getScene('realm').characters.get('golden-preview').skinVisual
                .body.frame.name,
          ),
        { timeout: 10000 },
      )
      .toMatch(new RegExp(`^${name}-`));
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'artifacts/golden-test-weapon.png' });
  expect(
    await page.evaluate(
      () =>
        window.golden.game.scene.getScene('realm').characters.get('golden-preview').skinVisual.item
          .visible,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  console.log(
    'PASS: civilian skin selection, saved re-entry, desktop/mobile, animated movement/jump/climb/attack and weapon renderer.',
  );
} finally {
  await browser.close();
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
