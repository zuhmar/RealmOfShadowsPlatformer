import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

// Record the real player at its normal pace, including one-way generated pose playback.
await mkdir('artifacts/cutscene-recordings', { recursive: true });
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
try {
  const context = await browser.newContext({
    viewport: { width: 1100, height: 750 },
    recordVideo: { dir: 'artifacts/cutscene-recordings', size: { width: 1100, height: 750 } },
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  await page.goto('http://localhost:5173');
  await page.evaluate(async () => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const {
      default: { createRoot },
    } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { CutscenePlayer } = await import('/src/CutscenePlayer.tsx');
    const { CUTSCENES } = await import(
      '/@fs/workspace/RealmOfShadowsPlatformer/packages/game-data/src/index.ts'
    );
    const { createPlayer } = await import(
      '/@fs/workspace/RealmOfShadowsPlatformer/packages/shared/src/index.ts'
    );
    const el = document.createElement('div');
    document.body.append(el);
    createRoot(el).render(
      React.createElement(CutscenePlayer, {
        scene: CUTSCENES.find((s) => s.id === 'chapter-woods'),
        player: createPlayer('preview', 'Hero', 'village'),
        onFinish: () => {
          window.recordingFinished = true;
        },
      }),
    );
  });
  await expect(page.locator('.cinema-scene-frames')).toBeVisible({ timeout: 15000 });
  await page.waitForFunction(() => window.recordingFinished === true, {}, { timeout: 45000 });
  expect(errors).toEqual([]);
  const video = page.video();
  await context.close();
  await video.saveAs('artifacts/cutscene-opening.webm');
  console.log('Recorded actual one-way opening playback to artifacts/cutscene-opening.webm.');
} finally {
  await browser.close();
}
