import { chromium, expect } from '@playwright/test';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
const current = JSON.parse(
  await readFile(new URL('../apps/web/public/assets/optimized-manifest.json', import.meta.url)),
);
const previous = process.env.BASELINE_MANIFEST
  ? JSON.parse(await readFile(process.env.BASELINE_MANIFEST))
  : null;
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const results = [];
try {
  await mkdir('artifacts', { recursive: true });
  for (const [name, manifest] of previous
    ? [
        ['before', previous],
        ['after', current],
      ]
    : [['after', current]]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
    });
    const page = await context.newPage();
    const errors = [],
      images = new Set();
    page.on('pageerror', (e) => errors.push(e.message));
    const remap = Object.fromEntries(
      Object.entries(current).map(([source, delivery]) => [delivery, manifest[source] ?? delivery]),
    );
    await page.route('**/assets/optimized/**', (route) => {
      const url = new URL(route.request().url());
      url.pathname = remap[url.pathname] ?? url.pathname;
      return route.continue({ url: url.href });
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await page.goto('http://localhost:5173');
    // Import code first so this comparison measures artwork loading, not dev compilation.
    await page.evaluate(async () => {
      await import('/src/game.ts');
    });
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 40,
      downloadThroughput: 1250000,
      uploadThroughput: 1250000,
    });
    page.on('request', (r) => {
      const p = new URL(r.url()).pathname;
      if (/\.(webp|png)$/.test(p)) images.add(remap[p] ?? p);
    });
    const started = Date.now();
    await page.evaluate(
      async (shared) => {
        const { mountGame } = await import('/src/game.ts');
        const { createPlayer } = await import(shared);
        const p = createPlayer('hero', 'Hero', 'woods-3');
        const host = document.createElement('div');
        host.style.cssText = 'position:fixed;inset:0';
        document.body.append(host);
        const progress = [];
        const game = mountGame(host, {
          id: p.id,
          held: {},
          blocked: true,
          send: () => {},
          snapshot: {
            mapId: 'woods-3',
            players: [p],
            wolves: [],
            drops: [],
            projectiles: [],
            time: Date.now(),
          },
          onLoadProgress: (value) => progress.push(value),
        });
        window.startupTest = { host, game, progress };
      },
      '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
    );
    await page.waitForFunction(
      () => window.startupTest.host.getAttribute('aria-busy') === 'false',
      null,
      { timeout: 90000 },
    );
    const seconds = (Date.now() - started) / 1000;
    const progress = await page.evaluate(() => window.startupTest.progress);
    expect(progress.at(-1)).toBe(100);
    expect(errors).toEqual([]);
    let bytes = 0;
    for (const p of images)
      bytes += (await stat(new URL('../apps/web/public' + p, import.meta.url))).size;
    results.push({
      name,
      artworkBytes: bytes,
      readySeconds: seconds,
      connection: '10 Mbps, 40 ms latency; fresh cache; local Chromium',
    });
    await page.screenshot({ path: `artifacts/startup-${name}.png` });
    await context.close();
  }
  if (previous) expect(results[1].artworkBytes).toBeLessThan(results[0].artworkBytes * 0.6);
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/startup-performance.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
