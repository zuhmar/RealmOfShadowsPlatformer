import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox'],
  }),
  page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await mkdir('artifacts', { recursive: true });
  await page.goto('http://localhost:5173');
  for (const appearance of ['male', 'female']) {
    await page.evaluate(async (appearance) => {
      document.getElementById('art-review')?.remove();
      const { assetUrl } = await import('/src/assets.ts');
      const host = document.createElement('main');
      host.id = 'art-review';
      Object.assign(host.style, {
        position: 'absolute',
        zIndex: 100000,
        top: '0',
        left: '0',
        width: '1200px',
        background: '#171022',
        padding: '18px',
        color: 'white',
        fontFamily: 'Arial',
      });
      const title = document.createElement('h2');
      title.textContent = `Integrated class sprites · ${appearance}`;
      host.append(title);
      const grid = document.createElement('div');
      Object.assign(grid.style, {
        display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)',
        gap: '12px',
      });
      host.append(grid);
      document.body.append(host);
      for (const skin of ['knight', 'archer', 'mage', 'rogue'])
        for (const tier of [null, 'starter', 'woods', 'crystal']) {
          const path = `/assets/characters/skins/integrated/${tier ? `armed/${tier}/` : ''}${appearance}-${skin}`,
            atlas = await fetch(`${path}.json`).then((r) => r.json()),
            image = assetUrl(`${path}.png`),
            card = document.createElement('section');
          Object.assign(card.style, {
            border: '1px solid #77568f',
            borderRadius: '10px',
            padding: '8px',
            background: '#241733',
          });
          card.innerHTML = `<p style="margin:0 0 6px;font-size:13px;color:#e3c6ff">${skin} · ${tier ?? 'unarmed'}</p>`;
          const row = document.createElement('div');
          Object.assign(row.style, { display: 'flex', justifyContent: 'space-around' });
          card.append(row);
          for (const pose of ['idle-0', 'attack-3']) {
            const f = atlas.frames[pose],
              s = f.spriteSourceSize,
              b = f.frame;
            row.innerHTML += `<svg width="110" height="155" viewBox="0 0 ${f.sourceSize.w} ${f.sourceSize.h}"><svg x="${s.x}" y="${s.y}" width="${b.w}" height="${b.h}" viewBox="${b.x} ${b.y} ${b.w} ${b.h}"><image href="${image}" width="${atlas.meta.size.w}" height="${atlas.meta.size.h}"/></svg></svg>`;
          }
          grid.append(card);
          const decoded = new Image();
          decoded.src = image;
          await decoded.decode();
        }
    }, appearance);
    await page
      .locator('#art-review')
      .screenshot({ path: `artifacts/integrated-art-${appearance}.png` });
  }
  expect(errors).toEqual([]);
  console.log(
    'PASS: reviewed idle/attack contact sheets for all 32 integrated class sprite atlases.',
  );
} finally {
  await browser.close();
}
