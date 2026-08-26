# Visual validation record

## Current edge/shadow revision gate

The edge/shadow revision compiles and preserves the deterministic reset,
fixed cameras, no-post path, and packed-field diagnostics. It adds a dedicated
`Shadow mask` view plus live outline-width variation and shadow brush-scale
controls. The automated in-app preview connection was unavailable for this
revision's first pass, so the previous accepted material-study frame remains
the visual baseline and the full fixed-view edge set still requires sign-off.
The connection was restored for the SeedThree integration described below.

Required inspection set: Final, Rim erosion, Shadow mask, and Edge layers at
Detail, Hero, and Wide; seed `73021` plus one shuffled seed; paused object and
camera motion; shadow erosion at `0` and `1`.

## Anchored outline revision gate

The outline vertex path now retains each source vertex's clip-space depth and
dilates only its projected X/Y position. Directional jitter modulates outward
reach instead of translating the complete shell, leaving the rendered model as
the shared inner boundary for the rim and both outline roles.

- Production TypeScript and Vite build passed.
- SeedThree beech Final view passed at Detail and Hero with seed `73021` and
  frozen time; thin branches remained attached and overlapping branch depth
  remained coherent.
- Material-study Edge layers passed a stress case at outline width `0.12` and
  jitter `0.08`: the colored layers expanded outward while the source
  silhouettes remained fixed.
- The current skinned CC0 man rendered the anchored shell without shader,
  skinning, or console errors.
- The SeedThree Wide bookmark still exposes the existing finite sky-dome edge;
  that framing defect is unrelated to the outline projection change.

## SeedThree beech integration gate

- Dependency: `SeloSlav/SeedThree` commit `4c20609db11f99605018e94cf7833351692d569a`.
- Preset: American Beech (*Fagus grandifolia*).
- Seed: `paint-lab:american-beech`.
- Structural output: `421` stems, `390` terminal stems, `2,712` leaves.
- Exact upstream mechanisms retained: SeedThree RNG, Weber–Penn skeleton,
  branch radii/orientations, LOD0 branch mesh, phyllotaxy, droop, taper, trunk
  clearance, and authored beech atlases.
- Render adaptation: deterministic leaf instances are baked into one WebGL
  mesh with SeedThree-equivalent canopy-dome normals. Bark and leaves then use
  the same painterly and custom shadow materials as the rest of Paint/Lab.
- Browser check: scene selected from the top-left dropdown, Hero and Detail
  frames rendered, leaf alpha silhouettes held, and the fresh console remained
  free of warnings and errors.

## CC0 man integration gate

- Asset: `quaternius-villager-man.glb`, Quaternius Animated Men Pack, CC0 1.0.
- Source transfer: copied from `medieval-road-system`; no source-repository files
  were modified.
- Render adaptation: the authored rig and idle clip remain active. Nine source
  material layers retain their clothing, skin, hair, and eye colors as source
  albedo while sharing the lab's painterly controls, rig-aware normals,
  outlines, and custom depth path.
- Defaults: all `33` slider-backed values match the Tier 1 residence scene.
- Fixed views: Detail, Hero, and Wide rendered with the model centered and
  grounded at a target height of `1.72 m`.
- Diagnostics: Source albedo showed the authored material separation; Final
  showed the painterly response without post-processing.
- Temporal check: two paused crop captures were byte-identical; two running
  captures `650 ms` apart differed under the idle animation.
- Runtime: `48` render calls and approximately `12K` submitted triangles in the
  Hero frame on the development host. The fresh console remained free of
  warnings and errors after switching between the burgage and man scenes.

## Manifest

| Item | Fixed value |
| --- | --- |
| Example | `paint-lab-r185` |
| Three.js | `0.185.1` |
| Backend | `WebGLRenderer` / WebGL2 |
| Design viewport | `1440 × 900` CSS pixels |
| Design canvas | `1050 × 900` CSS pixels beside the control panel |
| Quality | High, pixel-budgeted DPR (`1254 × 1075` measured drawing buffer) |
| Seed | numeric `73021`, hash `ED5884FA` |
| Time | `0.0 s`, frozen by Reset |
| Camera | Hero bookmark |
| Tone/output | ACES Filmic once, sRGB output |
| Post passes | none |

## Visual contract

- The hero sphere shows broad color islands, dry-brush breakup, and fine
  bristles at the same time.
- The fake reflection forms large warm, quantized paint regions with ragged
  edges; it cannot collapse into an ordinary smooth GGX highlight.
- With Oil reflection at zero and Native sheen at zero, the material remains
  matte; there is no second hidden specular or clearcoat contribution.
- The primary rim and silhouette remain readable with no bloom or compositor.
- Broad B-channel carrier strokes keep every rim mark attached at the object
  boundary; low-frequency width envelopes and fine comb tips provide the
  dry-brush breakup.
- Erosion remains inside a clamped shallow silhouette band and never reveals
  the far side of a closed volume.
- Two anchored outline loops remain independently readable, with more than 2×
  outward width variation along one path and object-locked gaps rather than
  translated or perfectly concentric curves.
- Camera and object motion do not move the macro field in screen space.
- Sphere macro strokes do not pinch at the UV pole.
- Derivative curvature prevents a shallow flat face from being erased.
- Cast shadows can be independently eroded by the shared triplanar B/A carrier
  with separate phase, scale, cutoff, and erosion controls.
- The sky stays a smooth low-frequency gradient while material-local surfaces
  remain quantized.
- High Key retains cool/teal masses with coral/cream light; Sunset Noir retains
  near-black masses with red/orange light.

## Evidence exercised

- Final/no-post design frame (these are the same path by design).
- Packed normal, diffuse B, detail A, toon-band, oil-only, rim-erosion,
  shadow-mask, color-coded edge-layer, and source-albedo diagnostics.
- Detail, Hero, and Wide camera bookmarks.
- High Key, Sunset Noir, and Ultraviolet preset switching.
- Paused deterministic reset and seed restoration.
- Three deterministic seed states in the edge-layer diagnostic, followed by
  exact restoration to `ED5884FA`.
- Object drift, camera transition, panel controls, panel collapse/reopen, and
  mobile `390 × 844` layout.
- Material-study click selection, transform-mode switching, Escape dismissal,
  and automatic gizmo detachment during scene changes.
- Desktop and mobile canvas sizing after fixing intrinsic panel overflow.
- Clean browser console after the final reload.
- SeedThree beech dropdown activation, Hero framing, Detail framing, alpha-cut
  leaves, painterly branch outlines, and full-crown ground contact.
- Anchored-outline stress testing at outline width `0.12` and jitter `0.08`,
  followed by a clean skinned-mesh regression check.

## Runtime inventory

Measured in the fixed design frame on the development host:

- `42` render calls.
- `229K` submitted triangles.
- `165 FPS` steady browser animation rate at the High quality tier after reset.
- Packed paint map: `512² RGBA8`, repeat-wrapped with mipmaps; approximately
  `1.33 MiB` including the mip chain.
- One `2048²` directional shadow map.
- One PMREM environment generated at startup.
- No full-screen composer, history, bloom, AO, or grading render targets.

The SeedThree beech Hero frame measured `10` render calls and `159K` submitted
triangles on the same development host. These include the painterly branch
shells, baked leaf cards, ground, and the shared shadow path.

The browser integration used for validation did not expose a disjoint timer
query, so no GPU-millisecond claim is made. The FPS value is empirical frame
pacing, not a substitute for GPU timing. Balanced/High/Ultra tiers intentionally
change only the pixel budget; they preserve the shader mechanism.

## Review decision

The previous baseline is accepted. The current edge/shadow revision passes the
build and mechanism gates but remains provisional until the fixed-view set
above confirms that outline bands stay painterly at all three camera scales,
closed volumes do not expose their far hulls, and cast-shadow breakup reads in
the final frame rather than only in the diagnostic.

## Known compromises

- UE5 mesh-distance-field AO is intentionally absent because core Three.js has
  no equivalent and a screen-space substitute would violate the tutorial's
  material-local/no-post constraint.
- The macro B/A field uses seam-safe object triplanar projection on curved and
  rounded hero objects; RG micro-relief remains the tutorial's tangent/UV path.
- Back-face rim and two outline roles use separate Three.js meshes. This keeps
  the graph inspectable but costs three extra draws per outlined object rather
  than reproducing the tutorial's experimental per-instance role branch.
- Vite reports the expected single-bundle size warning because Three.js and its
  renderer ship in the demo entry chunk; production build output is otherwise
  clean.
- SeedThree's LOD0 leaves are static in this material study. Their exact seeded
  placement is retained, but the upstream leaf-only wind node is intentionally
  omitted so Paint/Lab's WebGL material and shadow passes remain the sole
  rendering owners.
