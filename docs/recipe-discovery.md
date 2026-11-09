# Hunting for recipes

Every current crafting recipe starts locked: 89 recipes across smelting, tools, weapons, armor, Cooking, Alchemy, Carpentry and house blueprints. This applies to existing characters too. Previously owned equipment, tools, meals and potions remain usable. Starter wooden tools remain automatic; they have no crafting recipe.

Kill monsters on a recipe’s island, then collect the owner-only recipe scroll in their loot. Collection permanently learns it for that character. There is no extra learn button or inventory scroll stack. The crafting menus show discovered counts, level requirements, ingredients and the island where each missing recipe drops. A pickup notice names the learned recipe.

## Drops

- Each island’s bar recipe is guaranteed on its first eligible kill while unknown, to establish the smelting path.
- After that, normal kills have a 10% chance of an unknown recipe. The tenth eligible kill since the last recipe drop guarantees one.
- Boss kills guarantee one unknown recipe if any remain.
- No duplicates of already learned recipes or owner’s pending ground scrolls. Expired, uncollected scrolls can drop again.
- Only that island’s recipe pool is eligible; no recipe rewards from offline claims, quests, shops or gathering.
- Whispering Woods and Crystal Caverns are live. The five later islands’ catalog entries remain marked as future island drops until those islands are playable.

Discovery does not bypass profession levels, character levels, ingredients, ownership restrictions, Bram’s quest or station proximity. Server validators enforce discovery before spending materials or granting XP. RPC payloads cannot grant discovery. Unlocks and per-island pity counters are saved in character JSON, survive travel/reentry and are hidden from other players’ snapshots. No schema migration is required.

## Artwork

Six generated parchment designs use profession/category emblems and a badge of the recipe’s output. All 89 recipes therefore have an identifiable scroll sprite in menus and ground/pickup loot. The seven generated ingots and ten generated meals/potions live in `apps/web/public/assets/ui/recipe-{scrolls,bars,consumables}.{png,json}`. Equipment and tools reuse the existing complete island equipment and gathering-tool atlases. Original source PNGs stay unchanged; atlas metadata bounds each silhouette without stretching. Delivery copies use lossless WebP and preserve exact RGBA.

Artwork provenance: generated originals remain in `/workspace/generated_images`; consumables `exec-9c5f8da5-6fc6-433c-bec8-df3da66fa73f.png`, bars `exec-79d324f1-6a10-421d-9d8f-45db7bed6d5b.png`, scrolls `exec-8c909c42-80c7-4e5e-a768-8008ac393ed9.png`. The scrolls’ blank centers receive the existing output sprite at runtime. Atlas framing uses density gutters and silhouette bounds to exclude detached artifacts without repainting pixels.

## Verification

Run `npm test`, `npm run typecheck`, `npm run build`, `npm run test:integration`, `node scripts/browser-recipe-art.mjs`, `node scripts/browser-loot-feedback.mjs`, and the database-backed `scripts/browser-recipes.mjs` / `scripts/browser-forge.mjs` with the server environment file. Tests cover all locked crafting catalogs, no mutation on rejection, tier pools, pity, boss guarantees, pending duplicates, owner-only pickup, persistence, forged RPC rejection, existing-item use, atlas loading and desktop/mobile rendering. Screenshots are written to ignored `artifacts/`.
