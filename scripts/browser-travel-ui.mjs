import { chromium, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://realm:realm@localhost:5432/realm',
  }),
});
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
let userId, id;
let matchmakingRequests = 0;
page.on('request', (request) => {
  if (
    request.method() === 'POST' &&
    new URL(request.url()).pathname.endsWith('/matchmake/joinOrCreate/map')
  )
    matchmakingRequests++;
});
const errors = [],
  report = [];
page.on('pageerror', (e) => {
  errors.push(e.message);
  console.log(e.stack);
});
try {
  if (process.env.LEGACY_TRAVEL === '1') {
    await page.route('**/matchmake/joinOrCreate/map', (route) => {
      const body = route.request().postDataJSON();
      body.travelProtocol = 0;
      return route.continue({ postData: JSON.stringify(body) });
    });
  }
  const response = await fetch('http://localhost:2567/api/guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  expect(response.ok).toBe(true);
  const { token } = await response.json();
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const made = await fetch('http://localhost:2567/api/characters', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'FastTraveler', appearance: 'male', outfit: 'sage' }),
  });
  expect(made.ok).toBe(true);
  const list = await fetch('http://localhost:2567/api/characters', { headers }).then((r) =>
    r.json(),
  );
  const c = list.characters[0];
  id = c.id;
  userId = c.userId;
  await db.character.update({
    where: { id },
    data: {
      data: {
        ...c.data,
        level: 20,
        teleportStarterGranted: true,
        gold: 100,
        inventory: { ...c.data.inventory, 'teleport-crystal': 10 },
        visitedAreas: ['village', 'woods', 'woods-2'],
      },
    },
  });
  await page.addInitScript((token) => localStorage.setItem('ros-session', token), token);
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: /Continue adventure/ }).click();
  await page.getByRole('button', { name: /Enter world/ }).click();
  await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
  await page.evaluate(() => {
    window.originalTravelCanvas = document.querySelector('.phaser-host canvas');
  });
  if (process.env.TRAVEL_LATENCY_MS) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: Number(process.env.TRAVEL_LATENCY_MS),
      downloadThroughput: 1250000,
      uploadThroughput: 1250000,
    });
  }
  for (const [mapId, title] of [
    ['woods', 'Wolf Hollow'],
    ['woods-2', 'Silkshade Glade'],
    ['woods', 'Wolf Hollow'],
    ['village', 'Elderwood Village'],
  ]) {
    await page.getByRole('button', { name: 'World map', exact: true }).click();
    await page
      .getByRole('button', {
        name: mapId === 'village' ? 'Explore Elderwood Village' : 'Explore Whispering Woods',
        exact: true,
      })
      .click();
    const start = Date.now();
    await page.locator(`[data-area-id="${mapId}"]`).click();
    await expect
      .poll(async () => (await db.character.findUnique({ where: { id } })).data.mapId)
      .toBe(mapId);
    await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor();
    await expect(page.locator('.world-title h1')).toContainText(title);
    expect(
      await page.evaluate(
        () => window.originalTravelCanvas === document.querySelector('.phaser-host canvas'),
      ),
    ).toBe(true);
    report.push({ mapId, milliseconds: Date.now() - start });
    console.log('Arrived', mapId);
  }
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  await expect(page.locator('.site-header')).toBeVisible();
  const saved = (await db.character.findUnique({ where: { id } })).data;
  expect(saved.mapId).toBe('village');
  expect(saved.inventory['teleport-crystal']).toBe(6);
  expect(saved.gold).toBe(100);
  expect(errors).toEqual([]);
  expect(matchmakingRequests).toBe(process.env.LEGACY_TRAVEL === '1' ? 5 : 1);
  console.log('Matchmaking requests:', matchmakingRequests);
  console.log(JSON.stringify(report, null, 2));
  console.log(
    'PASS: four real UI teleports preserve one canvas, charge one crystal each and save the destination.',
  );
} finally {
  await browser.close();
  if (userId) {
    await db.session.deleteMany({ where: { userId } });
    await db.character.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } });
  }
  await db.$disconnect();
}
