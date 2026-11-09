# Realm of Shadows — Discord starter pack

- `server-icon.png`: square purple R monogram; upload as the server icon.
- `welcome-banner.png`: illustrated welcome graphic; post in your welcome channel or use as a banner where available.
- `housing-showcase.png`: ready-to-post development update showing the actual housing renderer.
- `housing-gameplay.png`: clean in-game capture used in the showcase.
- `housing-showcase.html`: editable layout; keep beside the gameplay PNG to preview locally.

The icon and welcome artwork are promotional illustrations. The housing capture
uses the actual game renderer with a staged small-house preview and one chair.
No unreleased story reveal is included.

## Suggested housing post

**A home in Elderwood 🏡**

Player housing is taking shape in Realm of Shadows! Build your house, craft and
place furniture, and invite friends over. Small, medium, and large plots give
you room to grow.

Here's a look at the latest development build. What furniture would you want
in your house first?

## Regenerate the showcase

With the web dev server running on port 5173:

```sh
node scripts/capture-discord-housing.mjs
node scripts/render-discord-showcase.mjs
```

These create marketing files only and do not change player saves.
