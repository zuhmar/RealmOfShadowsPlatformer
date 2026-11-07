import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 850 } }),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('/assets/')) errors.push(`${r.status()} ${r.url()}`);
});
try {
  await mkdir('artifacts', { recursive: true });
  await page.goto('http://localhost:5173');
  await page.evaluate(
    async (shared) => {
      const { mountGame } = await import('/src/game.ts');
      const { createPlayer } = await import(shared);
      const players = ['male', 'female'].flatMap((appearance, row) =>
        ['knight', 'archer', 'mage', 'rogue'].map((skin, col) =>
          Object.assign(createPlayer(`${appearance}-${skin}`, skin, 'crystal'), {
            appearance,
            skin,
            classId: skin,
            weapon: `crystal-${['sword', 'bow', 'staff', 'dagger'][col]}`,
            x: 600 + col * 210,
            y: row ? 800 : 400,
            grounded: true,
            platform: row ? 'ground' : 'crystal-lower',
          }),
        ),
      );
      const host = document.createElement('div');
      Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 999 });
      document.body.append(host);
      const bridge = {
        id: 'fixture',
        held: {},
        blocked: true,
        send: () => {},
        snapshot: {
          mapId: 'crystal',
          players,
          wolves: [],
          drops: [],
          projectiles: [],
          time: Date.now(),
        },
      };
      window.skinsTest = { host, bridge, frames: {}, game: mountGame(host, bridge) };
    },
    '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
  );
  await page.waitForFunction(() => window.skinsTest?.host.getAttribute('aria-busy') === 'false');
  await page.waitForFunction(() => {
    const s = window.skinsTest.game.scene.getScene('realm');
    return (
      s.characters.size === 8 &&
      [...s.characters.values()].every(
        (v) => v.skinVisual?.container.visible && v.skinVisual.body.getData('integratedWeapon'),
      )
    );
  });
  await page.evaluate(() => {
    const t = window.skinsTest,
      s = t.game.scene.getScene('realm');
    s.cameras.main.centerOn(920, 570);
    for (const [id, v] of s.characters) {
      const record = () => {
        (t.frames[id] ??= []).push(String(v.skinVisual.body.frame.name));
      };
      v.skinVisual.body.on('animationstart', record);
      v.skinVisual.body.on('animationupdate', record);
    }
  });
  for (const tier of ['starter', 'woods', 'crystal']) {
    await page.evaluate((tier) => {
      const t = window.skinsTest;
      t.bridge.snapshot.players.forEach((p, i) => {
        const kind = ['sword', 'bow', 'staff', 'dagger'][i % 4];
        p.weapon =
          tier === 'starter'
            ? ['elderwood-blade', 'elderwood-bow', 'elderwood-staff', 'elderwood-dagger'][i % 4]
            : `${tier}-${kind}`;
      });
    }, tier);
    await page.waitForFunction(
      (tier) =>
        [...window.skinsTest.game.scene.getScene('realm').characters.values()].every(
          (v) =>
            v.skinVisual.body.texture.key.endsWith(`-${tier}`) &&
            v.skinVisual.body.getData('integratedWeapon') &&
            !v.skinVisual.item.visible,
        ),
      tier,
    );
  }
  await page.evaluate(() => {
    const scene = window.skinsTest.game.scene.getScene('realm');
    for (const visual of scene.characters.values()) {
      const body = visual.skinVisual.body;
      const frame = body.frame;
      if (Math.abs(frame.u0 - (frame.cutX + 0.5) / frame.source.width) > 1e-9)
        throw new Error('Pose filtering can sample a neighboring sprite');
      const atlas = scene.cache.json.get(`${body.texture.key}-atlas`);
      for (const pose of Object.values(atlas.frames)) {
        if (pose.spriteSourceSize.y + pose.frame.h !== atlas.meta.sourceFrame.baseline)
          throw new Error('Pose changes move the feet away from the baseline');
      }
    }
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'artifacts/class-skins-lineup.png' });
  const mutate = (values) =>
    page.evaluate(
      (v) => window.skinsTest.bridge.snapshot.players.forEach((p) => Object.assign(p, v)),
      values,
    );
  const allFrames = (prefix) =>
    expect
      .poll(
        () =>
          page.evaluate(
            (prefix) =>
              Object.values(window.skinsTest.frames).every(
                (frames) => new Set(frames.filter((f) => f.startsWith(prefix + '-'))).size === 6,
              ),
            prefix,
          ),
        { timeout: 6000 },
      )
      .toBe(true);
  await allFrames('idle');
  await mutate({ vx: 180 });
  await allFrames('walk');
  await mutate({ vx: 0, grounded: false, climbing: true, vy: -150 });
  await allFrames('climb');
  expect(
    await page.evaluate(() =>
      [...window.skinsTest.game.scene.getScene('realm').characters.values()].every(
        (v) =>
          !v.skinVisual.item.visible &&
          v.skinVisual.body.getData('integratedWeapon') === null &&
          !v.skinVisual.body.texture.key.endsWith('-crystal'),
      ),
    ),
  ).toBe(true);
  await mutate({ grounded: true, climbing: false, vy: 0, lastAttack: 100 });
  await allFrames('attack');
  await page.evaluate(() => {
    const t = window.skinsTest,
      skills = ['Mining', 'Woodcutting', 'Fishing', 'Herbalism'],
      tools = ['pickaxe', 'axe', 'rod', 'sickle'];
    t.bridge.snapshot.players.forEach((p, i) => {
      const skill = skills[i % 4],
        node = t.game.scene.getScene('realm').map.resources.find((n) => n.skill === skill);
      p.gathering = {
        nodeId: node.id,
        toolId: `crystal-${tools[i % 4]}`,
        startedAt: Date.now(),
        finishAt: Date.now() + 30000,
      };
    });
  });
  await page.waitForFunction(() =>
    [...window.skinsTest.game.scene.getScene('realm').characters.values()].every(
      (v) => v.skinVisual.item.texture.key === 'class-tools',
    ),
  );
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'artifacts/class-skins-gathering.png' });
  expect(
    await page.evaluate(() =>
      [...window.skinsTest.game.scene.getScene('realm').characters.values()].every(
        (v) => v.skinVisual.container.visible && v.skinVisual.item.visible,
      ),
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/class-skins-mobile.png' });
  const distorted = await page.evaluate(() => {
    const result = [];
    function visit(n) {
      if (
        ['Image', 'Sprite'].includes(n.type) &&
        Math.abs(Math.abs(n.scaleX) - Math.abs(n.scaleY)) > 0.001
      )
        result.push(`${n.name}:${n.texture.key}`);
      n.list?.forEach(visit);
    }
    window.skinsTest.game.scene.getScene('realm').children.list.forEach(visit);
    return result;
  });
  expect(distorted).toEqual([]);
  await mutate({ skin: null, gathering: undefined });
  await page.waitForFunction(() =>
    [...window.skinsTest.game.scene.getScene('realm').characters.values()].every(
      (v) => v.sprite.visible && !v.skinVisual.container.visible,
    ),
  );
  expect(errors).toEqual([]);
  console.log(
    'PASS: eight class skins, all six-frame idle/walk/climb/attack loops, integrated headwear/weapons, held tools, unarmed climbing, original-skin restoration and uniform artwork scale.',
  );
} finally {
  await browser.close();
}
