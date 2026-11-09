import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const dir = 'docs/community/discord/features';
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:5173');
  for (const [name, mapId, kind] of [
    ['elderwood', 'village', 'town'],
    ['woods', 'woods', 'combat'],
    ['gathering', 'woods', 'gather'],
    ['fishing', 'woods', 'fish'],
    ['boss', 'woods-boss', 'boss'],
    ['crystal', 'crystal', 'combat'],
    ['crystal-gathering', 'crystal', 'gather'],
  ]) {
    await page.evaluate(
      async ({ mapId, kind, shared }) => {
        window.featureCapture?.game.destroy(true);
        window.featureCapture?.host.remove();
        const { mountGame } = await import('/src/game.ts'),
          { World, createPlayer } = await import(shared),
          { MAPS, maxHp } = await import(
            shared.replace('shared/src/index.ts', 'game-data/src/index.ts')
          );
        const map = MAPS[mapId],
          world = new World(map),
          p = createPlayer('preview', 'Adventurer', mapId);
        Object.assign(p, {
          level: 20,
          hp: maxHp(20),
          weapon: mapId === 'crystal' ? 'crystal-sword' : 'woods-sword',
          grounded: true,
        });
        if (kind === 'town') {
          p.x = 960;
          p.y = map.platforms.find((p) => p.id === 'ground').y;
        }
        if (kind === 'gather' || kind === 'fish') {
          const node = map.resources.find((n) =>
            kind === 'fish' ? n.skill === 'Fishing' : n.skill === 'Mining',
          );
          if (node) {
            p.x = node.x - 45;
            p.y = node.y;
          }
        }
        if (kind === 'combat' || kind === 'boss') {
          const m = world.wolves[0];
          if (m) {
            p.x = m.x - 150;
            p.y = m.y;
            p.platform = m.platform;
          }
        }
        world.players.set(p.id, p);
        const host = document.createElement('div');
        Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 9999 });
        document.body.append(host);
        const bridge = {
          id: p.id,
          held: {},
          blocked: true,
          send: () => {},
          snapshot: world.snapshot(10000),
        };
        window.featureCapture = { host, bridge, world, p, game: mountGame(host, bridge) };
      },
      {
        mapId,
        kind,
        shared: '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
      },
    );
    await page.waitForFunction(
      () => window.featureCapture.host.getAttribute('aria-busy') === 'false',
      {},
      { timeout: 60000 },
    );
    await page.evaluate(() => {
      const t = window.featureCapture,
        s = t.game.scene.getScene('realm');
      s.cameras.main.stopFollow();
      s.cameras.main.setZoom(0.95);
      s.cameras.main.centerOn(t.p.x + 200, t.p.y - 240);
    });
    await page.waitForTimeout(550);
    await page.screenshot({ path: `${dir}/${name}-gameplay.png` });
    console.log('Captured', name);
  }
  if (errors.length) throw new Error(errors.join('\n'));
} finally {
  await browser.close();
}
