# Elderwood housing and Carpentry

A central platform at x500–1300, feet y240, is reached by the new ladder from the existing terrace. Open **Home** under the player profile. Construction and visits require standing near this platform; server checks position and map for every action.

Each character owns one private plot. Small, Medium and Large plots have widths 280/440/620 and Carpentry requirements 1/5/10. Plot costs are 20 planks, 60 planks + 5 Iron Bars, and 120 planks + 10 Iron Bars. A larger plot replaces the previous size while preserving construction and furniture; no downgrading or second plot. Costs are cumulative across upgrades.

House construction proceeds through foundation, walls and finished house. Small stages cost 10 planks; 20 planks; 15 planks + 1 Iron Bar. Medium doubles and Large quadruples these construction costs. Five Oak Logs make a plank. Building/crafting trains Carpentry using the existing profession XP curve. The house exterior is displayed on the platform; finished houses now enter private interior maps. See [house interiors](house-interiors.md).

Five Carpentry recipes (planks, table, chair, bed, chest) and three house blueprints are added to the existing Woods monster recipe pool, with the same scroll pickup, no duplicate, pity and boss rules. No blueprints are automatically granted, including to existing characters. Logs come from the existing Woods gathering nodes. Wooden tools remain automatic and every ore/tool/crafting rule stays unchanged.

Finished houses allow furniture placement on the current interior floor. Placement uses a position slider; server validates integer coordinates, plot bounds, ownership, inventory, overlap and size-dependent 24/48/80-piece caps. Removing furniture returns it to the bag for repositioning. All four furniture types are decorative: the chest does not introduce another inventory, and beds grant no combat/offline bonuses in this version.

## Privacy and visits

Village terrain and players remain shared. Each viewer receives only their own house, or the house they explicitly choose to visit. A house owner invites another character currently in the same village room. Invitations persist by character ID, up to 20 guests. Guests use **Visit plot** from Home; guests can follow into a private house after selecting its exterior. Interior access is checked on entry and re-entry. A guest can always return to their own plot.

The server removes housing, invitation lists, Carpentry and housing revisions from every remote player's snapshot. It attaches a sanitized `housingView` only to the receiving player's record, so houses are not merely hidden by CSS. Views exclude invitation lists. The renderer draws only that selected view. Every snapshot rechecks permission and owner presence; revocation or departure clears a guest’s view immediately. Guests cannot build, place, remove or invite on the visited plot. Other public player sprites remain visible.

Housing actions are serialized with other durable room actions. A locked character transaction checks a housing revision, validates costs and writes house, furniture, inventory and Carpentry together before publishing success. Temporary selected visits are room memory only and never saved in character JSON. Existing characters need no database schema migration or new environment variables.

## Artwork and verification

`assets/ui/housing.{png,json}` contains Small/Medium/Large houses, a construction frame, table, chair, bed and chest. Generated original: `/workspace/generated_images/exec-055bfbe9-e448-419a-a963-dbafec962d2d.png`. PNG bytes are unchanged; atlas bounds isolate the silhouettes. Foundation uses the construction sprite's masonry crop at runtime. Rendering preserves proportions. UI delivery WebP is lossless.

Checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run test:integration`, and `node --env-file-if-exists=apps/server/.env scripts/browser-housing.mjs`. Housing tests cover costs, levels, discovery, upgrades, inventory conservation, invalid/overlapping placement, remote snapshot privacy, unauthorized visits/edits, revocation, saves/re-entry and concurrent duplicate writes. The browser journey builds through the real UI, crafts/places furniture, upgrades, checks mobile overflow and confirms saved state.

## Plot feedback and batch crafting

Claimed but unbuilt plots display survey stakes, a boundary line and a Build Foundation hint, including existing saved plots. Build is separate from claiming: the menu puts the next construction stage before plot upgrades. The renderer can derive the owner’s view from their private saved housing data while waiting for a view payload. No materials or ownership are reset.

The housing popup has an open background and Build/Craft/Decorate/Guests tabs. Crafting uses a recipe catalog, selected recipe details, quantity input, 1/5/10/Max presets, total ingredients and total XP. Mobile uses a horizontally scrolling recipe strip. Each batch is limited to 1–1000; server validation checks the full multiplied cost before deducting anything, then adds all outputs and XP in one transaction. The default omitted quantity remains one for older clients. Placement remains one furniture item at a time.

`browser-plot-feedback.mjs` verifies visible stage-zero markers and foundation replacement; the live housing journey checks three-item crafting and the open desktop/mobile layout. Housing unit tests compare batch inventory/XP with repeated single crafts, reject invalid/unaffordable quantities without mutations, and the concurrent transaction test verifies only one batch is charged.
