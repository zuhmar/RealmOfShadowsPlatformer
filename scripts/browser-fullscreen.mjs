import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto('http://localhost:5173');
  await page.evaluate(async () => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const {
      default: { createRoot },
    } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { FullscreenButton } = await import('/src/FullscreenButton.tsx');
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    createRoot(root).render(
      React.createElement(
        'main',
        { className: 'game-shell' },
        React.createElement(
          'div',
          { className: 'world-title' },
          React.createElement(FullscreenButton),
        ),
        React.createElement(
          'div',
          { className: 'game-stage' },
          React.createElement('div', { id: 'test-host', className: 'phaser-host' }),
        ),
        React.createElement('div', { className: 'game-toolbar' }, 'Controls'),
      ),
    );
  });
  await page.waitForSelector('#test-host');
  await page.evaluate(async () => {
    const { mountGame } = await import('/src/game.ts');
    window.fullGame = mountGame(document.querySelector('#test-host'), {
      id: 'test',
      held: {},
      send: () => {},
      snapshot: {
        mapId: 'village',
        players: [],
        wolves: [],
        drops: [],
        projectiles: [],
        time: Date.now(),
      },
    });
  });
  await page.waitForFunction(
    () => document.querySelector('#test-host').getAttribute('aria-busy') === 'false',
  );
  await page.getByRole('button', { name: 'Enter full screen' }).click();
  await expect(page.getByRole('button', { name: 'Exit full screen' })).toBeVisible();
  expect(await page.evaluate(() => document.fullscreenElement === document.documentElement)).toBe(
    true,
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Math.abs(
            document.querySelector('canvas').height -
              document.querySelector('#test-host').clientHeight,
          ) < 2,
      ),
    )
    .toBe(true);
  await page.getByRole('button', { name: 'Exit full screen' }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.fullscreenElement === null &&
          !document.documentElement.classList.contains('game-expanded'),
      ),
    )
    .toBe(true);
  // Unsupported native API still provides an expanded view and Escape exit.
  await page.evaluate(() => {
    document.documentElement.requestFullscreen = async () => {
      throw new Error('Unsupported');
    };
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Enter full screen' }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.round(document.querySelector('.game-shell').getBoundingClientRect().width),
      ),
    )
    .toBe(390);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Enter full screen' })).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'PASS: native full screen, exit, canvas resize, mobile window-filling fallback and Escape.',
  );
} finally {
  await browser.close();
}
