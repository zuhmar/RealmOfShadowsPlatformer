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
        send: () => {},
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
  expect(npc.every((n) => n.texture === 'npc-celestial' && n.frame.startsWith('idle-'))).toBe(true);
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
  expect(errors).toEqual([]);
  console.log(
    'PASS: friendly NPCs use Celestial figures, hostile character atlas animates, desktop/mobile render without errors.',
  );
} finally {
  await browser.close();
}
