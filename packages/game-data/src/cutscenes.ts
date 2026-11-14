export type FilmActor = {
  kind: string;
  x: number;
  move?: 'enter' | 'approach' | 'retreat';
  action?: string;
  size?: number;
  flip?: boolean;
  item?: string;
};
export type FilmBeat = {
  speaker: string;
  text: string;
  background: string;
  /** Generated full-scene story artwork; replaces staged sprite actors when present. */
  illustration?: string;
  actors: FilmActor[];
  effect?: 'embers' | 'mist' | 'snow' | 'magic';
  cue?: 'memory' | 'arrival' | 'craft' | 'battle';
  duration?: number;
};
export type Cutscene = {
  id: string;
  title: string;
  kind: 'chapter' | 'feature' | 'boss';
  map?: string;
  quest?: string;
  npc?: string;
  future?: boolean;
  spoiler?: boolean;
  beats: FilmBeat[];
};
const bg = (id: string) => `/assets/backgrounds/${id}.png`;
const hero = (x = 30, move: FilmActor['move'] = 'enter', action = 'walk'): FilmActor => ({
  kind: 'hero',
  x,
  move,
  action,
  size: 1,
});
const npc = (kind: string, x = 72): FilmActor => ({
  kind,
  x,
  size: ['mira', 'mentor', 'bram', 'mirewarden', 'frostwarden'].includes(kind) ? 0.8 : 1,
  flip: true,
});
const beat = (
  speaker: string,
  text: string,
  background: string,
  actors: FilmActor[],
  effect?: FilmBeat['effect'],
  cue: FilmBeat['cue'] = 'arrival',
): FilmBeat => ({ speaker, text, background: bg(background), actors, effect, cue, duration: 6500 });
export const CUTSCENES: Cutscene[] = [
  {
    id: 'chapter-woods',
    title: 'The promise that survived',
    kind: 'chapter',
    map: 'village',
    quest: 'mira-wolves',
    npc: 'mira',
    beats: [
      beat(
        'Narrator',
        'Once, a boy had a home. Then the Shadow Dragon came.',
        'cinematic-fall',
        [{ kind: 'young', x: 40, size: 0.7, action: 'idle' }],
        'embers',
        'memory',
      ),
      beat(
        'Narrator',
        'When the fire faded, he was the only survivor. He did not know why.',
        'cinematic-fall',
        [{ kind: 'young', x: 57, size: 0.7, action: 'idle', move: 'retreat' }],
        'embers',
        'memory',
      ),
      beat(
        'Narrator',
        'Years of training turned grief into a promise: find the dragon, and end its reign.',
        'whispering-woods',
        [{ kind: 'training', x: 48, action: 'attack', size: 1 }],
        'mist',
        'battle',
      ),
      beat(
        'Mira',
        'Every journey begins with someone who needs help. Make the road through Whispering Woods safe.',
        'elderwood-village',
        [hero(), npc('mira')],
      ),
    ],
  },
  {
    id: 'chapter-crystal',
    title: 'A path of your own',
    kind: 'chapter',
    map: 'crystal',
    quest: 'crystal-class-trial',
    npc: 'mentor',
    beats: [
      beat(
        'Narrator',
        'Beyond the forest, crystal light shines on a harder road. Strength alone will not carry your promise.',
        'crystal-1',
        [hero()],
        'magic',
      ),
      beat(
        'Cavern Mentor',
        'Before you choose a path, prove that you can protect others. Face the creatures of these caverns.',
        'crystal-1',
        [hero(35, 'approach', 'idle'), npc('mentor')],
        'magic',
      ),
      beat(
        'Hero',
        'The dragon took my home. I will become strong enough to keep that from happening again.',
        'crystal-2',
        [hero(52, 'approach', 'walk')],
        'magic',
      ),
    ],
  },
  {
    id: 'chapter-murkmire',
    title: 'Through the poisoned trail',
    kind: 'chapter',
    map: 'murkmire',
    quest: 'murkmire-slimes',
    npc: 'mirewarden',
    beats: [
      beat(
        'Narrator',
        'The trail leaves the caverns and sinks into Murkmire. Here, even the roots seem to watch.',
        'murkmire-1',
        [hero()],
        'mist',
      ),
      beat(
        'Mire Warden',
        'A vow means little if you cannot survive the road. Clear the pools, then push deeper into the marsh.',
        'murkmire-1',
        [hero(35, 'approach', 'idle'), npc('mirewarden')],
        'mist',
      ),
      beat(
        'Hero',
        'I have trained for this journey. I will not leave these people to face the darkness alone.',
        'murkmire-2',
        [hero(48, 'approach', 'walk')],
        'mist',
      ),
    ],
  },
  {
    id: 'chapter-frostfall',
    title: 'A promise against the cold',
    kind: 'chapter',
    map: 'frostfall',
    quest: 'frostfall-wolves',
    npc: 'frostwarden',
    beats: [
      beat(
        'Narrator',
        'Past the mire, the northern wind carries the hero into Frostfall. The road ahead is buried in snow.',
        'frostfall-1',
        [hero()],
        'snow',
      ),
      beat(
        'Frost Warden',
        'The wolves close the pass. Open it, and the people here may have a road to safety again.',
        'frostfall-1',
        [hero(35, 'approach', 'idle'), npc('frostwarden')],
        'snow',
      ),
      beat(
        'Hero',
        'I could not save my town. But I can fight for the people still here.',
        'frostfall-2',
        [hero(52, 'approach', 'walk')],
        'snow',
      ),
    ],
  },
  {
    id: 'chapter-ember',
    title: 'Through fire',
    kind: 'chapter',
    map: 'ember',
    quest: 'ember-imps',
    future: true,
    beats: [
      beat(
        'Narrator',
        'The frozen road gives way to burning peaks. Fire brings back memories the hero cannot outrun.',
        'cinematic-fall',
        [hero(38, 'approach', 'idle')],
        'embers',
        'memory',
      ),
      beat(
        'Hero',
        'I remember what the dragon left behind. This time, I am here to fight back.',
        'island-maps/ember',
        [hero(50, 'approach', 'attack')],
        'embers',
        'battle',
      ),
    ],
  },
  {
    id: 'chapter-celestial',
    title: 'The truth beneath the light',
    kind: 'chapter',
    map: 'celestial',
    quest: 'celestial-sprites',
    future: true,
    spoiler: true,
    beats: [
      beat(
        'Narrator',
        'In Celestial Realm, the spell around the hero is finally revealed.',
        'island-maps/celestial',
        [hero(42, 'approach', 'idle')],
        'magic',
        'memory',
      ),
      beat(
        'Narrator',
        'He was taken from the Shadow people as a child. A spell gave him a Celestial appearance and bound him to goodness.',
        'island-maps/celestial',
        [{ kind: 'shadow', x: 56, action: 'idle', size: 1 }, hero(38, 'approach', 'idle')],
        'magic',
        'memory',
      ),
      beat(
        'Hero',
        'I survived because I was Shadow. But the people I loved—and the promise I made—were real.',
        'island-maps/celestial',
        [hero(50, 'approach', 'idle')],
        'magic',
      ),
    ],
  },
  {
    id: 'chapter-fortress',
    title: 'The promise at the gates',
    kind: 'chapter',
    map: 'fortress',
    quest: 'fortress-knights',
    future: true,
    spoiler: true,
    beats: [
      beat(
        'Narrator',
        'At the Shadow Fortress, the journey returns to the dragon that destroyed his home.',
        'island-maps/fortress',
        [hero()],
        'mist',
        'battle',
      ),
      beat(
        'Hero',
        'I know where I came from. Now I choose what I fight for.',
        'island-maps/fortress',
        [hero(50, 'approach', 'attack')],
        'magic',
        'battle',
      ),
    ],
  },
  {
    id: 'feature-classes',
    title: 'Four paths, one promise',
    kind: 'feature',
    map: 'crystal',
    npc: 'mentor',
    beats: [
      beat(
        'Cavern Mentor',
        'Your trial is complete. A Knight stands firm; an Archer strikes from afar.',
        'crystal-1',
        [npc('knight', 30), npc('archer', 70)],
        'magic',
      ),
      beat(
        'Cavern Mentor',
        'A Mage shapes magic; a Rogue fights with swift twin blades. Which path will you train?',
        'crystal-1',
        [npc('mage', 30), npc('rogue', 70)],
        'magic',
      ),
      beat(
        'Hero',
        'A class is a beginning. I will earn the strength to carry it.',
        'crystal-1',
        [hero(48, 'approach', 'idle')],
        'magic',
      ),
    ],
  },
  {
    id: 'feature-gathering',
    title: 'Strength from the land',
    kind: 'feature',
    beats: [
      beat(
        'Narrator',
        'Ore, wood, herbs and fish give a traveler the means to keep going.',
        'whispering-woods',
        [{ kind: 'gathering', x: 42, action: 'mining', size: 1 }],
        'mist',
        'craft',
      ),
      beat(
        'Narrator',
        'Wooden tools are always available. Craft stronger tools, then equip the one you want to use.',
        'whispering-woods',
        [{ kind: 'gathering', x: 42, action: 'woodcutting', size: 1 }],
        'mist',
        'craft',
      ),
      beat(
        'Narrator',
        'Keep gathering while you remain at the node. Leave or fight to stop.',
        'whispering-woods',
        [{ kind: 'gathering', x: 42, action: 'fishing', size: 1 }],
        'mist',
      ),
    ],
  },
  {
    id: 'feature-forging',
    title: 'Steel for the road',
    kind: 'feature',
    npc: 'bram',
    beats: [
      beat(
        'Bram',
        'A good weapon begins long before the first swing. Bring ore, and we can make something that lasts.',
        'elderwood-village',
        [hero(25), npc('bram', 67), { kind: 'bench', x: 50, action: 'smelting', size: 1.2 }],
        'embers',
        'craft',
      ),
      beat(
        'Bram',
        'Hunt for recipes, smelt twenty ore into a bar, then build the tools and equipment your journey needs.',
        'elderwood-village',
        [
          { kind: 'item', item: 'iron-bar', x: 32, size: 0.7 },
          { kind: 'item', item: 'iron-pickaxe', x: 68, size: 0.7 },
        ],
        'magic',
        'craft',
      ),
    ],
  },
  {
    id: 'feature-cooking',
    title: 'A meal before the road',
    kind: 'feature',
    npc: 'cooking-station',
    beats: [
      beat(
        'Narrator',
        'A hard journey needs more than a sharp blade. Your catch can become a meal that prepares you for battle.',
        'elderwood-village',
        [hero(28), { kind: 'bench', x: 69, action: 'cooking', size: 1.2 }],
        'embers',
        'craft',
      ),
      beat(
        'Narrator',
        'Discover recipes by hunting. Cook fish for temporary buffs; a new meal replaces the old food buff.',
        'elderwood-village',
        [
          { kind: 'item', item: 'brook-trout', x: 32, size: 0.7 },
          { kind: 'item', item: 'trout-skewers', x: 68, size: 0.7 },
        ],
        'magic',
        'craft',
      ),
    ],
  },
  {
    id: 'feature-alchemy',
    title: 'A little light in a bottle',
    kind: 'feature',
    npc: 'alchemy-station',
    beats: [
      beat(
        'Narrator',
        'Gathered herbs can become the potions that bring you back from the edge.',
        'elderwood-village',
        [hero(28), { kind: 'bench', x: 69, action: 'alchemy', size: 1.2 }],
        'magic',
        'craft',
      ),
      beat(
        'Narrator',
        'Find recipes on monsters and craft health or mana potions. All potions share a cooldown—choose your moment.',
        'elderwood-village',
        [
          { kind: 'item', item: 'greenleaf-health-potion', x: 32, size: 0.7 },
          { kind: 'item', item: 'greenleaf-mana-potion', x: 68, size: 0.7 },
        ],
        'magic',
        'craft',
      ),
    ],
  },
  {
    id: 'feature-identification',
    title: 'What the shadows leave behind',
    kind: 'feature',
    beats: [
      beat(
        'Narrator',
        'Some equipment found on monsters hides its true attributes. The outside does not reveal its rarity.',
        'elderwood-village',
        [hero(28), { kind: 'item', item: 'woods-sword', x: 68, size: 0.8 }],
        'mist',
      ),
      beat(
        'Narrator',
        'Pay gold to identify a monster drop anywhere. Crafted equipment already has fixed properties.',
        'elderwood-village',
        [{ kind: 'item', item: 'woods-sword', x: 50, size: 1 }],
        'magic',
        'craft',
      ),
    ],
  },
  {
    id: 'feature-travel',
    title: 'The roads you remember',
    kind: 'feature',
    beats: [
      beat(
        'Narrator',
        'Every new shore begins with a journey. Visit an area through its portal before teleporting there.',
        'island-maps/woods',
        [hero(35)],
        'magic',
      ),
      beat(
        'Narrator',
        'Open the world map and choose a discovered area. Teleport Crystals shorten the road; boss entrances still require their keys.',
        'island-maps/crystal',
        [{ kind: 'item', item: 'teleport-crystal', x: 50, size: 0.8 }],
        'magic',
      ),
    ],
  },
  {
    id: 'feature-training',
    title: 'The strength you earn',
    kind: 'feature',
    beats: [
      beat(
        'Narrator',
        'Knights and Rogues train Melee. Archers train Distance. Mages train Magic. These skills strengthen base damage.',
        'whispering-woods',
        [
          { kind: 'knight', x: 28, action: 'attack', size: 1 },
          { kind: 'mage', x: 72, action: 'attack', size: 1 },
        ],
        'magic',
        'battle',
      ),
      beat(
        'Narrator',
        'Crit, dodge, block and other attributes come from equipment. Training and good gear each have their place.',
        'whispering-woods',
        [
          { kind: 'archer', x: 28, action: 'attack', size: 1 },
          { kind: 'rogue', x: 72, action: 'attack', size: 1 },
        ],
        'magic',
        'battle',
      ),
    ],
  },
  {
    id: 'feature-housing',
    title: 'A place to return to',
    kind: 'feature',
    beats: [
      beat(
        'Narrator',
        'The road takes much from a traveler. In Elderwood, you can build a place that belongs to you.',
        'elderwood-village',
        [hero(27), { kind: 'house', x: 68, size: 1.8 }],
        'mist',
        'craft',
      ),
      beat(
        'Narrator',
        'Hunt for blueprints and recipes. Build your plot and house, then place furniture and display the treasures you bring home.',
        'elderwood-village',
        [
          hero(25),
          { kind: 'item', item: 'oak-table', x: 55, size: 0.8 },
          { kind: 'item', item: 'oak-chest', x: 78, size: 0.8 },
        ],
        'magic',
        'craft',
      ),
      beat(
        'Narrator',
        'Chests store your items. Your home is private; invite someone when you want to share it.',
        'elderwood-village',
        [hero(40, 'approach', 'idle'), { kind: 'item', item: 'oak-chest', x: 68, size: 1 }],
        'magic',
      ),
    ],
  },
  {
    id: 'feature-arena',
    title: 'A rival, not an enemy',
    kind: 'feature',
    map: 'murkmire-arena',
    beats: [
      beat(
        'Narrator',
        'Not every battle is against the darkness. In Mirebound Arena, travelers test the strength they have earned.',
        'murkmire-arena',
        [hero(28), { kind: 'rogue', x: 73, size: 1, flip: true, action: 'idle' }],
        'mist',
        'battle',
      ),
      beat(
        'Narrator',
        'Both fighters must be ready. Your actual gear and trained skills decide your strength; movement and timing decide the rest.',
        'murkmire-arena',
        [
          { kind: 'knight', x: 30, size: 1, action: 'attack' },
          { kind: 'rogue', x: 70, size: 1, flip: true, action: 'attack' },
        ],
        'magic',
        'battle',
      ),
      beat(
        'Narrator',
        'A knockout wins. The timer can end in a draw. Leaving a live duel forfeits it.',
        'murkmire-arena',
        [hero(48, 'approach', 'idle')],
        'mist',
      ),
    ],
  },
  {
    id: 'feature-battlegrounds',
    title: 'Hold against the storm',
    kind: 'feature',
    map: 'frostfall-battleground',
    beats: [
      beat(
        'Narrator',
        'At the frozen battlements, survival is a battle fought in waves. Enter alone, or stand with a party of up to four.',
        'frostfall-battleground',
        [hero(25), { kind: 'frost-wolf', x: 77, size: 1, flip: true, action: 'walk' }],
        'snow',
        'battle',
      ),
      beat(
        'Narrator',
        'Share your party code before starting. Ready together, then face ten waves that grow stronger as you advance.',
        'frostfall-battleground',
        [
          { kind: 'knight', x: 27, size: 1, action: 'attack' },
          { kind: 'mage', x: 44, size: 1, action: 'attack' },
          { kind: 'ice-troll', x: 76, size: 1.3, flip: true, action: 'attack' },
        ],
        'snow',
        'battle',
      ),
      beat(
        'Narrator',
        'Potions can help living fighters. A fallen teammate watches the rest carry on. Clear the final wave to earn the expedition reward.',
        'frostfall-battleground',
        [
          hero(28, 'approach', 'attack'),
          { kind: 'frost-giant', x: 75, size: 1.8, flip: true, action: 'attack' },
        ],
        'snow',
        'battle',
      ),
    ],
  },
  ...(['woods', 'crystal', 'murkmire', 'frostfall'] as const).map(
    (island, i): Cutscene => ({
      id: `boss-${island}`,
      title: [
        'The forest awakens',
        'Beneath the crystal heart',
        'The heart of the mire',
        'The mountain rises',
      ][i],
      kind: 'boss',
      map: `${island}-boss`,
      beats: [
        beat(
          'Narrator',
          'A guardian bars the road ahead. Every entry costs a key earned on the hunting grounds.',
          ['bear-den', 'crystal-boss', 'murkmire-boss', 'frostfall-boss'][i],
          [
            hero(23),
            {
              kind: ['forest-bear', 'crystal-wyrm', 'hydra', 'frost-giant'][i],
              x: 76,
              size: 1.8,
              flip: true,
              action: 'idle',
            },
          ],
          i === 3 ? 'snow' : 'mist',
          'battle',
        ),
        beat(
          'Narrator',
          'Watch the warning. Leave the marked ground before the special attack lands—standing still can cost you everything.',
          ['bear-den', 'crystal-boss', 'murkmire-boss', 'frostfall-boss'][i],
          [
            hero(28, 'retreat', 'walk'),
            {
              kind: ['forest-bear', 'crystal-wyrm', 'hydra', 'frost-giant'][i],
              x: 76,
              size: 1.8,
              flip: true,
              action: 'attack',
            },
          ],
          i === 3 ? 'snow' : 'magic',
          'battle',
        ),
      ],
    }),
  ),
];
// Authored film stills retain the original staging as a fallback for future chapters.
for (const scene of CUTSCENES) {
  if (scene.future) continue;
  scene.beats.forEach((beat, index) => {
    const art =
      scene.id === 'chapter-woods'
        ? ['woods-attack', 'woods-survivor', 'woods-training', 'chapter-woods'][index]
        : scene.id;
    beat.illustration = `/assets/cutscenes/${art}.png`;
  });
}
export const cutsceneById = (id: unknown) =>
  typeof id === 'string' ? CUTSCENES.find((s) => s.id === id) : undefined;
