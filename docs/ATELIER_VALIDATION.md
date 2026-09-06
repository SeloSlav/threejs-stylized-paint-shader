# Atelier gallery validation — 2026-09-06

## Visual contract

The collection contains exactly six complete painted compositions. No primitive,
texture, tree, residence, or character study remains in the selector or build.
The night café reads as amber light against a blue night; the cat, duck captain,
pigeon board members, and racing snails remain distinct focal subjects. Strong
surface paint survives while background light breakup can be tuned separately.

## Reproducible inputs

Three.js 0.185.1 / WebGL2. Geometry seeds are 41923 (Provence), 8193 (sunflowers),
47211 (café), 26312 (bathroom), 59218 (rooftop), and 77413 (garden). Reset restores
paint seed 73021, time zero, the scene-specific controls, and its Hero bookmark.
Exact Detail/Hero/Wide camera positions and lighting values are in
`src/scenes/sceneRegistry.ts`. Browser checks used High resolution with the
palette hidden, at desktop 1280 × 720 / 1440 × 900 and portrait 390 × 844.

## Checks performed

- Visually reviewed all six paintings, including the retained Provence and
  sunflower compositions after the shader contrast adjustment.
- Reviewed the new hero compositions and a rooftop Detail/native comparison and
  Wide view. Moved the hero cameras closer, raised the race banner clear of the
  snails, extended the bathroom floor/wall, and reduced distracting background
  light breakup. Tightened the new Wide bookmarks after the initial review.
- Inspected Pigment deposits and Impasto relief at the rooftop Detail bookmark.
  Strokes and bristle ridges follow the same surface coordinates; no screen-space
  painting filter is involved. These captures were inspected in the task preview.
- Reviewed a shuffled field (packed seed label C1F587C3) with Gouache, then Reset.
  Verified that the authored values and Impasto state return on Reset.
- Checked next/previous navigation and direct scene URLs, shader on/off,
  scene-specific lighting restoration, and palette open/close.
- At 390 × 844, the café remains composed between the controls and caption;
  opening the palette shows an independently scrolling overlay with accessible
  close and export controls.
- No browser console warnings or errors during the final preview checks.
- `pnpm build` passes TypeScript and production bundling: 28 modules,
  approximately 787 kB JavaScript / 205 kB gzip. The standard large-chunk advisory
  remains because all scenes share one Three.js runtime.
- `pnpm run test:paint` passes repeatable reset, distinct seeds, populated linear
  channels, and mip filtering. Fixture SHA256 prefix: e527aee79c4a86e0.
- Removed approximately 26 MB of obsolete source texture/model assets and the
  SeedThree package. Current paintings require no downloaded scene assets.

## Rendering budget

Representative warm desktop statistics from the gallery counter:

| Scene | Submitted draws | Submitted triangles |
| --- | ---: | ---: |
| Provence | 39 | 124K |
| Sunflowers | 35 | 84K |
| Night café | 99 | 432K |
| Duck admiral | 71 | 129K |
| Pigeon meeting | 77 | 104K |
| Snail race | 52 | 196K |

These include shadow submissions; counts can vary with frustum coverage.
Observed browser rates ranged roughly 87–166 FPS across preview conditions and
concurrent tabs. They are not GPU timings or cross-device performance promises.

The two 512² RGBA paint maps occupy approximately 2.67 MiB including mipmaps.
The existing 2048² directional shadow map and dormant composer/outline allocations
remain. No new render targets or post-process passes were added. All six gallery
scenes use the direct renderer path and one ACES output transform. Geometry is
batched by pigment; generated sign textures are disposed on scene changes.

## Intentional limits

The compositions are static procedural illustrations with live orbit controls.
Bristle relief changes normals rather than silhouettes. Wet-street reflections
are authored opaque paint marks, and soap bubbles are painted rings. Emissive
windows do not cast physically simulated local light. The worlds are composed
for their bookmarks; arbitrary orbit positions can reveal their diorama layout.
Full GPU timing and automated temporal image-difference measurements were not
performed. Historic engine-study evidence remains in `VALIDATION.md`.
