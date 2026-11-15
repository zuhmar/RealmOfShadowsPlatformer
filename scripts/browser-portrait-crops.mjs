import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 520 } }),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:5173');
  await page.evaluate(async () => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const {
      default: { createRoot },
    } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { ClassSprite } = await import('/src/ClassSprite.tsx');
    const host = document.createElement('div');
    host.className = 'character-carousel';
    Object.assign(host.style, {
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      background: '#231135',
    });
    document.body.append(host);
    const skins = ['golden-test', 'knight', 'archer', 'mage', 'rogue'];
    window.portraitAudit = { root: createRoot(host), React, ClassSprite };
    window.portraitAudit.root.render(
      React.createElement(
        React.Fragment,
        null,
        ...skins.map((skin) =>
          React.createElement(
            'div',
            { className: 'portrait-big', key: skin, 'data-skin': skin },
            React.createElement(ClassSprite, { skin, appearance: 'male' }),
          ),
        ),
      ),
    );
  });
  await expect(page.locator('[data-skin] .class-sprite[aria-busy="false"]')).toHaveCount(5);
  const result = await page.evaluate(async () => {
    const portraits = [...document.querySelectorAll('[data-skin] .class-sprite')];
    const clips = portraits.map((svg) => svg.querySelector('clipPath').id);
    if (new Set(clips).size !== 5) throw Error('Portrait clips are not unique');
    const report = [];
    for (const svg of portraits) {
      if (svg.querySelector('svg')) throw Error('Nested SVG crop remains exposed to portrait CSS');
      const copy = svg.cloneNode(true),
        size = svg.getBoundingClientRect();
      copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      copy.setAttribute('width', size.width);
      copy.setAttribute('height', size.height);
      copy.style.filter = 'none';
      const image = copy.querySelector('image');
      const data = await fetch(image.getAttribute('href')).then((r) => r.blob());
      image.setAttribute(
        'href',
        await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(data);
        }),
      );
      const raster = new Image();
      raster.src =
        'data:image/svg+xml;charset=utf-8,' +
        encodeURIComponent(new XMLSerializer().serializeToString(copy));
      await raster.decode();
      const canvas = document.createElement('canvas');
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(raster, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const rect = copy.querySelector('clipPath rect'),
        scale = size.width / svg.viewBox.baseVal.width;
      const x = Number(rect.getAttribute('x')) * scale,
        y = Number(rect.getAttribute('y')) * scale;
      const w = Number(rect.getAttribute('width')) * scale,
        h = Number(rect.getAttribute('height')) * scale;
      let visible = 0,
        outside = 0;
      for (let py = 0; py < canvas.height; py++)
        for (let px = 0; px < canvas.width; px++) {
          if (pixels[(py * canvas.width + px) * 4 + 3] < 16) continue;
          visible++;
          if (px < x - 1 || px > x + w + 1 || py < y - 1 || py > y + h + 1) outside++;
        }
      if (visible < 100 || outside)
        throw Error(`Bad portrait crop: visible=${visible} outside=${outside}`);
      report.push({ skin: svg.parentElement.dataset.skin, visible, outside });
    }
    return report;
  });
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/portrait-crops-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('[data-skin="golden-test"] > svg')).toHaveCSS('width', '180px');
  await page.screenshot({ path: 'artifacts/portrait-crops-mobile.png' });
  expect(errors).toEqual([]);
  console.log(JSON.stringify(result));
  console.log(
    'PASS: base and all four class portraits render visible pixels only inside their idle frame; unique clips and desktop/mobile sizing.',
  );
} finally {
  await browser.close();
}
