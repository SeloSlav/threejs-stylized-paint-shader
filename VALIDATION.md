# Visual validation record

## Paint-first lighting revision gate

The painterly-light revision is accepted for the material-study target. The
previous Noir palette left almost all visible color in the oil overlay, which
made Oil reflection behave like a metalness switch. The base diffuse palette
now owns coral, magenta, navy, and black pigment masses; the oil path is a
lower-strength optional glaze with isolated warm-white impasto peaks.

- Reference mechanism retained: each broad texture mark owns a randomized RG
  normal tilt, fine relief is layered over it, and the rotated reflection field
  compares the reflected view vector directly against the light direction.
- Fixed inputs: seed `73021` / `ED5884FA`, frozen `0.0 s`, High quality,
  `1440 × 900` viewport, and the named Detail, Hero, and Wide bookmarks.
- Final Hero passed with a broad coral/orange painted-light plane, black shadow
  mass, visible internal pigment breakup, and a small white bristle-loaded peak.
- Oil reflection `0` plus Native sheen `0` passed at Hero and Detail: the
  spheres retained matte coral/magenta/navy brush masses and did not collapse
  to black or reveal a hidden smooth specular contribution.
- `Impasto highlight` diagnostic passed and isolates the deposited B/A carrier
  from the brightest brush-loaded peak. Packed normal, Diffuse strokes, Detail
  strokes, Toon bands, and Oil reflection remain available for field isolation.
- Wide preserved the large color grouping after the close/detail tuning.
- House, Tree, and Man scene switches completed without WebGL, shader, console
  warning, or console error. A fresh material-study tab was also console-clean.
- Production TypeScript and Vite build passed. The only build notice remains
  the previously documented single-bundle size warning.
- Material-study output uses the local material plus authored shell outlines
  and the ordinary output transform; there is no bloom, AO, blur, or grading
  pass manufacturing the white highlight or the color separation.

## Texture study integration gate

- Subject: one `34 × 26` ground surface with shallow deterministic relief and
  no props, vegetation geometry, or presentation effects.
- Source identities: meadow grass, dense grass, dry grass, and secondary
  forest leaf litter from `medieval-road-system`.
- Mechanism: direct albedo and OpenGL-normal sampling plus packed roughness/AO;
  all channels share the same four broad deterministic blend weights. Grass
  projections are decorrelated and the litter projection is intentionally
  finer.
- Fixed seed: shader field offsets `7.3 / 2.1` and `19.7 / 11.4`; no per-frame
  randomness.
- Native baseline: the Painterly shader toggle renders the same four-way PBR
  blend through `MeshStandardMaterial` without the brush response.
- Diagnostics: Source albedo and Texture weights both rendered cleanly.
- Fixed views: Detail, Hero, and Wide rendered under the authored Verdant look;
  the Detail view preserved leaf shapes and grass grain, while Wide preserved
  the broad material islands.
- Runtime: `2` render calls and approximately `41K` submitted triangles in the
  browser validation frame. No WebGL, shader, console warning, or console error
  was reported while switching between final, native, source-albedo, and weight
  views.
- Post/targets: no outline passes are active for this shell-free ground study;
  the ordinary renderer path owns the final image and ACES remains the single
  output transform.
- Known compromise: the 1K source maps are intentionally repeated rather than
  virtual-textured; this study evaluates painterly material response, not
  strategic-world terrain streaming.

## Current edge/shadow revision gate

The edge/shadow revision compiles and preserves the deterministic reset,
fixed cameras, material-local paint path, and packed-field diagnostics. It adds a dedicated
`Shadow mask` view plus live outline-width variation and shadow brush-scale
controls. The automated in-app preview connection was unavailable for this
revision's first pass, so the previous accepted material-study frame remains
the visual baseline and the full fixed-view edge set still requires sign-off.
The connection was restored for the SeedThree integration described below.

Required inspection set: Final, Rim erosion, Shadow mask, and Edge layers at
Detail, Hero, and Wide; seed `73021` plus one shuffled seed; paused object and
camera motion; shadow erosion at `0` and `1`.

## Anchored outline revision gate

The original painterly rim and two outline shells remain the reference path for
the simple material-study forms. Imported, skinned, and highly tessellated
objects instead render unchanged into a silhouette mask. That mask stores the
original object-space triplanar brush load, which is propagated only across a
bounded dilation for the matching rim and two colored loops. No complex-asset
outline vertex is displaced, so mesh tessellation cannot create spikes.

- Production TypeScript and Vite build passed.
- SeedThree beech Final view passed at Detail and Hero with seed `73021` and
  frozen time; thin branches remained attached and overlapping branch depth
  remained coherent.
- Material-study Edge layers passed a stress case at outline width `0.12` and
  jitter `0.08`: the colored layers expanded outward while the source
  silhouettes remained fixed.
- The current skinned CC0 man rendered the anchored painterly mask without
  skinning or shader errors.
- Diffuse-stroke and edge-layer checkpoints across separated walk poses keep
  their brush regions attached to the same limbs and torso areas. Procedural
  sampling uses bind/rest-pose coordinates while lighting uses deformed world
  positions and normals.
- Detail/Hero/Wide comparisons preserve model-relative outline reach, and the
  visible-edge diagnostic confirms occluded edges contribute neither color nor
  alpha through the man, residence, or tree.
- Both width roles now reach a true zero: with rim and outline width at `0`,
  the CC0 man has no residual colored contour. The residence mask uses one
  shared identity for the complete building assembly; its `0.24` maximum
  produces clearly separated primary and secondary loops around the full roof
  and wall silhouette, while the tree's existing `0.005` response is retained.
- Primary and secondary loop color inputs were exercised with contrasting
  magenta/green values on both the residence mask path and the original
  material-study shell path.
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
  showed the painterly response plus the bounded silhouette composite.
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
| Post passes | complex assets: rim + two painterly silhouette loops + output conversion |

## Visual contract

- The hero sphere shows broad color islands, dry-brush breakup, and fine
  bristles at the same time.
- The fake reflection forms large warm, quantized paint regions with ragged
  edges; it cannot collapse into an ordinary smooth GGX highlight.
- With Oil reflection at zero and Native sheen at zero, the material remains
  matte; there is no second hidden specular or clearcoat contribution.
- The primary rim and silhouette remain readable with no bloom; for complex
  assets the compositor is limited to the bounded rim and two outline loops.
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

- Final painterly-material frame with the bounded outline composite.
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
- Three silhouette-mask outline passes on complex assets; no history, bloom,
  AO, or grading targets.

The SeedThree beech Hero frame measured `10` render calls and `159K` submitted
triangles on the same development host before the silhouette-composite
revision. Current counters include the mask passes, baked leaf cards, ground,
and the shared shadow path.

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
  material-local paint constraint.
- The macro B/A field uses seam-safe object triplanar projection on curved and
  rounded hero objects; RG micro-relief remains the tutorial's tangent/UV path.
- Three screen-space mask roles replace back-face outline meshes on complex
  assets. This adds fixed-resolution mask/edge work, but outline shape is
  independent of source triangle size and cannot tear sparse or split meshes
  into spikes. The reference material-study forms retain their original shells.
- Vite reports the expected single-bundle size warning because Three.js and its
  renderer ship in the demo entry chunk; production build output is otherwise
  clean.
- SeedThree's LOD0 leaves are static in this material study. Their exact seeded
  placement is retained, but the upstream leaf-only wind node is intentionally
  omitted so Paint/Lab's WebGL material and shadow passes remain the sole
  rendering owners.
