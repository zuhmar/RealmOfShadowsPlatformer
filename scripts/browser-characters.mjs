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
    const players = [];
    for (const appearance of ['male', 'female'])
      for (const outfit of ['sage', 'ember', 'tide'])
        players.push({
          id: `${appearance}-${outfit}`,
          name: `${appearance} · ${outfit}`,
          appearance,
          outfit,
          x: 400 + players.length * 120,
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
          inventory: {},
          weapon: null,
          auto: false,
          settings: { skills: true, loot: true, target: 'nearest', healBelow: 30 },
          lastAttack: 0,
          lastSkill: 0,
          lastHit: 0,
          mapId: 'woods',
          kills: 0,
          targetId: null,
        });
    const bridge = {
      id: 'test',
      snapshot: { players, wolves: [], drops: [], mapId: 'woods', time: Date.now() },
      held: {},
      send: () => {},
    };
    window.characterTest = { bridge, game: mountGame(host, bridge), frames: {}, corpses: [] };
  });
  await page.waitForFunction(
    () => window.characterTest?.game.scene.getScene('realm')?.characters?.size === 6,
  );
  await page.evaluate(() => {
    const t = window.characterTest,
      s = t.game.scene.getScene('realm');
    s.cameras.main.centerOn(700, 650);
    for (const [id, v] of s.characters) {
      const record = (_animation, frame) => {
        (t.frames[id] ??= []).push(String(frame.textureFrame));
      };
      v.sprite.on('animationstart', record);
      v.sprite.on('animationupdate', record);
    }
    s.events.on('postupdate', () => {
      for (const [id, v] of s.characters) {
        const frame = String(v.sprite.frame.name);
        (t.frames[id] ??= []).push(frame);
      }
    });
  });
  const mutate = async (values) =>
    page.evaluate((v) => {
      for (const p of window.characterTest.bridge.snapshot.players) Object.assign(p, v);
    }, values);
  const state = () =>
    page.evaluate(() => {
      const t = window.characterTest,
        s = t.game.scene.getScene('realm');
      return {
        frames: t.frames,
        characters: [...s.characters.values()].map((v) => ({
          key: v.key,
          frame: String(v.sprite.frame.name),
          paused: v.sprite.anims.isPaused,
          flip: v.container.scaleX,
          weapon: v.drawnWeapon !== 'unarmed',
        })),
        corpses: t.corpses.map((c) => ({ active: c.active, frame: String(c.frame?.name) })),
      };
    });
  const allFrames = async (name) => {
    for (const id of ['male-sage', 'female-sage'])
      await expect
        .poll(
          async () =>
            new Set((await state()).frames[id]?.filter((x) => x.startsWith(name + '-'))).size,
          { timeout: 15000 },
        )
        .toBe(6);
  };
  await allFrames('idle');
  await page.screenshot({ path: 'artifacts/characters-outfits.png' });
  await mutate({ vx: 200 });
  await allFrames('walk');
  await mutate({ vx: 0, grounded: false, vy: -500 });
  await page.waitForTimeout(350);
  for (const vy of [-200, 0, 250]) {
    await mutate({ vy });
    await page.waitForTimeout(250);
  }
  await mutate({ grounded: true, vy: 0 });
  await page.waitForTimeout(150);
  await allFrames('jump');
  await mutate({ grounded: false, climbing: true, vy: -155 });
  await allFrames('climb');
  await mutate({ vy: 0 });
  await page.waitForTimeout(150);
  const paused = (await state()).characters.map((c) => c.frame);
  expect((await state()).characters.every((c) => c.paused)).toBe(true);
  await page.waitForTimeout(350);
  expect((await state()).characters.map((c) => c.frame)).toEqual(paused);
  await mutate({ vy: -155 });
  await page.waitForTimeout(150);
  expect((await state()).characters.every((c) => !c.paused)).toBe(true);
  await mutate({ grounded: true, climbing: false, vy: 0, lastAttack: 100, weapon: 'sword' });
  await allFrames('attack');
  expect((await state()).characters.every((c) => c.weapon)).toBe(true);
  await mutate({ vx: 200 });
  await expect
    .poll(async () => (await state()).characters.every((c) => c.frame.startsWith('walk-')), {
      timeout: 5000,
    })
    .toBe(true);
  await mutate({ hp: 93, lastHit: 200 });
  await page.waitForTimeout(250);
  expect((await state()).characters.every((c) => c.frame.startsWith('walk-'))).toBe(true);
  expect(
    Object.values((await state()).frames)
      .flat()
      .some((f) => f.startsWith('hurt-')),
  ).toBe(false);
  await mutate({ vx: 0 });
  await mutate({ facing: -1 });
  await page.waitForTimeout(120);
  expect((await state()).characters.every((c) => c.flip === -1)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'artifacts/characters-mobile.png' });
  await page.evaluate(() => {
    const t = window.characterTest,
      s = t.game.scene.getScene('realm');
    for (const [id, v] of s.characters) {
      s.events.emit('float', {
        type: 'respawn',
        playerId: id,
        x: 180,
        y: 760,
        deathX: v.container.x,
        deathY: v.container.y,
        text: 'Returned to safety',
      });
    }
    t.corpses = s.children.list.filter(
      (c) => c.type === 'Sprite' && String(c.anims?.currentAnim?.key).endsWith('-death'),
    );
    for (const c of t.corpses) {
      const id = c.texture.key.includes('female') ? 'female-sage' : 'male-sage';
      const record = () => {
        (t.frames[id] ??= []).push(String(c.frame.name));
      };
      record();
      c.on('animationupdate', record);
    }
  });
  await allFrames('death');
  await expect
    .poll(async () => (await state()).corpses.every((c) => !c.active), { timeout: 5000 })
    .toBe(true);
  expect(errors).toEqual([]);
  console.log(
    'PASS: both appearances, six outfits, all 72 active pose frames, physics-selected jump, paused/resumed climb, attacks uninterrupted by damage, facing, equipped blades, defeat/fade and mobile render.',
  );
} finally {
  await browser.close();
}
