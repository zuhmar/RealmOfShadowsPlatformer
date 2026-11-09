import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import * as data from '../packages/game-data/src/index.ts';
const root = new URL('../apps/web/public/', import.meta.url),
  out = new URL('../docs/community/discord/', import.meta.url);
const optimized = JSON.parse(await readFile(new URL('assets/optimized-manifest.json', root)));
const url = (p) => 'http://localhost:5173' + (optimized[p] ?? p);
const escape = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const pretty = (s) => s.replaceAll('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const json = async (p) => JSON.parse(await readFile(new URL(p.replace(/^\//, ''), root)));
const index = [];
const catalogs = [];
function image(path, label) {
  return `<img src="${url(path)}" alt="${escape(label)}">`;
}
let clipId = 0;
function svg(path, atlas, f) {
  const id = 'sprite-clip-' + clipId++;
  return `<svg viewBox="${f.x} ${f.y} ${f.w} ${f.h}" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="${id}"><rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}"/></clipPath></defs><image clip-path="url(#${id})" href="${url(path)}" width="${atlas.meta.size.w}" height="${atlas.meta.size.h}"/></svg>`;
}

async function sprite(path, id) {
  const a = await json(path + '.json');
  if (!a.frames[id]) throw Error(`Missing ${path}/${id}`);
  return svg(path + '.png', a, a.frames[id].frame);
}
async function atlasItems(path) {
  const a = await json(path + '.json');
  return Object.entries(a.frames).map(([id, f]) => ({
    id,
    name: data.itemDefinition(id)?.name ?? pretty(id),
    art: svg(path + '.png', a, f.frame),
  }));
}
const gearManifest = await json('/assets/equipment/islands/manifest.json');
const equipment = data.ISLAND_EQUIPMENT.map((g) => {
  const a = gearManifest.sheets[g.tier],
    w = a.width / 4,
    h = a.height / 2;
  return {
    ...g,
    art: svg(
      `/assets/equipment/islands/${g.tier}.png`,
      { meta: { size: { w: a.width, h: a.height } } },
      { x: (g.frame % 4) * w, y: Math.floor(g.frame / 4) * h, w, h },
    ),
  };
});
const tools = await atlasItems('/assets/equipment/gathering-tools');
const food = await atlasItems('/assets/ui/recipe-consumables');
const resources = [
  ...(await atlasItems('/assets/ui/woods-resources')),
  ...(await atlasItems('/assets/ui/crystal-resources')),
];
const loot = [
  ...(await atlasItems('/assets/ui/woods-loot')),
  ...(await atlasItems('/assets/ui/crystal-loot')),
];
const bars = await atlasItems('/assets/ui/recipe-bars');
const housing = await atlasItems('/assets/ui/housing');
const stations = await atlasItems('/assets/props/crafting-stations');
const scrolls = await atlasItems('/assets/ui/recipe-scrolls');
const classes = await Promise.all(
  Object.entries(data.CLASS_PATHS).map(async ([id, c]) => ({
    id,
    name: c.name,
    note: c.description,
    art: await sprite(`/assets/characters/skins/celestial/${id}-armed-woods`, 'idle-0'),
  })),
);
function grid(items, cols = 4) {
  return `<div class="grid" style="--cols:${cols}">${items.map((i) => `<div class="item"><div class="art">${i.art}</div><h3>${escape(i.name)}</h3>${i.note ? `<p>${escape(i.note)}</p>` : ''}</div>`).join('')}</div>`;
}
const css = `*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#f8f0ff}main{width:1600px;height:1000px;padding:52px 64px;background:radial-gradient(ellipse at 100% 0%,#50276c,transparent 60%),linear-gradient(135deg,#211331,#0e0818);position:relative;overflow:hidden}.brand{font-size:19px;letter-spacing:5px;color:#d59eff;font-weight:bold}.eyebrow{position:absolute;right:64px;top:54px;border:1px solid #aa72ce;padding:12px 21px;border-radius:30px;color:#dfb7fc;letter-spacing:2px;font-size:16px}h1{font:normal 52px Georgia,serif;margin:19px 0 14px;line-height:1.1}.intro{font-size:24px;color:#cfc0da;margin:0 0 25px;max-width:1400px}.body{height:680px}.split{display:flex;gap:36px;height:640px;align-items:center}.shot{width:1024px;height:640px;object-fit:contain;border-radius:15px;outline:1px solid #be8de055;box-shadow:0 20px 60px #0007}.detail{flex:1}h2{font:normal 39px Georgia,serif;line-height:1.2;margin:0 0 24px}.detail p{font-size:23px;line-height:1.5;color:#ddd0e7}.point{padding:18px 0;border-top:1px solid #ffffff25;font-size:22px;color:#ebd5fb}.point:before{content:'✦';color:#bc80eb;margin-right:12px}.grid{display:grid;grid-template-columns:repeat(var(--cols),1fr);gap:18px;height:650px;grid-auto-rows:minmax(0,1fr)}.item{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0;min-height:0;text-align:center;padding:16px;border:1px solid #b786d32b;border-radius:16px;background:#ffffff04}.art{width:100%;height:0;flex:1;min-height:0;display:flex;align-items:center;justify-content:center}.art svg,.art img{display:block;width:100%;height:100%;object-fit:contain}.item h3{font-size:24px;line-height:1.2;margin:15px 0 0;font-weight:500;flex-shrink:0}.item p{font-size:19px;color:#ccbbd9;line-height:1.4;margin:12px 0 0;flex-shrink:0}footer{position:absolute;bottom:37px;left:64px;right:64px;display:flex;justify-content:space-between;font-size:17px;color:#af9dbd}.cover{display:flex;align-items:center;height:650px;gap:60px}.cover img{width:620px;height:570px;object-fit:contain}.cover ul{font-size:29px;line-height:1.9;color:#e0ccec}.cover h2{font-size:49px}.snapshot{height:100%;width:100%;object-fit:contain}`;
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
async function card(
  id,
  title,
  intro,
  body,
  {
    label = 'FEATURE PREVIEW',
    kind = 'Game sprites · Development preview',
    section = 'features',
  } = {},
) {
  await mkdir(new URL(section + '/', out), { recursive: true });
  const html = `<!doctype html><meta charset="utf-8"><style>${css}</style><main><div class="brand">REALM OF SHADOWS</div><div class="eyebrow">${label}</div><h1>${escape(title)}</h1><p class="intro">${escape(intro)}</p><div class="body">${body}</div><footer><span>${kind}</span><span>Follow the journey.</span></footer></main>`;
  const entry = { id, title, intro, file: `${section}/${id}.png`, kind };
  if (process.env.SKIP_EXISTING) {
    try {
      await access(new URL(entry.file, out));
      index.push(entry);
      return;
    } catch {}
  }
  await page.setContent(html);
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
  await page.waitForFunction(() =>
    [...document.querySelectorAll('svg image')].every((i) => !!i.getAttribute('href')),
  );
  await page.waitForTimeout(180);
  const overflow = await page.evaluate(
    () =>
      [...document.querySelectorAll('.item h3,.item p,.detail,.intro')].filter(
        (e) => e.getBoundingClientRect().bottom > 940,
      ).length,
  );
  if (overflow) throw Error('Layout overflow ' + id);
  await page.screenshot({ path: new URL(`${section}/${id}.png`, out).pathname });
  index.push({ id, title, intro, file: `${section}/${id}.png`, kind });
  console.log('Rendered', id);
}
function split(shot, title, points) {
  return `<div class="split"><img class="shot" src="http://localhost:5173/@fs${new URL(`features/${shot}-gameplay.png`, out).pathname}"><div class="detail"><h2>${title}</h2>${points.map((p) => `<div class="point">${escape(p)}</div>`).join('')}</div></div>`;
}
try {
  await card(
    '00-start-here',
    'A world to grow into.',
    'Explore, fight, craft, and make a home in Realm of Shadows.',
    `<div class="cover">${image('/assets/ui/realm-of-shadows-logo.png', 'Realm of Shadows')}<div><h2>Follow the development.</h2><ul><li>Four combat classes</li><li>Gathering & crafting</li><li>Gear, loot & discovery</li><li>Player-built homes</li></ul></div></div>`,
  );
  for (const c of [
    [
      '01-elderwood',
      'Elderwood Village',
      'Your safe hub between adventures.',
      'elderwood',
      'Come home to Elderwood.',
      ['Meet the villagers', 'Craft at dedicated benches', 'Build a private home'],
    ],
    [
      '02-hunting',
      'Into Whispering Woods',
      'Explore distinct hunting areas as your adventure unfolds.',
      'woods',
      'Take the next step.',
      ['Wolves, spiders & boars', 'Portals connect hunting areas', 'A keyed boss encounter'],
    ],
    [
      '03-gathering',
      'Gather. Train. Upgrade.',
      'Build your gathering skills with tools held in your character’s hands.',
      'gathering',
      'Four ways to gather.',
      ['Mining & Woodcutting', 'Fishing & Herbalism', 'Continuous gathering actions'],
    ],
    [
      '04-fishing',
      'A quiet moment by the water.',
      'Cast from a dedicated fishing platform.',
      'fishing',
      'Catch your next ingredient.',
      ['Train your Fishing skill', 'Discover different catches', 'Turn fish into cooked buffs'],
    ],
    [
      '05-bosses',
      'Face the island boss.',
      'A bigger threat at the end of the hunt.',
      'boss',
      'Watch. Move. Strike.',
      ['A key for each entry', 'Basic and special attacks', 'Avoid telegraphed danger'],
    ],
    [
      '06-crystal',
      'Beyond the woods.',
      'A look inside Crystal Caverns.',
      'crystal',
      'A new challenge awaits.',
      ['Cave Bat hunting', 'Crystal-themed terrain', 'A quest to unlock your class'],
    ],
    [
      '07-crystal-gathering',
      'Resources with a crystal glow.',
      'Continue gathering as your equipment progresses.',
      'crystal-gathering',
      'Bring the right tools.',
      ['Crystal Ore', 'Crystalwood & Glowcap', 'New crafting materials'],
    ],
  ])
    await card(c[0], c[1], c[2], split(c[3], c[4], c[5]), {
      kind: 'Actual game renderer · Staged development capture',
    });
  await card(
    '08-classes',
    'Four paths. Your adventure.',
    'Choose a class through the Crystal Caverns quest.',
    grid(classes),
  );
  for (const c of classes)
    await card(
      'class-' + c.id,
      c.name,
      c.note,
      grid(
        [
          { ...c, note: data.CLASS_PATHS[c.id].signature },
          ...equipment
            .filter((g) => g.tier === 'woods' && g.weaponKind === data.CLASS_PATHS[c.id].weapon)
            .slice(0, 1),
        ],
        2,
      ),
      { section: 'classes' },
    );
  await card(
    '09-weapons',
    'Choose your weapon.',
    'Sword, bow, staff, or paired daggers: find your combat style.',
    grid(equipment.filter((g) => g.tier === 'woods').slice(0, 4)),
  );
  await card(
    '10-skills',
    'Grow through practice.',
    'Melee, Magic, and Distance training increase base damage.',
    grid(
      classes.map((c, i) => ({
        ...c,
        name: ['Melee', 'Distance', 'Magic', 'Melee'][i],
        note: ['Knight weapon hits', 'Archer weapon hits', 'Mage weapon hits', 'Rogue weapon hits'][
          i
        ],
      })),
    ),
  );
  await card(
    '11-equipment',
    'Gear up for the journey.',
    'Weapons and armor with a visual identity for each island.',
    grid(
      equipment.filter((g) => g.tier === 'crystal'),
      4,
    ),
  );
  await card(
    '12-identification',
    'What did you find?',
    'Identify monster-dropped equipment with gold to reveal its rarity and attributes.',
    grid(
      equipment
        .filter((g) => g.tier === 'woods')
        .slice(0, 4)
        .map((g, i) => ({
          ...g,
          name: ['Uncommon', 'Rare', 'Epic', 'Legendary'][i],
          note: 'Revealed after identification',
        })),
    ),
  );
  await card(
    '13-crafting-benches',
    'Built for crafting.',
    'Dedicated stations bring your materials to life.',
    grid(stations, 5),
  );
  await card(
    '14-forging',
    'Ore to bars. Bars to equipment.',
    'Smelt materials, discover recipes, and craft upgrades.',
    grid(
      [
        ...bars.slice(0, 2),
        ...tools.filter((t) => t.id.startsWith('iron')).slice(0, 4),
        ...equipment.filter((g) => g.tier === 'woods').slice(0, 2),
      ],
      4,
    ),
  );
  await card(
    '15-cooking',
    'Cook for the next fight.',
    'Prepared food grants buffs for your adventures.',
    grid(
      food.filter((f) => data.provisionRecipe(f.id)?.skill === 'Cooking'),
      3,
    ),
  );
  await card(
    '16-alchemy',
    'Brew a little backup.',
    'Craft health and mana potions with gathered ingredients.',
    grid(
      food.filter((f) => data.provisionRecipe(f.id)?.skill === 'Alchemy'),
      4,
    ),
  );
  await card(
    '17-recipes',
    'Your next discovery could be a recipe.',
    'Find recipe scrolls while hunting to unlock new crafts.',
    grid(scrolls, 4),
  );
  await card(
    '18-carpentry',
    'Make something worth coming home to.',
    'Turn logs into planks, furniture, and a place of your own.',
    grid(housing.filter((h) => !h.id.startsWith('house-')).slice(0, 8), 4),
  );
  await card(
    '19-housing',
    'Your corner of Elderwood.',
    'Build, decorate, and invite friends into your private house.',
    `<img class="snapshot" src="http://localhost:5173/@fs${new URL('housing-gameplay.png', out).pathname}">`,
    { kind: 'Actual game renderer · Staged development capture' },
  );
  await card(
    '20-travel',
    'Less walking. More adventure.',
    'Spend Teleport Crystals on the world map to revisit discovered areas.',
    grid(
      [
        {
          name: 'Teleport Crystal',
          art: image('/assets/ui/teleport-crystal.png', 'Teleport Crystal'),
        },
        {
          name: 'Elderwood Village',
          art: image('/assets/backgrounds/island-maps/village.png', 'Elderwood Village'),
        },
        {
          name: 'Whispering Woods',
          art: image('/assets/backgrounds/island-maps/woods.png', 'Whispering Woods'),
        },
        {
          name: 'Crystal Caverns',
          art: image('/assets/backgrounds/island-maps/crystal.png', 'Crystal Caverns'),
        },
      ],
      4,
    ),
  );
  await card(
    '21-quests',
    'One quest at a time.',
    'Hunt, explore, and work toward the next chapter of your journey.',
    grid([
      { name: 'Track your quests', art: await sprite('/assets/ui/player-menu', 'journal') },
      { name: 'Earn your starter weapons', art: equipment[0].art },
      { name: 'Unlock your class', art: classes[0].art },
      {
        name: 'Challenge the boss',
        art: image('/assets/ui/forest-bear-key.png', 'Forest Bear Key'),
      },
    ]),
  );
  await card(
    '22-inventory',
    'Everything you carry.',
    'Stacked inventory slots, equipped gear, and item details in your bag.',
    grid(
      [
        equipment[0],
        equipment[4],
        resources[0],
        food[0],
        tools[0],
        loot[0],
        bars[0],
        {
          name: 'Teleport Crystal',
          art: image('/assets/ui/teleport-crystal.png', 'Teleport Crystal'),
        },
      ],
      4,
    ),
  );
  await card(
    '23-idle',
    'Keep growing between adventures.',
    'Assign away activities and return to claim accumulated rewards.',
    grid([
      { name: 'Training', art: classes[0].art },
      { name: 'Gathering', art: tools[0].art },
      { name: 'Materials', art: resources[0].art },
      { name: 'Rewards', art: loot[0].art },
    ]),
  );
  await card(
    '24-specials',
    'A technique that grows with your weapon.',
    'Special attacks improve as your weapon tier progresses.',
    grid(
      [
        ...equipment.filter((g) => g.tier === 'woods').slice(0, 4),
        ...equipment.filter((g) => g.tier === 'crystal').slice(0, 4),
      ],
      4,
    ),
  );
  await card(
    '25-skins',
    'Dress for your calling.',
    'Class outfits include headwear and matching weapon appearances.',
    grid(
      await Promise.all(
        classes.map(async (c) => ({
          ...c,
          name: data.CLASS_SKINS[c.id].name,
          note: data.CLASS_SKINS[c.id].description,
          art: await sprite(`/assets/characters/skins/celestial/${c.id}-unarmed`, 'idle-0'),
        })),
      ),
      4,
    ),
  );
  await card(
    '26-villagers',
    'A few familiar faces.',
    'Meet the people who help you along the way.',
    grid(
      (await atlasItems('/assets/characters/skins/npc-outfits')).map((n) => ({
        ...n,
        name: { mira: 'Mira', bram: 'Bram', mentor: 'Class Mentor' }[n.id] ?? n.name,
      })),
      3,
    ),
  );
  const portalArt = await Promise.all(
    data.PORTAL_THEMES.map(async (id) => ({
      id,
      name: data.ISLANDS.find((i) => i.id === id)?.name ?? pretty(id),
      art: await sprite(`/assets/effects/island-portals/${id}`, 'idle-0'),
    })),
  );
  await card(
    '27-portals',
    'Every destination has its own glow.',
    'Island-themed portals connect the journey.',
    grid(portalArt, 4),
    { label: 'PORTAL ART PREVIEW', kind: 'Actual portal sprites · Includes later-island artwork' },
  );
  for (let i = 0; i < data.ISLANDS.length; i += 4)
    await card(
      '28-world-' + (i / 4 + 1),
      'The islands ahead.',
      'Whispering Woods and Crystal Caverns are playable; later islands are in development.',
      grid(
        data.ISLANDS.slice(i, i + 4).map((island) => ({
          name: island.name,
          note: `Levels ${island.minLevel}–${island.maxLevel} · ${island.available ? 'Playable' : 'In development'}`,
          art: image(`/assets/backgrounds/island-maps/${island.id}.png`, island.name),
        })),
        4,
      ),
      {
        label: 'WORLD OVERVIEW',
        kind: 'Actual island-map artwork · Availability labelled per island',
      },
    );
  const actions = await atlasItems('/assets/ui/world-actions');
  await card(
    '29-controls',
    'Adventure at your fingertips.',
    'In-game controls and menus keep the world in view.',
    grid(
      [
        ...(await atlasItems('/assets/ui/game-controls')).filter((a) =>
          ['attack', 'skill', 'interact', 'auto'].includes(a.id),
        ),
        ...actions,
      ],
      4,
    ),
  );
  await card(
    '30-multiplayer',
    'A world to share.',
    'Chat with other adventurers and invite friends into your house.',
    grid(
      [
        { name: 'In-game chat', art: actions.find((a) => a.id === 'chat').art },
        {
          name: 'A shared world',
          art: image('/assets/backgrounds/island-maps/village.png', 'Elderwood Village'),
        },
        {
          name: 'Private house invitations',
          art: housing.find((h) => h.id === 'house-small')?.art ?? housing[0].art,
        },
      ],
      3,
    ),
  );
  await card(
    '31-attributes',
    'Make your equipment count.',
    'Revealed gear attributes can shape your combat stats.',
    grid(
      equipment
        .filter((g) => g.tier === 'woods')
        .slice(0, 4)
        .map((g, i) => ({
          ...g,
          name: ['Critical chance', 'Critical damage', 'Dodge', 'Block'][i],
          note: 'Attribute example · Rolls vary by item',
        })),
      4,
    ),
  );
  for (const [id, title] of [
    ['mining', 'Mining'],
    ['woodcutting', 'Woodcutting'],
    ['fishing', 'Fishing'],
    ['herbalism', 'Herbalism'],
  ]) {
    const selected = data.GATHERING_TOOLS.filter(
      (t) => t.skill === title && ['wood', 'iron', 'crystal'].includes(t.material),
    );
    await card(
      'gather-' + id,
      title + ' progression',
      'Start with wooden tools, then equip crafted upgrades.',
      grid(
        selected.map((t) => ({
          ...tools.find((a) => a.id === t.id),
          note: t.starter ? 'Starter tool' : 'Equip to use',
        })),
        3,
      ),
    );
  }
  for (const [id, title] of [
    ['wolf-spritesheet', 'Wolf'],
    ['thorn-spider', 'Thorn Spider'],
    ['wild-boar', 'Wild Boar'],
    ['forest-bear', 'Forest Bear'],
    ['cave-bat', 'Cave Bat'],
    ['crystal-golem', 'Crystal Golem'],
    ['shard-scorpion', 'Shard Scorpion'],
    ['crystal-wyrm', 'Crystal Wyrm'],
  ]) {
    const a = await json(`/assets/monsters/${id}.json`);
    if (!a.frames) {
      a.frames = { 'idle-0': { frame: { x: 0, y: 0, w: a.frameWidth, h: a.frameHeight } } };
      a.meta = { size: { w: a.frameWidth * a.columns, h: a.frameHeight * a.rows } };
    }
    const frame = a.frames['idle-0'] ?? Object.values(a.frames)[0];
    await card(
      'monster-' + id,
      title,
      'A creature from the current hunting islands.',
      grid([{ name: title, art: svg(`/assets/monsters/${id}.png`, a, frame.frame) }], 1),
      { section: 'monsters', label: 'MONSTER SHOWCASE' },
    );
  }
  await card(
    'starter-weapons',
    'The first four weapons.',
    'Try the four weapon types as your adventure begins.',
    grid(await atlasItems('/assets/equipment/elderwood-weapons'), 4),
    { section: 'items', label: 'ITEM SHOWCASE' },
  );
  await card(
    'keys-currency',
    'Keys, crystals & rewards.',
    'Useful finds for your travels and hunts.',
    grid(
      [
        {
          name: 'Teleport Crystal',
          art: image('/assets/ui/teleport-crystal.png', 'Teleport Crystal'),
        },
        {
          name: 'Forest Bear Key',
          art: image('/assets/ui/forest-bear-key.png', 'Forest Bear Key'),
        },
        ...(await atlasItems('/assets/ui/loot-basics')),
      ],
      4,
    ),
    { section: 'items', label: 'ITEM SHOWCASE' },
  );
  for (const tier of data.EQUIPMENT_TIERS) {
    await card(
      'equipment-' + tier.id,
      tier.name + ' equipment',
      tier.islandName + ' · Four weapon types and four armor pieces.',
      grid(
        equipment.filter((g) => g.tier === tier.id),
        4,
      ),
      {
        label: ['woods', 'crystal'].includes(tier.id) ? 'ITEM SHOWCASE' : 'ITEM ART PREVIEW',
        section: 'items',
        kind: ['woods', 'crystal'].includes(tier.id)
          ? 'Actual game sprites · Development preview'
          : 'Actual game sprites · Later-island art preview',
      },
    );
  }
  for (const material of data.TOOL_MATERIALS)
    await card(
      'tools-' + material.id,
      material.name + ' gathering tools',
      'Pickaxe, axe, fishing rod, and sickle.',
      grid(
        tools.filter((t) => t.id.startsWith(material.id + '-')),
        4,
      ),
      { section: 'items', label: 'ITEM SHOWCASE' },
    );
  for (const [id, title, items] of [
    ['resources', 'Gathering resources', resources],
    ['loot', 'Hunting loot', loot],
    ['bars', 'Smelted bars', bars],
    ['food-potions', 'Food & potions', food],
    ['furniture', 'Housing & furniture', housing],
    ['recipe-scrolls', 'Recipe scrolls', scrolls],
  ]) {
    for (let i = 0; i < items.length; i += 12) {
      await card(
        id + '-' + (i / 12 + 1),
        title + (items.length > 12 ? ' · ' + (i / 12 + 1) : ''),
        'A closer look at the game’s item sprites.',
        grid(items.slice(i, i + 12), 4),
        { section: 'items', label: 'ITEM SHOWCASE' },
      );
    }
    catalogs.push({
      category: title,
      count: items.length,
      items: items.map(({ art, ...rest }) => rest),
    });
  }
  await writeFile(
    new URL('showcase-manifest.json', out),
    JSON.stringify(
      { cards: index, catalogs, equipmentCount: equipment.length, toolCount: tools.length },
      null,
      2,
    ) + '\n',
  );
  const gallery = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Realm of Shadows — Showcase Library</title><style>body{background:#140d21;color:#f3e9ff;font:18px Arial;margin:40px}h1{font:44px Georgia}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:25px}img{width:100%;border-radius:12px}a{color:#e6b8ff;text-decoration:none}p{color:#c9b7d7;line-height:1.5}</style><h1>Realm of Shadows</h1><p>Discord showcase library · Development previews. Later-island item art does not indicate playable island completion.</p><section>${index.map((c) => `<a href="${c.file}"><img src="${c.file}" loading="lazy"><h2>${escape(c.title)}</h2><p>${escape(c.intro)}</p></a>`).join('')}</section>`;
  await writeFile(new URL('index.html', out), gallery);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`PASS: ${index.length} cards exported without asset errors or text overflow.`);
} finally {
  await browser.close();
}
