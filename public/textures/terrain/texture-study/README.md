# Texture study terrain set

These four 1K terrain families are study copies of the approved runtime maps
from the sibling `medieval-road-system` project:

- `gorski_meadow_grass_v1`
- `gorski_dense_grass_v1`
- `gorski_dry_grass_v1`
- `gorski_forest_litter_secondary_v1`

Each folder keeps the source albedo and OpenGL normal map. `surface.png` packs
roughness into red and ambient occlusion into green; blue is fixed to white.
This reduces roughness/AO from eight texture bindings to four without changing
the source channel values. The per-family `SOURCE.md` records the original
review candidate and processing notes.

The study shader gives every family its own world scale, rotation, and offset.
Broad deterministic coverage islands blend the four PBR identities together;
the painterly packed field is applied after that shared albedo, normal,
roughness, and AO surface has been resolved.
