import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 750 } }),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
try {
  await page.goto('http://localhost:5173');
  await page.evaluate(async () => {
    const { mountGame } = await import('/src/game.ts');
    const { World, createPlayer } = await import(
      '/@fs/workspace/RealmOfShadowsPlatformer/packages/shared/src/index.ts'
    );
    const { MAPS } = await import(
      '/@fs/workspace/RealmOfShadowsPlatformer/packages/game-data/src/index.ts'
    );
    const w = new World(MAPS.woods),
      p = createPlayer('hero', 'Gatherer', 'woods');
    w.players.set(p.id, p);
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 999 });
    document.body.append(host);
    const bridge = {
      id: p.id,
      blocked: true,
      held: {},
      send: () => {},
      snapshot: w.snapshot(Date.now()),
    };
    window.gs = { host, bridge, game: mountGame(host, bridge) };
  });
  await page.waitForFunction(() => window.gs.host.getAttribute('aria-busy') === 'false');
  const skins = ['base', 'knight', 'archer', 'mage', 'rogue'],
    materials = ['wood', 'iron', 'crystal', 'mire', 'frost', 'ember', 'celestial', 'shadow'],
    skills = [
      ['Mining', 'pickaxe'],
      ['Woodcutting', 'axe'],
      ['Fishing', 'rod'],
      ['Herbalism', 'sickle'],
    ];
  let checked = 0;
  for (const skin of skins)
    for (const material of materials)
      for (const [skill, type] of skills) {
        const tool = `${material}-${type}`;
        await page.evaluate(
          ({ skin, skill, tool }) => {
            const t = window.gs,
              s = t.game.scene.getScene('realm'),
              p = t.bridge.snapshot.players[0],
              node = s.map.resources.find((n) => n.skill === skill);
            Object.assign(p, {
              skin: skin === 'base' ? 'golden-test' : skin,
              classId: skin === 'base' ? undefined : skin,
              x: node.x,
              y: node.y,
              grounded: true,
              platform: node.platform,
              facing: 1,
              climbing: false,
              gathering: { nodeId: node.id, startedAt: 10000, finishAt: 20000, toolId: tool },
            });
          },
          { skin, skill, tool },
        );
        await expect
          .poll(
            () =>
              page.evaluate(() => {
                const v = window.gs.game.scene.getScene('realm').characters.get('hero').skinVisual;
                return `${v.body.texture.key}/${v.body.getData('gatheringSkill')}/${v.body.getData('gatheringTool')}`;
              }),
            { timeout: 20000 },
          )
          .toBe(`gather-baked-${skin}-${material}/${skill}/${tool}`);
        const pose = await page.evaluate(() => {
          const v = window.gs.game.scene.getScene('realm').characters.get('hero').skinVisual;
          return {
            integrated: v.body.getData('integratedGatheringTool'),
            overlay: v.item.visible,
            frame: v.body.frame.name,
          };
        });
        expect(pose.integrated).toBe(true);
        expect(pose.overlay).toBe(false);
        expect(pose.frame.startsWith(skill.toLowerCase() + '-')).toBe(true);
        if (material === 'wood') {
          const initial = await page.evaluate(
            () =>
              window.gs.game.scene.getScene('realm').characters.get('hero').skinVisual.body.frame
                .name,
          );
          await expect
            .poll(
              () =>
                page.evaluate(
                  () =>
                    window.gs.game.scene.getScene('realm').characters.get('hero').skinVisual.body
                      .frame.name,
                ),
              { timeout: 6000, intervals: [50] },
            )
            .not.toBe(initial);
        }
        checked++;
        if (material === 'mire') {
          await page.waitForTimeout(140);
          await page.screenshot({ path: `artifacts/gather-${skin}-${skill.toLowerCase()}.png` });
        }
      }
  await page.evaluate(() => {
    const p = window.gs.bridge.snapshot.players[0];
    p.gathering = undefined;
    p.climbing = true;
    p.grounded = false;
    p.vy = -100;
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.gs.game.scene
          .getScene('realm')
          .characters.get('hero')
          .skinVisual.body.getData('gatheringSkill'),
      ),
    )
    .toBe(null);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    const t = window.gs,
      s = t.game.scene.getScene('realm'),
      p = t.bridge.snapshot.players[0],
      node = s.map.resources.find((n) => n.skill === 'Fishing');
    Object.assign(p, {
      skin: 'mage',
      classId: 'mage',
      climbing: false,
      grounded: true,
      x: node.x,
      y: node.y,
      platform: node.platform,
      gathering: { nodeId: node.id, startedAt: 10000, finishAt: 20000, toolId: 'celestial-rod' },
    });
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.gs.game.scene
          .getScene('realm')
          .characters.get('hero')
          .skinVisual.body.getData('gatheringTool'),
      ),
    )
    .toBe('celestial-rod');
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'artifacts/gathering-skins-mobile.png' });
  expect(errors).toEqual([]);
  console.log(
    `PASS: ${checked} skin/material/activity combinations use generated character-and-tool frames without tool overlays; climbing suppresses gathering; mobile fishing checked.`,
  );
} finally {
  await browser.close();
}
