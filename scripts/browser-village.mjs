import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 650 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('/assets/')) errors.push(`${r.status()} ${r.url()}`);
});
try {
  await page.goto('http://localhost:5173');
  await page.evaluate(async () => {
    const { mountGame } = await import('/src/game.ts');
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'fixed', inset: '0', zIndex: '999' });
    document.body.appendChild(host);
    const sent = [];
    const bridge = {
      id: 'test',
      snapshot: {
        players: [],
        wolves: [],
        drops: [],
        projectiles: [],
        mapId: 'village',
        time: Date.now(),
      },
      held: {},
      send: (type, data) => sent.push({ type, data }),
    };
    window.villageTest = { host, sent, game: mountGame(host, bridge) };
  });
  await page.waitForFunction(() => window.villageTest?.host.getAttribute('aria-busy') === 'false');
  for (const [name, x, y] of [
    ['west', 300, 580],
    ['center', 850, 540],
    ['east', 1500, 580],
  ]) {
    await page.evaluate(
      ({ x, y }) => {
        window.villageTest.game.scene.getScene('realm').cameras.main.centerOn(x, y);
      },
      { x, y },
    );
    await page.waitForTimeout(150);
    const state = await page.evaluate(() => {
      const s = window.villageTest.game.scene.getScene('realm'),
        v = s.village,
        c = s.cameras.main,
        b = v.background.getBounds();
      return {
        buildings: v.buildings.map((i) => i.frame.name),
        props: v.props.map((i) => i.frame.name),
        ladders: v.ladders.length,
        stations: s.children.list
          .filter((node) => ['cooking-station', 'alchemy-station'].includes(node.name))
          .map((node) => node.name),
        bodies: s.floor.getChildren().length,
        surfaces: [...new Map(v.platforms.map((i) => [i.getData('platformId'), i])).values()].map(
          (i) => ({
            id: i.getData('platformId'),
            y: i.y + i.getData('artSurfaceY') * i.scaleY,
          }),
        ),
        background: { left: b.left, right: b.right, top: b.top, bottom: b.bottom },
        view: {
          left: c.worldView.left,
          right: c.worldView.right,
          top: c.worldView.top,
          bottom: c.worldView.bottom,
        },
      };
    });
    expect(state.buildings).toEqual(['guide-cottage', 'blacksmith', 'inn', 'market-stall']);
    expect(state.props.length).toBeGreaterThanOrEqual(12);
    expect(state.stations).toEqual(['cooking-station', 'alchemy-station']);
    expect(state.ladders).toBeGreaterThanOrEqual(2);
    expect(state.bodies).toBe(3);
    expect(state.surfaces.find((p) => p.id === 'ground').y).toBeCloseTo(650, 4);
    expect(state.surfaces.find((p) => p.id === 'terrace').y).toBeCloseTo(450, 4);
    expect(state.surfaces.find((p) => p.id === 'housing').y).toBeCloseTo(240, 4);
    expect(state.background.left).toBeLessThanOrEqual(state.view.left);
    expect(state.background.right).toBeGreaterThanOrEqual(state.view.right);
    expect(state.background.top).toBeLessThanOrEqual(state.view.top);
    expect(state.background.bottom).toBeGreaterThanOrEqual(state.view.bottom);
    await page.screenshot({ path: `artifacts/elderwood-village-${name}.png` });
  }
  await page.evaluate(() => {
    window.villageTest.game.scene.getScene('realm').cameras.main.centerOn(500, 560);
  });
  await page.waitForTimeout(100);
  const pos = await page.evaluate(() => {
    const c = window.villageTest.game.scene.getScene('realm').cameras.main;
    return { x: (500 - c.worldView.x) * c.zoom, y: (610 - c.worldView.y) * c.zoom };
  });
  await page.mouse.click(pos.x, pos.y);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.villageTest.sent.some((e) => e.type === 'interact' && e.data.npcId === 'mira'),
      ),
    )
    .toBe(true);
  await page.evaluate(() => {
    const s = window.villageTest.game.scene.getScene('realm');
    const bram = s.children.list.find(
      (n) => n.name === 'celestial-npc' && n.getData('npcId') === 'bram',
    );
    if (bram?.texture.key !== 'npc-outfits') throw new Error('Bram sprite not loaded');
    const feet = bram.getBottomCenter().y;
    if (Math.abs(feet - 650) > 0.01) throw new Error('Bram feet do not meet village ground');
    s.cameras.main.centerOn(900, 560);
  });
  await page.waitForTimeout(150);
  const bramPos = await page.evaluate(() => {
    const c = window.villageTest.game.scene.getScene('realm').cameras.main;
    return { x: (900 - c.worldView.x) * c.zoom, y: (610 - c.worldView.y) * c.zoom };
  });
  await page.mouse.click(bramPos.x, bramPos.y);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.villageTest.sent.some((e) => e.type === 'interact' && e.data.npcId === 'bram'),
      ),
    )
    .toBe(true);
  await page.screenshot({ path: 'artifacts/bram-village.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    window.villageTest.game.scene.getScene('realm').cameras.main.centerOn(500, 560);
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: 'artifacts/elderwood-village-mobile.png' });
  expect(errors).toEqual([]);
  console.log(
    'PASS: village artwork, three platform bodies and aligned surfaces including housing, both ladders, parallax coverage, Mira and Bram interaction, Bram sprite/feet alignment, desktop/mobile and asset loading.',
  );
} finally {
  await browser.close();
}
