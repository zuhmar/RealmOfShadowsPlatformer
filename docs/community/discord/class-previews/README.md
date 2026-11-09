# Individual animated class previews

Each class has a still PNG and a four-second looping GIF at 1080 × 860.
The GIF shows one character at a time: unarmed idle skin, armed movement,
basic attack, and the special with the actual weapon effect artwork.
Full sprite sheets are never displayed. Source atlas offsets and baselines
are used to keep the character aligned without clipping neighboring frames.

The cards show the actual rank-one weapon profiles, mana cost, cooldown,
training skill, and class details from game data. They do not invent
class-based crit, dodge, or block values; those attributes depend on gear.
The showcased weapons are the Ironwood variants, with the Woods effect theme.
Specials improve with weapon tiers and class talents. These are isolated
sprite/effect demonstrations, not captures of a live combat encounter.

Regenerate with `node --import tsx scripts/render-discord-class-previews.mjs`.
This needs Chromium and ffmpeg. Output consists of 48 frames at 12 fps per GIF.
Render checks reject clipped sprites and oversized GIFs. Temporary frames stay
under ignored `artifacts/`.

With private Discord credentials configured, preview with
`node scripts/post-discord-class-previews.mjs`; append `--apply` to post/update
these four cards in #pick-your-class. Both media files are normal attachments,
with plain text descriptions so users do not need link embeds enabled.
Discord role previews do not change or unlock an in-game class.
