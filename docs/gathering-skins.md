# Gathering skin animations

The five current player appearances—Celestial base, Royal Knight, Woodland Ranger, Starlight Mage, and Dusk Rogue—each have a generated 16-pose gathering sheet. Four poses cover each of Mining, Woodcutting, Fishing, and Herbalism. They retain the character's outfit and headwear, face right, and use one stable boot baseline and body scale per sheet. Men and women use the same Celestial/class appearances, consistent with the current character design.

A new generated held-tool atlas supplies all 32 tools: four kinds across Wood, Iron, Crystal, Mire, Frost, Ember, Celestial, and Shadow. The dedicated skin motion and actual equipped tool combine into 160 skin/material/activity combinations. Hands, grip, and tool angles are authored in frame metadata; the tool handle sits behind the character's hands. Rods have no baked line or hook. Their cast line runs from the transformed rod tip into the existing pond's water target.

Gathering animates continuously, with faster tool materials increasing motion speed within a readability limit. Fishing includes a longer hold/reel interval. Gathering art is suppressed during climbing; finishing or interrupting an activity restores the normal character animation. The server's tool ownership, manual equipment, skill requirements, resource yield and activity duration rules are unchanged.

Only gathering skins worn by players present and the shared tool atlas are queued on resource maps. Other skins load when actually needed, rather than one body atlas per tool material. Atlas metadata is bundled with the matching versioned image references. Original generated PNGs are retained; optimized deliveries preserve dimensions and alpha.

Sources are under `assets/characters/gathering/skins/` and `assets/equipment/gathering-held-tools.*`. Metadata trims neighboring fragments without editing the generated source pixels. `npm test` checks all body frame bounds, boot baselines, hand anchors and tool grips. `npm run test:browser:gathering-skins` exercises every combination, confirms animation advancement and grip alignment, checks climbing interruption, and captures desktop/mobile examples in `artifacts/`.
