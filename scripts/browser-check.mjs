import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://127.0.0.1:5173');
await page.getByRole('heading', { name: /A little light/ }).waitFor();
await expect(page.locator('.hero-logo')).toHaveAttribute(
  'src',
  '/assets/ui/realm-of-shadows-logo.png',
);
await page.waitForFunction(() => document.querySelector('.hero-logo')?.naturalWidth > 0);
await page.screenshot({ path: 'artifacts/landing-desktop.png', fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: 'artifacts/landing-mobile.png', fullPage: true });
await page.getByRole('button', { name: /Already a traveler/ }).click();
await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
await expect(page.locator('.login-logo')).toBeVisible();
await page.waitForFunction(() => document.querySelector('.login-logo')?.naturalWidth > 0);
await page.screenshot({ path: 'artifacts/branded-login-mobile.png', fullPage: true });
await page.getByRole('button', { name: 'Close', exact: true }).click();
await page.getByRole('button', { name: 'Create account', exact: true }).click();
await expect(page.getByRole('heading', { name: 'Begin your story.' })).toBeVisible();
console.log({ errors });
await browser.close();
if (errors.length) process.exitCode = 1;
