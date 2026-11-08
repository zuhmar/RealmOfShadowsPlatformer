import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await mkdir('artifacts', { recursive: true });
  await page.goto('http://localhost:5173');
  await page.evaluate(
    async (shared) => {
      const { mountGame } = await import('/src/game.ts');
      const { createPlayer } = await import(shared);
      const host = document.createElement('div');
      Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 99999 });
      document.body.appendChild(host);
      const p = createPlayer('hero', 'Hero', 'village');
      const bridge = {
        id: p.id,
        blocked: true,
        held: {},
        send: (type, value) => (window.factionCalls ??= []).push({ type, value }),
        snapshot: { players: [p], wolves: [], drops: [], mapId: 'village', time: Date.now() },
      };
      window.factions = { game: mountGame(host, bridge), bridge, host };
    },
    '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
  );
  await page.waitForFunction(() => window.factions.host.getAttribute('aria-busy') === 'false');
  const npc = await page.evaluate(() => {
    const scene = window.factions.game.scene.getScene('realm');
    return scene.children.list
      .filter((c) => c.name === 'celestial-npc')
      .map((c) => ({
        texture: c.texture.key,
        frame: c.frame.name,
        allegiance: c.getData('allegiance'),
      }));
  });
  expect(npc.length).toBeGreaterThanOrEqual(2);
  await page.evaluate(() => {
    const scene = window.factions.game.scene.getScene('realm');
    for (const npc of scene.map.npcs.filter((n) => ['mira', 'bram'].includes(n.id))) {
      const zone = scene.children.list.find(
        (c) => c.type === 'Zone' && c.x === npc.x && c.y === npc.y - 40,
      );
      if (!zone) throw new Error(`Missing ${npc.id} interaction`);
      zone.emit('pointerdown');
    }
  });
  expect(
    await page.evaluate(() =>
      window.factionCalls.filter((c) => c.type === 'interact').map((c) => c.value.npcId),
    ),
  ).toEqual(['mira', 'bram']);
  expect(npc.every((n) => n.texture === 'npc-outfits' && ['mira', 'bram'].includes(n.frame))).toBe(
    true,
  );
  await page.evaluate(() =>
    window.factions.game.scene.getScene('realm').cameras.main.centerOn(650, 500),
  );
  await page.screenshot({ path: 'artifacts/celestial-village-desktop.png' });
  // Hostile actor gallery only; no new NPC is spawned in the real game.
  await page.evaluate(async () => {
    const { preloadFactionFigures, factionFigure } = await import('/src/faction-figures.ts');
    const scene = window.factions.game.scene.getScene('realm');
    preloadFactionFigures(scene, { npcs: [{ id: 'preview', allegiance: 'shadow' }] });
    await new Promise((resolve) => {
      scene.load.once('complete', resolve);
      scene.load.start();
    });
    factionFigure(scene, 650, 650, 'shadow').setName('shadow-preview');
  });
  await page.waitForFunction(
    () =>
      window.factions.game.scene.getScene('realm').children.getByName('shadow-preview')?.anims
        .isPlaying,
  );
  await page.screenshot({ path: 'artifacts/shadow-character-preview.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/celestial-characters-mobile.png' });
  await page.goto('http://localhost:5173');
  await page.evaluate(
    async (shared) => {
      const { mountGame } = await import('/src/game.ts');
      const { createPlayer } = await import(shared);
      const host = document.createElement('div');
      Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 99999 });
      document.body.appendChild(host);
      const p = createPlayer('hero', 'Hero', 'crystal');
      const bridge = {
        id: p.id,
        blocked: true,
        held: {},
        send: (type, value) => (window.factionCalls ??= []).push({ type, value }),
        snapshot: { players: [p], wolves: [], drops: [], mapId: 'crystal', time: Date.now() },
      };
      window.factions = { game: mountGame(host, bridge), bridge, host };
    },
    '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
  );
  await page.waitForFunction(() => window.factions.host.getAttribute('aria-busy') === 'false');
  expect(
    await page.evaluate(
      () =>
        window.factions.game.scene
          .getScene('realm')
          .children.list.find((c) => c.name === 'celestial-npc')?.frame.name,
    ),
  ).toBe('mentor');
  await page.evaluate(() => {
    const s = window.factions.game.scene.getScene('realm'),
      n = s.map.npcs.find((n) => n.id === 'mentor');
    s.cameras.main.centerOn(n.x, n.y - 80);
    s.children.list
      .find((c) => c.type === 'Zone' && c.x === n.x && c.y === n.y - 40)
      .emit('pointerdown');
  });
  expect(
    await page.evaluate(() =>
      window.factionCalls.some((c) => c.type === 'interact' && c.value.npcId === 'mentor'),
    ),
  ).toBe(true);
  await page.screenshot({ path: 'artifacts/cavern-mentor-outfit-mobile.png' });
  expect(errors).toEqual([]);
  console.log(
    'PASS: Mira, Bram and Mentor wear their correct outfits; all three interaction zones work; shadow fallback and desktop/mobile render without errors.',
  );
} finally {
  await browser.close();
}
