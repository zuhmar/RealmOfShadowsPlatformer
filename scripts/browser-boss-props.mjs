import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 650 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('/assets/')) errors.push(r.url());
});
try {
  await page.goto('http://localhost:5173');
  await page.evaluate(async () => {
    const { mountGame } = await import('/src/game.ts');
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 999 });
    document.body.appendChild(host);
    const sent = [];
    window.propTest = {
      host,
      sent,
      game: mountGame(host, {
        id: 'test',
        held: {},
        send: (type, data) => sent.push({ type, data }),
        snapshot: {
          mapId: 'woods-3',
          players: [],
          wolves: [],
          drops: [],
          projectiles: [],
          time: Date.now(),
        },
      }),
    };
  });
  await page.waitForFunction(() => window.propTest.host.getAttribute('aria-busy') === 'false');
  expect(
    await page.evaluate(() => {
      const portal = window.propTest.game.scene
        .getScene('realm')
        .children.list.find((c) => c.name === 'travel-portal' && c.getData('target') === 'crystal');
      return (
        portal && {
          x: portal.x,
          y: portal.y,
          theme: portal.getData('theme'),
          animated: portal.anims.isPlaying,
        }
      );
    }),
  ).toEqual({ x: 2300, y: 760, theme: 'crystal', animated: true });
  expect(
    await page.evaluate(() => {
      const s = window.propTest.game.scene.getScene('realm'),
        p = s.children.getByName('boss-entrance-prop');
      return {
        target: p.getData('target'),
        vortex: s.children.list.some(
          (c) => c.name === 'travel-portal' && c.getData('target') === 'woods-boss',
        ),
      };
    }),
  ).toEqual({ target: 'woods-boss', vortex: false });
  for (const [label, width, height] of [
    ['desktop', 1100, 750],
    ['mobile', 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => {
      window.propTest.game.scene.getScene('realm').cameras.main.centerOn(2140, 215);
    });
    await page.waitForTimeout(150);
    const info = await page.evaluate(() => {
      const s = window.propTest.game.scene.getScene('realm'),
        p = s.children.getByName('boss-entrance-prop'),
        b = p.getBounds(),
        v = s.cameras.main.worldView;
      return {
        platform: p.getData('platformId'),
        y: p.y,
        left: b.left,
        right: b.right,
        top: b.top,
        bottom: b.bottom,
        vl: v.left,
        vr: v.right,
        vt: v.top,
        vb: v.bottom,
      };
    });
    expect(info.platform).toBe('boss-perch');
    expect(info.y).toBe(285);
    expect(info.left).toBeGreaterThanOrEqual(info.vl);
    expect(info.right).toBeLessThanOrEqual(info.vr);
    expect(info.top).toBeGreaterThanOrEqual(info.vt);
    expect(info.bottom).toBeLessThanOrEqual(info.vb);
    const point = await page.evaluate(() => {
      const s = window.propTest.game.scene.getScene('realm'),
        p = s.children.getByName('boss-entrance-prop'),
        c = s.cameras.main;
      return { x: (p.x - c.worldView.x) * c.zoom, y: (p.y - 60 - c.worldView.y) * c.zoom };
    });
    await page.mouse.click(point.x, point.y);
    await expect
      .poll(() => page.evaluate(() => window.propTest.sent.some((e) => e.type === 'travel')))
      .toBe(true);
    await page.screenshot({ path: `artifacts/boss-perch-${label}.png` });
  }
  await page.setViewportSize({ width: 1100, height: 650 });
  await page.evaluate(async () => {
    const { preloadBossProp, addBossProp } = await import('/src/boss-entrances.ts');
    const s = window.propTest.game.scene.getScene('realm'),
      themes = ['woods', 'crystal', 'murkmire', 'frostfall', 'ember', 'celestial', 'fortress'];
    for (const theme of themes) preloadBossProp(s, theme);
    await new Promise((resolve) => {
      s.load.once('complete', resolve);
      s.load.start();
    });
    s.cameras.main.setZoom(1).setScroll(0, 0);
    s.add.rectangle(550, 325, 1100, 650, 0x110b20).setDepth(100).setScrollFactor(0);
    window.propTest.props = themes.map((theme, i) => {
      const x = 140 + (i % 4) * 270,
        y = 245 + Math.floor(i / 4) * 300;
      const prop = addBossProp(s, theme, x, y).setDepth(101).setScrollFactor(0);
      prop.setScale(prop.scaleX * 1.3);
      s.add
        .text(x, y + 32, prop.getData('label'), { fontSize: '15px', color: '#efdfff' })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(102);
      return prop;
    });
  });
  expect(await page.evaluate(() => window.propTest.props.map((p) => p.texture.key))).toEqual(
    ['woods', 'crystal', 'murkmire', 'frostfall', 'ember', 'celestial', 'fortress'].map(
      (t) => `boss-prop-${t}`,
    ),
  );
  await page.screenshot({ path: 'artifacts/boss-entrance-props.png' });
  expect(errors).toEqual([]);
  console.log(
    'PASS: all seven unique guardian props load with correct themes and transparent source art.',
  );
} finally {
  await browser.close();
}
