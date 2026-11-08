import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await mkdir('artifacts', { recursive: true });
  await page.goto('http://localhost:5173');
  const count = await page.evaluate(
    async (shared) => {
      const { default: React } = await import('/node_modules/.vite/deps/react.js');
      const {
        default: { createRoot },
      } = await import('/node_modules/.vite/deps/react-dom_client.js');
      const { ItemIcon } = await import('/src/ItemIcon.tsx');
      const { ALL_RECIPES, recipeScroll } = await import(
        shared.replace('shared/src/index.ts', 'game-data/src/index.ts')
      );
      const host = document.createElement('div');
      host.id = 'recipe-gallery';
      Object.assign(host.style, {
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#1c102e',
        overflow: 'auto',
        padding: '24px',
        color: '#fff',
      });
      document.body.appendChild(host);
      createRoot(host).render(
        React.createElement(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))',
              gap: '14px',
            },
          },
          ...ALL_RECIPES.map((r) =>
            React.createElement(
              'div',
              { key: r.id, 'data-recipe': r.id, style: { padding: '6px' } },
              React.createElement(ItemIcon, { id: recipeScroll(r.id) }),
              React.createElement(ItemIcon, { id: r.id }),
              React.createElement('p', null, r.name),
            ),
          ),
        ),
      );
      return ALL_RECIPES.length;
    },
    '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
  );
  await expect(page.locator('[data-recipe]')).toHaveCount(count);
  const bad = await page.evaluate(async () => {
    const urls = [
      ...new Set(
        [...document.querySelectorAll('#recipe-gallery image')].map((n) => n.getAttribute('href')),
      ),
    ];
    return (
      await Promise.all(
        urls.map(
          (src) =>
            new Promise((resolve) => {
              const im = new Image();
              im.onload = () => resolve(null);
              im.onerror = () => resolve(src);
              im.src = src;
            }),
        ),
      )
    ).filter(Boolean);
  });
  expect(bad).toEqual([]);
  await page.screenshot({ path: 'artifacts/recipe-art-desktop.png' });
  await page.locator('#recipe-gallery').evaluate((el) => (el.scrollTop = el.scrollHeight));
  await page.screenshot({ path: 'artifacts/recipe-art-consumables.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/recipe-art-mobile.png' });
  expect(errors).toEqual([]);
  console.log(
    `PASS: ${count} recipe scrolls and all output sprites render; all atlas images load on desktop/mobile.`,
  );
} finally {
  await browser.close();
}
