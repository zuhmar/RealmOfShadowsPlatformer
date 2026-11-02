import { chromium, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
let userId;
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://realm:realm@localhost:5432/realm',
  }),
});
try {
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: 'Play as guest' }).click();
  await page
    .getByRole('button', { name: /A story unwritten/ })
    .first()
    .click();
  await page.getByLabel('Character name', { exact: true }).fill('Willow');
  await page.getByLabel('Appearance').selectOption('female');
  await page.getByLabel('Starting outfit').selectOption('ember');
  await expect(page.getByRole('img', { name: 'female ember adventurer' })).toHaveAttribute(
    'aria-busy',
    'false',
  );
  await expect(page.locator('.modal svg image')).toHaveAttribute('href', /^data:image\/png/);
  await page.getByRole('button', { name: 'Create adventurer' }).click();
  await page.getByRole('button', { name: 'Enter world' }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await expect(page.getByRole('heading', { name: 'Elderwood Village' })).toBeVisible();
  await page.waitForTimeout(1000);
  const token = await page.evaluate(() => localStorage.getItem('ros-session'));
  const chars = await fetch('http://localhost:2567/api/characters', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  userId = chars.characters[0].userId;
  await page.screenshot({ path: 'artifacts/village-desktop.png', fullPage: true });
  await page.keyboard.down('d');
  await page.waitForTimeout(6500);
  await page.keyboard.up('d');
  await page.keyboard.press('e');
  await expect(page.getByRole('heading', { name: 'Wolf Hollow' })).toBeVisible({ timeout: 10000 });
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await page.getByRole('button', { name: /AUTO OFF/ }).click();
  await expect(page.getByRole('button', { name: /AUTO ON/ })).toBeVisible();
  await page.waitForTimeout(18000);
  await page.screenshot({ path: 'artifacts/hunting-desktop.png', fullPage: true });
  await page.getByRole('button', { name: /Bag/ }).click();
  await expect(page.getByRole('heading', { name: 'Your satchel.' })).toBeVisible();
  await expect(page.locator('.inventory-cell').filter({ hasText: '◈' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Close panel' }).click();
  // Space is not swallowed by Phaser while chatting.
  const input = page.getByLabel('World chat');
  await input.click();
  await page.keyboard.type('Hello from the forest');
  await expect(input).toHaveValue('Hello from the forest');
  await page.keyboard.press('Enter');
  await expect(page.locator('.chat-lines')).toContainText('Hello from the forest');
  await input.blur();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'artifacts/hunting-mobile.png', fullPage: true });
  const left = page.getByRole('button', { name: 'Move left', exact: true });
  await left.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch' });
  await page.waitForTimeout(100);
  await left.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch' });
  await expect(page.getByRole('button', { name: /AUTO OFF/ })).toBeVisible();
  // Releasing a touch button must not mask later keyboard input for that direction.
  const beforeLeft = parseFloat(await page.locator('.mini-map b').evaluate((el) => el.style.left));
  await page.keyboard.down('a');
  await page.waitForTimeout(400);
  await page.keyboard.up('a');
  const afterLeft = parseFloat(await page.locator('.mini-map b').evaluate((el) => el.style.left));
  expect(afterLeft).toBeLessThan(beforeLeft - 0.5);
  await page.getByRole('button', { name: 'Leave world' }).click();
  await expect(page.getByRole('heading', { name: /Your adventurers/ })).toBeVisible();
  await page.getByRole('button', { name: 'Enter world' }).click();
  await expect(page.getByRole('heading', { name: 'Wolf Hollow' })).toBeVisible();
  await page.getByRole('button', { name: 'Leave world' }).click();
  console.log(
    JSON.stringify({
      browserErrors: errors,
      screenshots: ['village-desktop', 'hunting-desktop', 'hunting-mobile'],
      checks: [
        'guest',
        'creation',
        'village',
        'portal',
        'AUTO',
        'loot inventory',
        'chat spaces',
        'mobile manual override',
        'save and rejoin',
      ],
    }),
  );
  if (errors.length) process.exitCode = 1;
} catch (e) {
  await page.screenshot({ path: 'artifacts/browser-failure.png', fullPage: true });
  console.error('Browser failure', await page.locator('h1').allTextContents(), errors);
  throw e;
} finally {
  await browser.close();
  if (userId) {
    await new Promise((r) => setTimeout(r, 300));
    await db.user.delete({ where: { id: userId } });
  }
  await db.$disconnect();
}
