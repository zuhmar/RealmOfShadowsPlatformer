import { chromium, expect } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const base = process.env.PERF_PREVIEW_URL ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage(),
    scripts = new Set(),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    const p = new URL(r.url()).pathname;
    if (p.endsWith('.js')) scripts.add(p);
  });
  await page.goto(base);
  await expect(page.getByRole('heading', { name: /A little light/ })).toBeVisible();
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Begin your story.' })).toBeVisible();
  const names = [...scripts];
  expect(
    names.some((n) =>
      /\/(game-|BagPanel-|StoragePanel-|HousingPanel-|WorldMapPanel-|ClassCarousel-|CutscenePlayer-)/.test(
        n,
      ),
    ),
  ).toBe(false);
  let raw = 0,
    gzip = 0;
  for (const path of names) {
    const file = await readFile(new URL('../apps/web/dist' + path, import.meta.url));
    raw += file.length;
    gzip += gzipSync(file).length;
  }
  expect(errors).toEqual([]);
  const result = {
    initialJavaScriptFiles: names,
    rawJavaScriptBytes: raw,
    estimatedGzipJavaScriptBytes: gzip,
    gameAndHeavyPanelsDeferred: true,
    scope:
      'Production build landing/account dialog; gzip is a file-size estimate, not measured network transfer.',
  };
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/startup-bundle.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
