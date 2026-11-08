import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await mkdir('artifacts', { recursive: true });
  await page.goto('http://localhost:5173');
  await page.evaluate(async () => {
    const { default: Phaser } = await import('/node_modules/.vite/deps/phaser.js');
    const { assetUrl } = await import('/src/assets.ts');
    const { guardAtlasSampling } = await import('/src/atlas-sampling.ts');
    const root = '/assets/characters/skins/celestial/';
    const manifest = await fetch(root + 'manifest.json').then((r) => r.json());
    const sheets = await Promise.all(
      Object.entries(manifest.sheets).map(async ([id, s]) => ({
        id,
        ...s,
        atlasData: await fetch(s.atlas).then((r) => r.json()),
      })),
    );
    const host = document.createElement('div');
    Object.assign(host.style, {
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: '#21172d',
    });
    document.body.appendChild(host);
    window.classSheets = { sheets, sprites: [], frames: {}, ready: false };
    class Gallery extends Phaser.Scene {
      preload() {
        for (const s of sheets) this.load.atlas(s.id, assetUrl(s.image), s.atlas);
      }
      create() {
        sheets.forEach((s, i) => {
          guardAtlasSampling(this.textures.get(s.id));
          const col = i % 2,
            row = Math.floor(i / 2),
            x = 330 + col * 500,
            y = 230 + row * 260;
          const f = s.atlasData.meta.sourceFrame;
          const sprite = this.add
            .sprite(x, y, s.id, 'idle-0')
            .setOrigin(0.5, f.baseline / f.height)
            .setScale(f.scale * 2);
          window.classSheets.sprites.push(sprite);
          this.add.text(x, y - 200, s.id, { fontSize: '20px', color: '#eee' }).setOrigin(0.5);
          for (const [name, clip] of Object.entries(s.atlasData.meta.animations))
            this.anims.create({
              key: `${s.id}-${name}`,
              frames: clip.frames.map((frame) => ({ key: s.id, frame })),
              frameRate: clip.frameRate,
              repeat: clip.repeat,
            });
          const record = () => {
            const key = sprite.anims.currentAnim.key;
            (window.classSheets.frames[key] ??= []).push(sprite.frame.name);
          };
          sprite.on('animationupdate', record);
          sprite.on('animationstart', record);
          sprite.play(`${s.id}-idle`);
        });
        window.classSheets.ready = true;
      }
    }
    window.classSheets.game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: host,
      width: 1200,
      height: 1100,
      backgroundColor: '#21172d',
      render: { antialias: true },
      scene: Gallery,
      audio: { noAudio: true },
    });
  });
  await page.waitForFunction(() => window.classSheets?.ready);
  await page.screenshot({ path: 'artifacts/celestial-class-sheets-idle.png' });
  for (const action of ['idle', 'walk', 'jump', 'attack', 'extra', 'death']) {
    await page.evaluate((action) => {
      const t = window.classSheets;
      for (const sprite of t.sprites) {
        const s = t.sheets.find((s) => s.id === sprite.texture.key);
        const clip = action === 'extra' ? (s.variant === 'armed' ? 'skill' : 'climb') : action;
        sprite.play(`${s.id}-${clip}`);
      }
    }, action);
    await expect
      .poll(
        () =>
          page.evaluate((action) => {
            const t = window.classSheets;
            return t.sheets.every((s) => {
              const clip =
                action === 'extra' ? (s.variant === 'armed' ? 'skill' : 'climb') : action;
              return new Set(t.frames[`${s.id}-${clip}`] ?? []).size === 6;
            });
          }, action),
        { timeout: 15000 },
      )
      .toBe(true);
    if (action === 'extra')
      await page.screenshot({ path: 'artifacts/celestial-class-sheets-actions.png' });
  }
  expect(errors).toEqual([]);
  console.log(
    'PASS: all eight sheets load and all six clips per sheet play every frame without errors.',
  );
} finally {
  await browser.close();
}
