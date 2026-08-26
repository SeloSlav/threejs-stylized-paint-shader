# Three.js Stylized Paint Shader

An interactive Three.js port and extension of Gabriel de Laubier's
[Stylized Paint Shader Breakdown](https://cyn-prod.com/stylized-paint-shader-breakdown).
The demo is pinned to **Three.js 0.185.1**.

## Run

```bash
corepack pnpm install
corepack pnpm run dev
```

Build the production bundle with:

```bash
corepack pnpm run build
```

## Ported material graph

The visible material stays local to each object; there is no painterly
post-process pass.

- One deterministic RGBA texture owns the complete paint field:
  - **RG** — tangent-space brush normal X/Y, decoded from `[0, 1]` to
    `[-1, 1]` with the tutorial's fixed `Z = 0.95` approximation.
  - **B** — broad grayscale strokes for the two-color diffuse gradient and
    bump-offset/parallax height.
  - **A** — smaller high-contrast strokes for bristle tips, band breakup, and
    the shadow pass. It never acts as the silhouette carrier by itself.
- The reset lighting thresholds reproduce the tutorial's `0 / .25 / 1`
  sun bands (`N·L` cuts at approximately `-.7` and `.3`).
- A swapped-UV normal sample feeds the tutorial's quantized, colored fake
  reflection lobe.
- Smooth normals are stored in a dedicated geometry attribute. They drive
  curvature detection, shell inflation, and stable edge handling without
  losing hard surface normals.
- The solid pass uses a shared triplanar B/A edge field and derivative
  curvature to keep shallow flat faces while broad carrier strokes chip curved
  silhouettes. Reach is clamped to a shallow edge band so the far side of a
  closed volume cannot become visible.
- Every featured object has a base-connected, tapered back-face paint rim plus
  two thin independently offset contour loops. Their inflation, width, gaps,
  and view-plane offsets vary separately, avoiding perfect concentric rings.
- The custom depth pass uses the A channel, squared sun-facing normal, and a
  derivative flat-face guard to erode cast shadows.
- Curved and rounded objects triplanar-project the macro B/A field to avoid
  sphere pole pinching. Fine tangent-space relief retains the tutorial's UV
  path.
- Three.js ACES tone mapping is the single output transform. No composer,
  bloom, screen-space paint filter, or second tone-map is installed.

## Controls and diagnostics

The panel groups parameters by perceptual role: stroke scale/relief, painted
light, oil response, bristle reach, rim continuity, outline wobble/breakup,
and shadow erosion. It also
provides:

- High Key, Sunset Noir, and Ultraviolet art-direction presets.
- Detail, Hero, and Wide fixed camera bookmarks (`1`, `2`, `3`).
- Final, packed-normal, broad-stroke, detail-stroke, toon-band, oil-only,
  erosion-only, and color-coded edge-layer views.
- Deterministic field shuffle/reset, time freeze (`P`), panel toggle (`H`),
  quality tiers, and PNG capture.
- Live FPS, draw-call, and triangle counters.

`Reset` restores seed `73021`, all shader values, object rotations, the Noir
preset, the Hero camera, and freezes motion at `t = 0` for reproducible captures.

## Visual contract

The accepted design frame preserves these observable invariants:

- Broad painted color islands, dry-brush breakup, and fine bristles remain
  simultaneously readable on the hero sphere.
- The warm reflection field ends in dragged, irregular stroke edges rather
  than a smooth PBR highlight.
- Near-black masses survive without bloom or presentation effects.
- Strokes remain attached under object and camera motion; curved macro fields
  do not show a visible UV pole.
- Flat faces remain intact while curved silhouettes can erode.
- Rim marks stay rooted at the object boundary and taper only at their outer
  tips; erosion never exposes a deep interior or far hull.
- Both offset loops remain readable as imperfect hand-drawn arcs rather than
  smooth concentric circles.
- The unfiltered final is already the no-post baseline.
- The material reads at the Detail, Hero, and Wide bookmarks and at mobile
  widths.

## Deliberate engine divergence

The UE tutorial's optional mesh-distance-field AO has no direct equivalent in
core Three.js. This demo keeps native physically based direct/environment
lighting and shadow maps, then ports the tutorial's brush-aware shadow depth
pass. It does not add screen-space AO because that would violate the source
project's material-local/no-post constraint. The rest of the material stages
are exposed and independently inspectable.

## License

Released under the [MIT License](LICENSE).
