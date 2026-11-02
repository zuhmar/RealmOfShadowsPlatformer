import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1000, height: 650 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto('http://localhost:5173');
  await page.evaluate(async () => {
    const { mountGame } = await import('/src/game.ts');
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'fixed', inset: '0', zIndex: '999' });
    document.body.appendChild(host);
    const wolf = {
      id: 'wolf-0',
      x: 500,
      y: 760,
      homeX: 500,
      homeY: 760,
      platform: 'ground',
      hp: 48,
      deadUntil: 0,
      lastAttack: 0,
      state: 'idle',
      killer: null,
    };
    const bridge = {
      id: 'test',
      snapshot: { players: [], wolves: [wolf], drops: [], mapId: 'woods', time: Date.now() },
      held: {},
      send: () => {},
    };
    window.wolfTest = { bridge, game: mountGame(host, bridge), frames: {} };
  });
  await page.waitForFunction(() =>
    window.wolfTest?.game.scene.getScene('realm')?.wolves?.get('wolf-0'),
  );
  await page.evaluate(() => {
    const t = window.wolfTest,
      scene = t.game.scene.getScene('realm');
    scene.cameras.main.centerOn(500, 650);
    const sprite = scene.wolves.get('wolf-0').sprite;
    sprite.on('animationcomplete', (anim) => {
      if (anim.key === 'wolf-death')
        t.deathAlphaAtCompletion = scene.wolves.get('wolf-0').container.alpha;
    });
    const record = (anim, frame) => {
      (t.frames[anim.key] ??= []).push(Number(frame.textureFrame));
    };
    sprite.on('animationstart', record);
    sprite.on('animationupdate', record);
  });
  const state = () =>
    page.evaluate(() => {
      const scene = window.wolfTest.game.scene.getScene('realm'),
        v = scene.wolves.get('wolf-0');
      return {
        clip: v.sprite.anims.currentAnim?.key,
        frame: Number(v.sprite.frame.name),
        alpha: v.container.alpha,
        flip: v.sprite.flipX,
        frames: window.wolfTest.frames,
        deathAlphaAtCompletion: window.wolfTest.deathAlphaAtCompletion,
      };
    });
  await page.waitForTimeout(1200);
  await expect
    .poll(async () => new Set((await state()).frames['wolf-idle']).size, { timeout: 15000 })
    .toBe(6);
  await expect.poll(async () => (await state()).clip, { timeout: 5000 }).toBe('wolf-idle');
  await page.evaluate(() =>
    Object.assign(window.wolfTest.bridge.snapshot.wolves[0], { x: 510, state: 'chasing' }),
  );
  await expect
    .poll(async () => new Set((await state()).frames['wolf-walk']).size, { timeout: 15000 })
    .toBe(6);
  expect((await state()).clip).toBe('wolf-walk');
  expect((await state()).flip).toBe(false);
  await page.evaluate(() => Object.assign(window.wolfTest.bridge.snapshot.wolves[0], { x: 505 }));
  await page.waitForTimeout(100);
  expect((await state()).flip).toBe(true);
  await page.evaluate(() =>
    Object.assign(window.wolfTest.bridge.snapshot.wolves[0], {
      state: 'attacking',
      lastAttack: 1200,
    }),
  );
  await page.waitForTimeout(120);
  expect((await state()).clip).toBe('wolf-attack');
  await page.waitForTimeout(700);
  await expect.poll(async () => (await state()).clip, { timeout: 5000 }).toBe('wolf-idle');
  await page.evaluate(() => Object.assign(window.wolfTest.bridge.snapshot.wolves[0], { hp: 34 }));
  await page.waitForTimeout(100);
  expect((await state()).clip).toBe('wolf-hurt');
  await page.waitForTimeout(650);
  await page.screenshot({ path: 'artifacts/wolf-animated.png' });
  await page.evaluate(() =>
    Object.assign(window.wolfTest.bridge.snapshot.wolves[0], { hp: 0, state: 'dead' }),
  );
  await page.waitForTimeout(800);
  await expect.poll(async () => (await state()).frame, { timeout: 5000 }).toBe(29);
  await expect.poll(async () => (await state()).deathAlphaAtCompletion, { timeout: 5000 }).toBe(1);
  await page.screenshot({ path: 'artifacts/wolf-death.png' });
  await page.waitForTimeout(800);
  await expect.poll(async () => (await state()).alpha, { timeout: 5000 }).toBe(0);
  const frames = (await state()).frames;
  for (const [i, name] of ['idle', 'walk', 'attack', 'hurt', 'death'].entries()) {
    expect(new Set(frames[`wolf-${name}`])).toEqual(
      new Set(Array.from({ length: 6 }, (_, n) => i * 6 + n)),
    );
  }
  await page.evaluate(() =>
    Object.assign(window.wolfTest.bridge.snapshot.wolves[0], { hp: 48, state: 'idle' }),
  );
  await page.waitForTimeout(150);
  expect((await state()).alpha).toBe(1);
  await expect.poll(async () => (await state()).clip, { timeout: 5000 }).toBe('wolf-idle');
  expect(errors).toEqual([]);
  console.log(
    'PASS: all 30 frames, walking/facing, attack and hurt completion, death/fade, respawn; no browser errors.',
  );
} finally {
  await browser.close();
}
