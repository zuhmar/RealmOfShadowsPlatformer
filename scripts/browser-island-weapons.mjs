import optimized from '../apps/web/public/assets/optimized-manifest.json' with { type: 'json' };
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [],
  requests = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('/assets/')) errors.push(`${r.status()} ${r.url()}`);
});
page.on('request', (r) => {
  if (
    Object.entries(optimized).some(
      ([source, delivery]) =>
        source.includes('/characters/armed/islands/') && r.url().endsWith(delivery),
    )
  )
    requests.push(r.url());
});
try {
  await page.goto('http://localhost:5173');
  await page.evaluate(
    async (shared) => {
      const { mountGame } = await import('/src/game.ts');
      const { createPlayer } = await import(shared);
      const host = document.createElement('div');
      Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 999 });
      document.body.appendChild(host);
      const players = ['male', 'female'].flatMap((appearance, row) =>
        ['sword', 'bow', 'staff', 'dagger'].map((kind, col) =>
          Object.assign(createPlayer(`${appearance}-${kind}`, `${appearance} ${kind}`), {
            appearance,
            weapon: `woods-${kind}`,
            x: 500 + col * 150,
            y: row ? 555 : 760,
            platform: row ? 'moss' : 'ground',
          }),
        ),
      );
      const bridge = {
        id: players[0].id,
        blocked: true,
        held: {},
        send: () => {},
        snapshot: { players, wolves: [], drops: [], projectiles: [], mapId: 'woods', time: 10000 },
      };
      window.islandTest = { host, bridge, game: mountGame(host, bridge) };
    },
    '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
  );
  await page.waitForFunction(() => window.islandTest?.host.getAttribute('aria-busy') === 'false');
  const check = (tier) =>
    page.waitForFunction(
      (tier) => {
        const t = window.islandTest,
          scene = t.game.scene.getScene('realm');
        return (
          scene.characters.size === 8 &&
          [...scene.characters.values()].every(
            (v) => v.key.includes(`-island-${tier}-`) && v.sprite.texture.key === v.key,
          )
        );
      },
      tier,
      { timeout: 30000 },
    );
  await check('woods');
  expect(requests.length).toBe(8); // No other 48 sheets are fetched on entry.
  for (const tier of ['woods', 'crystal', 'swamp', 'frost', 'ember', 'celestial', 'shadow']) {
    await page.evaluate((tier) => {
      const t = window.islandTest;
      for (const p of t.bridge.snapshot.players)
        Object.assign(p, {
          weapon: `${tier}-${p.id.split('-')[1]}`,
          climbing: false,
          grounded: true,
          vx: 0,
          vy: 0,
        });
    }, tier);
    await check(tier);
    const clips = await page.evaluate(() => {
      const s = window.islandTest.game.scene.getScene('realm');
      s.cameras.main.centerOn(785, 620);
      return [...s.characters.values()].map((v) =>
        ['idle', 'walk', 'jump', 'attack', 'death'].map(
          (clip) => s.anims.get(`${v.key}-${clip}`).frames.length,
        ),
      );
    });
    expect(clips.flat().every((n) => n === 6)).toBe(true);
    await page.screenshot({ path: `artifacts/held-${tier}-weapons.png` });
    await page.evaluate(() => {
      for (const p of window.islandTest.bridge.snapshot.players) p.lastAttack += 1000;
    });
    await page.waitForFunction(() =>
      [...window.islandTest.game.scene.getScene('realm').characters.values()].every((v) =>
        v.sprite.anims.currentAnim?.key.endsWith('-attack'),
      ),
    );
    await page.waitForTimeout(120);
    expect(
      await page.evaluate(() =>
        [...window.islandTest.game.scene.getScene('realm').characters.values()].every(
          (v) => String(v.sprite.frame.name).startsWith('attack-') && v.sprite.anims.isPlaying,
        ),
      ),
    ).toBe(true);
    // Ladder switch must take effect even while the armed attack is still playing.
    await page.evaluate(() => {
      for (const p of window.islandTest.bridge.snapshot.players)
        Object.assign(p, { climbing: true, grounded: false, vy: -155 });
    });
    await page.waitForFunction(() =>
      [...window.islandTest.game.scene.getScene('realm').characters.values()].every(
        (v) =>
          v.drawnWeapon === 'unarmed' &&
          !v.key.includes('island') &&
          String(v.sprite.frame.name).startsWith('climb-'),
      ),
    );
  }
  expect(new Set(requests).size).toBe(56);
  await page.evaluate(() => {
    for (const p of window.islandTest.bridge.snapshot.players)
      Object.assign(p, { climbing: false, grounded: true, vy: 0, outfit: 'tide', facing: -1 });
  });
  await check('shadow');
  await page.waitForFunction(() =>
    [...window.islandTest.game.scene.getScene('realm').characters.values()].every((v) =>
      v.key.includes('-tide-island-'),
    ),
  );
  expect(
    await page.evaluate(() =>
      [...window.islandTest.game.scene.getScene('realm').characters.values()].every(
        (v) => v.key.includes('-tide-island-') && v.container.scaleX === -1,
      ),
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/held-island-weapons-mobile.png' });
  expect(
    await page.evaluate(() => {
      const scene = window.islandTest.game.scene.getScene('realm');
      for (const visual of scene.characters.values()) visual.die();
      return scene.children.list.filter(
        (node) =>
          node.texture?.key?.includes('-tide-island-shadow-') &&
          node.anims?.currentAnim?.key.endsWith('-death'),
      ).length;
    }),
  ).toBe(8);
  await page.waitForTimeout(1700);
  expect(
    await page.evaluate(
      () =>
        window.islandTest.game.scene
          .getScene('realm')
          .children.list.filter((node) => node.anims?.currentAnim?.key.endsWith('-death')).length,
    ),
  ).toBe(0);
  expect(errors).toEqual([]);
  console.log(
    'PASS: 56 weapon-specific player sheets, all animation clips, on-demand loading, outfit variants, facing, unarmed ladders, desktop and mobile.',
  );
} finally {
  await browser.close();
}
