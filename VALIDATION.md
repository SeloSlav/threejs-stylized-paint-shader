# Visual validation sign-off

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
- The primary rim and silhouette remain readable with no bloom or compositor.
- Broad B-channel carrier strokes keep every rim mark attached at the object
  boundary; only the outer tip is dry-brush broken.
- Erosion remains inside a clamped shallow silhouette band and never reveals
  the far side of a closed volume.
- Two offset outline loops remain independently readable, with varying radius,
  width, and continuity rather than perfect concentric curves.
- Camera and object motion do not move the macro field in screen space.
- Sphere macro strokes do not pinch at the UV pole.
- Derivative curvature prevents a shallow flat face from being erased.
- Cast shadows can be independently eroded by the packed A field.
- The sky stays a smooth low-frequency gradient while material-local surfaces
  remain quantized.
- High Key retains cool/teal masses with coral/cream light; Sunset Noir retains
  near-black masses with red/orange light.

## Evidence exercised

- Final/no-post design frame (these are the same path by design).
- Packed normal, diffuse B, detail A, toon-band, oil-only, rim-erosion, and
  color-coded edge-layer diagnostics.
- Detail, Hero, and Wide camera bookmarks.
- High Key, Sunset Noir, and Ultraviolet preset switching.
- Paused deterministic reset and seed restoration.
- Three deterministic seed states in the edge-layer diagnostic, followed by
  exact restoration to `ED5884FA`.
- Object drift, camera transition, panel controls, panel collapse/reopen, and
  mobile `390 × 844` layout.
- Desktop and mobile canvas sizing after fixing intrinsic panel overflow.
- Clean browser console after the final reload.

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

The browser integration used for validation did not expose a disjoint timer
query, so no GPU-millisecond claim is made. The FPS value is empirical frame
pacing, not a substitute for GPU timing. Balanced/High/Ultra tiers intentionally
change only the pixel budget; they preserve the shader mechanism.

## Review decision

Accepted. The final frame remains painterly without post-processing, the
controlling fields are inspectable, rim strokes remain rooted and tapered, no
closed volume reads as transparent, the fixed reset is reproducible, all three
camera scales read, and no shader/runtime errors remain.

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
