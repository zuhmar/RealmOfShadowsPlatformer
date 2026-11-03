import { chromium, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://realm:realm@localhost:5432/realm',
  }),
});
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
let userId;
try {
  for (const mapId of ['village', 'woods']) {
    await page.goto('http://localhost:5173');
    await page.evaluate(async (mapId) => {
      const { mountGame } = await import('/src/game.ts');
      const host = document.createElement('div');
      Object.assign(host.style, { position: 'fixed', inset: '0', zIndex: 999 });
      document.body.appendChild(host);
      const game = mountGame(host, {
        id: 'test',
        held: {},
        send: () => {},
        snapshot: { mapId, players: [], wolves: [], drops: [], projectiles: [], time: Date.now() },
      });
      window.portalTest = { host, game, seen: [] };
    }, mapId);
    await page.waitForFunction(() => window.portalTest.host.getAttribute('aria-busy') === 'false');
    await page.evaluate(() => {
      const t = window.portalTest,
        s = t.game.scene.getScene('realm'),
        portal = s.children.list.find((c) => c.name === 'travel-portal');
      s.cameras.main.centerOn(portal.x, portal.y - 70);
      s.time.addEvent({ delay: 30, loop: true, callback: () => t.seen.push(portal.frame.name) });
    });
    await expect
      .poll(() => page.evaluate(() => new Set(window.portalTest.seen).size), { timeout: 5000 })
      .toBe(8);
    const info = await page.evaluate(() => {
      const s = window.portalTest.game.scene.getScene('realm'),
        p = s.children.list.find((c) => c.name === 'travel-portal');
      return {
        x: p.x,
        y: p.y,
        target: p.getData('target'),
        origin: p.originY,
        anim: p.anims.currentAnim.key,
        theme: p.getData('theme'),
        texture: p.texture.key,
        label: s.children.list.find((c) => c.text === s.map.portals[0].label)?.y,
      };
    });
    expect(info.y).toBe(mapId === 'village' ? 650 : 760);
    expect(info.target).toBe(mapId === 'village' ? 'woods' : 'village');
    expect(info.origin).toBeGreaterThan(0.7);
    expect(info.origin).toBeLessThanOrEqual(1);
    expect(info.theme).toBe('woods');
    expect(info.texture).toBe('island-portal-woods');
    expect(info.anim).toBe('island-portal-woods-idle');
    expect(info.label).toBe(info.y - 164);
    await page.screenshot({ path: `artifacts/woods-portal-${mapId}.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    await page.screenshot({ path: `artifacts/woods-portal-${mapId}-mobile.png` });
    await page.setViewportSize({ width: 1100, height: 650 });
  }
  await page.evaluate(async () => {
    const { preloadPortalTheme, registerPortalTheme, addPortal } = await import('/src/portals.ts');
    const s = window.portalTest.game.scene.getScene('realm');
    const themes = ['woods', 'crystal', 'murkmire', 'frostfall', 'ember', 'celestial', 'fortress'];
    for (const theme of themes) preloadPortalTheme(s, theme);
    await new Promise((resolve) => {
      s.load.once('complete', resolve);
      s.load.start();
    });
    s.cameras.main.setScroll(0, 0).setZoom(1);
    s.add.rectangle(550, 325, 1100, 650, 0x110b20).setDepth(100).setScrollFactor(0);
    window.portalTest.gallery = themes.map((theme, i) => {
      registerPortalTheme(s, theme);
      const x = 140 + (i % 4) * 270,
        y = 265 + Math.floor(i / 4) * 290;
      const p = addPortal(s, 'village', { x, y, target: theme, label: theme })
        .setScale(0.45)
        .setDepth(101)
        .setScrollFactor(0);
      s.add
        .text(x, y + 25, theme === 'fortress' ? 'Shadow Fortress' : theme, {
          fontSize: '17px',
          color: '#f2dbff',
        })
        .setOrigin(0.5)
        .setDepth(102)
        .setScrollFactor(0);
      return p;
    });
    window.portalTest.galleryFrames = themes.map(() => []);
    s.time.addEvent({
      delay: 30,
      loop: true,
      callback: () => {
        window.portalTest.gallery.forEach((p, i) =>
          window.portalTest.galleryFrames[i].push(p.frame.name),
        );
      },
    });
  });
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          window.portalTest.galleryFrames.every((frames) => new Set(frames).size === 8),
        ),
      { timeout: 6000 },
    )
    .toBe(true);
  expect(await page.evaluate(() => window.portalTest.gallery.map((p) => p.texture.key))).toEqual(
    ['woods', 'crystal', 'murkmire', 'frostfall', 'ember', 'celestial', 'fortress'].map(
      (id) => `island-portal-${id}`,
    ),
  );
  await page.screenshot({ path: 'artifacts/island-portal-gallery.png' });
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: 'Play as guest' }).click();
  await page
    .getByRole('button', { name: /A story unwritten/ })
    .first()
    .click();
  await page.getByLabel('Character name', { exact: true }).fill('PortalTester');
  await page.getByRole('button', { name: 'Create adventurer' }).click();
  const token = await page.evaluate(() => localStorage.getItem('ros-session'));
  const chars = await fetch('http://localhost:2567/api/characters', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  userId = chars.characters[0].userId;
  await page.getByRole('button', { name: 'Enter world' }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await page.keyboard.down('d');
  await page.waitForTimeout(6500);
  await page.keyboard.up('d');
  await page.keyboard.press('e');
  await expect(page.locator('.world-title h1')).toContainText('Wolf Hollow', { timeout: 10000 });
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await page.waitForTimeout(200);
  await page.keyboard.press('e');
  await expect(page.locator('.world-title h1')).toContainText('Elderwood Village', {
    timeout: 10000,
  });
  expect(errors).toEqual([]);
  console.log(
    'PASS: all56 island portal frames loop, Woods theme in both active maps, stable baseline and labels, desktop/mobile render, and E travel works in both directions.',
  );
} finally {
  await browser.close();
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
