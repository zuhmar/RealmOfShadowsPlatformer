# Discord feature and item library

72 ready-to-post PNG cards at 1600 × 1000:

- 37 feature previews, including gathering specializations.
- 4 individual class spotlights.
- 8 monster spotlights from the two current hunting islands.
- 23 item galleries: all seven equipment tiers, eight tool materials,
  resources, loot, bars, food, potions, furniture, recipe scrolls, starter weapons,
  keys, and currency.

Open `index.html` to browse the entire pack. `SHOWCASE-CAPTIONS.md` contains a
caption for every card, and `showcase-manifest.json` maps filenames to titles.
Every PNG was checked for dimensions, decoding, and size under 10 MiB.

## What these previews show

Gameplay captures use the actual client renderer with staged preview state.
They are labelled accordingly and do not modify player accounts or saves.
Item and class cards use the real game sprites, clipped to their atlas frames.
They are promotional layouts, not screenshots of in-game menus.

Whispering Woods and Crystal Caverns are the current playable hunting islands.
Later-island equipment and portal artwork is labelled as an art preview. Island
map cards label playable versus in-development destinations. No hidden hero
identity or future storyline reveal is included.

## Regenerate

With the web dev server running on port 5173:

```sh
node scripts/capture-discord-features.mjs
node --import tsx scripts/render-discord-features.mjs
```

The renderer checks missing assets and text overflow. `SKIP_EXISTING=1` can
reuse exported PNGs when rebuilding the gallery and manifest; omit it after
layout or artwork changes.

## View on the game website

The web build publishes this library at `/showcase`. Open that path on the
same domain as the game, tap a preview, and save the full-size PNG. The page
also links to the server icon, welcome banner, and post captions. These static
files load only when visiting the gallery, not when starting the game.
