# House roof and wall artwork

Housing uses newly generated `house-wall-edge.png`, `house-roof.png`, and
`house-sky.png`. Original generated PNGs are retained unchanged. Atlas metadata
selects the vertical timber and roof bounds; the edge frame excludes the end
caps and transparent canvas padding. Edges tile vertically at a uniform scale,
while the full roof scales proportionally to each house width.

The sky fills the camera viewport behind the roof. The existing plaster begins
under the eave and continues below the house. Camera bounds include the roof
peak, while player movement retains the existing interior collision bounds.

Validation: typecheck, production build, exact-alpha WebP verification, and the
three-size desktop/mobile housing renderer check. Roof screenshots are saved
under `artifacts/*-house-roof.png` by `scripts/browser-house-interiors.mjs`.
