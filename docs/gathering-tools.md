# Held gathering tools and touch controls

Gathering uses new male/female character atlases at `/assets/characters/gathering/citizen-{male,female}.{png,json}`. Each has24 poses: six each for mining, woodcutting, fishing, and herbalism. Wooden pickaxe, axe, rod/reel, and sickle are painted into the hands. The renderer selects the appropriate loop from authoritative gathering state, preserves Sage/Ember/Tide outfits, and restores the equipped weapon afterward. Climbing continues to use unarmed ladder poses.

Mining/chopping/herbalism loops play at7 FPS; fishing at4 FPS. Atlas source frames are384×384 with foot baseline336. Trim rectangles follow measured silhouettes. Feet anchors are measured from boot pixels, and fishing line tips are measured per fishing frame so the runtime line starts at the painted rod tip. PNGs preserve the generated source bytes and true alpha. The male source was corrected before packaging to restore the clipped raised pickaxe.

`packages/game-data/src/tools.ts` defines32 tool variants: pickaxe, axe, fishing rod, and sickle in Wooden, Iron, Crystal, Mire, Frost, Ember, Celestial, and Shadow materials. `/assets/equipment/gathering-tools.{png,json}` supplies their matching icon atlas. The server selects a free wooden starter tool for each gathering action. Character displays the starter set and an expandable tier gallery.

Ore-tier tools are prepared as catalog/artwork for future crafting upgrades. They are not granted, craftable, equipable, or stat upgrades in this change; held-tool animation sheets currently depict the starter wooden set. No tool recipes, ownership, or upgrade costs are invented by this implementation.

Game buttons and the canvas suppress context menus, image dragging, text selection and WebKit touch callouts. SVG artwork ignores pointer events so touches target the actual buttons. Movement/skill controls retain `touch-action:none`, pointer capture and clean release; chat text fields retain normal selection behavior. HUD mouse/pointer/touch events also stop before reaching the world behind them, so sending chat near Mira does not accidentally open her dialog. Menus remain accessible by keyboard with visible focus outlines.

Browser checks cover all48 gathering poses, both appearances/outfit variants, restoring weapons, tool gallery frames, held-pointer capture/release, prevented context/drag events, chat/menu operation, and live fishing/save. Chromium verifies the events and CSS; Safari's OS callout behavior relies on its `-webkit-touch-callout:none` support rather than a device-specific native-menu test.
