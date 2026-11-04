import { chromium, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
let userId;
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  const guest = await fetch('http://localhost:2567/api/guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  }).then((r) => r.json());
  const c = await fetch('http://localhost:2567/api/characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${guest.token}` },
    body: JSON.stringify({ name: 'Recovery Audio' }),
  }).then((r) => r.json());
  userId = c.userId;
  await page.addInitScript((token) => {
    localStorage.setItem('ros-session', token);
    const Native = window.WebSocket;
    window.testSockets = [];
    window.WebSocket = class extends Native {
      constructor(...args) {
        super(...args);
        window.testSockets.push(this);
      }
    };
  }, guest.token);
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: /Continue adventure/ }).click();
  await page.getByRole('button', { name: 'Enter world' }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await page.evaluate(
    () => (window.originalCanvas = document.querySelector('.phaser-host canvas')),
  );
  await page.evaluate(() =>
    window.testSockets.find((s) => s.readyState === 1 && s.url.includes(':2567/')).close(),
  );
  await expect(page.getByRole('heading', { name: 'Finding your way back' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Finding your way back' })).toBeHidden({
    timeout: 12000,
  });
  expect(
    await page.evaluate(
      () => window.originalCanvas === document.querySelector('.phaser-host canvas'),
    ),
  ).toBe(true);
  await page.keyboard.press('j');
  const audio = await page.evaluate(async () => {
    const { realmAudio: a } = await import('/src/audio.ts');
    await a.unlock();
    a.setSettings({ music: true, volume: 0.2 });
    a.setBiome('crystal');
    for (let i = 0; i < 20; i++)
      a.event({ type: 'skill', playerId: 'hero', skill: 'staff' }, 'hero');
    return a.stats;
  });
  expect(audio.state).toBe('running');
  expect(audio.activeVoices).toBeLessThanOrEqual(8);
  expect(audio.musicActive).toBe(true);
  expect(audio.effectsPlayed).toBeGreaterThan(0);
  await page.waitForTimeout(700);
  expect(
    await page.evaluate(async () => {
      const { realmAudio: a } = await import('/src/audio.ts');
      return a.stats.activeVoices;
    }),
  ).toBe(0);
  await page.evaluate(async () => {
    const { realmAudio: a } = await import('/src/audio.ts');
    a.setSettings({ muted: true });
  });
  expect(
    await page.evaluate(async () => {
      const { realmAudio: a } = await import('/src/audio.ts');
      return a.stats.musicActive;
    }),
  ).toBe(false);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ros-audio')).muted)).toBe(true);
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Enter world' })).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'PASS: mobile browser reconnect preserves canvas, intentional exit saves, audio unlock/music/mute/voice cleanup and preference persistence.',
  );
} finally {
  await browser.close();
  await new Promise((r) => setTimeout(r, 300));
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
