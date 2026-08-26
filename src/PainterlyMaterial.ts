import * as THREE from 'three';

export const PAINT_DEBUG_MODES = [
  'Final',
  'Packed normal',
  'Diffuse strokes',
  'Detail strokes',
  'Toon bands',
  'Oil reflection',
  'Rim erosion',
  'Edge layers',
] as const;

export type PaintDebugMode = (typeof PAINT_DEBUG_MODES)[number];

type PaintUniform = { value: number | THREE.Texture | THREE.Color | THREE.Vector2 | THREE.Vector3 };

export interface PaintGlobalUniforms {
  paintMap: PaintUniform;
  lightDirection: PaintUniform;
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
  roughnessVariation: PaintUniform;
  rimStrength: PaintUniform;
  rimPower: PaintUniform;
  edgeErosion: PaintUniform;
  edgeBristleReach: PaintUniform;
  erosionScale: PaintUniform;
  curvatureGuard: PaintUniform;
  shadowErosion: PaintUniform;
  shadowMaskOffset: PaintUniform;
  debugMode: PaintUniform;
  outerRimWidth: PaintUniform;
  rimContinuity: PaintUniform;
  outlineWidth: PaintUniform;
  outlineJitter: PaintUniform;
  outlineSeparation: PaintUniform;
  outlineBreakup: PaintUniform;
  outlineStrokeWidth: PaintUniform;
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
  triplanarMacro?: boolean;
  objectTextureScale?: number;
  roughness?: number;
  metalness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  envMapIntensity?: number;
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
}

export interface PaintShellOptions {
  kind: 'rim' | 'outline';
  color: THREE.ColorRepresentation;
  widthMultiplier?: number;
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

vec4 samplePaintEdgeField( vec3 objectPosition, vec3 objectNormal, float phase ) {
  vec3 coordinate = objectPosition * uObjectTextureScale * uBrushScale * 0.74;
  coordinate += vec3( 0.173, 0.397, 0.619 ) * phase;
  vec4 broadSample = samplePaintTriplanar( coordinate, objectNormal );
  vec4 toothSample = samplePaintTriplanar(
    coordinate * 1.83 + vec3( 0.311, 0.127, 0.491 ) * ( phase + 1.0 ),
    objectNormal
  );
  return vec4( broadSample.rg, broadSample.b, toothSample.a );
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
  float coarse = 0.5 + 0.5 * sin( coordinate * 37.0 + warp + phase * 7.13 );
  float fine = 0.5 + 0.5 * sin( coordinate * 113.0 - warp * 0.73 + phase * 13.7 );
  return clamp( pow( coarse, 2.2 ) * 0.68 + pow( fine, 4.0 ) * 0.48, 0.0, 1.0 );
}

float paintEdgeLoad( vec4 edgePacked, float comb ) {
  float carrier = smoothstep( 0.06, 0.42, edgePacked.b + edgePacked.a * 0.22 );
  float tooth = smoothstep( 0.12, 0.68, edgePacked.a + edgePacked.b * 0.28 );
  return clamp( carrier * mix( 0.72, 1.18, tooth ) + comb * 0.16, 0.0, 1.0 );
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
uniform vec3 uPaintDark;
uniform vec3 uPaintLight;
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
uniform float uRoughnessVariation;
uniform float uRimStrength;
uniform float uRimPower;
uniform float uEdgeErosion;
uniform float uEdgeBristleReach;
uniform float uErosionScale;
uniform float uCurvatureGuard;
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
float paintFresnel = 0.0;
float paintErosionMask = 0.0;

${edgeFieldFunctions}
`;

const paintSampling = /* glsl */ `
vec3 paintBaseNormal = normalize( vPaintGeometricNormalWorld );
vec3 paintSmoothNormal = normalize( vPaintSmoothNormalWorld );
vec3 paintViewDirection = normalize( cameraPosition - vPaintWorldPosition );

vec2 paintUv = vMapUv * uBrushScale;
vec3 paintDp1 = dFdx( vPaintWorldPosition );
vec3 paintDp2 = dFdy( vPaintWorldPosition );
vec2 paintDuv1 = dFdx( paintUv );
vec2 paintDuv2 = dFdy( paintUv );
vec3 paintTangent = paintDp1 * paintDuv2.y - paintDp2 * paintDuv1.y;
vec3 paintBitangent = - paintDp1 * paintDuv2.x + paintDp2 * paintDuv1.x;
float paintTangentValid = step( 1e-8, dot( paintTangent, paintTangent ) * dot( paintBitangent, paintBitangent ) );
paintTangent = normalize( mix( vec3( 1.0, 0.0, 0.0 ), paintTangent, paintTangentValid ) );
paintBitangent = normalize( mix( vec3( 0.0, 1.0, 0.0 ), paintBitangent, paintTangentValid ) );

vec4 paintInitial = texture2D( uPaintMap, paintUv );
float paintFacing = max( abs( dot( paintBaseNormal, paintViewDirection ) ), 0.18 );
vec2 paintViewUv = vec2( dot( paintViewDirection, paintTangent ), dot( paintViewDirection, paintBitangent ) ) / paintFacing;
vec2 paintParallaxUv = paintUv - paintViewUv * ( paintInitial.b - 0.5 ) * uParallaxDepth;
paintPacked = texture2D( uPaintMap, paintParallaxUv );

#ifdef PAINT_TRIPLANAR_MACRO
  vec3 paintObjectCoordinate = vPaintObjectPosition * uObjectTextureScale * uBrushScale;
  vec4 paintTriplanarPacked = samplePaintTriplanar( paintObjectCoordinate, vPaintObjectNormal );
  paintPacked.ba = paintTriplanarPacked.ba;
#endif

vec2 paintNormalXY = ( paintPacked.rg * 2.0 - 1.0 ) * uPaintNormalStrength;
vec3 paintTangentNormal = normalize( vec3( paintNormalXY, 0.95 ) );
vec3 paintMappedNormal = normalize(
  paintTangent * paintTangentNormal.x +
  paintBitangent * paintTangentNormal.y +
  paintBaseNormal * paintTangentNormal.z
);
paintResolvedNormalWorld = normalize( mix( paintBaseNormal, paintMappedNormal, uPaintNormalStrength ) );

float paintStroke = smoothstep(
  0.16 + ( 1.0 - uStrokeContrast ) * 0.22,
  0.84 - ( 1.0 - uStrokeContrast ) * 0.22,
  paintPacked.b
);
vec3 paintAlbedo = mix( uPaintDark, uPaintLight, paintStroke );

float paintNdotL = dot( paintResolvedNormalWorld, normalize( uPaintLightDirection ) );
float paintBandNoise = ( paintPacked.a - 0.5 ) * uDetailStrength * 0.24;
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

vec2 paintReflectionUv = paintParallaxUv.yx;
vec4 paintReflectionPacked = texture2D( uPaintMap, paintReflectionUv );
vec2 paintReflectionXY = ( paintReflectionPacked.rg * 2.0 - 1.0 ) * ( 0.55 + 0.65 * uPaintNormalStrength );
vec3 paintReflectionNormal = normalize(
  paintTangent * paintReflectionXY.x +
  paintBitangent * paintReflectionXY.y +
  paintBaseNormal * 0.95
);
vec3 paintReflectionVector = reflect( - paintViewDirection, paintReflectionNormal );
float paintReflectionDot = saturate( dot( paintReflectionVector, normalize( uPaintLightDirection ) ) );
paintOilLobe = step( uOilThreshold, paintReflectionDot );

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
float paintCombTip = smoothstep( 0.30, 0.68, paintComb );
float paintEdgeDistance = abs( dot( paintSmoothNormal, paintViewDirection ) );
float paintBaseReach = mix( 0.025, 0.34, saturate( uEdgeBristleReach ) );
float paintTexturedReach = paintBaseReach * mix(
  1.0 - uErosionScale * 0.62,
  1.0 + uErosionScale * 0.34,
  paintLoad
);
paintTexturedReach *= mix( 0.62, 1.42, paintCombTip );
paintTexturedReach = min( paintTexturedReach, 0.38 );
float paintEdgeAA = max( fwidth( paintEdgeDistance ) * 1.5, 0.006 );
paintErosionMask = (
  1.0 - smoothstep(
    paintTexturedReach - paintEdgeAA,
    paintTexturedReach + paintEdgeAA,
    paintEdgeDistance
  )
) * paintCurvedSurface * saturate( uEdgeErosion );

if ( uPaintDebugMode < 0.5 && paintErosionMask > 0.5 ) discard;
`;

const paintOutput = /* glsl */ `
float paintReflectionRamp = clamp(
  ( floor( 2.0 * pow( paintReflectionDot, 4.0 ) + 0.5 ) * 0.5 - 0.5 ) * 2.0,
  -0.25,
  1.0
);
vec3 paintOilColor = mix( uReflectionDark, uReflectionLight, paintReflectionRamp );
outgoingLight += paintOilColor * paintOilLobe * uOilStrength;

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
  outgoingLight = paintOilColor * paintOilLobe * 2.0;
} else if ( uPaintDebugMode > 5.5 && uPaintDebugMode < 6.5 ) {
  outgoingLight = vec3( paintErosionMask );
} else if ( uPaintDebugMode > 6.5 ) {
  outgoingLight = mix( vec3( 0.035, 0.045, 0.06 ), vec3( 1.0, 0.14, 0.025 ), paintErosionMask );
}
`;

export function createPaintGlobalUniforms(texture: THREE.Texture): PaintGlobalUniforms {
  return {
    paintMap: { value: texture },
    lightDirection: { value: new THREE.Vector3(-0.45, 0.82, 0.34).normalize() },
    brushScale: { value: 3.25 },
    parallaxDepth: { value: 0.048 },
    normalStrength: { value: 0.9 },
    strokeContrast: { value: 0.9 },
    detailStrength: { value: 0.72 },
    shadowThreshold: { value: -0.7 },
    lightThreshold: { value: 0.3 },
    bandSoftness: { value: 0.01 },
    shadowValue: { value: 0 },
    midtoneValue: { value: 0.25 },
    oilStrength: { value: 0.85 },
    oilThreshold: { value: 0.5 },
    roughnessVariation: { value: 0.36 },
    rimStrength: { value: 0.9 },
    rimPower: { value: 5 },
    edgeErosion: { value: 0.68 },
    edgeBristleReach: { value: 0.66 },
    erosionScale: { value: 0.58 },
    curvatureGuard: { value: 8.0 },
    shadowErosion: { value: 1 },
    shadowMaskOffset: { value: 0 },
    debugMode: { value: 0 },
    outerRimWidth: { value: 0.06 },
    rimContinuity: { value: 0.9 },
    outlineWidth: { value: 0.128 },
    outlineJitter: { value: 0.046 },
    outlineSeparation: { value: 1.72 },
    outlineBreakup: { value: 0.48 },
    outlineStrokeWidth: { value: 1.55 },
  };
}

function bindUniforms(
  shaderUniforms: Record<string, PaintUniform>,
  globals: PaintGlobalUniforms,
  palette: PainterlyMaterial['paintPalette'],
  projectionScale: PaintUniform,
): void {
  shaderUniforms.uPaintMap = globals.paintMap;
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
  shaderUniforms.uRoughnessVariation = globals.roughnessVariation;
  shaderUniforms.uRimStrength = globals.rimStrength;
  shaderUniforms.uRimPower = globals.rimPower;
  shaderUniforms.uEdgeErosion = globals.edgeErosion;
  shaderUniforms.uEdgeBristleReach = globals.edgeBristleReach;
  shaderUniforms.uErosionScale = globals.erosionScale;
  shaderUniforms.uCurvatureGuard = globals.curvatureGuard;
  shaderUniforms.uPaintDebugMode = globals.debugMode;
  shaderUniforms.uObjectTextureScale = projectionScale;
  shaderUniforms.uPaintDark = palette.dark;
  shaderUniforms.uPaintLight = palette.light;
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
    roughness: options.roughness ?? 0.47,
    metalness: options.metalness ?? 0.2,
    clearcoat: options.clearcoat ?? 0.42,
    clearcoatRoughness: options.clearcoatRoughness ?? 0.28,
    envMapIntensity: options.envMapIntensity ?? 0.7,
    side: THREE.FrontSide,
  }) as PainterlyMaterial;

  material.paintPalette = {
    dark: { value: new THREE.Color(options.palette.dark) },
    light: { value: new THREE.Color(options.palette.light) },
    reflectionDark: { value: new THREE.Color(options.palette.reflectionDark) },
    reflectionLight: { value: new THREE.Color(options.palette.reflectionLight) },
    rim: { value: new THREE.Color(options.palette.rim) },
  };
  material.paintProjectionScale = { value: options.objectTextureScale ?? 0.26 };
  if (options.triplanarMacro) {
    material.defines = { ...material.defines, PAINT_TRIPLANAR_MACRO: 1 };
  }

  material.onBeforeCompile = (shader: CompiledShader) => {
    bindUniforms(shader.uniforms, globals, material.paintPalette, material.paintProjectionScale);

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${vertexPrelude}`)
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vPaintWorldPosition = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
        vPaintGeometricNormalWorld = normalize( mat3( modelMatrix ) * normal );
        vPaintSmoothNormalWorld = normalize( mat3( modelMatrix ) * aSmoothNormal );
        vPaintObjectPosition = transformed;
        vPaintObjectNormal = normalize( normal );`,
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
        );`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `normal = normalize( mat3( viewMatrix ) * paintResolvedNormalWorld );
        nonPerturbedNormal = normal;`,
      )
      .replace('#include <opaque_fragment>', `${paintOutput}\n#include <opaque_fragment>`);
  };

  material.customProgramCacheKey = () => 'painterly-physical-v4';
  return material;
}

const shellVertexShader = /* glsl */ `
attribute vec3 aSmoothNormal;
uniform sampler2D uPaintMap;
uniform float uShellWidth;
uniform float uWidthMultiplier;
uniform float uOffsetScale;
uniform float uOffsetMultiplier;
uniform vec2 uOffsetDirection;
uniform float uBrushScale;
uniform float uObjectTextureScale;
uniform float uShellLayer;
uniform float uShellPhase;
uniform float uEdgeBristleReach;
uniform float uOutlineBreakup;
varying vec2 vShellUv;
varying vec3 vShellObjectPosition;
varying vec3 vShellObjectNormal;
varying vec3 vShellViewPosition;
varying vec3 vShellViewNormal;

${edgeFieldFunctions}

void main() {
  vShellUv = uv;
  vShellObjectPosition = position;
  vShellObjectNormal = normalize( aSmoothNormal );

  vec4 edgePacked = samplePaintEdgeField( position, aSmoothNormal, uShellPhase );
  float comb = paintEdgeComb( position, aSmoothNormal, edgePacked, uShellPhase );
  float edgeLoad = paintEdgeLoad( edgePacked, comb );
  float combTip = smoothstep( 0.36, 0.64, comb );
  float isRim = 1.0 - step( 0.5, uShellLayer );
  float rimInflation = 0.34 + edgeLoad * 0.58;
  rimInflation += combTip * ( 0.56 + edgeLoad * 0.78 );
  float loopField = clamp( edgePacked.b * 0.55 + combTip * 0.45, 0.0, 1.0 );
  float loopInflation = mix( 0.76, 1.24, loopField );
  float rimBristleAmount = uEdgeBristleReach * 0.88;
  float loopWobbleAmount = mix( 0.45, 0.88, uOutlineBreakup );
  float bristleAmount = mix( loopWobbleAmount, rimBristleAmount, isRim );
  float inflation = mix( 1.0, mix( loopInflation, rimInflation, isRim ), bristleAmount );

  vec3 expanded = position
    + normalize( aSmoothNormal ) * uShellWidth * uWidthMultiplier * inflation;
  vec4 viewPosition = modelViewMatrix * vec4( expanded, 1.0 );
  viewPosition.xy += uOffsetDirection * uOffsetScale * uOffsetMultiplier;
  vShellViewPosition = - viewPosition.xyz;
  vShellViewNormal = normalize( normalMatrix * aSmoothNormal );
  gl_Position = projectionMatrix * viewPosition;
}
`;

const shellFragmentShader = /* glsl */ `
uniform sampler2D uPaintMap;
uniform vec3 uShellColor;
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

${edgeFieldFunctions}

void main() {
  if ( uPaintDebugMode > 0.5 && uPaintDebugMode < 6.5 ) discard;

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
  float contourWobble = ( strokes.a - 0.5 ) * 1.15 + ( combTip - 0.5 ) * 0.9;
  float outlineDistance = max(
    contourDistance + contourPixel * contourWobble * uOutlineBreakup * 1.7,
    0.0
  );
  float contour = 1.0 - smoothstep(
    contourPixel * 0.2,
    contourPixel * ( uOutlineStrokeWidth + 0.8 ),
    outlineDistance
  );
  float outlineInk = smoothstep( 0.04, 0.28, strokes.b + strokes.a * 0.28 + uCoverageBias );
  float outlineContinuity = mix( 1.0, outlineInk, uOutlineBreakup );
  float rimTipZone = 1.0 - smoothstep(
    contourPixel * 0.35,
    contourPixel * 5.5,
    contourDistance
  );
  float attachedRimCoverage = mix( 1.0, rimCoverage, rimTipZone );

  if ( isRim > 0.5 ) {
    if ( attachedRimCoverage < 0.46 ) discard;
  } else {
    if ( contour < 0.42 || outlineContinuity < 0.62 ) discard;
  }

  vec3 shellColor = uShellColor * mix( 0.74, 1.28, strokes.b );
  if ( uPaintDebugMode > 6.5 ) {
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

  const material = new THREE.ShaderMaterial({
    name: `Paint ${options.kind}`,
    uniforms: {
      uPaintMap: globals.paintMap,
      uShellColor: { value: new THREE.Color(options.color) },
      uShellWidth: widthUniform,
      uWidthMultiplier: widthMultiplier,
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
      uPaintDebugMode: globals.debugMode,
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
): THREE.MeshDepthMaterial {
  const material = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: globals.paintMap.value as THREE.Texture,
    alphaTest: 0.14,
  });

  material.onBeforeCompile = (shader: CompiledShader) => {
    shader.uniforms.uShadowPaintMap = globals.paintMap;
    shader.uniforms.uShadowLightDirection = globals.lightDirection;
    shader.uniforms.uShadowErosion = globals.shadowErosion;
    shader.uniforms.uShadowMaskOffset = globals.shadowMaskOffset;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vShadowPaintNormalWorld;`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vShadowPaintNormalWorld = normalize( mat3( modelMatrix ) * normal );`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uShadowPaintMap;
        uniform vec3 uShadowLightDirection;
        uniform float uShadowErosion;
        uniform float uShadowMaskOffset;
        varying vec3 vShadowPaintNormalWorld;`,
      )
      .replace(
        '#include <map_fragment>',
        `vec4 shadowPaint = texture2D( uShadowPaintMap, vMapUv );
        vec3 shadowNormal = normalize( vShadowPaintNormalWorld );
        float shadowFacing = pow( dot( normalize( uShadowLightDirection ), shadowNormal ), 2.0 );
        float shadowCurvature = length( dFdx( shadowNormal ) ) + length( dFdy( shadowNormal ) );
        float shadowFlatPreserve = 1.0 - step( 0.000002, shadowCurvature );
        float shadowBrushMask = saturate( shadowPaint.a * shadowFacing + shadowFlatPreserve + uShadowMaskOffset );
        diffuseColor.a *= mix( 1.0, shadowBrushMask, uShadowErosion );`,
      );
  };

  material.customProgramCacheKey = () => 'painterly-depth-v2';
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
