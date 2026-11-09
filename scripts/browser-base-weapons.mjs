import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await mkdir('artifacts', { recursive: true });
  await page.goto('http://localhost:5173');
  await page.evaluate(
    async (shared) => {
      const { mountGame } = await import('/src/game.ts');
      const { createPlayer } = await import(shared);
      const starter = ['elderwood-blade', 'elderwood-bow', 'elderwood-staff', 'elderwood-dagger'];
      const kinds = ['sword', 'bow', 'staff', 'dagger'];
      const players = ['starter', 'woods', 'crystal'].flatMap((tier, row) =>
        kinds.map((kind, col) =>
          Object.assign(createPlayer(`${kind}-${tier}`, `${kind} ${tier}`, 'woods'), {
            skin: 'golden-test',
            weapon: tier === 'starter' ? starter[col] : `${tier}-${kind}`,
            x: 400 + col * 180,
            y: 450 + row * 140,
            grounded: true,
          }),
        ),
      );
      const host = document.createElement('div');
      Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 99999 });
      document.body.appendChild(host);
      const bridge = {
        id: 'preview',
        blocked: true,
        held: {},
        send: () => {},
        snapshot: { players, wolves: [], drops: [], mapId: 'woods', time: Date.now() },
      };
      window.baseWeapons = { bridge, game: mountGame(host, bridge), host, frames: {} };
    },
    '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
  );
  await page.waitForFunction(() => window.baseWeapons?.host.getAttribute('aria-busy') === 'false');
  await page.waitForFunction(() => {
    const s = window.baseWeapons.game.scene.getScene('realm');
    return (
      s.characters.size === 12 &&
      [...s.characters.values()].every(
        (v) =>
          v.skinVisual.body.texture.key === `skin-base-${v.player.id}` &&
          v.skinVisual.body.getData('integratedWeapon') === v.player.weapon &&
          !v.skinVisual.item.visible,
      )
    );
  });
  await page.evaluate(() => {
    const t = window.baseWeapons,
      s = t.game.scene.getScene('realm');
    s.cameras.main.centerOn(700, 600);
    for (const [id, v] of s.characters) {
      const record = () => {
        (t.frames[id] ??= []).push(v.skinVisual.body.frame.name);
      };
      v.skinVisual.body.on('animationstart', record);
      v.skinVisual.body.on('animationupdate', record);
    }
  });
  await page.screenshot({ path: 'artifacts/base-weapons-all-tiers.png' });
  const mutate = (values) =>
    page.evaluate(
      (values) =>
        window.baseWeapons.bridge.snapshot.players.forEach((p) => Object.assign(p, values)),
      values,
    );
  const allFrames = (clip) =>
    expect
      .poll(
        () =>
          page.evaluate(
            (clip) =>
              Object.values(window.baseWeapons.frames).every(
                (f) => new Set(f.filter((n) => n.startsWith(clip + '-'))).size === 6,
              ),
            clip,
          ),
        { timeout: 15000 },
      )
      .toBe(true);
  await allFrames('idle');
  await mutate({ vx: 120 });
  await allFrames('walk');
  await mutate({ vx: 0, lastAttack: 100 });
  await allFrames('attack');
  await mutate({ lastSkill: 200 });
  await allFrames('skill');
  await mutate({ grounded: false, climbing: true, vy: -100 });
  await allFrames('climb');
  expect(
    await page.evaluate(() =>
      [...window.baseWeapons.game.scene.getScene('realm').characters.values()].every(
        (v) => v.skinVisual.body.texture.key === 'skin-golden-test' && !v.skinVisual.item.visible,
      ),
    ),
  ).toBe(true);
  await mutate({ grounded: true, climbing: false, vy: 0 });
  await page.evaluate(() => {
    const t = window.baseWeapons,
      skills = ['Mining', 'Woodcutting', 'Fishing', 'Herbalism'];
    t.bridge.snapshot.players.forEach((p, i) => {
      const skill = skills[i % 4],
        node = t.game.scene.getScene('realm').map.resources.find((n) => n.skill === skill);
      p.gathering = {
        nodeId: node.id,
        toolId: ['iron-pickaxe', 'iron-axe', 'iron-rod', 'iron-sickle'][i % 4],
        startedAt: Date.now(),
        finishAt: Date.now() + 30000,
      };
    });
  });
  await page.waitForFunction(() =>
    [...window.baseWeapons.game.scene.getScene('realm').characters.values()].every(
      (v) =>
        v.skinVisual.body.texture.key === 'skin-golden-test' &&
        v.skinVisual.item.visible &&
        v.skinVisual.item.texture.key === 'class-tools',
    ),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/base-weapons-gathering-mobile.png' });
  expect(errors).toEqual([]);
  console.log(
    'PASS: twelve plain Celestial weapon sheets, integrated equipment, attacks/skills, unarmed climbing, held gathering tools, desktop/mobile.',
  );
} finally {
  await browser.close();
}
