# Character direction and story canon

## Visual rules

The main character and friendly NPCs use the compact white-and-gold **Celestial** figure. Hostile humanoid and Shadow NPCs use the matching black-and-purple **Shadow** figure. Both have 36 authored animation frames: idle, walk, jump, climb, attack and death. The existing `golden-test` identifier is retained for save compatibility, but its public name is now Celestial.

Wolves, spiders, boars, bats, golems, scorpions and every other monster/boss keep their existing creature artwork, animations, sizes and combat. Allegiance is a character/NPC art choice, not a creature recolor.

New and saved heroes adopt the Celestial appearance automatically. Class selection, skills, equipment, gold, quests, gathering tools and inventory remain intact. Archived class skin assets remain in the repository for compatibility; live portraits, previews and player rendering use the new hero. Classes still determine weapons and combat, and the selection carousel shows the corresponding weapon over the Celestial body. Player cosmetics do not offer the Shadow appearance before the revelation.

NPC names, roles, collision positions, interaction zones and dialogue remain intact. Mira, Bram and the Cavern Mentor are friendly Celestials. A future hostile NPC sets `allegiance: 'shadow'` in map data; unspecified NPCs default to Celestial. Cooking and Alchemy stations remain station props.

## Canon — author spoilers

The boy was stolen from the Shadow people as a child and raised among the Celestials. A spell made him look white-and-gold like them and compelled him toward goodness. He believed he was Celestial and did not know his origin or the spell.

The Shadow Dragon destroyed his hometown and killed everyone he knew. He survived because of his hidden Shadow nature, without understanding why. He trained for years and began his journey to slay the dragon. The hometown attack, losses, training and revenge quest remain the spine of the story.

Do not reveal the abduction, enchantment or Shadow origin in Elderwood, Whispering Woods, Crystal Caverns, Murkmire, Frostfall or Ember. The truth is revealed on **Celestial Realm**, the sixth island (51–60), before the final journey to Shadow Fortress (61–100). Who stole him and cast the spell is not yet specified; do not assign a culprit without further direction.

## Reveal implementation and current limits

`apps/server/src/story.ts` owns the secret text. `revealOrigin` runs on authoritative map entry and checks the actual room island, not client-supplied level, unlock lists or visited-area claims. Until that island is Celestial Realm, no revelation is attached to the character. On first entry, it adds a persistent `originRevelation` journal entry. Later entries do not duplicate it. Public snapshots hide this private story progress from other players. The opening prologue only describes his believed Celestial upbringing and the existing tragedy.

Celestial Realm is still a future island; this change does not open its map, introduce a playable reveal quest, or bypass the current Woods/Crystal scope. The guarded journal reveal is ready for its eventual map entry. It also does not automatically transform the hero after the reveal; his visual form remains white-and-gold unless a later story decision changes it.

## Assets and checks

- Celestial: `apps/web/public/assets/characters/skins/golden-test.{png,json}`.
- Shadow: `apps/web/public/assets/characters/skins/shadow-being.{png,json}`. Generated original retained at `/workspace/generated_images/exec-0ff8e896-cc77-40c3-a528-49d8736c99e2.png`.
- Framing: `python scripts/frame-golden-test.py <generated-source.png> shadow-being` returns atlas metadata without repainting pixels. Both figures use restrained edge glow, contain each pose in its own frame and render with preserved proportions.
- Delivery: `python scripts/optimize-art.py --verify` preserves source dimensions and exact alpha.
- Validation: `npm test`, `npm run build`, `npm run test:integration`, `node scripts/browser-factions.mjs`, and `node --env-file-if-exists=apps/server/.env scripts/browser-golden-test.mjs`. Tests cover default/migrated heroes, spoiler-free opening content, authoritative reveal gating, persistent and private revelation, NPC faction art, movement, weapons and desktop/mobile rendering.
