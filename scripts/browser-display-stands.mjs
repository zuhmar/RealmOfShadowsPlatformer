import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
try {
  await mkdir('artifacts', { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 850 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:5173');
  await page.evaluate(
    async (shared) => {
      const { mountGame } = await import('/src/game.ts');
      const { createPlayer } = await import(shared);
      const ids = ['woods', 'crystal', 'swamp', 'frost', 'ember', 'celestial', 'shadow'];
      const p = createPlayer('owner', 'Collector', 'house-medium');
      Object.assign(p, { houseOwnerId: p.id, x: 160, y: 780, grounded: true });
      p.inventory = Object.fromEntries(ids.map((id) => [`${id}-sword`, 1]));
      p.housing = {
        size: 'medium',
        stage: 3,
        invited: [],
        furniture: ids.map((id, i) => ({
          id,
          item: `${id}-sword`,
          display: true,
          x: (i - 3) * 170,
          floor: 0,
        })),
      };
      const host = document.createElement('div');
      Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 9999 });
      document.body.append(host);
      const bridge = {
        id: p.id,
        held: {},
        blocked: true,
        send: () => {},
        snapshot: { mapId: p.mapId, players: [p], wolves: [], drops: [], time: Date.now() },
      };
      window.stands = { host, bridge, game: mountGame(host, bridge) };
    },
    '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
  );
  await page.waitForFunction(() => window.stands.host.getAttribute('aria-busy') === 'false');
  await page.waitForFunction(
    () =>
      window.stands.game.scene
        .getScene('realm')
        .children.list.filter((o) => o.name === 'house-display').length === 7,
  );
  const state = () =>
    page.evaluate(() => {
      const s = window.stands.game.scene.getScene('realm');
      s.cameras.main.stopFollow();
      s.cameras.main.centerOn(725, 670);
      return s.children.list
        .filter((o) => o.name === 'house-display')
        .map((o) => ({
          theme: o.list[0].getData('theme'),
          texture: o.list[0].list[0].texture?.key,
          frame: o.list[0].list[0].frame?.name,
          uniform: o.list[0].list[0].scaleX === o.list[0].list[0].scaleY,
          effectTexture: o.list[0].list[1]?.texture?.key,
          effectFrame: o.list[0].list[1]?.frame?.name,
          animated: !!o.list[0].list[1]?.anims?.isPlaying,
          allSprites: o.list[0].list.every((child) => ['Image', 'Sprite'].includes(child.type)),
        }));
    });
  const first = await state();
  expect(first.map((s) => s.theme)).toEqual([
    'woods',
    'crystal',
    'swamp',
    'frost',
    'ember',
    'celestial',
    'shadow',
  ]);
  expect(
    first.every((s) => s.texture === 'island-display-stands' && s.frame === s.theme && s.uniform),
  ).toBe(true);
  expect(first.map((s) => s.animated)).toEqual([false, false, false, false, false, true, true]);
  await page.waitForTimeout(300);
  const next = await state();
  expect(first.every((s) => s.allSprites)).toBe(true);
  expect(first[5].effectTexture).toBe('display-stand-effects');
  expect(first[6].effectTexture).toBe('display-stand-effects');
  await expect.poll(async () => (await state())[5].effectFrame).not.toBe(first[5].effectFrame);
  await expect.poll(async () => (await state())[6].effectFrame).not.toBe(first[6].effectFrame);
  await page.screenshot({ path: 'artifacts/island-display-stands.png' });
  await page.evaluate(() => {
    window.stands.bridge.furniturePlacement = {
      item: 'display:celestial-sword',
      onTarget: () => {},
    };
  });
  await page.waitForFunction(
    () =>
      window.stands.game.scene
        .getScene('realm')
        .children.getByName('furniture-placement-preview')
        ?.list[0].getData('theme') === 'celestial',
  );
  await page.evaluate(() => {
    delete window.stands.bridge.furniturePlacement;
    window.stands.bridge.snapshot.players[0].housing.furniture = [];
  });
  await page.waitForFunction(
    () =>
      window.stands.game.scene
        .getScene('realm')
        .children.list.filter((o) => o.name === 'house-display').length === 0,
  );
  await page.waitForTimeout(100);
  const stale = await page.evaluate(() =>
    window.stands.game.scene
      .getScene('realm')
      .tweens.getTweens()
      .some((t) => t.targets.some((o) => !o.scene)),
  );
  expect(stale).toBe(false);
  expect(errors).toEqual([]);
  console.log(
    'PASS seven island stands, animated Celestial/Shadow, matching preview, cleanup without stale animation targets.',
  );
} finally {
  await browser.close();
}
