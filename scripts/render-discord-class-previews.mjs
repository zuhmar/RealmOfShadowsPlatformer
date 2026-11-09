import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import * as data from '../packages/game-data/src/index.ts';
const base = new URL('../', import.meta.url),
  output = new URL('docs/community/discord/class-previews/', base);
const work = new URL('artifacts/class-preview-frames/', base);
await mkdir(output, { recursive: true });
await mkdir(work, { recursive: true });
const read = async (path) => JSON.parse(await readFile(new URL(path, base), 'utf8'));
const png = async (path) =>
  'data:image/png;base64,' + (await readFile(new URL(path, base))).toString('base64');
const details = {
  knight: {
    weapon: 'Sword',
    training: 'Melee',
    role: 'Close-range sweeps',
    special: 'Sweep up to 3 enemies for 2× damage.',
    talent: 'Sweeping Edge improves reach and coverage.',
  },
  archer: {
    weapon: 'Bow',
    training: 'Distance',
    role: 'Ranged piercing attacks',
    special: 'Pierce up to 3 enemies at 150% range for 2× damage.',
    talent: 'Piercing Power improves range and coverage.',
  },
  mage: {
    weapon: 'Staff',
    training: 'Magic',
    role: 'Ranged magic and area bursts',
    special: 'An orb explodes around its first target, hitting up to 3 enemies for 2× damage.',
    talent: 'Expanding Nova improves burst coverage.',
  },
  rogue: {
    weapon: 'Dual daggers',
    training: 'Melee',
    role: 'Fast close-range combinations',
    special: 'Strike one nearby enemy 3 times for 1× damage per strike.',
    talent: 'Relentless Flurry improves special damage and strikes.',
  },
};
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1080, height: 860 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const manifest = [];
  for (const [id, definition] of Object.entries(data.CLASS_PATHS)) {
    const folder = `apps/web/public/assets/characters/skins/celestial/${id}`;
    const unarmed = await read(folder + '-unarmed.json'),
      armed = await read(folder + '-armed-woods.json');
    const fxPath = `apps/web/public/assets/effects/weapon-specials/${definition.weapon}`;
    const fx = await read(fxPath + '.json');
    const images = {
      unarmed: await png(folder + '-unarmed.png'),
      armed: await png(folder + '-armed-woods.png'),
      fx: await png(fxPath + '.png'),
    };
    const profile = data.WEAPON_PROFILES[definition.weapon],
      info = details[id];
    const html = `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;color:#f9f0ff;font-family:Arial,sans-serif}main{width:1080px;height:860px;padding:40px 44px;background:radial-gradient(ellipse at 95% 15%,#593273,transparent 63%),linear-gradient(135deg,#241332,#100b19);position:relative;overflow:hidden}.brand{font-size:17px;letter-spacing:4px;color:#d0a2f0}.label{position:absolute;right:44px;top:40px;font-size:15px;letter-spacing:2px;color:#d9b4f2}h1{font:58px Georgia,serif;margin:17px 0 6px}.subtitle{color:#d1c0dd;font-size:23px}.body{display:flex;gap:30px;margin-top:30px}.left{width:390px}.right{width:570px;position:relative}h2{font-size:23px;margin:0 0 13px;color:#f0d6ff}.stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px}.stat{border:1px solid #d4a4f133;border-radius:10px;padding:13px;background:#fff04}.stat small{font-size:14px;color:#bca4ce;display:block;margin-bottom:7px}.stat b{font-size:22px;font-weight:500}.ability{border-top:1px solid #d8b4f133;padding-top:18px}p{font-size:19px;line-height:1.42;color:#e0d0e9;margin:9px 0 14px}.meta{font-size:16px;color:#bda8cd;line-height:1.45}.stage{font-size:18px;text-align:center;letter-spacing:3px;color:#e5b6ff;height:25px;margin:0 0 6px}.skin{text-align:center;font:26px Georgia;margin-top:0}canvas{width:570px;height:440px;display:block}.pills{display:flex;justify-content:center;gap:7px;margin-top:9px}.pill{font-size:13px;border:1px solid #d2a2f144;border-radius:18px;padding:8px 12px;color:#c7addb}.pill.active{color:#fff;background:#a064c94d;border-color:#d4a0f0}footer{position:absolute;left:44px;right:44px;bottom:30px;display:flex;justify-content:space-between;font-size:14px;color:#b8a0c8}.note{max-width:520px}.unlock{font-size:17px;border-left:3px solid #c385e8;padding-left:15px;margin-top:17px}</style><main><div class="brand">REALM OF SHADOWS</div><div class="label">CLASS PREVIEW</div><h1>${definition.name}</h1><div class="subtitle">${info.role}</div><div class="body"><section class="left"><h2>Weapon profile</h2><div class="stats"><div class="stat"><small>WEAPON</small><b>${info.weapon}</b></div><div class="stat"><small>TRAINS</small><b>${info.training}</b></div><div class="stat"><small>BASIC INTERVAL</small><b>${(profile.cooldown / 1000).toFixed(2)}s</b></div><div class="stat"><small>WEAPON DAMAGE SCALE</small><b>${data.WEAPON_DAMAGE_SCALE[definition.weapon].toFixed(2)}×</b></div></div><div class="ability"><h2>${profile.skillName}</h2><p>${info.special}</p><p><b>${data.WEAPON_SKILL.mana} mana · ${data.WEAPON_SKILL.cooldown / 1000}s base cooldown</b></p><p class="meta">${info.talent} Weapon tiers improve your special.</p></div><p class="unlock">Unlock class selection through the Crystal Caverns quest.</p><p class="meta">Training boosts base damage. Crit, dodge, block, and other attributes come from equipment.</p></section><section class="right"><div class="skin">${data.CLASS_SKINS[id].name}</div><p class="stage" id="stage">SKIN / IDLE</p><canvas width="570" height="440"></canvas><div class="pills">${['Idle', 'Move', 'Attack', profile.skillName].map((x, i) => `<span class="pill" data-stage="${i}">${x}</span>`).join('')}</div><p class="meta" style="text-align:center">Class-restricted skin · Ironwood weapon preview</p></section></div><footer><span>Rank-one weapon profile · Before equipment attributes or talents</span><span>Actual game sprites & effects · Development preview</span></footer></main>`;
    await page.setContent(html);
    const report = await page.evaluate(
      async ({ images, unarmed, armed, fx, special }) => {
        const loaded = {};
        for (const [key, src] of Object.entries(images)) {
          const im = new Image();
          im.src = src;
          await im.decode();
          loaded[key] = im;
        }
        const canvas = document.querySelector('canvas'),
          ctx = canvas.getContext('2d');
        let checks = 0;
        const scale = 1.48;
        function drawSprite(sheet, image, key) {
          const entry = sheet.frames[key];
          if (!entry) throw Error('Missing ' + key);
          const f = entry.frame,
            o = entry.spriteSourceSize,
            meta = sheet.meta.sourceFrame;
          const x = canvas.width / 2 + (o.x - entry.sourceSize.w / 2) * scale,
            y = 399 + (o.y - meta.baseline) * scale;
          if (x < 0 || y < 0 || x + f.w * scale > canvas.width || y + f.h * scale > canvas.height)
            throw Error('Sprite would clip ' + key);
          ctx.drawImage(image, f.x, f.y, f.w, f.h, x, y, f.w * scale, f.h * scale);
          checks++;
        }
        window.renderFrame = (frame) => {
          const time = frame / 12,
            stage = Math.floor(time) % 4,
            t = time % 1;
          ctx.clearRect(0, 0, 570, 440);
          ctx.fillStyle = '#ffffff05';
          ctx.beginPath();
          ctx.ellipse(285, 399, 154, 19, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#b485d350';
          ctx.beginPath();
          ctx.moveTo(80, 403);
          ctx.lineTo(490, 403);
          ctx.stroke();
          const sheet = stage === 0 ? unarmed : armed,
            which = stage === 0 ? 'idle' : stage === 1 ? 'walk' : stage === 2 ? 'attack' : 'skill',
            clip = sheet.meta.animations[which];
          let key = clip.frames[Math.floor(t * clip.frameRate) % clip.frames.length];
          if (stage >= 2 && t > 0.7) key = 'idle-0';
          drawSprite(sheet, stage === 0 ? loaded.unarmed : loaded.armed, key);
          if (stage === 3 && t < 0.4) {
            const entry = fx.frames['fx-' + Math.min(7, Math.floor(t * 20))].frame;
            const tmp = document.createElement('canvas');
            tmp.width = entry.w;
            tmp.height = entry.h;
            const tc = tmp.getContext('2d');
            tc.drawImage(loaded.fx, entry.x, entry.y, entry.w, entry.h, 0, 0, entry.w, entry.h);
            tc.globalCompositeOperation = 'multiply';
            tc.fillStyle = '#a3da75';
            tc.fillRect(0, 0, entry.w, entry.h);
            tc.globalCompositeOperation = 'destination-in';
            tc.drawImage(loaded.fx, entry.x, entry.y, entry.w, entry.h, 0, 0, entry.w, entry.h);
            const size = special === 'Arcane Burst' ? 230 : special === 'Cleave' ? 260 : 210;
            ctx.drawImage(tmp, 280, 205, size, size);
          }
          document.querySelector('#stage').textContent = [
            'SKIN / IDLE',
            'MOVEMENT',
            'BASIC ATTACK',
            special.toUpperCase(),
          ][stage];
          document
            .querySelectorAll('.pill')
            .forEach((p, i) => p.classList.toggle('active', i === stage));
        };
        for (let f = 0; f < 48; f++) window.renderFrame(f);
        window.renderFrame(0);
        return { checks };
      },
      { images, unarmed, armed, fx, special: profile.skillName },
    );
    const overflow = await page.evaluate(() =>
      [...document.querySelectorAll('.left p,footer')].some(
        (e) => e.getBoundingClientRect().bottom > 855,
      ),
    );
    if (overflow) throw Error('Text overflow ' + id);
    const frames = new URL(id + '/', work);
    await mkdir(frames, { recursive: true });
    for (let frame = 0; frame < 48; frame++) {
      await page.evaluate((f) => window.renderFrame(f), frame);
      await page.screenshot({
        path: new URL(String(frame).padStart(3, '0') + '.png', frames).pathname,
      });
    }
    await page.evaluate(() => window.renderFrame(0));
    await page.screenshot({ path: new URL(id + '-card.png', output).pathname });
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-loglevel',
        'error',
        '-framerate',
        '12',
        '-i',
        new URL('%03d.png', frames).pathname,
        '-filter_complex',
        '[0:v]split[a][b];[a]palettegen=max_colors=192:stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a',
        '-loop',
        '0',
        new URL(id + '-animated.gif', output).pathname,
      ],
      { stdio: 'pipe' },
    );
    const size = (await stat(new URL(id + '-animated.gif', output))).size;
    if (size > 9 * 1024 * 1024) throw Error('GIF too large');
    manifest.push({
      id,
      className: definition.name,
      skin: data.CLASS_SKINS[id].name,
      weapon: info.weapon,
      training: info.training,
      special: profile.skillName,
      description: info.special,
      basicInterval: profile.cooldown / 1000,
      damageScale: data.WEAPON_DAMAGE_SCALE[definition.weapon],
      mana: data.WEAPON_SKILL.mana,
      cooldown: data.WEAPON_SKILL.cooldown / 1000,
      frames: 48,
      fps: 12,
      gif: id + '-animated.gif',
      poster: id + '-card.png',
      bytes: size,
    });
    console.log('Rendered', id, report.checks, 'frame checks', size, 'bytes');
  }
  if (errors.length) throw Error(errors.join('\n'));
  await writeFile(new URL('manifest.json', output), JSON.stringify(manifest, null, 2) + '\n');
  console.log(
    'PASS four animated class cards, single sprites only, actual profile values, no clipping.',
  );
} finally {
  await browser.close();
}
