# Continuous house shell and movement bounds

Housing uses a continuous opaque plaster backdrop rather than isolated framed wall panels. It fills the camera view, follows scroll/zoom and refreshes after viewport changes. Original background source: `/workspace/generated_images/exec-5ee955e2-ca02-475b-ab81-9c79cda405d5.png`; source PNG is unchanged and WebP delivery preserves dimensions and alpha.

Wood wainscot, floor and ceiling trim use inset atlas regions from the existing generated house sprites. Metadata excludes decorative end caps and transparent gutters so repeated strips join continuously without repainting or stretching artwork. Side columns meet each level, floors and ceiling. Windows, ladders, doors and furniture retain proportional scaling.

`houseInteriorBounds` defines visible interior edges: 64 units from each map side, ceiling 260 units above the highest floor, and ground at the first floor. All house collision floors end at these same edges. Actor centers stay 28 units inside each wall, with 80 units of head clearance below the ceiling. Authoritative movement stops velocity against a wall, clamps ceiling movement, and recovers positions below the ground floor. Server join normalizes old saved coordinates before its first snapshot. The client also normalizes incoming actor positions before rendering, preventing a stale snapshot from displaying an adventurer outside the shell. Other maps keep their existing movement rules.

No house, plot, furniture, invitation or progress is removed. Furniture's existing 80-unit side margins remain inside the 64-unit walls. Entry, exit and ladders stay at their original coordinates.

Unit checks hold left/right movement on every floor of every size, test ceiling contact and invalid saved positions. The real multiplayer test holds movement at both walls and reloads a deliberately invalid save. Browser checks verify actual background texture and coverage on desktop/mobile, bounded character rendering, floor furniture and the complete entry/decorate/exit flow.
