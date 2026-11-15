import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const report = {
  scope:
    'Local Chromium mobile emulation; battleground fixture health is held high to prevent wipe during measurement. Decoded RGBA estimates exclude driver overhead. Not physical-phone or production capacity measurements.',
  travel: [],
  houses: [],
  battlegrounds: [],
};
const shared = '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname;
async function mount(page, mapId, furniture = []) {
  await page.goto('http://localhost:5173');
  await page.evaluate(
    async ({ shared, mapId, furniture }) => {
      const { mountGame } = await import('/src/game.ts');
      const { World, createPlayer, BattlegroundRun, idleInput } = await import(shared);
      const { MAPS } = await import(
        shared.replace('shared/src/index.ts', 'game-data/src/index.ts')
      );
      const snapshot = (id, count = 1) => {
        const world = new World(MAPS[id]);
        for (let i = 0; i < count; i++) {
          const p = createPlayer(i ? `friend-${i}` : 'hero', 'Adventurer', id);
          Object.assign(p, {
            level: 40,
            hp: 10000,
            x: 900 + i * 70,
            classId: ['knight', 'archer', 'mage', 'rogue'][i % 4],
            skin: ['knight', 'archer', 'mage', 'rogue'][i % 4],
            weapon: ['frost-sword', 'frost-bow', 'frost-staff', 'frost-dagger'][i % 4],
          });
          if (id.startsWith('house-')) {
            p.houseOwnerId = p.id;
            p.housing = { size: id.slice(6), stage: 3, invited: [], furniture };
          }
          world.players.set(p.id, p);
        }
        if (id === 'frostfall-battleground') {
          const run = new BattlegroundRun(world, 'hero_benchmark', 'hero');
          world.battleground = run;
          for (const p of world.players.values()) {
            run.join(p);
            run.ready(p, true);
          }
          run.start(world.players.get('hero'), Date.now());
          run.wave = 8;
          run.spawnWave(Date.now());
        }
        return world;
      };
      const world = snapshot(mapId, mapId === 'frostfall-battleground' ? 4 : 1);
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;inset:0;z-index:10000';
      document.body.append(host);
      const bridge = {
        id: 'hero',
        held: {},
        blocked: true,
        send: () => {},
        snapshot: world.snapshot(Date.now()),
      };
      window.audit = { host, world, bridge, snapshot, idleInput, game: mountGame(host, bridge) };
    },
    { shared, mapId, furniture },
  );
  await page.waitForFunction(() => window.audit.host.getAttribute('aria-busy') === 'false', null, {
    timeout: 60000,
  });
}
async function memory(page) {
  return page.evaluate(() => {
    const game = window.audit.game,
      textures = Object.values(game.textures.list);
    return {
      textures: textures.length,
      decodedMiB: +(
        textures.reduce((n, t) => n + t.source.reduce((m, s) => m + s.width * s.height * 4, 0), 0) /
        1048576
      ).toFixed(1),
      scenes: game.scene.scenes.length,
      keys: game.textures.getTextureKeys(),
    };
  });
}
const errors = [];
try {
  // Full island tours exercise eviction and reloading of previously registered monster clips.
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (/texture.*not found|missing.*frame/i.test(m.text())) errors.push(m.text());
  });
  await mount(page, 'woods');
  const tour = [
    'woods-boss',
    'crystal-boss',
    'murkmire-boss',
    'frostfall-boss',
    'woods',
    'woods-boss',
    'crystal-boss',
    'murkmire-boss',
    'frostfall-boss',
    'woods',
  ];
  let canvas;
  for (const mapId of tour) {
    await page.evaluate((id) => {
      const a = window.audit;
      a.old = a.game.scene.getScene('realm');
      a.world = a.snapshot(id);
      a.bridge.snapshot = a.world.snapshot(Date.now());
    }, mapId);
    await page.waitForFunction(
      (id) => {
        const a = window.audit,
          s = a.game.scene.getScene('realm');
        return (
          s !== a.old &&
          s?.map?.id === id &&
          a.host.getAttribute('aria-busy') === 'false' &&
          s.wolves.size > 0
        );
      },
      mapId,
      { timeout: 60000 },
    );
    const usage = await memory(page);
    expect(usage.scenes).toBe(1);
    report.travel.push({ mapId, ...usage });
  }
  const first = report.travel[4],
    second = report.travel[9];
  expect(second.decodedMiB).toBeLessThanOrEqual(first.decodedMiB + 8);
  expect(second.keys).not.toContain('crystal-wyrm');
  await page.close();
  // Fresh contexts expose unnecessary house downloads instead of benefiting from travel cache.
  for (const [name, furniture] of [
    ['empty', []],
    ['frost-display', [{ id: 'heart', item: 'giant-heart', x: 0, floor: 0, display: true }]],
  ]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await context.newPage(),
      images = [];
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('response', (r) => {
      if (/\.(png|webp)$/.test(new URL(r.url()).pathname)) images.push(new URL(r.url()).pathname);
    });
    await mount(p, 'house-small', furniture);
    if (furniture.length)
      await p.waitForFunction(() =>
        window.audit.game.scene
          .getScene('realm')
          .children.list.some((c) => c.name === 'house-display'),
      );
    const usage = await memory(p);
    expect(usage.keys.filter((key) => key.startsWith('loot-equipment-'))).toEqual([]);
    expect(usage.keys.includes('loot-frostfall-items')).toBe(furniture.length > 0);
    expect(usage.keys).not.toContain('animated-display-stands');
    report.houses.push({ name, images: images.length, ...usage });
    await context.close();
  }
  const p = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  p.on('pageerror', (e) => errors.push(e.message));
  await mount(p, 'frostfall-battleground');
  await p.evaluate(() => {
    const a = window.audit;
    a.timer = setInterval(() => {
      const now = Date.now();
      for (const player of a.world.players.values()) {
        player.hp = 100000;
        player.lastHit = now;
      }
      const inputs = new Map(
        [...a.world.players.keys()].map((id) => [
          id,
          { ...a.idleInput(), attack: true, skill: true },
        ]),
      );
      a.world.step(1 / 15, now, inputs);
      a.bridge.snapshot = a.world.snapshot(now);
      const scene = a.game.scene.getScene('realm');
      if (
        a.world.wolves.some((w) => w.special) ||
        a.world.events.some((e) => e.type === 'bossAttack')
      )
        a.sawBossSpecial = true;
      for (const e of a.world.events) scene.events.emit('float', e);
    }, 1000 / 15);
  });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 2 });
  for (const phase of ['wave-nine', 'boss-special']) {
    if (phase === 'boss-special')
      await p.evaluate(() => {
        const a = window.audit;
        a.world.battleground.wave = 9;
        a.world.battleground.spawnWave(Date.now());
        a.world.wolves[0].nextSpecialAt = Date.now();
      });
    await p.waitForTimeout(500);
    const measured = await p.evaluate(
      () =>
        new Promise((resolve) => {
          const samples = [];
          let last;
          const started = performance.now();
          function frame(now) {
            if (last) samples.push(now - last);
            last = now;
            if (now - started < 3000) {
              requestAnimationFrame(frame);
              return;
            }
            samples.sort((a, b) => a - b);
            resolve({
              frames: samples.length,
              averageFrameMs: +(samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(2),
              p95Ms: +samples[Math.floor(samples.length * 0.95)].toFixed(2),
              monsters: window.audit.world.wolves.length,
            });
          }
          requestAnimationFrame(frame);
        }),
    );
    expect(measured.monsters).toBeGreaterThan(0);
    if (phase === 'boss-special') {
      expect(measured.monsters).toBe(1);
      expect(await p.evaluate(() => window.audit.sawBossSpecial)).toBe(true);
    }
    report.battlegrounds.push({ phase, cpuThrottle: 2, ...measured, ...(await memory(p)) });
  }
  await p.evaluate(() => clearInterval(window.audit.timer));
  await p.close();
  expect(errors).toEqual([]);
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/performance-checklist.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
