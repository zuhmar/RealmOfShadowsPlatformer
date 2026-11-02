import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 650 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto('http://localhost:5173');
  await page.evaluate(async () => {
    const { mountGame } = await import('/src/game.ts');
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'fixed', inset: '0', zIndex: '999' });
    document.body.appendChild(host);
    const ids = ['elderwood-blade', 'elderwood-bow', 'elderwood-staff', 'elderwood-dagger'];
    const players = ids.map((weapon, i) => ({
      id: `trial-${i}`,
      name: ['Knight', 'Archer', 'Mage', 'Rogue'][i],
      appearance: i % 2 ? 'female' : 'male',
      outfit: 'sage',
      x: 500 + i * 150,
      y: 760,
      vx: 0,
      vy: 0,
      facing: 1,
      grounded: true,
      climbing: false,
      platform: 'ground',
      dropUntil: 0,
      level: 1,
      xp: 0,
      hp: 100,
      mp: 50,
      gold: 0,
      inventory: { [weapon]: 1 },
      weapon,
      auto: false,
      settings: { skills: true, loot: true, target: 'nearest', healBelow: 30 },
      lastAttack: 0,
      lastSkill: 0,
      lastHit: 0,
      mapId: 'woods',
      kills: 0,
      targetId: null,
    }));
    const bridge = {
      id: 'test',
      snapshot: {
        players,
        wolves: [],
        drops: [],
        projectiles: [],
        mapId: 'woods',
        time: Date.now(),
      },
      held: {},
      send: () => {},
    };
    window.weaponTest = { host, bridge, game: mountGame(host, bridge) };
  });
  await page.waitForFunction(() => window.weaponTest?.host.getAttribute('aria-busy') === 'false');
  await page.waitForFunction(
    () => window.weaponTest.game.scene.getScene('realm').characters.size === 4,
  );
  await page.evaluate(() =>
    window.weaponTest.game.scene.getScene('realm').cameras.main.centerOn(720, 650),
  );
  expect(
    await page.evaluate(() =>
      [...window.weaponTest.game.scene.getScene('realm').characters.values()].map(
        (v) => v.drawnWeapon,
      ),
    ),
  ).toEqual(['sword', 'bow', 'staff', 'dagger']);
  await page.evaluate(() => {
    const t = window.weaponTest;
    for (const p of t.bridge.snapshot.players) p.lastAttack = 1000;
    t.bridge.snapshot.projectiles = [
      {
        id: 'shot-arrow',
        owner: 'trial-1',
        kind: 'arrow',
        x: 720,
        y: 730,
        startX: 650,
        vx: 560,
        range: 280,
        damage: 20,
        empowered: false,
      },
      {
        id: 'shot-orb',
        owner: 'trial-2',
        kind: 'orb',
        x: 890,
        y: 730,
        startX: 800,
        vx: 400,
        range: 320,
        damage: 22,
        empowered: false,
      },
    ];
  });
  await page.waitForTimeout(120);
  expect(
    await page.evaluate(() =>
      ['shot-arrow', 'shot-orb'].every((id) =>
        window.weaponTest.game.scene.getScene('realm').actors.has(id),
      ),
    ),
  ).toBe(true);
  await page.screenshot({ path: 'artifacts/four-weapon-trials.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'artifacts/weapon-trials-mobile.png' });
  await page.evaluate(() => (window.weaponTest.bridge.snapshot.projectiles = []));
  await page.waitForTimeout(100);
  expect(
    await page.evaluate(() =>
      window.weaponTest.game.scene.getScene('realm').actors.has('shot-arrow'),
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
  console.log(
    'PASS: sword, bow, staff and dagger render separately; arrow/orb snapshots render and clean up; desktop/mobile show no browser errors.',
  );
} finally {
  await browser.close();
}
