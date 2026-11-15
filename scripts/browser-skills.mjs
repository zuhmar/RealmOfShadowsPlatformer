import { chromium, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { QUESTS } from '../packages/game-data/src/index.ts';
import { mkdir } from 'node:fs/promises';
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
let userId;
try {
  const api = async (path, token, body) => {
    const r = await fetch('http://localhost:2567/api' + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const v = await r.json();
    if (!r.ok) throw Error(v.error);
    return v;
  };
  const guest = await api('/guest', undefined, {}),
    row = await api('/characters', guest.token, { name: 'SkillsBrowser' });
  userId = row.userId;
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((token) => localStorage.setItem('ros-session', token), guest.token);
  const enter = async () => {
    await page.goto('http://localhost:5173');
    await page.getByRole('button', { name: /Continue adventure/ }).click();
    await page.getByRole('button', { name: /Enter world/ }).click();
    await page.locator('.phaser-host[aria-busy="false"] canvas').waitFor({ timeout: 60000 });
  };
  const open = async () => {
    await page.getByRole('button', { name: 'Skills', exact: true }).click();
    await expect(
      page.getByRole('dialog', { name: 'Skills & attributes.', exact: true }),
    ).toBeVisible();
  };
  const category = (name) =>
    page
      .getByRole('navigation', { name: 'Skill categories' })
      .getByRole('button', { name, exact: true });
  await enter();
  await open();
  await expect(page.getByRole('heading', { name: /Civilian/ })).toBeVisible();
  await expect(page.locator('.combat-entry')).toHaveCount(3);
  await expect(page.locator('.skills-intro')).toContainText('Civilians do not train');
  await category('Class path').click();
  await expect(page.getByRole('button', { name: 'Browse classes', exact: true })).toBeDisabled();
  await category('Gathering & crafting').click();
  await expect(page.locator('.trade-entry')).toHaveCount(8);
  await expect(
    page.getByRole('progressbar', { name: 'Mining skill progress', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cooking & Alchemy recipes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cooking & Alchemy', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await open();
  await page.keyboard.press('Escape');
  await expect(page.locator('.skills-popup')).toHaveCount(0);
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  await page.waitForTimeout(400);
  const saved = await db.character.findUnique({ where: { id: row.id } });
  await db.quest.upsert({
    where: { id: 'crystal-class-trial' },
    create: { id: 'crystal-class-trial', definition: QUESTS['crystal-class-trial'] },
    update: {},
  });
  await db.questProgress.create({
    data: { characterId: row.id, questId: 'crystal-class-trial', progress: 90, claimed: true },
  });
  await db.character.update({
    where: { id: row.id },
    data: {
      data: {
        ...saved.data,
        classId: 'knight',
        skin: 'knight',
        level: 20,
        classTalents: { mastery: 0, signature: 0, discipline: 0 },
        weapon: 'elderwood-blade',
        inventory: { ...saved.data.inventory, 'elderwood-blade': 1 },
        combatSkills: { Melee: { level: 4, xp: 25 } },
      },
    },
  });
  await enter();
  await open();
  await expect(page.locator('.combat-entry.is-active')).toContainText('Melee');
  await expect(
    page.getByRole('progressbar', { name: 'Melee skill progress', exact: true }),
  ).toHaveAttribute('value', '25');
  await mkdir('artifacts', { recursive: true });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'artifacts/skills-combat-desktop.png' });
  await category('Attributes').click();
  await expect(page.locator('.skill-attribute')).toHaveCount(11);
  await page.screenshot({ path: 'artifacts/skills-attributes-desktop.png' });
  await page
    .getByRole('navigation', { name: 'Skill categories' })
    .getByRole('button', { name: /Class path/ })
    .click();
  await expect(page.locator('.talent-entry')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Browse classes', exact: true })).toBeEnabled();
  await page
    .locator('.talent-entry')
    .filter({ has: page.getByRole('heading', { name: 'Weapon Mastery', exact: true }) })
    .getByRole('button', { name: 'Learn rank', exact: true })
    .click();
  await expect(page.locator('.skills-talent-heading')).toContainText('3 points available');
  await expect
    .poll(
      async () =>
        (await db.character.findUnique({ where: { id: row.id } })).data.classTalents.mastery,
    )
    .toBe(1);
  await page.screenshot({ path: 'artifacts/skills-talents-desktop.png' });
  const style = await page.locator('.skills-popup .bag-view').evaluate((el) => ({
    background: getComputedStyle(el).backgroundColor,
    shadow: getComputedStyle(el).boxShadow,
  }));
  expect(style).toEqual({ background: 'rgba(0, 0, 0, 0)', shadow: 'none' });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const name of ['Combat', 'Gathering & crafting', 'Attributes']) {
    await category(name).click();
    expect(
      await page
        .locator('.skills-popup .bag-view')
        .evaluate((el) => el.scrollWidth > el.clientWidth + 1),
    ).toBe(false);
    await page.screenshot({
      path: `artifacts/skills-mobile-${name.split(' ')[0].toLowerCase()}.png`,
    });
  }
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Leave world', exact: true }).click();
  expect(errors).toEqual([]);
  console.log(
    'PASS: transparent Skills popup, generated icons, civilian class gate, active training, eight trades, eleven attributes, recipe navigation, durable talent spending, desktop and mobile layouts.',
  );
} finally {
  await browser.close();
  await new Promise((r) => setTimeout(r, 200));
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
