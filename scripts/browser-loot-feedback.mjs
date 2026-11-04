import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 750 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto('http://localhost:5173');
  await page.evaluate(
    async (shared) => {
      const { mountGame } = await import('/src/game.ts');
      const { World, createPlayer } = await import(shared);
      const { MAPS } = await import(
        shared.replace('shared/src/index.ts', 'game-data/src/index.ts')
      );
      const w = new World(MAPS.woods),
        p = createPlayer('loot-hero', 'LootTester');
      p.x = w.wolves[0].x - 200;
      p.y = w.wolves[0].y;
      p.level = 7;
      w.players.set(p.id, p);
      const host = document.createElement('div');
      Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 999 });
      document.body.appendChild(host);
      const bridge = {
        id: p.id,
        blocked: true,
        held: {},
        send: () => {},
        snapshot: w.snapshot(10000),
      };
      window.lootTest = { w, p, host, bridge, game: mountGame(host, bridge) };
      window.lootTest.texts = () => {
        const all = [];
        const walk = (node) => {
          if (typeof node.text === 'string')
            all.push({ text: node.text, color: node.style?.color });
          for (const child of node.list ?? []) walk(child);
        };
        for (const node of window.lootTest.game.scene.getScene('realm').children.list) walk(node);
        return all;
      };
    },
    '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
  );
  await page.waitForFunction(() => window.lootTest.host.getAttribute('aria-busy') === 'false');
  await page.evaluate(() => {
    const t = window.lootTest,
      original = Math.random;
    let n = 0;
    try {
      Math.random = () => [0, 0, 0.95][n++] ?? 0.99;
      t.w.hitWolf(t.p, t.w.wolves[0], 1000, 10000);
    } finally {
      Math.random = original;
    }
    t.bridge.snapshot = t.w.snapshot(10000);
    for (const e of t.w.events) t.game.scene.getScene('realm').events.emit('float', e);
  });
  const nodes = () =>
    page.evaluate(() => {
      const all = [];
      const walk = (n) => {
        all.push({ name: n.name, item: n.getData?.('item'), text: n.text });
        for (const c of n.list ?? []) walk(c);
      };
      for (const n of window.lootTest.game.scene.getScene('realm').children.list) walk(n);
      return all;
    });
  await expect
    .poll(async () =>
      (await nodes()).filter((n) => n.name === 'loot-item-sprite').map((n) => n.item),
    )
    .toEqual(expect.arrayContaining(['gold', 'fang', 'wolf-pelt', 'woods-sword']));
  expect((await nodes()).some((n) => n.name === 'loot-rarity-glow')).toBe(true);
  expect(
    (await nodes()).some(
      (n) => typeof n.text === 'string' && /Ironwood Sword|dropped!|Collected/.test(n.text),
    ),
  ).toBe(false);
  await page.screenshot({ path: 'artifacts/epic-gear-drop.png' });
  await page.evaluate(() => {
    const t = window.lootTest,
      d = t.w.drops[0];
    t.p.x = d.x;
    t.p.y = d.y;
    t.w.events.length = 0;
    t.w.collect(t.p, 11000);
    t.bridge.snapshot = t.w.snapshot(11000);
    for (const e of t.w.events) t.game.scene.getScene('realm').events.emit('float', e);
  });
  expect((await nodes()).some((n) => n.name === 'loot-pickup-sprites')).toBe(true);
  expect(
    (await nodes()).some(
      (n) => typeof n.text === 'string' && /Ironwood Sword|Collected/.test(n.text),
    ),
  ).toBe(false);
  const beforeOther = (await nodes()).filter((n) => n.name === 'loot-pickup-sprites').length;
  await page.evaluate(() =>
    window.lootTest.game.scene.getScene('realm').events.emit('float', {
      type: 'loot',
      text: 'Hidden Other Gear',
      x: 600,
      y: 700,
      playerId: 'other',
      gear: { name: 'Other Gear', rarity: 'Legendary' },
      loot: [{ item: 'woods-sword', quantity: 1, rarity: 'Legendary' }],
    }),
  );
  expect(
    await page.evaluate(() => window.lootTest.texts().some((t) => t.text === 'Hidden Other Gear')),
  ).toBe(false);
  expect((await nodes()).filter((n) => n.name === 'loot-pickup-sprites').length).toBe(beforeOther);
  await page.screenshot({ path: 'artifacts/epic-gear-pickup.png' });
  expect(errors).toEqual([]);
  console.log(
    'PASS: item sprites, rarity glows, no loot-name text and owner-only pickup sprites render in Phaser.',
  );
} finally {
  await browser.close();
}
