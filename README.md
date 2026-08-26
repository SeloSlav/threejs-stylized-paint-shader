# Three.js Stylized Paint Shader

An interactive Three.js port and extension of Gabriel de Laubier's
[Stylized Paint Shader Breakdown](https://cyn-prod.com/stylized-paint-shader-breakdown).
The demo is pinned to **Three.js 0.185.1**.

![Sunset Noir preset in the interactive Three.js paint shader laboratory](docs/screenshots/sunset-noir.png)

*Sunset Noir — the full interactive material laboratory and brush controls.*

![Ultraviolet preset showing close-up procedural brushwork in Three.js](docs/screenshots/ultraviolet.png)

*Ultraviolet — close-up brush texture, painted reflections, and broken outlines.*

## Run

```bash
corepack pnpm install
corepack pnpm run dev
```

Build the production bundle with:

```bash
corepack pnpm run build
```

## Scenes

Use the **Active scene** dropdown beneath the Paint/Lab mark to switch between:

- Material study — the original primitive shader laboratory.
- Tier 1 residence — the burgage cottage integration from
  `medieval-road-system`.
- SeedThree beech — one deterministic American beech (*Fagus grandifolia*)
  generated from the exact SeloSlav/SeedThree fork and preset used by
  `medieval-road-system`, then rendered through the painterly bark, leaf-cutout,
  outline, and stylized-shadow paths.
- CC0 man — the rigged Quaternius villager copied from `medieval-road-system`,
  centered as a standalone material test with all nine authored clothing, skin,
  hair, and eye colors routed through the painterly shader. Its idle clip remains
  active and obeys the lab's Freeze time control.

SeedThree is pinned to commit `4c20609db11f99605018e94cf7833351692d569a`.
The lab preserves its seeded Weber–Penn skeleton and branch mesher. Its LOD0
leaf grammar is baked into one ordinary mesh so the same WebGL painterly
material lifecycle can own all 2,712 leaf instances without mixing Three.js
runtime entries.

## Ported material graph

The visible material stays local to each object; there is no painterly
post-process pass.

- One deterministic RGBA texture owns the complete paint field:
  - **RG** — tangent-space brush normal X/Y, decoded from `[0, 1]` to
    `[-1, 1]` with the tutorial's fixed `Z = 0.95` approximation.
  - **B** — broad grayscale strokes for the two-color diffuse gradient and
    bump-offset/parallax height.
  - **A** — smaller high-contrast strokes for bristle tips and band breakup.
    Edge and shadow masks combine it with the broad B carrier instead of using
    detail noise as a silhouette by itself.
- The reset lighting thresholds reproduce the tutorial's `0 / .25 / 1`
  sun bands (`N·L` cuts at approximately `-.7` and `.3`).
- A broad half-vector mask feeds the tutorial's quantized, colored fake
  reflection plates. The packed field only disturbs their boundaries, so the
  highlight stays contiguous instead of becoming metallic noise.
- Smooth normals are stored in a dedicated geometry attribute. They drive
  curvature detection, silhouette dilation, and stable edge handling without
  losing hard surface normals.
- The solid pass uses a shared triplanar B/A edge field and derivative
  curvature to keep shallow flat faces while dry gaps remove paint from curved
  silhouettes. A low-frequency comb sets the reach and a finer comb frays the
  tips; both remain clamped to a shallow edge band.
- Every featured object has a base-connected, tapered back-face paint rim plus
  two asymmetric contour loops. Their vertices retain the source surface depth
  and dilate only in projected X/Y, so the model remains the shared inner edge
  while width variation and directional jitter change only the outward reach.
  Object-locked brush coverage then breaks the anchored bands into dry arcs.
- The custom depth pass overrides opacity with the same triplanar B/A carrier
  and comb used by the edges, but with an independent phase, scale, cutoff, and
  erosion amount. Squared light-facing response makes the breakup pronounced
  on curved casters while a derivative guard preserves shallow flat faces.
- Curved and rounded objects triplanar-project the macro B/A field to avoid
  sphere pole pinching. Fine tangent-space relief retains the tutorial's UV
  path.
- Three.js ACES tone mapping is the single output transform. No composer,
  bloom, screen-space paint filter, or second tone-map is installed.

## Controls and diagnostics

The panel groups parameters by perceptual role: stroke scale/relief, painted
light, oil response, bristle reach, rim continuity, outline width variation,
and a separate stylized-shadow group. It also
provides:

- High Key, Sunset Noir, Ultraviolet, Earthy, Open Sky, and Verdant
  art-direction presets.
- Detail, Hero, and Wide fixed camera bookmarks (`1`, `2`, `3`).
- Final, packed-normal, broad-stroke, detail-stroke, toon-band, oil-only,
  erosion-only, shadow-mask, color-coded edge-layer, and source-albedo views.
- Deterministic field shuffle/reset, time freeze (`P`), panel toggle (`H`),
  quality tiers, PNG capture, and versioned JSON settings export.
- In the Material study scene, click any painted object to attach a transform
  gizmo. Drag its handles directly, use `W` / `E` / `R` for move / rotate /
  scale, and press `Esc` or click empty space to close it.
- Live FPS, draw-call, and triangle counters.

`Reset` restores seed `73021`, all shader values, object transforms, the Noir
preset, the Hero camera, and freezes motion at `t = 0` for reproducible captures.

## Exporting a material setup

`Export JSON` downloads every slider-backed uniform under `controls`, plus the
active look palettes, scene metadata, Three.js revision, and deterministic
packed-texture recipe. The reusable part is deliberately independent of the
Lab DOM. Rebuild the packed field and apply the numeric controls directly:

```ts
import {
  applyPainterlyControls,
  createPaintGlobalUniforms,
  createPainterlyMaterial,
} from './PainterlyMaterial.ts';
import { createPaintTexture } from './paintTexture.ts';
import exported from './paint-lab-tier-one-residence-noir.json';

const packed = createPaintTexture({
  size: exported.paintTexture.width,
  seed: exported.paintTexture.seed,
  broadStrokeCount: exported.paintTexture.broadStrokeCount,
  detailStrokeCount: exported.paintTexture.detailStrokeCount,
  bristleDensity: exported.paintTexture.bristleDensity,
  normalStrength: exported.paintTexture.normalStrength,
});
const paintGlobals = createPaintGlobalUniforms(packed.texture);
applyPainterlyControls(paintGlobals, exported.controls);

const material = createPainterlyMaterial(paintGlobals, {
  palette: exported.look.palettes[0],
  surfaceColor: '#b98c67',
  surfaceMap: yourObjectAlbedo,
  surfaceMapStrength: 1,
  sourceAlbedoWeight: 1,
});
```

Materials that receive the same `paintGlobals` update together. Create a
separate globals object when one mesh needs its own independently tuned setup.

## Visual contract

The target design frame preserves these observable invariants:

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
- Both anchored loops remain readable as imperfect hand-drawn arcs: each path
  grows outward from the model, visibly swells, tapers, and dry-breaks instead
  of translating away from the silhouette or becoming a uniform wire.
- Cast-shadow footprints retain solid contact cores but break into stable
  object-locked brush marks toward curved caster silhouettes.
- The unfiltered final is already the no-post baseline.
- The material reads at the Detail, Hero, and Wide bookmarks and at mobile
  widths.

## Deliberate engine divergence

The UE tutorial's optional mesh-distance-field AO has no direct equivalent in
core Three.js. This demo keeps native diffuse lighting and shadow maps, while
the visible reflection is owned by a palette-tinted painterly plate rather
than a stacked GGX/clearcoat response. The optional Native sheen control can
blend a small amount of the physical response back in. It does not add
screen-space AO because that would violate the source project's
material-local/no-post constraint. The rest of the material stages are
exposed and independently inspectable.

## License

Released under the [MIT License](LICENSE). SeedThree code and beech texture
assets are also MIT licensed. The Quaternius man is CC0 1.0; see
[Third-party notices](THIRD_PARTY_NOTICES.md).
