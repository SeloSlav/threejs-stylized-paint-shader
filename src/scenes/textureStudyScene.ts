import * as THREE from 'three';
import type { PainterlyMaterial } from '../PainterlyMaterial.ts';
import type { SceneBuildContext } from './sceneRegistry.ts';

type StudyLayerName = 'meadow' | 'dense' | 'dry' | 'forest';

interface StudyTextureLayer {
  albedo: THREE.Texture;
  normal: THREE.Texture;
  surface: THREE.Texture;
}

type StudyTextureSet = Record<StudyLayerName, StudyTextureLayer>;

const TEXTURE_ROOT = '/textures/terrain/texture-study';
const TEXTURE_PATHS: Record<StudyLayerName, string> = {
  meadow: `${TEXTURE_ROOT}/gorski_meadow_grass_v1`,
  dense: `${TEXTURE_ROOT}/gorski_dense_grass_v1`,
  dry: `${TEXTURE_ROOT}/gorski_dry_grass_v1`,
  forest: `${TEXTURE_ROOT}/gorski_forest_litter_secondary_v1`,
};

const STUDY_LAYER_NAMES = Object.keys(TEXTURE_PATHS) as StudyLayerName[];

const TEXTURE_STUDY_FRAGMENT = /* glsl */ `
uniform sampler2D uStudyMeadowAlbedo;
uniform sampler2D uStudyMeadowNormal;
uniform sampler2D uStudyMeadowSurface;
uniform sampler2D uStudyDenseAlbedo;
uniform sampler2D uStudyDenseNormal;
uniform sampler2D uStudyDenseSurface;
uniform sampler2D uStudyDryAlbedo;
uniform sampler2D uStudyDryNormal;
uniform sampler2D uStudyDrySurface;
uniform sampler2D uStudyForestAlbedo;
uniform sampler2D uStudyForestNormal;
uniform sampler2D uStudyForestSurface;

struct TextureStudySample {
  vec3 albedo;
  vec3 normal;
  float roughness;
  float ao;
  vec4 weights;
};

float textureStudyHash( vec2 p ) {
  return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453123 );
}

float textureStudyNoise( vec2 p ) {
  vec2 i = floor( p );
  vec2 f = fract( p );
  vec2 u = f * f * ( 3.0 - 2.0 * f );
  return mix(
    mix( textureStudyHash( i ), textureStudyHash( i + vec2( 1.0, 0.0 ) ), u.x ),
    mix( textureStudyHash( i + vec2( 0.0, 1.0 ) ), textureStudyHash( i + 1.0 ), u.x ),
    u.y
  );
}

float textureStudyFbm( vec2 p ) {
  float value = 0.0;
  float amplitude = 0.5;
  for ( int octave = 0; octave < 4; octave += 1 ) {
    value += textureStudyNoise( p ) * amplitude;
    p = mat2( 1.62, 1.21, -1.21, 1.62 ) * p + 0.37;
    amplitude *= 0.5;
  }
  return value;
}

float textureStudyIsland(
  vec2 worldXZ,
  vec2 center,
  vec2 radius,
  float edgeNoise,
  float inner,
  float outer
) {
  float distanceToCenter = length( ( worldXZ - center ) / radius );
  return 1.0 - smoothstep( inner + edgeNoise, outer + edgeNoise, distanceToCenter );
}

vec4 textureStudyWeights( vec2 worldXZ ) {
  // Fixed seed offsets make captures reproducible. The large overlapping
  // islands expose every source in the authored design camera instead of
  // leaving the material mix to a lucky random frame.
  float boundary = ( textureStudyFbm( worldXZ * 0.16 + vec2( 7.3, 2.1 ) ) - 0.5 ) * 0.28;
  float forest = textureStudyIsland(
    worldXZ, vec2( -5.6, -1.1 ), vec2( 7.6, 5.8 ), boundary, 0.54, 1.08
  );
  float dry = textureStudyIsland(
    worldXZ, vec2( 3.1, 5.0 ), vec2( 7.2, 5.6 ), -boundary * 0.72, 0.46, 1.04
  ) * ( 1.0 - forest * 0.72 );
  float dense = textureStudyIsland(
    worldXZ, vec2( 6.3, -3.6 ), vec2( 7.4, 5.4 ), boundary * 0.56, 0.48, 1.08
  ) * ( 1.0 - forest * 0.78 );
  float meadow = max( 0.16, 1.0 - max( forest, max( dry, dense ) ) );

  float overlap = textureStudyFbm( worldXZ * 0.31 + vec2( 19.7, 11.4 ) );
  meadow *= mix( 0.82, 1.18, overlap );
  dense *= mix( 1.13, 0.87, overlap );
  dry *= mix( 0.9, 1.12, textureStudyNoise( worldXZ * 0.43 + 5.7 ) );
  forest *= mix( 0.88, 1.12, textureStudyNoise( worldXZ * 0.37 + 13.2 ) );

  vec4 weights = max( vec4( meadow, dense, dry, forest ), vec4( 0.0 ) );
  return weights / max( dot( weights, vec4( 1.0 ) ), 0.0001 );
}

vec2 textureStudyUv( vec2 worldXZ, float scale, vec2 rotation, vec2 offset ) {
  vec2 p = worldXZ * scale;
  return vec2(
    rotation.x * p.x - rotation.y * p.y,
    rotation.y * p.x + rotation.x * p.y
  ) + offset;
}

vec3 textureStudyNormal(
  sampler2D normalTexture,
  vec2 sampleUv,
  vec2 rotation,
  float strength
) {
  vec3 decoded = texture2D( normalTexture, sampleUv ).xyz * 2.0 - 1.0;
  decoded.xy = vec2(
    rotation.x * decoded.x + rotation.y * decoded.y,
    -rotation.y * decoded.x + rotation.x * decoded.y
  ) * strength;
  decoded.z = max( decoded.z, 0.16 );
  return normalize( decoded );
}

TextureStudySample sampleTextureStudy( vec2 worldXZ ) {
  const vec2 meadowRotation = vec2( 1.0, 0.0 );
  const vec2 denseRotation = vec2( 0.78, 0.62578 );
  const vec2 dryRotation = vec2( 0.671, -0.74146 );
  const vec2 forestRotation = vec2( 0.91, 0.41461 );

  vec2 meadowUv = textureStudyUv( worldXZ, 0.31, meadowRotation, vec2( 0.17, 0.63 ) );
  vec2 denseUv = textureStudyUv( worldXZ, 0.27, denseRotation, vec2( 0.74, 0.29 ) );
  vec2 dryUv = textureStudyUv( worldXZ, 0.29, dryRotation, vec2( 0.41, 0.86 ) );
  // Leaf forms need a substantially smaller world scale than grass clumps.
  vec2 forestUv = textureStudyUv( worldXZ, 0.82, forestRotation, vec2( 0.23, 0.67 ) );

  vec4 weights = textureStudyWeights( worldXZ );
  vec3 albedo =
    texture2D( uStudyMeadowAlbedo, meadowUv ).rgb * weights.x
    + texture2D( uStudyDenseAlbedo, denseUv ).rgb * weights.y
    + texture2D( uStudyDryAlbedo, dryUv ).rgb * weights.z
    + texture2D( uStudyForestAlbedo, forestUv ).rgb * weights.w;

  vec3 resolvedNormal = normalize(
    textureStudyNormal( uStudyMeadowNormal, meadowUv, meadowRotation, 0.74 ) * weights.x
    + textureStudyNormal( uStudyDenseNormal, denseUv, denseRotation, 0.78 ) * weights.y
    + textureStudyNormal( uStudyDryNormal, dryUv, dryRotation, 0.82 ) * weights.z
    + textureStudyNormal( uStudyForestNormal, forestUv, forestRotation, 0.86 ) * weights.w
  );

  vec2 meadowSurface = texture2D( uStudyMeadowSurface, meadowUv ).rg;
  vec2 denseSurface = texture2D( uStudyDenseSurface, denseUv ).rg;
  vec2 drySurface = texture2D( uStudyDrySurface, dryUv ).rg;
  vec2 forestSurface = texture2D( uStudyForestSurface, forestUv ).rg;
  vec2 surface = meadowSurface * weights.x
    + denseSurface * weights.y
    + drySurface * weights.z
    + forestSurface * weights.w;

  TextureStudySample result;
  result.albedo = albedo;
  result.normal = resolvedNormal;
  result.roughness = clamp( surface.r, 0.48, 1.0 );
  result.ao = mix( 1.0, clamp( surface.g, 0.0, 1.0 ), 0.72 );
  result.weights = weights;
  return result;
}
`;

export async function buildTextureStudyScene(context: SceneBuildContext): Promise<void> {
  const textures = await loadStudyTextures();
  if (!context.isActive()) {
    disposeStudyTextures(textures);
    return;
  }

  const geometry = new THREE.PlaneGeometry(34, 26, 160, 120);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const height = Math.sin(x * 0.31 + 0.45) * 0.14
      + Math.cos(z * 0.37 - 0.2) * 0.1
      + Math.sin((x + z) * 0.19) * 0.07;
    positions.setY(index, height);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.setAttribute('uv1', geometry.getAttribute('uv'));

  const nativeMaterial = createNativeTextureStudyMaterial(textures);
  const ground = context.addPaintedObject({
    label: 'Blended terrain textures',
    geometry,
    position: new THREE.Vector3(0, -1.05, 0),
    paletteIndex: 2,
    shells: false,
    surfaceMap: textures.meadow.albedo,
    surfaceMapStrength: 1,
    sourceAlbedoWeight: 1,
    nativeMaterial,
    roughness: 0.94,
    metalness: 0,
    clearcoat: 0,
    objectTextureScale: 0.18,
  });
  ground.base.name = 'Deterministic four-way painterly texture study';
  ground.base.castShadow = false;
  ground.base.receiveShadow = true;

  const painterlyMaterial = ground.base.material as PainterlyMaterial;
  configurePainterlyTextureStudyMaterial(painterlyMaterial, textures);
  let texturesDisposed = false;
  painterlyMaterial.addEventListener('dispose', () => {
    if (texturesDisposed) return;
    texturesDisposed = true;
    disposeStudyTextures(textures);
  });
}

async function loadStudyTextures(): Promise<StudyTextureSet> {
  const loader = new THREE.TextureLoader();
  const entries = await Promise.all(STUDY_LAYER_NAMES.map(async (name) => {
    const base = TEXTURE_PATHS[name];
    const [albedo, normal, surface] = await Promise.all([
      loader.loadAsync(`${base}/albedo.png`),
      loader.loadAsync(`${base}/normal.png`),
      loader.loadAsync(`${base}/surface.png`),
    ]);
    albedo.colorSpace = THREE.SRGBColorSpace;
    normal.colorSpace = THREE.NoColorSpace;
    surface.colorSpace = THREE.NoColorSpace;
    for (const texture of [albedo, normal, surface]) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = 8;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.name = `Texture study · ${name} · ${texture === albedo ? 'albedo' : texture === normal ? 'normal' : 'roughness/AO'}`;
    }
    return [name, { albedo, normal, surface }] as const;
  }));
  return Object.fromEntries(entries) as StudyTextureSet;
}

function createNativeTextureStudyMaterial(textures: StudyTextureSet): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    name: 'Texture study · native blended PBR',
    color: 0xffffff,
    map: textures.meadow.albedo,
    normalMap: textures.meadow.normal,
    normalScale: new THREE.Vector2(1, 1),
    roughnessMap: textures.meadow.surface,
    roughness: 1,
    aoMap: textures.meadow.surface,
    aoMapIntensity: 1,
    metalness: 0,
  });
  const parentCompile = material.onBeforeCompile.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    parentCompile(shader, renderer);
    bindTextureStudyUniforms(shader.uniforms, textures);
    shader.vertexShader = replaceRequired(
      shader.vertexShader,
      '#include <common>',
      '#include <common>\nvarying vec3 vTextureStudyWorldPosition;',
      'native vertex declarations',
    );
    shader.vertexShader = replaceRequired(
      shader.vertexShader,
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
      vTextureStudyWorldPosition = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;`,
      'native world position',
    );
    shader.fragmentShader = replaceRequired(
      shader.fragmentShader,
      '#include <common>',
      `#include <common>
      varying vec3 vTextureStudyWorldPosition;
      ${TEXTURE_STUDY_FRAGMENT}`,
      'native fragment declarations',
    );
    shader.fragmentShader = replaceRequired(
      shader.fragmentShader,
      '#include <map_fragment>',
      `TextureStudySample textureStudySurface = sampleTextureStudy( vTextureStudyWorldPosition.xz );
      diffuseColor *= vec4( textureStudySurface.albedo, 1.0 );`,
      'native albedo blend',
    );
    shader.fragmentShader = replaceRequired(
      shader.fragmentShader,
      '#include <roughnessmap_fragment>',
      `float roughnessFactor = roughness * textureStudySurface.roughness;`,
      'native roughness blend',
    );
    shader.fragmentShader = replaceRequired(
      shader.fragmentShader,
      '#include <normal_fragment_maps>',
      `vec3 textureStudyMapN = textureStudySurface.normal;
      textureStudyMapN.xy *= normalScale;
      normal = normalize( tbn * textureStudyMapN );`,
      'native normal blend',
    );
    shader.fragmentShader = replaceRequired(
      shader.fragmentShader,
      '#include <aomap_fragment>',
      `float ambientOcclusion = textureStudySurface.ao;
      reflectedLight.indirectDiffuse *= ambientOcclusion;
      #if defined( USE_ENVMAP ) && defined( STANDARD )
        float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
        reflectedLight.indirectSpecular *= computeSpecularOcclusion(
          dotNV, ambientOcclusion, material.roughness
        );
      #endif`,
      'native AO blend',
    );
  };
  material.customProgramCacheKey = () => 'texture-study-native-v1';
  return material;
}

function configurePainterlyTextureStudyMaterial(
  material: PainterlyMaterial,
  textures: StudyTextureSet,
): void {
  const parentCompile = material.onBeforeCompile.bind(material);
  const parentCacheKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    parentCompile(shader, renderer);
    bindTextureStudyUniforms(shader.uniforms, textures);
    shader.fragmentShader = replaceRequired(
      shader.fragmentShader,
      '#include <common>',
      `#include <common>\n${TEXTURE_STUDY_FRAGMENT}`,
      'painterly fragment declarations',
    );
    shader.fragmentShader = replaceRequired(
      shader.fragmentShader,
      'vec4 paintSurfaceSample = texture2D( uSurfaceMap, vMapUv );',
      `TextureStudySample textureStudySurface = sampleTextureStudy( vPaintWorldPosition.xz );
      vec4 paintSurfaceSample = vec4( textureStudySurface.albedo, 1.0 );
      paintSurfaceWeights = textureStudySurface.weights;
      vec3 textureStudyNormalWorld = normalize(
        paintTangent * textureStudySurface.normal.x
        + paintBitangent * textureStudySurface.normal.y
        + paintBaseNormal * textureStudySurface.normal.z
      );
      paintResolvedNormalWorld = normalize(
        paintResolvedNormalWorld + ( textureStudyNormalWorld - paintBaseNormal ) * 0.82
      );`,
      'painterly albedo and normal blend',
    );
    shader.fragmentShader = replaceRequired(
      shader.fragmentShader,
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
      roughnessFactor *= textureStudySurface.roughness;`,
      'painterly roughness blend',
    );
    shader.fragmentShader = replaceRequired(
      shader.fragmentShader,
      '#include <aomap_fragment>',
      `#include <aomap_fragment>
      float textureStudyAmbientOcclusion = textureStudySurface.ao;
      reflectedLight.indirectDiffuse *= textureStudyAmbientOcclusion;
      #if defined( USE_CLEARCOAT )
        clearcoatSpecularIndirect *= textureStudyAmbientOcclusion;
      #endif
      #if defined( USE_SHEEN )
        sheenSpecularIndirect *= textureStudyAmbientOcclusion;
      #endif
      #if defined( USE_ENVMAP ) && defined( STANDARD )
        float textureStudyDotNV = saturate( dot( geometryNormal, geometryViewDir ) );
        reflectedLight.indirectSpecular *= computeSpecularOcclusion(
          textureStudyDotNV,
          textureStudyAmbientOcclusion,
          material.roughness
        );
      #endif`,
      'painterly AO blend',
    );
  };
  material.customProgramCacheKey = () => `${parentCacheKey()}-texture-study-v1`;
  material.needsUpdate = true;
}

function bindTextureStudyUniforms(
  uniforms: Record<string, THREE.IUniform>,
  textures: StudyTextureSet,
): void {
  Object.assign(uniforms, {
    uStudyMeadowAlbedo: { value: textures.meadow.albedo },
    uStudyMeadowNormal: { value: textures.meadow.normal },
    uStudyMeadowSurface: { value: textures.meadow.surface },
    uStudyDenseAlbedo: { value: textures.dense.albedo },
    uStudyDenseNormal: { value: textures.dense.normal },
    uStudyDenseSurface: { value: textures.dense.surface },
    uStudyDryAlbedo: { value: textures.dry.albedo },
    uStudyDryNormal: { value: textures.dry.normal },
    uStudyDrySurface: { value: textures.dry.surface },
    uStudyForestAlbedo: { value: textures.forest.albedo },
    uStudyForestNormal: { value: textures.forest.normal },
    uStudyForestSurface: { value: textures.forest.surface },
  });
}

function replaceRequired(
  source: string,
  search: string,
  replacement: string,
  label: string,
): string {
  if (!source.includes(search)) {
    throw new Error(`Texture study shader hook is missing: ${label}`);
  }
  return source.replace(search, replacement);
}

function disposeStudyTextures(textures: StudyTextureSet): void {
  for (const name of STUDY_LAYER_NAMES) {
    textures[name].albedo.dispose();
    textures[name].normal.dispose();
    textures[name].surface.dispose();
  }
}
