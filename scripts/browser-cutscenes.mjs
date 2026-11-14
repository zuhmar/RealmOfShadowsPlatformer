import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const context = await browser.newContext({
  viewport: { width: 1200, height: 800 },
  recordVideo: process.env.CUTSCENE_VIDEO
    ? { dir: 'artifacts/cutscene-video', size: { width: 1200, height: 800 } }
    : undefined,
});
const page = await context.newPage(),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(`${r.status()}: ${r.url()}`);
});
try {
  await page.goto('http://localhost:5173');
  await page.evaluate(async () => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js'),
      {
        default: { createRoot },
      } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { CutscenePlayer } = await import('/src/CutscenePlayer.tsx'),
      { CUTSCENES } = await import(
        '/@fs/workspace/RealmOfShadowsPlatformer/packages/game-data/src/index.ts'
      ),
      { createPlayer } = await import(
        '/@fs/workspace/RealmOfShadowsPlatformer/packages/shared/src/index.ts'
      );
    const el = document.createElement('div');
    document.body.append(el);
    const root = createRoot(el),
      p = createPlayer('film', 'Story Hero', 'village');
    window.filmqa = {
      done: 0,
      sequence: 0,
      show(id) {
        const scene = CUTSCENES.find((s) => s.id === id);
        root.render(
          React.createElement(CutscenePlayer, {
            key: `${id}:${++window.filmqa.sequence}`,
            scene,
            player: p,
            onFinish: () => window.filmqa.done++,
          }),
        );
      },
      scenes: CUTSCENES.filter((s) => !s.future).map((s) => ({ id: s.id, beats: s.beats.length })),
    };
    window.filmqa.show('chapter-woods');
  });
  await expect(page.getByRole('dialog', { name: 'The promise that survived' })).toBeVisible();
  await expect(page.locator('.cinema-loading')).toHaveCount(0, { timeout: 20000 });
  const actor = page.locator('[data-film-path]').first();
  await expect(actor).toBeVisible();
  const initial = await actor.getAttribute('data-film-frame');
  await expect
    .poll(() => actor.getAttribute('data-film-frame'), { intervals: [50] })
    .not.toBe(initial);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const paused = await actor.getAttribute('data-film-frame');
  await page.waitForTimeout(350);
  expect(await actor.getAttribute('data-film-frame')).toBe(paused);
  await page.screenshot({ path: 'artifacts/cutscene-opening-desktop.png' });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('.cinema-loading')).toHaveCount(0);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'artifacts/cutscene-training.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  const box = await page.getByRole('dialog').boundingBox();
  expect(box.width).toBe(390);
  for (const b of await page.getByRole('dialog').getByRole('button').all()) {
    const f = await b.boundingBox();
    expect(f.x).toBeGreaterThanOrEqual(0);
    expect(f.x + f.width).toBeLessThanOrEqual(390);
  }
  await page.screenshot({ path: 'artifacts/cutscene-mobile.png' });
  await page.setViewportSize({ width: 1200, height: 800 });
  const scenes = await page.evaluate(() => window.filmqa.scenes);
  let beats = 0;
  for (const s of scenes) {
    await page.evaluate((id) => window.filmqa.show(id), s.id);
    await expect(page.locator('.cinema-stage')).toHaveAttribute('data-cinema-beat', '0');
    for (let i = 0; i < s.beats; i++) {
      await expect(page.locator('.cinema-stage')).toHaveAttribute('data-cinema-beat', String(i));
      await expect(page.locator('.cinema-loading')).toHaveCount(0, { timeout: 20000 });
      expect(await page.locator('.cinema-actor svg, .cinema-actor img').count()).toBeGreaterThan(0);
      beats++;
      if (
        ['feature-classes', 'feature-arena', 'feature-battlegrounds', 'feature-housing'].includes(
          s.id,
        ) &&
        i === 0
      ) {
        await page.waitForTimeout(250);
        await page.screenshot({ path: `artifacts/cutscene-${s.id}.png` });
      }
      if (i < s.beats - 1) await page.getByRole('button', { name: 'Next', exact: true }).click();
      else await page.getByRole('button', { name: 'Continue journey' }).click();
    }
  }
  const completed = await page.evaluate(() => window.filmqa.done);
  expect(completed).toBe(scenes.length);
  await page.evaluate(() => window.filmqa.show('chapter-woods'));
  await expect(page.getByRole('dialog', { name: 'The promise that survived' })).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.filmqa.done)).toBe(completed + 1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => window.filmqa.show('feature-training'));
  await expect(page.getByRole('dialog', { name: 'The strength you earn' })).toBeVisible();
  await expect(page.locator('.cinema-loading')).toHaveCount(0);
  const reduced = page.locator('.cinema-actor [data-film-frame]').first();
  const frame = await reduced.getAttribute('data-film-frame');
  await page.waitForTimeout(350);
  expect(await reduced.getAttribute('data-film-frame')).toBe(frame);
  expect(errors).toEqual([]);
  console.log(
    `Animated films: ${scenes.length} playable scenes / ${beats} beats, actual frame playback, Pause/Play, stepping, completion/skip, mobile bounds, reduced motion and all artwork requests passed.`,
  );
} finally {
  await context.close();
  await browser.close();
}
