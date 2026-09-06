# Atelier revision — 2026-09-06

## Visual contract

Surface-anchored, overlapping brush deposits must remain visible on geometry,
with warm/cool pigment variation, coherent bristle relief, and quiet background
surfaces around the focal subjects. The new Provence and sunflower paintings
must read without a post-process. All five existing asset studies must still
render; skinned rest-pose anchoring and leaf alpha silhouettes must survive.

## Implementation and verification

- Three.js 0.185.1 / WebGL2, fixed geometry seeds 41923 and 8193, paint seed 73021.
- Added a 512-square linear RGBA pigment map: value, temperature, relief, load.
  Ordered opaque deposits preserve individual strokes. Mipmaps and derivative
  footprint attenuation filter fine relief. Roughness uses the same deposit.
- Two paint maps total approximately 2.67 MiB with mipmaps. No new render target
  or post-process pass was added. Existing shadow and outline allocations remain.
- Reviewed both new paintings, all five existing studies, pigment/relief
  diagnostics, Detail and Hero views, medium buttons, native-shader toggle,
  portrait layout and palette open/close. The villager animation remained active.
- Found and fixed the texture study's 17-sampler overflow: its four full source
  texture sets remain intact, while optional environment reflection is omitted
  for that matte material to fit WebGL2's guaranteed 16 fragment samplers.
- Representative desktop warm frames at 1280 x 720 / High: Provence 39 calls,
  124K submitted triangles, approximately 100–125 FPS; still life 35 calls,
  84K submitted triangles, approximately 150–163 FPS. These are browser frame
  rates on this host, not GPU timings or cross-device performance guarantees.
- `pnpm run test:paint` passes: exact reset bytes, distinct seeded layouts,
  populated independent packed channels, linear sampling and mip filtering.
  128-square seed-73021 fixture SHA256 prefix: e527aee79c4a86e0.
- `pnpm build` passes TypeScript and production bundling. The existing large
  entry-chunk warning remains because the gallery shares its Three.js runtime.

## Intentional limits

Bristle relief is a derivative normal treatment, not silhouette displacement.
The new scenes are static procedural compositions; orbit controls remain live.
Gouache and Soft study are authored treatments of the shared pigment mechanism,
not fluid simulations. [Historic validation](../VALIDATION.md) refers to the earlier shader.

---

