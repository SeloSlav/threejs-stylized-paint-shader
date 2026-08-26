import * as THREE from 'three';

export const PAINT_DEBUG_MODES = [
  'Final',
  'Packed normal',
  'Diffuse strokes',
  'Detail strokes',
  'Toon bands',
  'Oil reflection',
  'Rim erosion',
  'Shadow mask',
  'Edge layers',
  'Source albedo',
  'Texture weights',
  'Impasto highlight',
] as const;

export type PaintDebugMode = (typeof PAINT_DEBUG_MODES)[number];

type PaintUniform = { value: number | THREE.Texture | THREE.Color | THREE.Vector2 | THREE.Vector3 };

export interface PaintGlobalUniforms {
  paintMap: PaintUniform;
  lightDirection: PaintUniform;
  viewportSize: PaintUniform;
  outlineZoomScale: PaintUniform;
  brushScale: PaintUniform;
  parallaxDepth: PaintUniform;
  normalStrength: PaintUniform;
  strokeContrast: PaintUniform;
  detailStrength: PaintUniform;
  shadowThreshold: PaintUniform;
  lightThreshold: PaintUniform;
  bandSoftness: PaintUniform;
  shadowValue: PaintUniform;
  midtoneValue: PaintUniform;
  oilStrength: PaintUniform;
  oilThreshold: PaintUniform;
  nativeSheen: PaintUniform;
  highlightBrushiness: PaintUniform;
  highlightSteps: PaintUniform;
  roughnessVariation: PaintUniform;
  rimStrength: PaintUniform;
  rimPower: PaintUniform;
  edgeErosion: PaintUniform;
  edgeBristleReach: PaintUniform;
  erosionScale: PaintUniform;
  curvatureGuard: PaintUniform;
  shadowErosion: PaintUniform;
  shadowMaskOffset: PaintUniform;
  shadowBrushScale: PaintUniform;
  debugMode: PaintUniform;
  outerRimWidth: PaintUniform;
  rimContinuity: PaintUniform;
  outlineWidth: PaintUniform;
  outlineJitter: PaintUniform;
  outlineSeparation: PaintUniform;
  outlineBreakup: PaintUniform;
  outlineStrokeWidth: PaintUniform;
  outlineWidthVariation: PaintUniform;
  outlinePrimaryColor: PaintUniform;
  outlineSecondaryColor: PaintUniform;
}

/**
 * Stable, JSON-safe controls that define the shared painterly treatment.
 * Texture, light direction, and debug output are runtime inputs rather than
 * authored slider values, so they are deliberately excluded.
 */
export const PAINTERLY_CONTROL_KEYS = [
  'brushScale',
  'parallaxDepth',
  'normalStrength',
  'strokeContrast',
  'detailStrength',
  'shadowThreshold',
  'lightThreshold',
  'bandSoftness',
  'shadowValue',
  'midtoneValue',
  'oilStrength',
  'oilThreshold',
  'nativeSheen',
  'highlightBrushiness',
  'highlightSteps',
  'roughnessVariation',
  'rimStrength',
  'rimPower',
  'edgeErosion',
  'edgeBristleReach',
  'erosionScale',
  'curvatureGuard',
  'shadowErosion',
  'shadowMaskOffset',
  'shadowBrushScale',
  'outerRimWidth',
  'rimContinuity',
  'outlineWidth',
  'outlineJitter',
  'outlineSeparation',
  'outlineBreakup',
  'outlineStrokeWidth',
  'outlineWidthVariation',
] as const satisfies readonly (keyof PaintGlobalUniforms)[];

export type PainterlyControlKey = (typeof PAINTERLY_CONTROL_KEYS)[number];
export type PainterlyControlValues = Record<PainterlyControlKey, number>;

export function readPainterlyControls(
  globals: PaintGlobalUniforms,
): PainterlyControlValues {
  const controls = {} as PainterlyControlValues;
  for (const key of PAINTERLY_CONTROL_KEYS) {
    const value = globals[key].value;
    if (typeof value !== 'number') {
      throw new Error(`Painterly control ${key} is not numeric.`);
    }
    controls[key] = value;
  }
  return controls;
}

export function applyPainterlyControls(
  globals: PaintGlobalUniforms,
  controls: Partial<PainterlyControlValues>,
): void {
  for (const key of PAINTERLY_CONTROL_KEYS) {
    const value = controls[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      globals[key].value = value;
    }
  }
}

export interface PaintPalette {
  dark: THREE.ColorRepresentation;
  light: THREE.ColorRepresentation;
  reflectionDark: THREE.ColorRepresentation;
  reflectionLight: THREE.ColorRepresentation;
  rim: THREE.ColorRepresentation;
  outline: THREE.ColorRepresentation;
  outlineSecondary: THREE.ColorRepresentation;
}

export interface PainterlyMaterialOptions {
  palette: PaintPalette;
  surfaceColor?: THREE.ColorRepresentation;
  surfaceMap?: THREE.Texture | null;
  texturelessSurface?: boolean;
  surfaceMapStrength?: number;
  surfaceAlphaTest?: number;
  sourceAlbedoWeight?: number;
  triplanarMacro?: boolean;
  objectTextureScale?: number;
  roughness?: number;
  metalness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  envMapIntensity?: number;
  side?: THREE.Side;
}

interface CompiledShader {
  uniforms: Record<string, PaintUniform>;
  vertexShader: string;
  fragmentShader: string;
}

export interface PainterlyMaterial extends THREE.MeshPhysicalMaterial {
  paintPalette: {
    dark: PaintUniform;
    light: PaintUniform;
    reflectionDark: PaintUniform;
    reflectionLight: PaintUniform;
    rim: PaintUniform;
  };
  paintProjectionScale: PaintUniform;
  paintSurface: {
    color: PaintUniform;
    map: PaintUniform;
    mapStrength: PaintUniform;
    alphaTest: PaintUniform;
    sourceAlbedoWeight: PaintUniform;
  };
}

export interface PaintShellOptions {
  kind: 'rim' | 'outline';
  color: THREE.ColorRepresentation;
  widthMultiplier?: number;
  objectWidthMultiplier?: number;
  coverageBias?: number;
  offsetDirection?: THREE.Vector2;
  offsetMultiplier?: number;
  objectTextureScale?: number;
  layer?: 0 | 1 | 2;
}

const edgeFieldFunctions = /* glsl */ `
vec4 samplePaintTriplanar( vec3 coordinate, vec3 normalObject ) {
  vec3 weight = pow( abs( normalize( normalObject ) ), vec3( 5.0 ) );
  weight /= max( weight.x + weight.y + weight.z, 1e-5 );
  vec3 axisSign = sign( normalObject );
  vec2 uvX = coordinate.zy * vec2( axisSign.x, 1.0 );
  vec2 uvY = coordinate.xz * vec2( axisSign.y, 1.0 );
  vec2 uvZ = coordinate.xy * vec2( - axisSign.z, 1.0 );
  return texture2D( uPaintMap, uvX ) * weight.x
    + texture2D( uPaintMap, uvY ) * weight.y
    + texture2D( uPaintMap, uvZ ) * weight.z;
}

vec4 samplePaintEdgeFieldScaled(
  vec3 objectPosition,
  vec3 objectNormal,
  float phase,
  float scaleMultiplier
) {
  vec3 coordinate = objectPosition * uObjectTextureScale * uBrushScale * 0.74 * scaleMultiplier;
  coordinate += vec3( 0.173, 0.397, 0.619 ) * phase;
  vec4 broadSample = samplePaintTriplanar( coordinate, objectNormal );
  vec4 toothSample = samplePaintTriplanar(
    coordinate * 1.83 + vec3( 0.311, 0.127, 0.491 ) * ( phase + 1.0 ),
    objectNormal
  );
  return vec4( broadSample.rg, broadSample.b, toothSample.a );
}

vec4 samplePaintEdgeField( vec3 objectPosition, vec3 objectNormal, float phase ) {
  return samplePaintEdgeFieldScaled( objectPosition, objectNormal, phase, 1.0 );
}

float paintEdgeComb(
  vec3 objectPosition,
  vec3 objectNormal,
  vec4 edgePacked,
  float phase
) {
  vec3 positionScaled = objectPosition * max( uObjectTextureScale, 0.05 );
  vec3 tangentAxis = normalize( vec3( 0.71, 1.93, -1.17 ) + objectNormal * 0.21 );
  float coordinate = dot( positionScaled, tangentAxis );
  float warp = ( edgePacked.r - 0.5 ) * 5.0 + ( edgePacked.g - 0.5 ) * 2.5;
  float coarse = 0.5 + 0.5 * sin( coordinate * 12.0 + warp * 0.58 + phase * 5.17 );
  float fine = 0.5 + 0.5 * sin( coordinate * 89.0 - warp * 0.81 + phase * 17.3 );
  return clamp( pow( coarse, 1.45 ) * 0.74 + pow( fine, 6.0 ) * 0.34, 0.0, 1.0 );
}

float paintEdgeLoad( vec4 edgePacked, float comb ) {
  float carrier = smoothstep( 0.06, 0.42, edgePacked.b + edgePacked.a * 0.22 );
  float tooth = smoothstep( 0.12, 0.68, edgePacked.a + edgePacked.b * 0.28 );
  return clamp( carrier * mix( 0.72, 1.18, tooth ) + comb * 0.16, 0.0, 1.0 );
}

float paintShadowStrokeMask(
  vec4 edgePacked,
  float comb,
  float lightFacing,
  float maskOffset
) {
  float carrier = paintEdgeLoad( edgePacked, comb );
  float depositedPaint = clamp(
    carrier * 0.66 + edgePacked.b * 0.24 + edgePacked.a * 0.12 + comb * 0.18,
    0.0,
    1.0
  );
  depositedPaint *= mix( 0.42, 1.08, lightFacing );
  float cutoff = 0.48 - maskOffset * 0.55;
  return smoothstep( cutoff - 0.13, cutoff + 0.13, depositedPaint );
}
`;

const vertexPrelude = /* glsl */ `
attribute vec3 aSmoothNormal;
varying vec3 vPaintWorldPosition;
varying vec3 vPaintGeometricNormalWorld;
varying vec3 vPaintSmoothNormalWorld;
varying vec3 vPaintObjectPosition;
varying vec3 vPaintObjectNormal;
`;

const fragmentPrelude = /* glsl */ `
uniform sampler2D uPaintMap;
uniform sampler2D uSurfaceMap;
uniform vec3 uPaintDark;
uniform vec3 uPaintLight;
uniform vec3 uSurfaceColor;
uniform float uSurfaceMapStrength;
uniform float uSurfaceAlphaTest;
uniform float uSourceAlbedoWeight;
uniform vec3 uReflectionDark;
uniform vec3 uReflectionLight;
uniform vec3 uRimColor;
uniform vec3 uPaintLightDirection;
uniform float uBrushScale;
uniform float uParallaxDepth;
uniform float uPaintNormalStrength;
uniform float uStrokeContrast;
uniform float uDetailStrength;
uniform float uShadowThreshold;
uniform float uLightThreshold;
uniform float uBandSoftness;
uniform float uShadowValue;
uniform float uMidtoneValue;
uniform float uOilStrength;
uniform float uOilThreshold;
uniform float uNativeSheen;
uniform float uHighlightBrushiness;
uniform float uHighlightSteps;
uniform float uRoughnessVariation;
uniform float uRimStrength;
uniform float uRimPower;
uniform float uEdgeErosion;
uniform float uEdgeBristleReach;
uniform float uErosionScale;
uniform float uCurvatureGuard;
uniform float uShadowMaskOffset;
uniform float uShadowBrushScale;
uniform float uPaintDebugMode;
uniform float uObjectTextureScale;

varying vec3 vPaintWorldPosition;
varying vec3 vPaintGeometricNormalWorld;
varying vec3 vPaintSmoothNormalWorld;
varying vec3 vPaintObjectPosition;
varying vec3 vPaintObjectNormal;

vec4 paintPacked = vec4( 0.5, 0.5, 0.5, 0.5 );
vec3 paintResolvedNormalWorld = vec3( 0.0, 1.0, 0.0 );
float paintToonBand = 1.0;
float paintOilLobe = 0.0;
float paintOilBand = 0.0;
float paintOilCoverage = 0.0;
float paintReflectionDeposit = 0.0;
float paintHighlightImpasto = 0.0;
float paintFresnel = 0.0;
float paintErosionMask = 0.0;
float paintShadowMask = 1.0;
vec3 paintSourceAlbedo = vec3( 1.0 );
vec4 paintSurfaceWeights = vec4( 1.0, 0.0, 0.0, 0.0 );

${edgeFieldFunctions}

vec3 perturbPaintNormalFromHeight(
  vec3 surfaceNormal,
  vec3 worldPosition,
  float heightField,
  float strength
) {
  vec3 positionDx = dFdx( worldPosition );
  vec3 positionDy = dFdy( worldPosition );
  vec3 gradientAxisX = cross( positionDy, surfaceNormal );
  vec3 gradientAxisY = cross( surfaceNormal, positionDx );
  float determinant = dot( positionDx, gradientAxisX );
  vec3 heightGradient = sign( determinant ) * (
    dFdx( heightField ) * gradientAxisX
    + dFdy( heightField ) * gradientAxisY
  );
  return normalize(
    surfaceNormal
    - heightGradient * ( strength / max( abs( determinant ), 1e-6 ) )
  );
}
`;

const paintSampling = /* glsl */ `
vec3 paintBaseNormal = normalize( vPaintGeometricNormalWorld );
vec3 paintSmoothNormal = normalize( vPaintSmoothNormalWorld );
vec3 paintViewDirection = normalize( cameraPosition - vPaintWorldPosition );

vec3 paintObjectCoordinate = vPaintObjectPosition * uObjectTextureScale * uBrushScale;
vec2 paintUv = vMapUv * uBrushScale;
vec2 paintParallaxUv = paintUv;
vec3 paintTangent = vec3( 1.0, 0.0, 0.0 );
vec3 paintBitangent = vec3( 0.0, 1.0, 0.0 );

#ifdef PAINT_TEXTURELESS_SURFACE
  vec3 paintReferenceAxis = abs( paintBaseNormal.y ) < 0.94
    ? vec3( 0.0, 1.0, 0.0 )
    : vec3( 1.0, 0.0, 0.0 );
  paintTangent = normalize( cross( paintReferenceAxis, paintBaseNormal ) );
  paintBitangent = normalize( cross( paintBaseNormal, paintTangent ) );
  paintPacked = samplePaintTriplanar(
    paintObjectCoordinate,
    normalize( vPaintObjectNormal )
  );
  float paintProceduralHeight = paintPacked.b * 0.85 + paintPacked.a * 0.15;
  paintResolvedNormalWorld = perturbPaintNormalFromHeight(
    paintBaseNormal,
    vPaintWorldPosition,
    paintProceduralHeight,
    uPaintNormalStrength * 0.0055
  );
#else
  vec3 paintDp1 = dFdx( vPaintWorldPosition );
  vec3 paintDp2 = dFdy( vPaintWorldPosition );
  vec2 paintDuv1 = dFdx( paintUv );
  vec2 paintDuv2 = dFdy( paintUv );
  paintTangent = paintDp1 * paintDuv2.y - paintDp2 * paintDuv1.y;
  paintBitangent = - paintDp1 * paintDuv2.x + paintDp2 * paintDuv1.x;
  float paintTangentValid = step(
    1e-8,
    dot( paintTangent, paintTangent ) * dot( paintBitangent, paintBitangent )
  );
  paintTangent = normalize( mix(
    vec3( 1.0, 0.0, 0.0 ),
    paintTangent,
    paintTangentValid
  ) );
  paintBitangent = normalize( mix(
    vec3( 0.0, 1.0, 0.0 ),
    paintBitangent,
    paintTangentValid
  ) );

  vec4 paintInitial = texture2D( uPaintMap, paintUv );
  float paintFacing = max( abs( dot( paintBaseNormal, paintViewDirection ) ), 0.18 );
  vec2 paintViewUv = vec2(
    dot( paintViewDirection, paintTangent ),
    dot( paintViewDirection, paintBitangent )
  ) / paintFacing;
  paintParallaxUv = paintUv
    - paintViewUv * ( paintInitial.b - 0.5 ) * uParallaxDepth;
  paintPacked = texture2D( uPaintMap, paintParallaxUv );

  #ifdef PAINT_TRIPLANAR_MACRO
    vec4 paintTriplanarPacked = samplePaintTriplanar(
      paintObjectCoordinate,
      vPaintObjectNormal
    );
    paintPacked.ba = paintTriplanarPacked.ba;
  #endif

  vec2 paintNormalXY = ( paintPacked.rg * 2.0 - 1.0 ) * uPaintNormalStrength;
  vec3 paintTangentNormal = normalize( vec3( paintNormalXY, 0.95 ) );
  vec3 paintMappedNormal = normalize(
    paintTangent * paintTangentNormal.x
    + paintBitangent * paintTangentNormal.y
    + paintBaseNormal * paintTangentNormal.z
  );
  paintResolvedNormalWorld = normalize( mix(
    paintBaseNormal,
    paintMappedNormal,
    uPaintNormalStrength
  ) );
#endif

float paintStroke = smoothstep(
  0.16 + ( 1.0 - uStrokeContrast ) * 0.22,
  0.84 - ( 1.0 - uStrokeContrast ) * 0.22,
  paintPacked.b
);
vec4 paintSurfaceSample = texture2D( uSurfaceMap, vMapUv );
if ( uSurfaceAlphaTest > 0.0 && paintSurfaceSample.a < uSurfaceAlphaTest ) discard;
vec3 paintSurfaceTexel = paintSurfaceSample.rgb;
paintSourceAlbedo = uSurfaceColor * mix(
  vec3( 1.0 ),
  paintSurfaceTexel,
  saturate( uSurfaceMapStrength )
);
vec3 paintPaletteAlbedo = mix( uPaintDark, uPaintLight, paintStroke );
vec3 paintSourceStrokes = paintSourceAlbedo * mix( 0.58, 1.18, paintStroke );
#ifdef PAINT_TEXTURELESS_SURFACE
  paintSourceStrokes = paintSourceAlbedo * mix( 0.76, 1.14, paintStroke );
  float paintPigmentGranulation = ( paintPacked.a - 0.5 ) * 0.10
    + ( paintPacked.b - 0.5 ) * 0.06;
  float paintPigmentDeposit = smoothstep(
    0.18,
    0.82,
    paintPacked.b * 0.72 + paintPacked.a * 0.28
  );
  paintSourceStrokes *= 1.0 + paintPigmentGranulation;
  paintSourceStrokes = mix(
    paintSourceStrokes,
    paintPaletteAlbedo,
    0.08 + paintPigmentDeposit * 0.12
  );
#endif
vec3 paintAlbedo = mix(
  paintPaletteAlbedo,
  paintSourceStrokes,
  saturate( uSourceAlbedoWeight )
);

vec3 paintBandNormal = paintResolvedNormalWorld;
#ifdef PAINT_TEXTURELESS_SURFACE
  paintBandNormal = normalize( mix(
    paintBaseNormal,
    paintResolvedNormalWorld,
    0.14
  ) );
#endif
float paintNdotL = dot( paintBandNormal, normalize( uPaintLightDirection ) );
float paintBandNoiseScale = 0.24;
#ifdef PAINT_TEXTURELESS_SURFACE
  paintBandNoiseScale = 0.015;
#endif
float paintBandNoise = ( paintPacked.a - 0.5 )
  * uDetailStrength
  * paintBandNoiseScale;
float paintMidBand = smoothstep(
  uShadowThreshold - uBandSoftness,
  uShadowThreshold + uBandSoftness,
  paintNdotL + paintBandNoise
);
float paintLightBand = smoothstep(
  uLightThreshold - uBandSoftness,
  uLightThreshold + uBandSoftness,
  paintNdotL + paintBandNoise
);
paintToonBand = mix( uShadowValue, uMidtoneValue, paintMidBand );
paintToonBand = mix( paintToonBand, 1.0, paintLightBand );
diffuseColor.rgb = paintAlbedo * paintToonBand;

float paintReflectionOffset = 0.055;
vec4 paintReflectionPacked;
float paintReflectionBroadX;
float paintReflectionBroadY;
vec3 paintReflectionTangent = paintTangent;
vec3 paintReflectionBitangent = paintBitangent;
#ifdef PAINT_TEXTURELESS_SURFACE
  vec3 paintReflectionCoordinate = paintObjectCoordinate.yzx
    + vec3( 0.317, 0.113, 0.491 );
  vec3 paintReflectionNormalObject = normalize( vPaintObjectNormal.yzx );
  paintReflectionPacked = samplePaintTriplanar(
    paintReflectionCoordinate,
    paintReflectionNormalObject
  );
  paintReflectionBroadX = samplePaintTriplanar(
    paintReflectionCoordinate + vec3( paintReflectionOffset, 0.0, 0.0 ),
    paintReflectionNormalObject
  ).b;
  paintReflectionBroadY = samplePaintTriplanar(
    paintReflectionCoordinate + vec3( 0.0, paintReflectionOffset, 0.0 ),
    paintReflectionNormalObject
  ).b;
#else
  vec2 paintReflectionUv = paintParallaxUv.yx;
  paintReflectionTangent = paintBitangent;
  paintReflectionBitangent = paintTangent;
  paintReflectionPacked = texture2D( uPaintMap, paintReflectionUv );
  paintReflectionBroadX = texture2D(
    uPaintMap,
    paintReflectionUv + vec2( paintReflectionOffset, 0.0 )
  ).b;
  paintReflectionBroadY = texture2D(
    uPaintMap,
    paintReflectionUv + vec2( 0.0, paintReflectionOffset )
  ).b;
#endif
vec2 paintReflectionSlope = vec2(
  paintReflectionBroadX - paintReflectionPacked.b,
  paintReflectionBroadY - paintReflectionPacked.b
) * uHighlightBrushiness * 0.12;
vec2 paintReflectionNormalXY = ( paintReflectionPacked.rg * 2.0 - 1.0 )
  * uPaintNormalStrength
  * mix( 0.22, 0.46, saturate( uHighlightBrushiness ) );
vec3 paintReflectionNormal = normalize(
  paintReflectionTangent * ( paintReflectionNormalXY.x + paintReflectionSlope.x ) +
  paintReflectionBitangent * ( paintReflectionNormalXY.y + paintReflectionSlope.y ) +
  paintSmoothNormal * 0.95
);
vec3 paintReflectionLight = normalize( uPaintLightDirection );
vec3 paintReflectedView = reflect( - paintViewDirection, paintReflectionNormal );
// The source compares the light against the reflection vector directly. A
// stylized expansion keeps that physically motivated center while turning the
// response into a broad painted plane rather than a pin-sized glossy glint.
float paintReflectionDot = pow(
  saturate( dot( paintReflectedView, paintReflectionLight ) ),
  0.58
);
float paintReflectionNdotL = dot( paintReflectionNormal, paintReflectionLight );
float paintReflectionCarrier = smoothstep(
  0.06,
  0.62,
  paintReflectionPacked.b + paintReflectionPacked.a * 0.2
);
paintReflectionDeposit = smoothstep(
  0.10,
  0.78,
  paintReflectionPacked.b * 0.72 + paintReflectionPacked.a * 0.38
);
float paintReflectionBristles = smoothstep(
  0.18,
  0.74,
  paintReflectionPacked.a + paintReflectionPacked.b * 0.24
);
float paintReflectionTilt = dot(
  paintReflectionNormalXY,
  normalize( vec2( 0.73, -0.41 ) )
);
float paintReflectionSignal = saturate(
  paintReflectionDot
  + ( paintReflectionDeposit - 0.5 ) * uHighlightBrushiness * 0.16
  + ( paintReflectionPacked.a - 0.5 ) * uHighlightBrushiness * 0.025
  + paintReflectionTilt * uHighlightBrushiness * 0.020
);
float paintReflectionRange = max( 1.0 - uOilThreshold, 0.001 );
float paintReflectionNormalized = saturate(
  ( paintReflectionSignal - uOilThreshold ) / paintReflectionRange
);
paintReflectionNormalized = pow( paintReflectionNormalized, 0.82 );
float paintReflectionSteps = max( floor( uHighlightSteps + 0.5 ), 1.0 );
float paintReflectionAA = max( fwidth( paintReflectionSignal ) * 1.25, 0.008 );
paintOilLobe = smoothstep(
  uOilThreshold - paintReflectionAA,
  uOilThreshold + paintReflectionAA,
  paintReflectionSignal
);
paintOilBand = clamp(
  floor( paintReflectionNormalized * ( paintReflectionSteps - 1.0 ) + 0.5 )
  / max( paintReflectionSteps - 1.0, 1.0 ),
  0.0,
  1.0
);
float paintReflectionBoundary = 1.0 - smoothstep(
  0.0,
  0.22,
  paintReflectionNormalized
);
float paintReflectionDryEdge = mix( 0.38, 1.12, paintReflectionDeposit )
  * mix( 0.85, 1.08, paintReflectionBristles );
paintOilCoverage = saturate(
  paintOilLobe
  * mix( paintReflectionDryEdge, paintReflectionCarrier, paintReflectionBoundary * 0.22 )
  * smoothstep( -0.08, 0.16, paintReflectionNdotL )
);
paintHighlightImpasto = saturate(
  paintOilLobe
  * smoothstep( 0.88, 0.995, paintReflectionNormalized )
  * smoothstep(
    0.50,
    0.92,
    paintReflectionPacked.b * 0.58 + paintReflectionPacked.a * 0.55
  )
  * mix( 0.70, 1.22, paintReflectionBristles )
);

paintFresnel = pow( 1.0 - saturate( abs( dot( paintSmoothNormal, paintViewDirection ) ) ), uRimPower );
float paintCurvature = length( fwidth( paintSmoothNormal ) ) * uCurvatureGuard;
float paintCurvedSurface = smoothstep( 0.006, 0.055, paintCurvature );
vec4 paintEdgePacked = samplePaintEdgeField(
  vPaintObjectPosition,
  vPaintObjectNormal,
  0.0
);
float paintComb = paintEdgeComb(
  vPaintObjectPosition,
  vPaintObjectNormal,
  paintEdgePacked,
  0.0
);
float paintLoad = paintEdgeLoad( paintEdgePacked, paintComb );
float paintCombTip = smoothstep( 0.26, 0.72, paintComb );
float paintEdgeDistance = abs( dot( paintSmoothNormal, paintViewDirection ) );
float paintBaseReach = mix( 0.018, 0.30, saturate( uEdgeBristleReach ) );
float paintTexturedReach = paintBaseReach * mix( 0.42, 1.38, paintCombTip );
paintTexturedReach *= mix( 0.82, 1.18, paintLoad * uErosionScale );
paintTexturedReach = min( paintTexturedReach, 0.36 );
float paintEdgeAA = max( fwidth( paintEdgeDistance ) * 1.5, 0.006 );
float paintSilhouetteZone = (
  1.0 - smoothstep(
    paintTexturedReach - paintEdgeAA,
    paintTexturedReach + paintEdgeAA,
    paintEdgeDistance
  )
);
float paintDryGap = 1.0 - smoothstep( 0.18, 0.74, paintLoad + paintCombTip * 0.16 );
paintDryGap = clamp( paintDryGap + ( 1.0 - paintCombTip ) * uErosionScale * 0.28, 0.0, 1.0 );
paintErosionMask = paintSilhouetteZone
  * paintDryGap
  * paintCurvedSurface
  * saturate( uEdgeErosion );

vec4 paintShadowPacked = samplePaintEdgeFieldScaled(
  vPaintObjectPosition,
  vPaintObjectNormal,
  3.71,
  uShadowBrushScale
);
float paintShadowComb = paintEdgeComb(
  vPaintObjectPosition,
  vPaintObjectNormal,
  paintShadowPacked,
  3.71
);
float paintShadowFacing = pow(
  abs( dot( paintSmoothNormal, normalize( uPaintLightDirection ) ) ),
  2.0
);
float paintShadowCurvature = length( fwidth( paintSmoothNormal ) );
float paintShadowFlatPreserve = 1.0 - smoothstep( 0.00002, 0.0004, paintShadowCurvature );
paintShadowMask = max(
  paintShadowFlatPreserve,
  paintShadowStrokeMask(
    paintShadowPacked,
    paintShadowComb,
    paintShadowFacing,
    uShadowMaskOffset
  )
);

if ( uPaintDebugMode < 0.5 && paintErosionMask > 0.5 ) discard;
`;

const paintOutput = /* glsl */ `
vec3 paintNativeLighting = outgoingLight;
// The custom 0/mid/1 paint ramp already owns the light response. Feeding that
// result through Lambert a second time crushed the underpaint toward black and
// made the optional oil layer look like the only source of color. Preserve a
// bounded hint of Three's receiver lighting for contact/shadow integration,
// but keep the authored pigment ramp as the actual matte output.
float paintBaseLuminance = dot(
  diffuseColor.rgb,
  vec3( 0.2126, 0.7152, 0.0722 )
);
float paintPhysicalLuminance = dot(
  totalDiffuse,
  vec3( 0.2126, 0.7152, 0.0722 )
);
float paintReceiverLight = clamp(
  paintPhysicalLuminance / max( paintBaseLuminance, 0.025 ),
  0.0,
  1.6
);
float paintReceiverModulation = mix(
  0.66,
  1.08,
  smoothstep( 0.10, 1.05, paintReceiverLight )
);
vec3 paintMatteLighting = diffuseColor.rgb * paintReceiverModulation
  + totalEmissiveRadiance;
outgoingLight = mix( paintMatteLighting, paintNativeLighting, saturate( uNativeSheen ) );

float paintOilStrokeTone = saturate(
  paintOilBand
  + ( paintReflectionDeposit - 0.5 ) * 0.42
  + ( paintReflectionPacked.a - 0.5 ) * 0.08
);
vec3 paintOilColor = mix( uReflectionDark, uReflectionLight, paintOilStrokeTone );
vec3 paintImpastoWhite = mix(
  uReflectionLight,
  vec3( 1.85, 1.58, 1.28 ),
  0.78
);
vec3 paintOilTarget = mix(
  diffuseColor.rgb,
  paintOilColor,
  0.84 + paintOilStrokeTone * 0.14
) * mix( 0.76, 1.24, paintOilStrokeTone );
paintOilTarget = mix( paintOilTarget, paintImpastoWhite, paintHighlightImpasto );
float paintOilOpacity = min(
  saturate(
    paintOilCoverage * uOilStrength * mix( 1.0, 1.36, paintOilStrokeTone )
    + paintHighlightImpasto * uOilStrength * 0.46
  ),
  0.97
);
outgoingLight = mix( outgoingLight, paintOilTarget, paintOilOpacity );
outgoingLight += paintImpastoWhite * paintHighlightImpasto * uOilStrength * 0.06;

float paintRimMask = paintFresnel * mix( 0.35, 1.0, paintPacked.a );
outgoingLight += uRimColor * paintRimMask * uRimStrength;

if ( uPaintDebugMode > 0.5 && uPaintDebugMode < 1.5 ) {
  outgoingLight = vec3( paintPacked.rg, 1.0 );
} else if ( uPaintDebugMode < 2.5 && uPaintDebugMode > 1.5 ) {
  outgoingLight = vec3( paintPacked.b );
} else if ( uPaintDebugMode < 3.5 && uPaintDebugMode > 2.5 ) {
  outgoingLight = vec3( paintPacked.a );
} else if ( uPaintDebugMode < 4.5 && uPaintDebugMode > 3.5 ) {
  outgoingLight = vec3( paintToonBand );
} else if ( uPaintDebugMode < 5.5 && uPaintDebugMode > 4.5 ) {
  outgoingLight = paintOilTarget * paintOilCoverage;
} else if ( uPaintDebugMode > 5.5 && uPaintDebugMode < 6.5 ) {
  outgoingLight = vec3( paintErosionMask );
} else if ( uPaintDebugMode > 6.5 && uPaintDebugMode < 7.5 ) {
  outgoingLight = vec3( paintShadowMask );
} else if ( uPaintDebugMode > 7.5 && uPaintDebugMode < 8.5 ) {
  outgoingLight = mix( vec3( 0.035, 0.045, 0.06 ), vec3( 1.0, 0.14, 0.025 ), paintErosionMask );
} else if ( uPaintDebugMode > 8.5 && uPaintDebugMode < 9.5 ) {
  outgoingLight = paintSourceAlbedo;
} else if ( uPaintDebugMode > 9.5 && uPaintDebugMode < 10.5 ) {
  outgoingLight = paintSurfaceWeights.x * vec3( 0.52, 0.9, 0.36 )
    + paintSurfaceWeights.y * vec3( 0.03, 0.28, 0.12 )
    + paintSurfaceWeights.z * vec3( 0.94, 0.63, 0.19 )
    + paintSurfaceWeights.w * vec3( 0.46, 0.16, 0.06 );
} else if ( uPaintDebugMode > 10.5 ) {
  outgoingLight = mix(
    vec3( paintReflectionDeposit * 0.16 ),
    vec3( 1.0, 0.93, 0.78 ),
    paintHighlightImpasto
  );
}
`;

export function createPaintGlobalUniforms(texture: THREE.Texture): PaintGlobalUniforms {
  return {
    paintMap: { value: texture },
    lightDirection: { value: new THREE.Vector3(-0.45, 0.82, 0.34).normalize() },
    viewportSize: { value: new THREE.Vector2(1, 1) },
    outlineZoomScale: { value: 1 },
    brushScale: { value: 0.7 },
    parallaxDepth: { value: 0.048 },
    normalStrength: { value: 0.9 },
    strokeContrast: { value: 0.9 },
    detailStrength: { value: 0.72 },
    shadowThreshold: { value: -0.8 },
    lightThreshold: { value: 0.12 },
    bandSoftness: { value: 0.02 },
    shadowValue: { value: 0.12 },
    midtoneValue: { value: 0.6 },
    oilStrength: { value: 0.48 },
    oilThreshold: { value: 0.34 },
    nativeSheen: { value: 0 },
    highlightBrushiness: { value: 1.08 },
    highlightSteps: { value: 4 },
    roughnessVariation: { value: 0.36 },
    rimStrength: { value: 0.9 },
    rimPower: { value: 5 },
    edgeErosion: { value: 0.82 },
    edgeBristleReach: { value: 0.76 },
    erosionScale: { value: 0.66 },
    curvatureGuard: { value: 8.0 },
    shadowErosion: { value: 1 },
    shadowMaskOffset: { value: -0.05 },
    shadowBrushScale: { value: 0.72 },
    debugMode: { value: 0 },
    outerRimWidth: { value: 0.002 },
    rimContinuity: { value: 0.84 },
    outlineWidth: { value: 0.028 },
    outlineJitter: { value: 0.036 },
    outlineSeparation: { value: 1.55 },
    outlineBreakup: { value: 0.62 },
    outlineStrokeWidth: { value: 2.15 },
    outlineWidthVariation: { value: 0.82 },
    outlinePrimaryColor: { value: new THREE.Color('#86b9db') },
    outlineSecondaryColor: { value: new THREE.Color('#ffe2b7') },
  };
}

function bindUniforms(
  shaderUniforms: Record<string, PaintUniform>,
  globals: PaintGlobalUniforms,
  palette: PainterlyMaterial['paintPalette'],
  projectionScale: PaintUniform,
  surface: PainterlyMaterial['paintSurface'],
): void {
  shaderUniforms.uPaintMap = globals.paintMap;
  shaderUniforms.uSurfaceMap = surface.map;
  shaderUniforms.uPaintLightDirection = globals.lightDirection;
  shaderUniforms.uBrushScale = globals.brushScale;
  shaderUniforms.uParallaxDepth = globals.parallaxDepth;
  shaderUniforms.uPaintNormalStrength = globals.normalStrength;
  shaderUniforms.uStrokeContrast = globals.strokeContrast;
  shaderUniforms.uDetailStrength = globals.detailStrength;
  shaderUniforms.uShadowThreshold = globals.shadowThreshold;
  shaderUniforms.uLightThreshold = globals.lightThreshold;
  shaderUniforms.uBandSoftness = globals.bandSoftness;
  shaderUniforms.uShadowValue = globals.shadowValue;
  shaderUniforms.uMidtoneValue = globals.midtoneValue;
  shaderUniforms.uOilStrength = globals.oilStrength;
  shaderUniforms.uOilThreshold = globals.oilThreshold;
  shaderUniforms.uNativeSheen = globals.nativeSheen;
  shaderUniforms.uHighlightBrushiness = globals.highlightBrushiness;
  shaderUniforms.uHighlightSteps = globals.highlightSteps;
  shaderUniforms.uRoughnessVariation = globals.roughnessVariation;
  shaderUniforms.uRimStrength = globals.rimStrength;
  shaderUniforms.uRimPower = globals.rimPower;
  shaderUniforms.uEdgeErosion = globals.edgeErosion;
  shaderUniforms.uEdgeBristleReach = globals.edgeBristleReach;
  shaderUniforms.uErosionScale = globals.erosionScale;
  shaderUniforms.uCurvatureGuard = globals.curvatureGuard;
  shaderUniforms.uShadowMaskOffset = globals.shadowMaskOffset;
  shaderUniforms.uShadowBrushScale = globals.shadowBrushScale;
  shaderUniforms.uPaintDebugMode = globals.debugMode;
  shaderUniforms.uObjectTextureScale = projectionScale;
  shaderUniforms.uPaintDark = palette.dark;
  shaderUniforms.uPaintLight = palette.light;
  shaderUniforms.uSurfaceColor = surface.color;
  shaderUniforms.uSurfaceMapStrength = surface.mapStrength;
  shaderUniforms.uSurfaceAlphaTest = surface.alphaTest;
  shaderUniforms.uSourceAlbedoWeight = surface.sourceAlbedoWeight;
  shaderUniforms.uReflectionDark = palette.reflectionDark;
  shaderUniforms.uReflectionLight = palette.reflectionLight;
  shaderUniforms.uRimColor = palette.rim;
}

export function createPainterlyMaterial(
  globals: PaintGlobalUniforms,
  options: PainterlyMaterialOptions,
): PainterlyMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: globals.paintMap.value as THREE.Texture,
    roughness: Math.max(options.roughness ?? 0.47, 0.82),
    metalness: 0,
    clearcoat: 0,
    clearcoatRoughness: 1,
    envMapIntensity: Math.min(options.envMapIntensity ?? 0.7, 0.18),
    side: options.side ?? THREE.FrontSide,
  }) as PainterlyMaterial;

  material.paintPalette = {
    dark: { value: new THREE.Color(options.palette.dark) },
    light: { value: new THREE.Color(options.palette.light) },
    reflectionDark: { value: new THREE.Color(options.palette.reflectionDark) },
    reflectionLight: { value: new THREE.Color(options.palette.reflectionLight) },
    rim: { value: new THREE.Color(options.palette.rim) },
  };
  material.paintProjectionScale = { value: options.objectTextureScale ?? 0.26 };
  material.paintSurface = {
    color: { value: new THREE.Color(options.surfaceColor ?? 0xffffff) },
    map: { value: options.surfaceMap ?? globals.paintMap.value },
    mapStrength: { value: options.surfaceMap ? options.surfaceMapStrength ?? 1 : 0 },
    alphaTest: { value: options.surfaceAlphaTest ?? 0 },
    sourceAlbedoWeight: { value: options.sourceAlbedoWeight ?? 0 },
  };
  if (options.triplanarMacro || options.texturelessSurface) {
    material.defines = {
      ...material.defines,
      ...(options.triplanarMacro ? { PAINT_TRIPLANAR_MACRO: 1 } : {}),
      ...(options.texturelessSurface ? { PAINT_TEXTURELESS_SURFACE: 1 } : {}),
    };
  }

  material.onBeforeCompile = (shader: CompiledShader) => {
    bindUniforms(
      shader.uniforms,
      globals,
      material.paintPalette,
      material.paintProjectionScale,
      material.paintSurface,
    );

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${vertexPrelude}`)
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vPaintWorldPosition = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
        // Procedural paint uses undeformed object coordinates as permanent
        // surface anchors. The interpolated field then bends with skinning or
        // morphing instead of the animated mesh moving through a rigid 3D
        // projection volume.
        vPaintObjectPosition = position;
        vPaintObjectNormal = normalize( normal );
        #ifdef USE_SKINNING
          vPaintGeometricNormalWorld = normalize(
            inverseTransformDirection( transformedNormal, viewMatrix )
          );
          vPaintSmoothNormalWorld = vPaintGeometricNormalWorld;
        #else
          vPaintGeometricNormalWorld = normalize( mat3( modelMatrix ) * normal );
          vPaintSmoothNormalWorld = normalize( mat3( modelMatrix ) * aSmoothNormal );
        #endif`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${fragmentPrelude}`)
      .replace('#include <map_fragment>', paintSampling)
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(
          roughnessFactor + ( paintPacked.a - 0.5 ) * uRoughnessVariation,
          0.08,
          0.98
        );
        #ifdef PAINT_TEXTURELESS_SURFACE
          roughnessFactor = clamp(
            roughnessFactor + ( 0.5 - paintStroke ) * 0.12,
            0.16,
            0.98
          );
        #endif`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `normal = normalize( mat3( viewMatrix ) * paintResolvedNormalWorld );
        nonPerturbedNormal = normal;`,
      )
      .replace('#include <opaque_fragment>', `${paintOutput}\n#include <opaque_fragment>`);
  };

  material.customProgramCacheKey = () => [
    'painterly-physical-v9-surface-anchor',
    options.triplanarMacro ? 'macro' : 'uv',
    options.texturelessSurface ? 'textureless' : 'textured',
  ].join('-');
  return material;
}

const shellVertexShader = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
attribute vec3 aSmoothNormal;
uniform sampler2D uPaintMap;
uniform float uShellWidth;
uniform float uWidthMultiplier;
uniform float uObjectWidthMultiplier;
uniform float uOffsetScale;
uniform float uOffsetMultiplier;
uniform vec2 uOffsetDirection;
uniform float uBrushScale;
uniform float uObjectTextureScale;
uniform float uShellLayer;
uniform float uShellPhase;
uniform float uEdgeBristleReach;
uniform float uOutlineBreakup;
uniform float uOutlineWidthVariation;
uniform vec2 uViewportSize;
uniform float uOutlineZoomScale;
varying vec2 vShellUv;
varying vec3 vShellObjectPosition;
varying vec3 vShellObjectNormal;
varying vec3 vShellViewPosition;
varying vec3 vShellViewNormal;
varying float vShellWidthField;
varying float vShellBrushLoad;

${edgeFieldFunctions}

void main() {
  // Keep a bind/rest-pose coordinate frame for the brush field while the
  // actual shell position and normal continue through the deformation path.
  vec3 paintShellAnchorPosition = position;
  vec3 paintShellAnchorNormal = aSmoothNormal;
  vec3 paintShellPosition = position;
  vec3 paintShellNormal = aSmoothNormal;
  #ifdef USE_SKINNING
    #include <skinbase_vertex>
    vec3 objectNormal = paintShellNormal;
    #include <skinnormal_vertex>
    vec3 transformed = paintShellPosition;
    #include <skinning_vertex>
    paintShellPosition = transformed;
    paintShellNormal = objectNormal;
  #endif

  vShellUv = uv;
  vShellObjectPosition = paintShellAnchorPosition;
  vShellObjectNormal = normalize( paintShellAnchorNormal );

  vec4 edgePacked = samplePaintEdgeField(
    paintShellAnchorPosition,
    paintShellAnchorNormal,
    uShellPhase
  );
  float comb = paintEdgeComb(
    paintShellAnchorPosition,
    paintShellAnchorNormal,
    edgePacked,
    uShellPhase
  );
  float edgeLoad = paintEdgeLoad( edgePacked, comb );
  float combTip = smoothstep( 0.36, 0.64, comb );
  float isRim = 1.0 - step( 0.5, uShellLayer );
  float rimInflation = 0.34 + edgeLoad * 0.58;
  rimInflation += combTip * ( 0.56 + edgeLoad * 0.78 );
  float loopField = clamp(
    edgePacked.b * 0.58 + edgeLoad * 0.30 + combTip * 0.24,
    0.0,
    1.0
  );
  float loopRamp = smoothstep( 0.10, 0.88, loopField );
  float loopMinimum = mix( 1.0, 0.28, uOutlineWidthVariation );
  float loopMaximum = mix( 1.0, 1.78, uOutlineWidthVariation );
  float loopInflation = mix( loopMinimum, loopMaximum, loopRamp );
  loopInflation += ( combTip - 0.5 ) * 0.24 * uOutlineWidthVariation;
  float rimBristleAmount = uEdgeBristleReach * 0.88;
  float loopWobbleAmount = mix( 0.45, 0.88, uOutlineBreakup );
  float bristleAmount = mix( loopWobbleAmount, rimBristleAmount, isRim );
  float inflation = mix( 1.0, mix( loopInflation, rimInflation, isRim ), bristleAmount );
  inflation = max( inflation, 0.18 );
  vShellWidthField = inflation;
  vShellBrushLoad = edgeLoad;

  vec4 viewPosition = modelViewMatrix * vec4( paintShellPosition, 1.0 );
  vec3 viewNormal = normalize( normalMatrix * paintShellNormal );
  vec4 baseClip = projectionMatrix * viewPosition;

  // Find the outward silhouette direction after projection. The probe is used
  // only to establish direction; the final vertex keeps the source surface's
  // clip-space depth so the outline cannot balloon toward the camera.
  vec4 normalProbeClip = projectionMatrix * vec4(
    viewPosition.xyz + viewNormal,
    1.0
  );
  vec2 baseNdc = baseClip.xy / max( abs( baseClip.w ), 1e-6 );
  vec2 normalProbeNdc = normalProbeClip.xy
    / max( abs( normalProbeClip.w ), 1e-6 );
  vec2 projectedNormal = normalProbeNdc - baseNdc;
  float projectedNormalLength = length( projectedNormal );
  vec2 fallbackDirection = normalize( viewNormal.xy + vec2( 1e-6, 0.0 ) );
  vec2 outwardNdc = projectedNormalLength > 1e-6
    ? projectedNormal / projectedNormalLength
    : fallbackDirection;

  // Resolve the projected normal in the viewport's pixel metric. This makes
  // one authored shell width mean the same thing for a large building, a thin
  // branch, and a scaled or skinned character.
  vec2 safeViewport = max( uViewportSize, vec2( 1.0 ) );
  vec2 outwardPixels = normalize( outwardNdc * safeViewport );
  vec2 pixelStepNdc = outwardPixels * 2.0 / safeViewport;

  const float shellPixelsPerWidthUnit = 200.0;
  float baseShellPixels = uShellWidth
    * uWidthMultiplier
    * uObjectWidthMultiplier
    * inflation
    * shellPixelsPerWidthUnit;

  // Offset-loop character now changes only the outward reach. The model
  // silhouette remains the shared inner boundary instead of the entire shell
  // translating away from it.
  float directionalReachPixels = dot( outwardPixels, uOffsetDirection )
    * uOffsetScale
    * uOffsetMultiplier
    * shellPixelsPerWidthUnit;
  float shellPixels = max( baseShellPixels + directionalReachPixels, 0.0 )
    * uOutlineZoomScale;

  // Only X/Y dilate. Keeping the original Z/W anchors depth and lets the base
  // mesh mask the inner half of the back-face shell as a true contour.
  baseClip.xy += pixelStepNdc * shellPixels * baseClip.w;
  vShellViewPosition = - viewPosition.xyz;
  vShellViewNormal = viewNormal;
  gl_Position = baseClip;
}
`;

const shellFragmentShader = /* glsl */ `
uniform sampler2D uPaintMap;
uniform vec3 uShellColor;
uniform float uShellWidth;
uniform float uCoverageBias;
uniform float uBrushScale;
uniform float uObjectTextureScale;
uniform float uShellLayer;
uniform float uShellPhase;
uniform float uRimContinuity;
uniform float uOutlineBreakup;
uniform float uOutlineStrokeWidth;
uniform float uPaintDebugMode;
varying vec2 vShellUv;
varying vec3 vShellObjectPosition;
varying vec3 vShellObjectNormal;
varying vec3 vShellViewPosition;
varying vec3 vShellViewNormal;
varying float vShellWidthField;
varying float vShellBrushLoad;

${edgeFieldFunctions}

void main() {
  // A true zero must disable the role completely. Without this guard, jitter
  // can still give a zero-width shell positive reach in the vertex stage.
  if ( uShellWidth <= 0.00001 ) discard;
  if (
    uPaintDebugMode > 0.5
    && ( uPaintDebugMode < 7.5 || uPaintDebugMode > 8.5 )
  ) discard;

  vec4 strokes = samplePaintEdgeField(
    vShellObjectPosition,
    vShellObjectNormal,
    uShellPhase
  );
  float comb = paintEdgeComb(
    vShellObjectPosition,
    vShellObjectNormal,
    strokes,
    uShellPhase
  );
  float combTip = smoothstep( 0.36, 0.64, comb );
  float isRim = 1.0 - step( 0.5, uShellLayer );
  float broadInk = strokes.b + strokes.a * 0.2 + combTip * 0.22 + uCoverageBias;
  float rimLow = mix( 0.44, 0.04, uRimContinuity );
  float rimHigh = mix( 0.66, 0.29, uRimContinuity );
  float rimCoverage = smoothstep( rimLow, rimHigh, broadInk );

  vec3 viewNormal = normalize( vShellViewNormal );
  vec3 viewDirection = normalize( vShellViewPosition );
  float contourDistance = abs( dot( viewNormal, viewDirection ) );
  float contourPixel = max( fwidth( contourDistance ), 0.0001 );
  float outlineInk = smoothstep(
    0.10,
    0.64,
    strokes.b * 0.68 + strokes.a * 0.20 + combTip * 0.28 + uCoverageBias
  );
  float outlineContinuity = mix( 1.0, outlineInk, uOutlineBreakup );
  float outlineContourLimit = mix(
    0.28,
    0.62,
    saturate( uOutlineStrokeWidth / 3.0 )
  );
  outlineContourLimit *= mix( 0.86, 1.16, saturate( vShellWidthField / 1.8 ) );
  float outlineContour = 1.0 - smoothstep(
    outlineContourLimit,
    outlineContourLimit + contourPixel * 3.0,
    contourDistance
  );
  float outlineBristles = smoothstep( 0.10, 0.72, vShellBrushLoad + combTip * 0.18 );
  float outlineCoverage = outlineContour
    * outlineContinuity
    * mix( 1.0, outlineBristles, uOutlineBreakup * 0.68 );
  float rimTipZone = 1.0 - smoothstep(
    contourPixel * 0.35,
    contourPixel * 5.5,
    contourDistance
  );
  float attachedRimCoverage = mix( 1.0, rimCoverage, rimTipZone );

  if ( isRim > 0.5 ) {
    if ( attachedRimCoverage < 0.46 ) discard;
  } else {
    if ( outlineCoverage < 0.46 ) discard;
  }

  float shellDeposit = clamp( strokes.b * 0.62 + strokes.a * 0.16 + combTip * 0.30, 0.0, 1.0 );
  vec3 shellColor = uShellColor * mix( 0.62, 1.38, shellDeposit );
  if ( uPaintDebugMode > 7.5 && uPaintDebugMode < 8.5 ) {
    if ( uShellLayer < 0.5 ) shellColor = vec3( 1.0, 0.08, 0.28 );
    else if ( uShellLayer < 1.5 ) shellColor = vec3( 0.05, 0.92, 1.0 );
    else shellColor = vec3( 1.0, 0.92, 0.04 );
  }
  gl_FragColor = vec4( shellColor, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createPaintShellMaterial(
  globals: PaintGlobalUniforms,
  options: PaintShellOptions,
): THREE.ShaderMaterial {
  const widthUniform = options.kind === 'rim' ? globals.outerRimWidth : globals.outlineWidth;
  const offsetUniform = options.kind === 'rim' ? { value: 0 } : globals.outlineJitter;
  const layer = options.layer ?? (options.kind === 'rim' ? 0 : 1);
  const widthMultiplier = layer === 2
    ? globals.outlineSeparation
    : { value: options.widthMultiplier ?? 1 };
  const shellColor = layer === 1
    ? globals.outlinePrimaryColor
    : layer === 2
      ? globals.outlineSecondaryColor
      : { value: new THREE.Color(options.color) };

  const material = new THREE.ShaderMaterial({
    name: `Paint ${options.kind}`,
    uniforms: {
      uPaintMap: globals.paintMap,
      uShellColor: shellColor,
      uShellWidth: widthUniform,
      uWidthMultiplier: widthMultiplier,
      uObjectWidthMultiplier: { value: options.objectWidthMultiplier ?? 1 },
      uOffsetScale: offsetUniform,
      uOffsetDirection: { value: options.offsetDirection ?? new THREE.Vector2() },
      uOffsetMultiplier: { value: options.offsetMultiplier ?? 1 },
      uCoverageBias: { value: options.coverageBias ?? 0 },
      uBrushScale: globals.brushScale,
      uObjectTextureScale: { value: options.objectTextureScale ?? 0.26 },
      uShellLayer: { value: layer },
      uShellPhase: { value: layer * 1.37 + 0.23 },
      uEdgeBristleReach: globals.edgeBristleReach,
      uRimContinuity: globals.rimContinuity,
      uOutlineBreakup: globals.outlineBreakup,
      uOutlineStrokeWidth: globals.outlineStrokeWidth,
      uOutlineWidthVariation: globals.outlineWidthVariation,
      uPaintDebugMode: globals.debugMode,
      uViewportSize: globals.viewportSize,
      uOutlineZoomScale: globals.outlineZoomScale,
    },
    vertexShader: shellVertexShader,
    fragmentShader: shellFragmentShader,
    side: THREE.BackSide,
    depthWrite: true,
    toneMapped: true,
  });
  material.userData.paintShellLayer = layer;
  return material;
}

export function createPainterlyDepthMaterial(
  globals: PaintGlobalUniforms,
  objectTextureScale = 0.26,
  surfaceMap: THREE.Texture | null = null,
  surfaceAlphaTest = 0,
  side: THREE.Side = THREE.FrontSide,
): THREE.MeshDepthMaterial {
  const material = new THREE.MeshDepthMaterial({
    map: surfaceMap ?? globals.paintMap.value as THREE.Texture,
    depthPacking: THREE.RGBADepthPacking,
    alphaTest: 0.5,
    side,
  });

  material.onBeforeCompile = (shader: CompiledShader) => {
    shader.uniforms.uPaintMap = globals.paintMap;
    shader.uniforms.uShadowLightDirection = globals.lightDirection;
    shader.uniforms.uShadowErosion = globals.shadowErosion;
    shader.uniforms.uShadowMaskOffset = globals.shadowMaskOffset;
    shader.uniforms.uBrushScale = globals.brushScale;
    shader.uniforms.uShadowBrushScale = globals.shadowBrushScale;
    shader.uniforms.uObjectTextureScale = { value: objectTextureScale };
    shader.uniforms.uSurfaceMap = { value: surfaceMap ?? globals.paintMap.value };
    shader.uniforms.uSurfaceAlphaTest = { value: surfaceAlphaTest };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec3 aSmoothNormal;
        varying vec3 vShadowPaintNormalWorld;
        varying vec3 vShadowObjectPosition;
        varying vec3 vShadowObjectNormal;`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec3 paintShadowNormal = aSmoothNormal;
        #ifdef USE_SKINNING
          mat4 paintSkinMatrix = mat4( 0.0 );
          paintSkinMatrix += skinWeight.x * boneMatX;
          paintSkinMatrix += skinWeight.y * boneMatY;
          paintSkinMatrix += skinWeight.z * boneMatZ;
          paintSkinMatrix += skinWeight.w * boneMatW;
          paintSkinMatrix = bindMatrixInverse * paintSkinMatrix * bindMatrix;
          paintShadowNormal = vec4(
            paintSkinMatrix * vec4( paintShadowNormal, 0.0 )
          ).xyz;
        #endif
        vShadowPaintNormalWorld = normalize( mat3( modelMatrix ) * paintShadowNormal );
        // Shadow breakup uses the same undeformed surface anchors as the
        // visible material, while light-facing response uses the animated
        // normal above.
        vShadowObjectPosition = position;
        vShadowObjectNormal = normalize( normal );`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uPaintMap;
        uniform vec3 uShadowLightDirection;
        uniform float uShadowErosion;
        uniform float uShadowMaskOffset;
        uniform float uBrushScale;
        uniform float uShadowBrushScale;
        uniform float uObjectTextureScale;
        uniform sampler2D uSurfaceMap;
        uniform float uSurfaceAlphaTest;
        varying vec3 vShadowPaintNormalWorld;
        varying vec3 vShadowObjectPosition;
        varying vec3 vShadowObjectNormal;

        ${edgeFieldFunctions}`,
      )
      .replace(
        '#include <map_fragment>',
        `vec4 shadowSurface = texture2D( uSurfaceMap, vMapUv );
        if ( uSurfaceAlphaTest > 0.0 && shadowSurface.a < uSurfaceAlphaTest ) discard;
        vec4 shadowPaint = samplePaintEdgeFieldScaled(
          vShadowObjectPosition,
          vShadowObjectNormal,
          3.71,
          uShadowBrushScale
        );
        float shadowComb = paintEdgeComb(
          vShadowObjectPosition,
          vShadowObjectNormal,
          shadowPaint,
          3.71
        );
        vec3 shadowNormal = normalize( vShadowPaintNormalWorld );
        float shadowFacing = pow(
          abs( dot( normalize( uShadowLightDirection ), shadowNormal ) ),
          2.0
        );
        float shadowCurvature = length( dFdx( shadowNormal ) ) + length( dFdy( shadowNormal ) );
        float shadowFlatPreserve = 1.0 - smoothstep( 0.00002, 0.0004, shadowCurvature );
        float shadowBrushMask = max(
          shadowFlatPreserve,
          paintShadowStrokeMask(
            shadowPaint,
            shadowComb,
            shadowFacing,
            uShadowMaskOffset
          )
        );
        diffuseColor.a *= mix( 1.0, shadowBrushMask, saturate( uShadowErosion ) );`,
      );
  };

  material.customProgramCacheKey = () => 'painterly-depth-v5-surface-anchor';
  return material;
}

export function installSmoothNormalAttribute(
  geometry: THREE.BufferGeometry,
  mode: 'radial' | 'existing' = 'existing',
): THREE.BufferGeometry {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const smooth = new Float32Array(position.count * 3);

  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const center = bounds?.getCenter(new THREE.Vector3()) ?? new THREE.Vector3();
  const halfSize = bounds?.getSize(new THREE.Vector3()).multiplyScalar(0.5) ?? new THREE.Vector3(1, 1, 1);
  halfSize.x = Math.max(halfSize.x, 1e-4);
  halfSize.y = Math.max(halfSize.y, 1e-4);
  halfSize.z = Math.max(halfSize.z, 1e-4);

  const vector = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    if (mode === 'radial') {
      vector.set(
        (position.getX(index) - center.x) / halfSize.x,
        (position.getY(index) - center.y) / halfSize.y,
        (position.getZ(index) - center.z) / halfSize.z,
      );
      if (vector.lengthSq() < 1e-6 && normal) {
        vector.set(normal.getX(index), normal.getY(index), normal.getZ(index));
      }
    } else if (normal) {
      vector.set(normal.getX(index), normal.getY(index), normal.getZ(index));
    } else {
      vector.set(0, 1, 0);
    }
    vector.normalize();
    smooth[index * 3] = vector.x;
    smooth[index * 3 + 1] = vector.y;
    smooth[index * 3 + 2] = vector.z;
  }

  geometry.setAttribute('aSmoothNormal', new THREE.BufferAttribute(smooth, 3));
  return geometry;
}

export function debugModeIndex(mode: PaintDebugMode): number {
  return PAINT_DEBUG_MODES.indexOf(mode);
}
