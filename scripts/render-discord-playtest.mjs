import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const out = new URL('docs/community/discord/playtest-2026-11-15/', root);
const background = await readFile(new URL('roadmap-background.png', out));
const sprite = async (skin, left) => {
  const base = new URL(
    `apps/web/public/assets/characters/skins/celestial/${skin}-armed-crystal`,
    root,
  );
  const atlas = JSON.parse(await readFile(new URL(base.href + '.json'), 'utf8'));
  const png = await readFile(new URL(base.href + '.png'));
  const { x, y, w, h } = atlas.frames['idle-0'].frame;
  return `<svg style="position:absolute;left:${left}px;top:12px;width:200px;height:204px;overflow:hidden" viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="xMidYMax meet" aria-label="Actual ${skin} in-game sprite"><image href="data:image/png;base64,${png.toString('base64')}" width="${atlas.meta.size.w}" height="${atlas.meta.size.h}"/></svg>`;
};
const html = `<style>html,body{margin:0;width:1024px;height:1536px;overflow:hidden}main{position:relative;width:1024px;height:1536px}img{display:block;width:1024px;height:1536px}</style><main><img src="data:image/png;base64,${background.toString('base64')}">${await sprite('knight', 38)}${await sprite('mage', 786)}</main>`;
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1024, height: 1536 },
    deviceScaleFactor: 1,
  });
  await page.setContent(html);
  await page.evaluate(async () => {
    await Promise.all(Array.from(document.images).map((im) => im.decode()));
    await Promise.all(
      Array.from(document.querySelectorAll('svg image')).map(
        (im) =>
          new Promise((resolve, reject) => {
            const test = new Image();
            test.onload = resolve;
            test.onerror = reject;
            test.src = im.getAttribute('href');
          }),
      ),
    );
  });
  await page.screenshot({ path: new URL('roadmap.png', out).pathname });
  await writeFile(
    new URL('provenance.json', out),
    JSON.stringify(
      {
        background: 'roadmap-background.png',
        generatedSource: 'exec-5a35b952-4276-49af-a0bd-8bb76c70a0b7.png',
        characters: ['knight-armed-crystal', 'mage-armed-crystal'],
        frame: 'idle-0',
        method:
          'Original in-game sprite pixels placed over generated poster, no character redrawing.',
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  await browser.close();
}
