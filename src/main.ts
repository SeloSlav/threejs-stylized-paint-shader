import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  TransformControls,
  type TransformControlsMode,
} from 'three/addons/controls/TransformControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import './style.css';
import {
  PAINT_DEBUG_MODES,
  createPaintGlobalUniforms,
  createPainterlyMaterial,
  createPainterlyDepthMaterial,
  createPaintShellMaterial,
  debugModeIndex,
  installSmoothNormalAttribute,
  readPainterlyControls,
  type PaintGlobalUniforms,
  type PaintPalette,
  type PainterlyControlValues,
  type PainterlyMaterial,
} from './PainterlyMaterial.ts';
import { createPaintTexture, type PaintTextureMetadata } from './paintTexture.ts';
import {
  PAINT_SCENES,
  paintSceneById,
  type CameraBookmark,
  type CameraBookmarkName,
  type PaintSceneDefinition,
  type SceneId,
  type ScenePaintedMeshOptions,
  type ScenePaintedObjectOptions,
} from './scenes/sceneRegistry.ts';

type PresetName = 'high-key' | 'noir' | 'ultraviolet' | 'earthy' | 'sky' | 'verdant';

interface Preset {
  label: string;
  eyebrow: string;
  top: THREE.ColorRepresentation;
  horizon: THREE.ColorRepresentation;
  abyss: THREE.ColorRepresentation;
  fog: THREE.ColorRepresentation;
  key: THREE.ColorRepresentation;
  keyIntensity: number;
  fill: THREE.ColorRepresentation;
  fillIntensity: number;
  accent: THREE.ColorRepresentation;
  accentIntensity: number;
  exposure: number;
  palettes: PaintPalette[];
}

interface PaintedObject {
  group: THREE.Group;
  base: THREE.Mesh;
  material: PainterlyMaterial;
  nativeMaterial: THREE.Material;
  depthMaterial: THREE.MeshDepthMaterial;
  outlineEnabled: boolean;
  screenOutlineEnabled: boolean;
  shells: THREE.ShaderMaterial[];
  paletteIndex: number | null;
  outlinePalette: {
    primary: THREE.Color;
    secondary: THREE.Color;
  };
  outlinePaletteWeight: number;
  label: string;
  spin: THREE.Vector3;
  initialPosition: THREE.Vector3;
  initialRotation: THREE.Euler;
  initialScale: THREE.Vector3;
}

interface PaintLabSettingsExport {
  format: 'paint-lab-settings';
  version: 2;
  exportedAt: string;
  threeRevision: string;
  scene: {
    id: SceneId;
    label: string;
  };
  look: {
    id: PresetName;
    label: string;
    palettes: PaintPalette[];
  };
  paintTexture: PaintTextureMetadata;
  controls: PainterlyControlValues;
  outlineColors: {
    primary: string;
    secondary: string;
  };
}

const PRESETS: Record<PresetName, Preset> = {
  'high-key': {
    label: 'High key',
    eyebrow: 'COOL DAYLIGHT / CORAL PAINT',
    top: '#b9d0dd',
    horizon: '#edf1e7',
    abyss: '#0b0b11',
    fog: '#bdc4c7',
    key: '#ffe8c2',
    keyIntensity: 5.4,
    fill: '#7aa8bd',
    fillIntensity: 0.42,
    accent: '#ff4962',
    accentIntensity: 28,
    exposure: 1.16,
    palettes: [
      {
        dark: '#101827', light: '#385f66', reflectionDark: '#bd3f67', reflectionLight: '#fff0df', rim: '#fff7ea', outline: '#8ec8dc', outlineSecondary: '#fff2d1',
      },
      {
        dark: '#1c1548', light: '#6463a8', reflectionDark: '#e75474', reflectionLight: '#ffd7c3', rim: '#fff4ee', outline: '#b8ffe8', outlineSecondary: '#ffc7d5',
      },
      {
        dark: '#163941', light: '#5e7d7d', reflectionDark: '#ef4b57', reflectionLight: '#ffe4b5', rim: '#fff2d7', outline: '#93dce0', outlineSecondary: '#fff4b5',
      },
      {
        dark: '#24414d', light: '#76949a', reflectionDark: '#ed7257', reflectionLight: '#f7eee4', rim: '#fff7ed', outline: '#a9e7f0', outlineSecondary: '#ffd8bf',
      },
      {
        dark: '#b25561', light: '#f8e5d5', reflectionDark: '#ff4d55', reflectionLight: '#ffd8a4', rim: '#fff0dc', outline: '#b7eef4', outlineSecondary: '#fff6d8',
      },
    ],
  },
  noir: {
    label: 'Sunset noir',
    eyebrow: 'INK SHADOWS / HOT OIL',
    top: '#6f8da7',
    horizon: '#d5dde1',
    abyss: '#060307',
    fog: '#5d5360',
    key: '#ff6a27',
    keyIntensity: 6.8,
    fill: '#38557b',
    fillIntensity: 0.14,
    accent: '#ff2438',
    accentIntensity: 44,
    exposure: 1.08,
    palettes: [
      {
        dark: '#334a60', light: '#c55f5e', reflectionDark: '#d3132c', reflectionLight: '#ff7a38', rim: '#ffb05e', outline: '#86b9db', outlineSecondary: '#ffe2b7',
      },
      {
        dark: '#44355f', light: '#98658f', reflectionDark: '#e21d2f', reflectionLight: '#ff9349', rim: '#ffc06d', outline: '#9ebde8', outlineSecondary: '#ffd284',
      },
      {
        dark: '#37465c', light: '#c95c67', reflectionDark: '#e42a23', reflectionLight: '#ffa55a', rim: '#ffd188', outline: '#b1cee6', outlineSecondary: '#fff0c4',
      },
      {
        dark: '#39546b', light: '#7f9aad', reflectionDark: '#cf2631', reflectionLight: '#ff8650', rim: '#ffb16d', outline: '#8ebbd1', outlineSecondary: '#ffbd7d',
      },
      {
        dark: '#633537', light: '#d85b42', reflectionDark: '#f13a1b', reflectionLight: '#ffb45e', rim: '#ffe09b', outline: '#93c7dc', outlineSecondary: '#ffe497',
      },
    ],
  },
  ultraviolet: {
    label: 'Ultraviolet',
    eyebrow: 'VIOLET INK / ELECTRIC CYAN',
    top: '#252b55',
    horizon: '#6676a7',
    abyss: '#080512',
    fog: '#342d54',
    key: '#ff7f8a',
    keyIntensity: 5.9,
    fill: '#4b9fb5',
    fillIntensity: 0.25,
    accent: '#8b55ff',
    accentIntensity: 35,
    exposure: 1.08,
    palettes: [
      {
        dark: '#0c0a23', light: '#233d67', reflectionDark: '#7f2b91', reflectionLight: '#65e0d4', rim: '#ff9fcb', outline: '#dfff55', outlineSecondary: '#72f4e6',
      },
      {
        dark: '#15103d', light: '#5e47a8', reflectionDark: '#e44c9e', reflectionLight: '#9ef3ef', rim: '#ffc5e9', outline: '#e9ff66', outlineSecondary: '#a2f7ef',
      },
      {
        dark: '#281141', light: '#a43d87', reflectionDark: '#ef4c77', reflectionLight: '#ffc87e', rim: '#ffe0bd', outline: '#f2ff74', outlineSecondary: '#ffb3dd',
      },
      {
        dark: '#0c2833', light: '#347c89', reflectionDark: '#7659d3', reflectionLight: '#82f3dd', rim: '#c2fff0', outline: '#dcff52', outlineSecondary: '#94fff0',
      },
      {
        dark: '#2d1037', light: '#c3447c', reflectionDark: '#fa4b77', reflectionLight: '#ffcf9f', rim: '#ffe0c5', outline: '#efff7a', outlineSecondary: '#ffa8dd',
      },
    ],
  },
  earthy: {
    label: 'Earthy',
    eyebrow: 'UMBER SOIL / OCHRE LIGHT',
    top: '#80745e',
    horizon: '#cdb58d',
    abyss: '#130d09',
    fog: '#6b5a49',
    key: '#ffd39d',
    keyIntensity: 5.6,
    fill: '#74816b',
    fillIntensity: 0.24,
    accent: '#c85a32',
    accentIntensity: 31,
    exposure: 1.04,
    palettes: [
      {
        dark: '#24140d', light: '#75452e', reflectionDark: '#8f3423', reflectionLight: '#d98a45', rim: '#f4d2a1', outline: '#76846a', outlineSecondary: '#d9b77d',
      },
      {
        dark: '#1d2115', light: '#65704a', reflectionDark: '#71462b', reflectionLight: '#c79b58', rim: '#ead8aa', outline: '#8f9a69', outlineSecondary: '#c8a978',
      },
      {
        dark: '#342419', light: '#a27a50', reflectionDark: '#9d4e31', reflectionLight: '#e1b56f', rim: '#f5dfb6', outline: '#79765e', outlineSecondary: '#d4c08b',
      },
      {
        dark: '#291a0d', light: '#946127', reflectionDark: '#a74025', reflectionLight: '#e2a94f', rim: '#f7d991', outline: '#6f8060', outlineSecondary: '#daba6c',
      },
      {
        dark: '#2a1512', light: '#874d3c', reflectionDark: '#a63e2c', reflectionLight: '#d9875a', rim: '#f0c7a0', outline: '#7d7661', outlineSecondary: '#d8a77b',
      },
    ],
  },
  sky: {
    label: 'Open sky',
    eyebrow: 'CERULEAN AIR / CLOUD LIGHT',
    top: '#3b78ad',
    horizon: '#dcecf5',
    abyss: '#08121e',
    fog: '#89aec6',
    key: '#fff2cf',
    keyIntensity: 5.7,
    fill: '#77bfe8',
    fillIntensity: 0.48,
    accent: '#ff9275',
    accentIntensity: 24,
    exposure: 1.12,
    palettes: [
      {
        dark: '#081a33', light: '#2b70a4', reflectionDark: '#126a90', reflectionLight: '#9fe4f2', rim: '#fff5dd', outline: '#c8efff', outlineSecondary: '#ffb899',
      },
      {
        dark: '#102446', light: '#4b8fc2', reflectionDark: '#6b5bb0', reflectionLight: '#b8edff', rim: '#fff8e6', outline: '#d6f5ff', outlineSecondary: '#ffc6ad',
      },
      {
        dark: '#123656', light: '#5fa8ca', reflectionDark: '#d06472', reflectionLight: '#ffd0ae', rim: '#fff6e0', outline: '#c4eff5', outlineSecondary: '#ffc1a2',
      },
      {
        dark: '#152b45', light: '#6b9ec4', reflectionDark: '#b95f69', reflectionLight: '#ffd39f', rim: '#fff4d6', outline: '#d2f2ff', outlineSecondary: '#ffb58e',
      },
      {
        dark: '#0c2841', light: '#467f9a', reflectionDark: '#2e7394', reflectionLight: '#afe7e3', rim: '#f3fbef', outline: '#bfeaff', outlineSecondary: '#ffd2b0',
      },
    ],
  },
  verdant: {
    label: 'Verdant',
    eyebrow: 'FERN SHADOW / MOSS GLOW',
    top: '#294e42',
    horizon: '#a8bea0',
    abyss: '#07110c',
    fog: '#435e50',
    key: '#eee3a4',
    keyIntensity: 5.4,
    fill: '#5b9780',
    fillIntensity: 0.3,
    accent: '#b7c84b',
    accentIntensity: 26,
    exposure: 1.07,
    palettes: [
      {
        dark: '#0d2017', light: '#315f40', reflectionDark: '#506c2c', reflectionLight: '#bfd26c', rim: '#eef1bd', outline: '#8bb99b', outlineSecondary: '#d8d999',
      },
      {
        dark: '#142117', light: '#4a7348', reflectionDark: '#7b5a2c', reflectionLight: '#d2bf69', rim: '#f2ecc0', outline: '#9bc0a0', outlineSecondary: '#d6cf89',
      },
      {
        dark: '#172719', light: '#628956', reflectionDark: '#4d7a47', reflectionLight: '#afd486', rim: '#edf5ca', outline: '#89b6a1', outlineSecondary: '#c8d990',
      },
      {
        dark: '#241a12', light: '#75583a', reflectionDark: '#5d3e25', reflectionLight: '#c09a5a', rim: '#eadcae', outline: '#7fa28a', outlineSecondary: '#c9bb7a',
      },
      {
        dark: '#102322', light: '#3f7265', reflectionDark: '#3c6f5f', reflectionLight: '#a8d0a3', rim: '#e9f0c1', outline: '#91c1a8', outlineSecondary: '#d6dc91',
      },
    ],
  },
};

const initialScene = PAINT_SCENES[0];
if (!initialScene) throw new Error('The paint scene registry is empty.');

const defaultControls = {
  brushScale: 0.7,
  parallaxDepth: 0.048,
  normalStrength: 0.9,
  strokeContrast: 0.9,
  detailStrength: 0.72,
  shadowThreshold: -0.8,
  lightThreshold: 0.12,
  bandSoftness: 0.02,
  shadowValue: 0.12,
  midtoneValue: 0.6,
  oilStrength: 0.48,
  oilThreshold: 0.34,
  nativeSheen: 0,
  highlightBrushiness: 1.08,
  highlightSteps: 4,
  roughnessVariation: 0.36,
  rimStrength: 0.9,
  rimPower: 5,
  edgeErosion: 0.82,
  edgeBristleReach: 0.76,
  erosionScale: 0.66,
  curvatureGuard: 8,
  shadowErosion: 1,
  shadowMaskOffset: -0.05,
  shadowBrushScale: 0.72,
  outerRimWidth: 0.002,
  rimContinuity: 0.84,
  outlineWidth: 0.028,
  outlineJitter: 0.036,
  outlineSeparation: 1.55,
  outlineBreakup: 0.62,
  outlineStrokeWidth: 2.15,
  outlineWidthVariation: 0.82,
} satisfies PainterlyControlValues;

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing #app root.');

root.innerHTML = createInterfaceMarkup();

const viewport = requiredElement<HTMLDivElement>('#viewport');
const loading = requiredElement<HTMLDivElement>('#loading');
const textureCanvas = requiredElement<HTMLCanvasElement>('#texture-preview');
const textureContextCandidate = textureCanvas.getContext('2d');
if (!textureContextCandidate) throw new Error('2D canvas is unavailable.');
const textureContext: CanvasRenderingContext2D = textureContextCandidate;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(pixelRatioForQuality('high'));
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = PRESETS.noir.exposure;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.domElement.setAttribute('aria-label', 'Interactive painterly shader scene');
viewport.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(PRESETS.noir.fog, 0.012);

const camera = new THREE.PerspectiveCamera(
  48,
  Math.max(viewport.clientWidth, 1) / Math.max(viewport.clientHeight, 1),
  0.1,
  120,
);
camera.position.copy(initialScene.cameraBookmarks.design.position);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = true;
controls.screenSpacePanning = false;
controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
controls.minDistance = initialScene.orbitDistance.min;
controls.maxDistance = initialScene.orbitDistance.max;
controls.minPolarAngle = 0.35;
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.copy(initialScene.cameraBookmarks.design.target);
controls.update();

const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.setMode('translate');
transformControls.setSpace('world');
transformControls.setSize(0.78);
scene.add(transformControls.getHelper());
transformControls.addEventListener('dragging-changed', (event) => {
  const dragging = Boolean(event.value);
  controls.enabled = !dragging;
  if (dragging) cameraGoal = null;
});
transformControls.addEventListener('objectChange', updateTransformReadout);

const room = new RoomEnvironment();
const pmrem = new THREE.PMREMGenerator(renderer);
const environmentTarget = pmrem.fromScene(room, 0.035);
scene.environment = environmentTarget.texture;
scene.environmentIntensity = 0.62;
room.dispose();
pmrem.dispose();

let activeTexture = createPaintTexture({ size: 512, seed: 73021 });
activeTexture.texture.anisotropy = Math.min(12, renderer.capabilities.getMaxAnisotropy());
const paintGlobals = createPaintGlobalUniforms(activeTexture.texture);
(paintGlobals.viewportSize.value as THREE.Vector2).set(
  Math.max(viewport.clientWidth, 1),
  Math.max(viewport.clientHeight, 1),
);

const skyUniforms = {
  top: { value: new THREE.Color(PRESETS.noir.top) },
  horizon: { value: new THREE.Color(PRESETS.noir.horizon) },
  abyss: { value: new THREE.Color(PRESETS.noir.abyss) },
};
const sky = createSky(skyUniforms);
scene.add(sky);

const keyLight = new THREE.DirectionalLight(PRESETS.noir.key, PRESETS.noir.keyIntensity);
keyLight.position.set(-7.5, 11.5, 8.5);
keyLight.target.position.set(0, 0.3, -0.5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -20;
keyLight.shadow.camera.right = 20;
keyLight.shadow.camera.top = 22;
keyLight.shadow.camera.bottom = -12;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 60;
keyLight.shadow.bias = -0.0003;
keyLight.shadow.normalBias = 0.035;
scene.add(keyLight, keyLight.target);

const fillLight = new THREE.HemisphereLight(
  PRESETS.noir.fill,
  '#14070b',
  PRESETS.noir.fillIntensity,
);
scene.add(fillLight);

const accentLight = new THREE.PointLight(
  PRESETS.noir.accent,
  PRESETS.noir.accentIntensity,
  18,
  2,
);
accentLight.position.set(-5.8, 1.1, 3.6);
scene.add(accentLight);

paintGlobals.lightDirection.value = keyLight.position
  .clone()
  .sub(keyLight.target.position)
  .normalize();

const paintedObjects: PaintedObject[] = [];
const animatedObjects: PaintedObject[] = [];
const outlinedObjects: THREE.Object3D[] = [];
let outlineObjectSerial = 0;
const outlineGroupIds = new Map<string, number>();
const sceneFrameUpdaters: Array<(deltaSeconds: number) => void> = [];
const sceneContentRoot = new THREE.Group();
sceneContentRoot.name = 'Active paint scene';
scene.add(sceneContentRoot);

const composer = new EffectComposer(renderer);
composer.setPixelRatio(renderer.getPixelRatio());
composer.setSize(Math.max(viewport.clientWidth, 1), Math.max(viewport.clientHeight, 1));
composer.addPass(new RenderPass(scene, camera));

// Three's stock OutlinePass compiles only four blur taps, which made the
// upper half of the width slider visually identical. A larger fixed kernel
// lets the authored 0..0.24 range remain responsive without touching meshes.
const COMPLEX_OUTLINE_MAX_RADIUS = 16;

const outlineRimPass = new OutlinePass(
  new THREE.Vector2(Math.max(viewport.clientWidth, 1), Math.max(viewport.clientHeight, 1)),
  scene,
  camera,
  outlinedObjects,
);
outlineRimPass.edgeStrength = 3.6;
outlineRimPass.edgeGlow = 0;
outlineRimPass.edgeThickness = 1;
outlineRimPass.pulsePeriod = 0;
configureOutlineBlurRadius(outlineRimPass);
configurePainterlyOutlineComposite(
  outlineRimPass,
  'rim',
  0.23,
  new THREE.Vector2(),
  0,
);
composer.addPass(outlineRimPass);

const outlineSecondaryPass = new OutlinePass(
  new THREE.Vector2(Math.max(viewport.clientWidth, 1), Math.max(viewport.clientHeight, 1)),
  scene,
  camera,
  outlinedObjects,
);
outlineSecondaryPass.edgeStrength = 2.4;
outlineSecondaryPass.edgeGlow = 0;
outlineSecondaryPass.edgeThickness = 2;
outlineSecondaryPass.pulsePeriod = 0;
configureOutlineBlurRadius(outlineSecondaryPass);
configurePainterlyOutlineComposite(
  outlineSecondaryPass,
  'outline',
  0.43,
  new THREE.Vector2(-0.52, 0.55).normalize(),
  1.35,
);
composer.addPass(outlineSecondaryPass);

const outlinePrimaryPass = new OutlinePass(
  new THREE.Vector2(Math.max(viewport.clientWidth, 1), Math.max(viewport.clientHeight, 1)),
  scene,
  camera,
  outlinedObjects,
);
outlinePrimaryPass.edgeStrength = 4.2;
outlinePrimaryPass.edgeGlow = 0;
outlinePrimaryPass.edgeThickness = 1;
outlinePrimaryPass.pulsePeriod = 0;
configureOutlineBlurRadius(outlinePrimaryPass);
configurePainterlyOutlineComposite(
  outlinePrimaryPass,
  'outline',
  0.07,
  new THREE.Vector2(0.85, 0.28).normalize(),
  1,
);
composer.addPass(outlinePrimaryPass);
composer.addPass(new OutputPass());

function configureOutlineBlurRadius(pass: OutlinePass): void {
  pass.separableBlurMaterial1.defines.MAX_RADIUS = COMPLEX_OUTLINE_MAX_RADIUS;
  pass.separableBlurMaterial2.defines.MAX_RADIUS = COMPLEX_OUTLINE_MAX_RADIUS;
  pass.separableBlurMaterial1.needsUpdate = true;
  pass.separableBlurMaterial2.needsUpdate = true;
}

function configurePainterlyOutlineComposite(
  pass: OutlinePass,
  role: 'rim' | 'outline',
  phase: number,
  direction: THREE.Vector2,
  offsetMultiplier: number,
): void {
  pass.patternTexture = activeTexture.texture;
  const maskMaterial = pass.prepareMaskMaterial;
  maskMaterial.uniforms.uPaintMap = paintGlobals.paintMap;
  maskMaterial.uniforms.uBrushScale = paintGlobals.brushScale;
  maskMaterial.uniforms.uObjectTextureScale = { value: 0.26 };
  maskMaterial.uniforms.uShellPhase = { value: phase };
  maskMaterial.uniforms.uObjectId = { value: 0 };
  maskMaterial.vertexShader = /* glsl */ `
    #include <common>
    #include <batching_pars_vertex>
    #include <morphtarget_pars_vertex>
    #include <skinning_pars_vertex>

    varying vec4 projTexCoord;
    varying vec4 vPosition;
    varying vec3 vPaintObjectPosition;
    varying vec3 vPaintObjectNormal;
    uniform mat4 textureMatrix;

    void main() {
      #include <batching_vertex>
      #include <beginnormal_vertex>
      #include <morphinstance_vertex>
      #include <morphnormal_vertex>
      #include <skinbase_vertex>
      #include <skinnormal_vertex>
      #include <begin_vertex>
      #include <morphtarget_vertex>
      #include <skinning_vertex>
      #include <project_vertex>

      // Store bind/rest-pose coordinates in the mask. They interpolate across
      // the animated surface like UVs, so outline breakup cannot swim while a
      // skinned character moves through its walk cycle.
      vPaintObjectPosition = position;
      vPaintObjectNormal = normalize( normal );
      vPosition = mvPosition;
      vec4 worldPosition = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        worldPosition = instanceMatrix * worldPosition;
      #endif
      worldPosition = modelMatrix * worldPosition;
      projTexCoord = textureMatrix * worldPosition;
    }
  `;
  maskMaterial.fragmentShader = /* glsl */ `
    #include <packing>

    uniform sampler2D depthTexture;
    uniform sampler2D uPaintMap;
    uniform vec2 cameraNearFar;
    uniform float uBrushScale;
    uniform float uObjectTextureScale;
    uniform float uShellPhase;
    uniform float uObjectId;
    varying vec4 vPosition;
    varying vec4 projTexCoord;
    varying vec3 vPaintObjectPosition;
    varying vec3 vPaintObjectNormal;

    vec4 samplePaintTriplanar( vec3 coordinate, vec3 normalObject ) {
      vec3 weight = pow( abs( normalize( normalObject ) ), vec3( 5.0 ) );
      weight /= max( weight.x + weight.y + weight.z, 0.00001 );
      vec3 axisSign = sign( normalObject );
      vec2 uvX = coordinate.zy * vec2( axisSign.x, 1.0 );
      vec2 uvY = coordinate.xz * vec2( axisSign.y, 1.0 );
      vec2 uvZ = coordinate.xy * vec2( -axisSign.z, 1.0 );
      return texture2D( uPaintMap, uvX ) * weight.x
        + texture2D( uPaintMap, uvY ) * weight.y
        + texture2D( uPaintMap, uvZ ) * weight.z;
    }

    void main() {
      float depth = unpackRGBAToDepth(
        texture2DProj( depthTexture, projTexCoord )
      );
      float viewZ = -perspectiveDepthToViewZ(
        depth,
        cameraNearFar.x,
        cameraNearFar.y
      );
      float depthTest = ( -vPosition.z > viewZ ) ? 1.0 : 0.0;

      vec3 coordinate = vPaintObjectPosition
        * uObjectTextureScale
        * uBrushScale
        * 0.74;
      coordinate += vec3( 0.173, 0.397, 0.619 ) * uShellPhase;
      vec4 broadSample = samplePaintTriplanar(
        coordinate,
        vPaintObjectNormal
      );
      vec4 toothSample = samplePaintTriplanar(
        coordinate * 1.83
          + vec3( 0.311, 0.127, 0.491 ) * ( uShellPhase + 1.0 ),
        vPaintObjectNormal
      );
      float warp = ( broadSample.r - 0.5 ) * 5.0
        + ( broadSample.g - 0.5 ) * 2.5;
      vec3 tangentAxis = normalize(
        vec3( 0.71, 1.93, -1.17 ) + vPaintObjectNormal * 0.21
      );
      float combCoordinate = dot(
        vPaintObjectPosition * max( uObjectTextureScale, 0.05 ),
        tangentAxis
      );
      float coarse = 0.5 + 0.5 * sin(
        combCoordinate * 12.0 + warp * 0.58 + uShellPhase * 5.17
      );
      float fine = 0.5 + 0.5 * sin(
        combCoordinate * 89.0 - warp * 0.81 + uShellPhase * 17.3
      );
      float comb = clamp(
        pow( coarse, 1.45 ) * 0.74 + pow( fine, 6.0 ) * 0.34,
        0.0,
        1.0
      );
      float carrier = smoothstep(
        0.06,
        0.42,
        broadSample.b + toothSample.a * 0.22
      );
      float tooth = smoothstep(
        0.12,
        0.68,
        toothSample.a + broadSample.b * 0.28
      );
      float brushLoad = clamp(
        carrier * mix( 0.72, 1.18, tooth ) + comb * 0.16,
        0.0,
        1.0
      );
      float deposit = clamp(
        broadSample.b * 0.62 + toothSample.a * 0.16
          + smoothstep( 0.36, 0.64, comb ) * 0.30,
        0.0,
        1.0
      );
      gl_FragColor = vec4( 0.0, depthTest, brushLoad, uObjectId );
    }
  `;
  maskMaterial.onBeforeRender = (_renderer, _scene, _camera, _geometry, object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const objectMaterial = Array.isArray(object.material)
      ? object.material[0]
      : object.material;
    const projectionScale = (objectMaterial as PainterlyMaterial | undefined)
      ?.paintProjectionScale?.value;
    maskMaterial.uniforms.uObjectTextureScale.value = typeof projectionScale === 'number'
      ? projectionScale
      : 0.26;
    maskMaterial.uniforms.uObjectId.value = typeof object.userData.paintOutlineId === 'number'
      ? object.userData.paintOutlineId
      : 0;
    maskMaterial.uniformsNeedUpdate = true;
  };
  maskMaterial.needsUpdate = true;

  const edgeMaterial = pass.edgeDetectionMaterial;
  edgeMaterial.fragmentShader = /* glsl */ `
    varying vec2 vUv;

    uniform sampler2D maskTexture;
    uniform vec2 texSize;
    uniform vec3 visibleEdgeColor;

    void main() {
      vec2 invSize = 1.0 / texSize;
      vec4 uvOffset = vec4( 1.0, 0.0, 0.0, 1.0 )
        * vec4( invSize, invSize );
      vec4 c1 = texture2D( maskTexture, vUv + uvOffset.xy );
      vec4 c2 = texture2D( maskTexture, vUv - uvOffset.xy );
      vec4 c3 = texture2D( maskTexture, vUv + uvOffset.yw );
      vec4 c4 = texture2D( maskTexture, vUv - uvOffset.yw );

      float diff1 = ( c1.r - c2.r ) * 0.5;
      float diff2 = ( c3.r - c4.r ) * 0.5;
      float silhouetteEdge = length( vec2( diff1, diff2 ) );
      float insideHorizontal = ( 1.0 - step( 0.5, c1.r ) )
        * ( 1.0 - step( 0.5, c2.r ) );
      float insideVertical = ( 1.0 - step( 0.5, c3.r ) )
        * ( 1.0 - step( 0.5, c4.r ) );
      float objectEdge = max(
        smoothstep( 0.012, 0.06, abs( c1.a - c2.a ) ) * insideHorizontal,
        smoothstep( 0.012, 0.06, abs( c3.a - c4.a ) ) * insideVertical
      );
      float edge = max( silhouetteEdge, objectEdge * 0.42 );
      float visibilityFactor = min(
        min( c1.g, c2.g ),
        min( c3.g, c4.g )
      );
      // OutlinePass normally colors occluded edges with hiddenEdgeColor. A
      // black hidden edge still carries alpha, however, so our normal-blended
      // painterly composite was painting those edges through the model. Hidden
      // samples must contribute no color *and* no alpha.
      float visibleEdge = 1.0 - step( 0.001, visibilityFactor );
      gl_FragColor = vec4( visibleEdgeColor, 1.0 ) * edge * visibleEdge;
    }
  `;
  edgeMaterial.needsUpdate = true;

  const material = pass.overlayMaterial;
  material.blending = THREE.NormalBlending;
  material.uniforms.uResolution = paintGlobals.viewportSize;
  material.uniforms.uOutlineBreakup = paintGlobals.outlineBreakup;
  material.uniforms.uOutlineJitter = paintGlobals.outlineJitter;
  material.uniforms.uOutlineWidthVariation = paintGlobals.outlineWidthVariation;
  material.uniforms.uOutlineStrokeWidth = paintGlobals.outlineStrokeWidth;
  material.uniforms.uOutlineZoomScale = paintGlobals.outlineZoomScale;
  material.uniforms.uOutlineRadius = { value: 1 };
  material.uniforms.uRimContinuity = paintGlobals.rimContinuity;
  material.uniforms.uEdgeBristleReach = paintGlobals.edgeBristleReach;
  material.uniforms.uIsRim = { value: role === 'rim' ? 1 : 0 };
  material.uniforms.uLayerDirection = { value: direction };
  material.uniforms.uLayerOffsetMultiplier = { value: offsetMultiplier };
  material.fragmentShader = /* glsl */ `
    varying vec2 vUv;

    uniform sampler2D maskTexture;
    uniform sampler2D edgeTexture1;
    uniform float edgeStrength;
    uniform vec2 uResolution;
    uniform float uOutlineBreakup;
    uniform float uOutlineJitter;
    uniform float uOutlineWidthVariation;
    uniform float uOutlineStrokeWidth;
    uniform float uOutlineZoomScale;
    uniform float uOutlineRadius;
    uniform float uRimContinuity;
    uniform float uEdgeBristleReach;
    uniform float uIsRim;
    uniform vec2 uLayerDirection;
    uniform float uLayerOffsetMultiplier;

    vec3 sampleAnchoredPaintField(
      vec2 uv,
      vec2 resolution,
      float radius
    ) {
      vec2 field = vec2( 0.0 );
      float weight = 0.0;
      for ( int directionIndex = 0; directionIndex < 8; directionIndex ++ ) {
        float angle = float( directionIndex ) * 0.78539816339;
        vec2 direction = vec2( cos( angle ), sin( angle ) );
        vec4 surfaceSample = texture2D(
          maskTexture,
          uv + direction * radius / resolution
        );
        float sourcePixel = ( 1.0 - step( 0.5, surfaceSample.r ) )
          * ( 1.0 - step( 0.5, surfaceSample.g ) );
        field += surfaceSample.ba * sourcePixel;
        weight += sourcePixel;
      }
      return vec3( field, weight );
    }

    float sampleInternalObjectEdge( vec2 uv, vec2 resolution ) {
      vec2 stepUv = vec2( 1.5 ) / resolution;
      vec4 left = texture2D( maskTexture, uv - vec2( stepUv.x, 0.0 ) );
      vec4 right = texture2D( maskTexture, uv + vec2( stepUv.x, 0.0 ) );
      vec4 down = texture2D( maskTexture, uv - vec2( 0.0, stepUv.y ) );
      vec4 up = texture2D( maskTexture, uv + vec2( 0.0, stepUv.y ) );
      float insideHorizontal = ( 1.0 - step( 0.5, left.r ) )
        * ( 1.0 - step( 0.5, right.r ) );
      float insideVertical = ( 1.0 - step( 0.5, down.r ) )
        * ( 1.0 - step( 0.5, up.r ) );
      return max(
        smoothstep( 0.012, 0.06, abs( left.a - right.a ) ) * insideHorizontal,
        smoothstep( 0.012, 0.06, abs( down.a - up.a ) ) * insideVertical
      );
    }

    void main() {
      vec4 maskColor = texture2D( maskTexture, vUv );
      vec2 safeResolution = max( uResolution, vec2( 1.0 ) );
      float jitterAmount = uOutlineJitter / 0.08;
      vec2 layerOffset = uLayerDirection
        * jitterAmount
        * 2.4
        * uOutlineZoomScale
        * uLayerOffsetMultiplier
        / safeResolution;
      vec4 edgeValue = texture2D( edgeTexture1, vUv - layerOffset );
      // A Gaussian line loses amplitude as its radius grows. Normalize only
      // beyond the stock four-pixel kernel so the original low-width look is
      // unchanged while large radii still cross the painterly loop threshold.
      float edgeMagnitude = edgeValue.a * max( uOutlineRadius / 4.0, 1.0 );

      // Pull the paint field from nearby source-surface pixels in the solid
      // silhouette mask. The field therefore follows the object as it moves
      // and rotates, while the outline itself is still dilated in screen space.
      vec3 anchoredField = sampleAnchoredPaintField(
        vUv,
        safeResolution,
        1.5 * uOutlineZoomScale
      );
      if ( anchoredField.z < 0.5 ) anchoredField = sampleAnchoredPaintField(
        vUv,
        safeResolution,
        4.0 * uOutlineZoomScale
      );
      if ( anchoredField.z < 0.5 ) anchoredField = sampleAnchoredPaintField(
        vUv,
        safeResolution,
        7.5 * uOutlineZoomScale
      );
      if ( anchoredField.z < 0.5 ) anchoredField = sampleAnchoredPaintField(
        vUv,
        safeResolution,
        11.0 * uOutlineZoomScale
      );
      float brushLoad = anchoredField.z > 0.0
        ? anchoredField.x / anchoredField.z
        : 0.72;
      float deposit = clamp( brushLoad * 0.86, 0.0, 1.0 );

      // Draw a narrow isocontour through the dilation field instead of filling
      // the complete expanded mask. Brush load moves that contour inward and
      // outward, recreating the old wandering loop while the maximum envelope
      // remains bounded and independent of source triangles.
      float loopPosition = mix(
        0.115,
        0.03,
        mix( 0.5, brushLoad, uOutlineWidthVariation )
      );
      float strokeHalfWidth = mix(
        0.005,
        0.018,
        clamp( uOutlineStrokeWidth / 3.0, 0.0, 1.0 )
      );
      float edgeAntialias = max( fwidth( edgeMagnitude ) * 1.35, 0.0025 );
      float outlineBand = 1.0 - smoothstep(
        strokeHalfWidth,
        strokeHalfWidth + edgeAntialias,
        abs( edgeMagnitude - loopPosition )
      );
      float rimLow = mix( 0.66, 0.28, uRimContinuity );
      float rimHigh = mix( 0.84, 0.48, uRimContinuity );
      float rimInk = smoothstep(
        rimLow,
        rimHigh,
        brushLoad + deposit * 0.24
      );
      float attachedRimBand = smoothstep( 0.012, 0.095, edgeMagnitude );
      float attachedRimCoverage = attachedRimBand * mix(
        1.0,
        rimInk,
        uEdgeBristleReach * 0.88
      );
      float brushCoverage = smoothstep(
        0.38,
        0.72,
        brushLoad
      );
      float continuity = mix(
        1.0,
        brushCoverage,
        uOutlineBreakup * 0.86
      );
      float loopCoverage = outlineBand * continuity;
      float edgeDomain = max(
        maskColor.r,
        sampleInternalObjectEdge( vUv, safeResolution )
      );
      float coverage = mix( loopCoverage, attachedRimCoverage, uIsRim )
        * edgeDomain;
      if ( coverage < 0.46 ) discard;

      vec3 inkColor = edgeValue.rgb / max( edgeValue.a, 0.00001 );
      inkColor *= mix( 0.62, 1.38, deposit );
      float opacity = smoothstep( 0.46, 0.64, coverage )
        * clamp( edgeStrength * 0.36, 0.0, 1.0 );
      gl_FragColor = vec4( inkColor, opacity );
    }
  `;
  material.needsUpdate = true;
}

let currentPreset: PresetName = 'noir';
let currentScene: PaintSceneDefinition = initialScene;
let shaderEnabled = true;
let autoRotate = true;
let paused = false;
let elapsedTime = 0;
let currentDebugMode = 0;
let cameraGoal: CameraBookmark | null = null;
let frameCounter = 0;
let statsElapsed = 0;
let fpsEstimate = 60;
let hoveredMesh: THREE.Object3D | null = null;
let selectedPaintedObject: PaintedObject | null = null;
let outlineColorsManuallyOverridden = false;
const pointerDownClient = new THREE.Vector2();
let pointerGestureMoved = false;
let pointerGestureStartedOnGizmo = false;

const pointer = new THREE.Vector2(2, 2);
const raycaster = new THREE.Raycaster();
let previousFrameTime = performance.now();
let sceneActivationId = 0;

activateScene(initialScene.id, true);
applyTexturePreview(activeTexture.metadata, currentDebugMode);
bindInterface();
onResize();

requestAnimationFrame(() => {
  loading.classList.add('is-hidden');
  previousFrameTime = performance.now();
  requestAnimationFrame(animate);
});

type CreateObjectOptions = ScenePaintedObjectOptions;

function createPaintedObject(
  options: CreateObjectOptions,
  parent: THREE.Object3D = sceneContentRoot,
): PaintedObject {
  const paletteIndex = options.paletteIndex ?? null;
  const palette = options.palette ?? (
    paletteIndex === null
      ? undefined
      : PRESETS.noir.palettes[paletteIndex % PRESETS.noir.palettes.length]
  );
  if (!palette) throw new Error('Missing palette.');
  const geometry = options.geometry.getAttribute('aSmoothNormal')
    ? options.geometry
    : installSmoothNormalAttribute(options.geometry, options.smoothNormals ?? 'existing');
  const material = createPainterlyMaterial(paintGlobals, {
    palette,
    surfaceColor: options.surfaceColor,
    surfaceMap: options.surfaceMap,
    texturelessSurface: options.texturelessSurface,
    surfaceMapStrength: options.surfaceMapStrength,
    surfaceAlphaTest: options.surfaceAlphaTest,
    sourceAlbedoWeight: options.sourceAlbedoWeight,
    triplanarMacro: options.triplanarMacro,
    objectTextureScale: options.objectTextureScale,
    roughness: options.roughness,
    metalness: options.metalness,
    clearcoat: options.clearcoat,
    clearcoatRoughness: options.clearcoatRoughness,
    envMapIntensity: 0.82,
    side: options.side,
  });
  const nativeMaterial = options.nativeMaterial ?? createNativeMaterial(options, palette);
  const base = new THREE.Mesh(geometry, material);
  base.castShadow = true;
  base.receiveShadow = true;
  base.userData.paintLabel = options.label;
  const outlineRequested = options.shells !== false || options.screenOutline === true;
  let outlineId = options.outlineGroup
    ? outlineGroupIds.get(options.outlineGroup)
    : undefined;
  if (outlineId === undefined) {
    outlineObjectSerial += 1;
    outlineId = (((outlineObjectSerial * 73) % 251) + 1) / 252;
    if (options.outlineGroup) outlineGroupIds.set(options.outlineGroup, outlineId);
  }
  base.userData.paintOutlineId = outlineId;

  const depthMaterial = createPainterlyDepthMaterial(
    paintGlobals,
    options.objectTextureScale ?? 0.26,
    options.surfaceMap ?? null,
    options.surfaceAlphaTest ?? 0,
    options.side ?? THREE.FrontSide,
  );
  base.customDepthMaterial = depthMaterial;

  const group = new THREE.Group();
  group.name = options.label;
  group.position.copy(options.position ?? new THREE.Vector3());
  if (options.rotation) group.rotation.copy(options.rotation);
  if (options.scale) group.scale.copy(options.scale);
  group.add(base);

  const shells: THREE.ShaderMaterial[] = [];
  if (
    outlineRequested
    && currentScene.id === 'material-study'
    && options.shells !== false
  ) {
      const rimMaterial = createPaintShellMaterial(paintGlobals, {
        kind: 'rim',
        color: palette.rim,
        layer: 0,
        widthMultiplier: 1,
        objectWidthMultiplier: options.shellWidthScale,
        coverageBias: 0.08,
        objectTextureScale: options.objectTextureScale,
      });
      const rim = new THREE.Mesh(geometry, rimMaterial);
      rim.renderOrder = -1;
      rim.userData.paintShell = true;
      group.add(rim);
      shells.push(rimMaterial);

      const outlineA = createPaintShellMaterial(paintGlobals, {
        kind: 'outline',
        color: palette.outline,
        layer: 1,
        widthMultiplier: 1,
        objectWidthMultiplier: options.shellWidthScale,
        coverageBias: -0.01,
        offsetDirection: new THREE.Vector2(0.85, 0.28).normalize(),
        objectTextureScale: options.objectTextureScale,
      });
      const outlineMeshA = new THREE.Mesh(geometry, outlineA);
      outlineMeshA.renderOrder = -3;
      outlineMeshA.userData.paintShell = true;
      group.add(outlineMeshA);
      shells.push(outlineA);

      const outlineB = createPaintShellMaterial(paintGlobals, {
        kind: 'outline',
        color: palette.outlineSecondary,
        layer: 2,
        coverageBias: 0.025,
        offsetDirection: new THREE.Vector2(-0.52, 0.55).normalize(),
        offsetMultiplier: 1.35,
        objectWidthMultiplier: options.shellWidthScale,
        objectTextureScale: options.objectTextureScale,
      });
      const outlineMeshB = new THREE.Mesh(geometry, outlineB);
      outlineMeshB.renderOrder = -4;
      outlineMeshB.userData.paintShell = true;
      group.add(outlineMeshB);
      shells.push(outlineB);
  } else if (outlineRequested && currentScene.id !== 'material-study') {
    outlinedObjects.push(base);
  }

  const paintedObject: PaintedObject = {
    group,
    base,
    material,
    nativeMaterial,
    depthMaterial,
    outlineEnabled: outlineRequested,
    screenOutlineEnabled: outlineRequested && currentScene.id !== 'material-study',
    shells,
    paletteIndex,
    outlinePalette: {
      primary: new THREE.Color(palette.outline),
      secondary: new THREE.Color(palette.outlineSecondary),
    },
    outlinePaletteWeight: geometrySurfaceArea(geometry, options.scale),
    label: options.label,
    spin: options.spin ?? new THREE.Vector3(),
    initialPosition: group.position.clone(),
    initialRotation: group.rotation.clone(),
    initialScale: group.scale.clone(),
  };
  applyShaderModeToObject(paintedObject);
  paintedObjects.push(paintedObject);
  if (paintedObject.spin.lengthSq() > 0) animatedObjects.push(paintedObject);
  parent.add(group);
  return paintedObject;
}

function geometrySurfaceArea(
  geometry: THREE.BufferGeometry,
  scale = new THREE.Vector3(1, 1, 1),
): number {
  const position = geometry.getAttribute('position');
  if (!position) return 1;

  const index = geometry.getIndex();
  const elementCount = index?.count ?? position.count;
  const start = THREE.MathUtils.clamp(Math.floor(geometry.drawRange.start), 0, elementCount);
  const requestedCount = geometry.drawRange.count;
  const end = Number.isFinite(requestedCount)
    ? Math.min(start + Math.max(Math.floor(requestedCount), 0), elementCount)
    : elementCount;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const edgeA = new THREE.Vector3();
  const edgeB = new THREE.Vector3();
  let area = 0;

  for (let offset = start; offset + 2 < end; offset += 3) {
    const aIndex = index?.getX(offset) ?? offset;
    const bIndex = index?.getX(offset + 1) ?? offset + 1;
    const cIndex = index?.getX(offset + 2) ?? offset + 2;
    a.fromBufferAttribute(position, aIndex).multiply(scale);
    b.fromBufferAttribute(position, bIndex).multiply(scale);
    c.fromBufferAttribute(position, cIndex).multiply(scale);
    edgeA.subVectors(b, a);
    edgeB.subVectors(c, a);
    area += edgeA.cross(edgeB).length() * 0.5;
  }

  return Math.max(area, 0.001);
}

function createNativeMaterial(
  options: CreateObjectOptions,
  palette: PaintPalette,
): THREE.MeshPhysicalMaterial {
  const hasSurfaceMap = Boolean(options.surfaceMap) && (options.surfaceMapStrength ?? 1) > 0;
  return new THREE.MeshPhysicalMaterial({
    name: `${options.label} · native`,
    color: options.surfaceColor ?? (hasSurfaceMap ? 0xffffff : palette.light),
    map: hasSurfaceMap ? options.surfaceMap ?? null : null,
    alphaTest: options.surfaceAlphaTest ?? 0,
    roughness: options.roughness ?? 0.47,
    metalness: options.metalness ?? 0,
    clearcoat: options.clearcoat ?? 0,
    clearcoatRoughness: options.clearcoatRoughness ?? 0,
    envMapIntensity: 0.82,
    side: options.side ?? THREE.FrontSide,
  });
}

function createPaintedMesh(
  options: ScenePaintedMeshOptions,
  parent: THREE.Object3D,
): PaintedObject {
  const { source, geometry = source.geometry, ...paintOptions } = options;
  const painted = createPaintedObject({
    ...paintOptions,
    geometry,
    position: source.position.clone(),
    rotation: source.rotation.clone(),
    scale: source.scale.clone(),
  }, parent);

  if (!(source instanceof THREE.SkinnedMesh)) return painted;

  const originalBase = painted.base;
  const skinnedBase = createSkinnedSurfaceMesh(source, originalBase);
  const outlinedIndex = outlinedObjects.indexOf(originalBase);
  if (outlinedIndex >= 0) outlinedObjects[outlinedIndex] = skinnedBase;
  originalBase.removeFromParent();
  painted.group.add(skinnedBase);
  painted.base = skinnedBase;
  applyShaderModeToObject(painted);
  return painted;
}

function createSkinnedSurfaceMesh(
  source: THREE.SkinnedMesh,
  template: THREE.Mesh,
): THREE.SkinnedMesh {
  const mesh = new THREE.SkinnedMesh(template.geometry, template.material);
  mesh.name = template.name;
  mesh.bindMode = source.bindMode;
  mesh.bind(source.skeleton, source.bindMatrix);
  mesh.bindMatrixInverse.copy(source.bindMatrixInverse);
  mesh.castShadow = template.castShadow;
  mesh.receiveShadow = template.receiveShadow;
  mesh.renderOrder = template.renderOrder;
  mesh.frustumCulled = false;
  mesh.userData = { ...template.userData };
  mesh.customDepthMaterial = template.customDepthMaterial;
  mesh.customDistanceMaterial = template.customDistanceMaterial;
  if (source.morphTargetInfluences) {
    mesh.morphTargetInfluences = [...source.morphTargetInfluences];
  }
  if (source.morphTargetDictionary) {
    mesh.morphTargetDictionary = { ...source.morphTargetDictionary };
  }
  return mesh;
}

function activateScene(id: SceneId, immediate = false): void {
  const nextScene = paintSceneById(id);
  if (!nextScene) throw new Error(`Unknown paint scene: ${id}`);

  const activationId = ++sceneActivationId;
  outlineColorsManuallyOverridden = false;
  disposeSceneContent();
  currentScene = nextScene;
  applySceneControlDefaults(nextScene);
  const buildContext = {
    root: sceneContentRoot,
    addPaintedObject: (options, parent = sceneContentRoot) => {
      const painted = createPaintedObject(options, parent);
      return { group: painted.group, base: painted.base };
    },
    addPaintedMesh: (options, parent = sceneContentRoot) => {
      const painted = createPaintedMesh(options, parent);
      return { group: painted.group, base: painted.base };
    },
    isActive: () => sceneActivationId === activationId && currentScene.id === nextScene.id,
    onFrame: (update) => {
      if (sceneActivationId === activationId && currentScene.id === nextScene.id) {
        sceneFrameUpdaters.push(update);
      }
    },
  } satisfies import('./scenes/sceneRegistry.ts').SceneBuildContext;
  try {
    const buildResult = nextScene.build(buildContext);
    if (buildResult instanceof Promise) {
      void buildResult
        .then(() => {
          if (buildContext.isActive()) applySceneOutlineDefaults();
        })
        .catch((error) => {
          if (buildContext.isActive()) console.error(`[Paint/Lab] Could not build ${nextScene.label}.`, error);
        });
    }
  } catch (error) {
    console.error(`[Paint/Lab] Could not build ${nextScene.label}.`, error);
  }

  controls.minDistance = nextScene.orbitDistance.min;
  controls.maxDistance = nextScene.orbitDistance.max;
  applyPreset(nextScene.preferredPreset ?? currentPreset, true);

  const design = nextScene.cameraBookmarks.design;
  if (immediate) {
    cameraGoal = null;
    camera.position.copy(design.position);
    controls.target.copy(design.target);
    controls.update();
  } else {
    setCameraBookmark('design');
  }

  const sceneSelect = document.querySelector<HTMLSelectElement>('#scene-select');
  if (sceneSelect) sceneSelect.value = nextScene.id;
  const sceneEyebrow = document.querySelector<HTMLElement>('#scene-eyebrow');
  if (sceneEyebrow) sceneEyebrow.textContent = `THREE.JS R185 · ${nextScene.eyebrow}`;
  setHover(null);
  updateObjectLabel();
}

function disposeSceneContent(): void {
  clearSelection();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();

  for (const painted of paintedObjects) {
    materials.add(painted.material);
    materials.add(painted.nativeMaterial);
    materials.add(painted.depthMaterial);
    for (const shell of painted.shells) materials.add(shell);
  }

  sceneContentRoot.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of meshMaterials) materials.add(material);
    if (object.customDepthMaterial) materials.add(object.customDepthMaterial);
    if (object.customDistanceMaterial) materials.add(object.customDistanceMaterial);
  });

  sceneContentRoot.clear();
  delete sceneContentRoot.userData.seedThree;
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
  paintedObjects.length = 0;
  animatedObjects.length = 0;
  outlinedObjects.length = 0;
  outlineObjectSerial = 0;
  outlineGroupIds.clear();
  sceneFrameUpdaters.length = 0;
  hoveredMesh = null;
  delete sceneContentRoot.userData.cc0Man;
}

function createSky(uniforms: typeof skyUniforms): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vSkyDirection;
      void main() {
        vec4 world = modelMatrix * vec4( position, 1.0 );
        vSkyDirection = normalize( world.xyz - cameraPosition );
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 top;
      uniform vec3 horizon;
      uniform vec3 abyss;
      varying vec3 vSkyDirection;
      void main() {
        float vertical = normalize( vSkyDirection ).y;
        float upper = smoothstep( -0.01, 0.72, vertical );
        float lower = smoothstep( -0.28, 0.02, vertical );
        vec3 color = mix( abyss, horizon, lower );
        color = mix( color, top, upper );
        gl_FragColor = vec4( color, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(70, 48, 24), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;
  return mesh;
}

function applyPreset(name: PresetName, resetOutlineColors = false): void {
  currentPreset = name;
  const preset = PRESETS[name];
  skyUniforms.top.value.set(preset.top);
  skyUniforms.horizon.value.set(preset.horizon);
  skyUniforms.abyss.value.set(preset.abyss);
  if (scene.fog instanceof THREE.FogExp2) scene.fog.color.set(preset.fog);
  keyLight.color.set(preset.key);
  keyLight.intensity = preset.keyIntensity;
  fillLight.color.set(preset.fill);
  fillLight.intensity = preset.fillIntensity;
  accentLight.color.set(preset.accent);
  accentLight.intensity = preset.accentIntensity;
  renderer.toneMappingExposure = preset.exposure;

  for (const painted of paintedObjects) {
    if (painted.paletteIndex === null) continue;
    const palette = preset.palettes[painted.paletteIndex % preset.palettes.length];
    if (!palette) continue;
    const materialPalette = painted.material.paintPalette;
    (materialPalette.dark.value as THREE.Color).set(palette.dark);
    (materialPalette.light.value as THREE.Color).set(palette.light);
    (materialPalette.reflectionDark.value as THREE.Color).set(palette.reflectionDark);
    (materialPalette.reflectionLight.value as THREE.Color).set(palette.reflectionLight);
    (materialPalette.rim.value as THREE.Color).set(palette.rim);
    painted.outlinePalette.primary.set(palette.outline);
    painted.outlinePalette.secondary.set(palette.outlineSecondary);
    painted.shells.forEach((shell) => {
      const shellColor = shell.uniforms.uShellColor?.value as THREE.Color | undefined;
      const layer = shell.userData.paintShellLayer as number | undefined;
      // The two loop colors are shared live controls. Only the per-object rim
      // continues to follow its material palette.
      if (layer === 0) shellColor?.set(palette.rim);
    });
  }

  if (resetOutlineColors) applySceneOutlineDefaults(true);

  document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.preset === name);
  });
  requiredElement<HTMLElement>('#preset-eyebrow').textContent = preset.eyebrow;
  requiredElement<HTMLElement>('#preset-name').textContent = preset.label;
  syncOutlinePasses();
}

function applySceneOutlineDefaults(force = false): void {
  if (outlineColorsManuallyOverridden && !force) return;

  const outlined = paintedObjects.filter((painted) => painted.outlineEnabled);
  const heroes = outlined.filter((painted) => painted.group.userData.primary === true);
  const candidates = heroes.length > 0
    ? heroes
    : outlined.length > 0
      ? outlined
      : paintedObjects;
  const fallback = PRESETS[currentPreset].palettes[0];
  if (candidates.length === 0) {
    if (fallback) setOutlineColors(fallback.outline, fallback.outlineSecondary);
    outlineColorsManuallyOverridden = false;
    return;
  }

  const primary = new THREE.Color(0, 0, 0);
  const secondary = new THREE.Color(0, 0, 0);
  let totalWeight = 0;
  for (const painted of candidates) {
    const weight = painted.outlinePaletteWeight;
    primary.r += painted.outlinePalette.primary.r * weight;
    primary.g += painted.outlinePalette.primary.g * weight;
    primary.b += painted.outlinePalette.primary.b * weight;
    secondary.r += painted.outlinePalette.secondary.r * weight;
    secondary.g += painted.outlinePalette.secondary.g * weight;
    secondary.b += painted.outlinePalette.secondary.b * weight;
    totalWeight += weight;
  }
  primary.multiplyScalar(1 / Math.max(totalWeight, 0.001));
  secondary.multiplyScalar(1 / Math.max(totalWeight, 0.001));
  setOutlineColors(primary, secondary);
  outlineColorsManuallyOverridden = false;
}

function setOutlineColors(
  primary: THREE.ColorRepresentation,
  secondary: THREE.ColorRepresentation,
): void {
  (paintGlobals.outlinePrimaryColor.value as THREE.Color).set(primary);
  (paintGlobals.outlineSecondaryColor.value as THREE.Color).set(secondary);

  const primaryInput = document.querySelector<HTMLInputElement>('#outline-primary-color');
  const secondaryInput = document.querySelector<HTMLInputElement>('#outline-secondary-color');
  if (primaryInput) {
    primaryInput.value = `#${(paintGlobals.outlinePrimaryColor.value as THREE.Color).getHexString()}`;
  }
  if (secondaryInput) {
    secondaryInput.value = `#${(paintGlobals.outlineSecondaryColor.value as THREE.Color).getHexString()}`;
  }
  syncOutlinePasses();
}

function syncOutlinePasses(): void {
  // Keep outline width proportional to the model's apparent size. The design
  // bookmark is the authored 1x view; moving closer expands the strokes and
  // moving farther away contracts them by the same perspective ratio.
  const design = currentScene.cameraBookmarks.design;
  const referenceDistance = Math.max(
    design.position.distanceTo(design.target),
    0.001,
  );
  const currentDistance = Math.max(camera.position.distanceTo(controls.target), 0.001);
  const zoomScale = THREE.MathUtils.clamp(referenceDistance / currentDistance, 0.5, 4);
  paintGlobals.outlineZoomScale.value = zoomScale;

  const outlineDomainVisible = shaderEnabled
    && outlinedObjects.length > 0
    && (currentDebugMode === 0 || currentDebugMode === 8);
  const width = paintGlobals.outlineWidth.value as number;
  const rimWidth = paintGlobals.outerRimWidth.value as number;
  const loopsVisible = outlineDomainVisible && width > 0.00001;
  const rimVisible = outlineDomainVisible && rimWidth > 0.00001;
  outlinePrimaryPass.enabled = loopsVisible;
  outlineSecondaryPass.enabled = loopsVisible;
  outlineRimPass.enabled = rimVisible;
  if (!loopsVisible && !rimVisible) return;

  // The three original visual roles use bounded mask dilation on complex
  // meshes: attached rim, primary loop, and offset secondary loop.
  const separation = paintGlobals.outlineSeparation.value as number;
  const variation = paintGlobals.outlineWidthVariation.value as number;
  const breakup = paintGlobals.outlineBreakup.value as number;
  const strokeWidth = paintGlobals.outlineStrokeWidth.value as number;
  const jitter = paintGlobals.outlineJitter.value as number;
  const upperRangeExpansion = Math.pow(THREE.MathUtils.clamp(width / 0.24, 0, 1), 2) * 5;
  const primaryBaseRadius = 0.55 + width * 34 + upperRangeExpansion;
  const primaryRadius = THREE.MathUtils.clamp(
    primaryBaseRadius * zoomScale,
    0.65,
    COMPLEX_OUTLINE_MAX_RADIUS,
  );
  const rimRadius = THREE.MathUtils.clamp(
    (0.4 + rimWidth * 42) * zoomScale,
    0.5,
    COMPLEX_OUTLINE_MAX_RADIUS,
  );
  const secondaryRadius = THREE.MathUtils.clamp(
    primaryBaseRadius * separation * (1 + variation * 0.08) * zoomScale,
    Math.min(primaryRadius + 0.35 * zoomScale, COMPLEX_OUTLINE_MAX_RADIUS),
    COMPLEX_OUTLINE_MAX_RADIUS,
  );
  const brokenCoverage = THREE.MathUtils.clamp(
    1 - breakup * 0.32 - (jitter / 0.08) * 0.08,
    0.52,
    1,
  );

  outlineRimPass.edgeThickness = rimRadius;
  outlinePrimaryPass.edgeThickness = primaryRadius;
  outlineSecondaryPass.edgeThickness = secondaryRadius;
  outlineRimPass.overlayMaterial.uniforms.uOutlineRadius.value = rimRadius;
  outlinePrimaryPass.overlayMaterial.uniforms.uOutlineRadius.value = primaryRadius;
  outlineSecondaryPass.overlayMaterial.uniforms.uOutlineRadius.value = secondaryRadius;
  outlineRimPass.edgeStrength = 3.4;
  outlinePrimaryPass.edgeStrength = (2.6 + strokeWidth * 0.72) * brokenCoverage;
  outlineSecondaryPass.edgeStrength = (1.35 + strokeWidth * 0.48) * brokenCoverage;

  if (currentDebugMode === 8) {
    outlineRimPass.visibleEdgeColor.set('#ff143f');
    outlinePrimaryPass.visibleEdgeColor.set('#0deaff');
    outlineSecondaryPass.visibleEdgeColor.set('#ffe817');
  } else {
    const palette = PRESETS[currentPreset].palettes[0];
    if (palette) outlineRimPass.visibleEdgeColor.set(palette.rim);
    outlinePrimaryPass.visibleEdgeColor.copy(
      paintGlobals.outlinePrimaryColor.value as THREE.Color,
    );
    outlineSecondaryPass.visibleEdgeColor.copy(
      paintGlobals.outlineSecondaryColor.value as THREE.Color,
    );
  }
  outlineRimPass.hiddenEdgeColor.set(0x000000);
  outlinePrimaryPass.hiddenEdgeColor.set(0x000000);
  outlineSecondaryPass.hiddenEdgeColor.set(0x000000);
}

function bindInterface(): void {
  document.querySelectorAll<HTMLInputElement>('input[type="range"][data-uniform]').forEach((input) => {
    const uniformName = input.dataset.uniform as keyof PaintGlobalUniforms;
    const uniform = paintGlobals[uniformName];
    if (!uniform) return;
    input.value = String(uniform.value);
    updateRangeOutput(input);
    input.addEventListener('input', () => {
      uniform.value = Number(input.value);
      updateRangeOutput(input);
    });
  });

  document.querySelectorAll<HTMLInputElement>('input[type="color"][data-color-uniform]').forEach((input) => {
    const uniformName = input.dataset.colorUniform as 'outlinePrimaryColor' | 'outlineSecondaryColor';
    const color = paintGlobals[uniformName].value as THREE.Color;
    input.value = `#${color.getHexString()}`;
    input.addEventListener('input', () => {
      color.set(input.value);
      outlineColorsManuallyOverridden = true;
      syncOutlinePasses();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((button) => {
    button.addEventListener('click', () => applyPreset(button.dataset.preset as PresetName, true));
  });

  document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach((button) => {
    button.addEventListener('click', () => setCameraBookmark(button.dataset.camera as CameraBookmarkName));
  });

  requiredElement<HTMLSelectElement>('#scene-select').addEventListener('change', (event) => {
    activateScene((event.target as HTMLSelectElement).value as SceneId);
  });

  requiredElement<HTMLButtonElement>('#shader-toggle').addEventListener('click', () => {
    setShaderEnabled(!shaderEnabled);
  });

  const debugSelect = requiredElement<HTMLSelectElement>('#debug-mode');
  debugSelect.innerHTML = PAINT_DEBUG_MODES.map((mode) => `<option value="${mode}">${mode}</option>`).join('');
  debugSelect.addEventListener('change', () => {
    currentDebugMode = debugModeIndex(debugSelect.value as (typeof PAINT_DEBUG_MODES)[number]);
    paintGlobals.debugMode.value = currentDebugMode;
    applyTexturePreview(activeTexture.metadata, currentDebugMode);
    requiredElement<HTMLElement>('#view-status').textContent = debugSelect.value;
    syncOutlinePasses();
  });

  requiredElement<HTMLInputElement>('#auto-rotate').addEventListener('change', (event) => {
    autoRotate = (event.target as HTMLInputElement).checked;
  });
  requiredElement<HTMLInputElement>('#pause-motion').addEventListener('change', (event) => {
    paused = (event.target as HTMLInputElement).checked;
  });

  requiredElement<HTMLSelectElement>('#quality').addEventListener('change', (event) => {
    const quality = (event.target as HTMLSelectElement).value as 'balanced' | 'high' | 'ultra';
    renderer.setPixelRatio(pixelRatioForQuality(quality));
    composer.setPixelRatio(renderer.getPixelRatio());
    onResize();
  });

  requiredElement<HTMLButtonElement>('#seed-shuffle').addEventListener('click', () => {
    const nextSeed = (activeTexture.metadata.seedHash + 0x9e3779b9) >>> 0;
    replacePaintTexture(nextSeed);
  });

  requiredElement<HTMLButtonElement>('#reset-controls').addEventListener('click', resetShaderControls);
  requiredElement<HTMLButtonElement>('#export-settings').addEventListener('click', exportSettings);
  requiredElement<HTMLButtonElement>('#capture-frame').addEventListener('click', captureFrame);

  document.querySelectorAll<HTMLButtonElement>('[data-transform-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      setTransformMode(button.dataset.transformMode as TransformControlsMode);
    });
  });
  requiredElement<HTMLButtonElement>('#transform-close').addEventListener('click', clearSelection);

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointerleave', () => {
    pointer.set(2, 2);
    setHover(null);
  });
  renderer.domElement.addEventListener('dblclick', focusHoveredObject);
  controls.addEventListener('start', () => {
    cameraGoal = null;
  });
  window.addEventListener('resize', onResize);
  document.addEventListener('keydown', onKeyDown);
}

function setShaderEnabled(enabled: boolean): void {
  shaderEnabled = enabled;
  for (const painted of paintedObjects) applyShaderModeToObject(painted);
  syncOutlinePasses();

  const button = requiredElement<HTMLButtonElement>('#shader-toggle');
  button.classList.toggle('is-active', enabled);
  button.setAttribute('aria-pressed', String(enabled));
  button.setAttribute(
    'aria-label',
    enabled ? 'Turn painterly shader off' : 'Turn painterly shader on',
  );
  requiredElement<HTMLElement>('#shader-toggle-state').textContent = enabled ? 'ON' : 'OFF';
}

function applyShaderModeToObject(painted: PaintedObject): void {
  painted.base.material = shaderEnabled ? painted.material : painted.nativeMaterial;
  painted.base.customDepthMaterial = shaderEnabled ? painted.depthMaterial : undefined;
  painted.group.children.forEach((child) => {
    if (child.userData.paintShell === true) {
      child.visible = shaderEnabled && painted.outlineEnabled;
    }
  });

  const outlineIndex = outlinedObjects.indexOf(painted.base);
  if (shaderEnabled && painted.screenOutlineEnabled && outlineIndex < 0) {
    outlinedObjects.push(painted.base);
  } else if ((!shaderEnabled || !painted.screenOutlineEnabled) && outlineIndex >= 0) {
    outlinedObjects.splice(outlineIndex, 1);
  }
}

function replacePaintTexture(seed: number): void {
  const previous = activeTexture.texture;
  activeTexture = createPaintTexture({ size: 512, seed });
  activeTexture.texture.anisotropy = Math.min(12, renderer.capabilities.getMaxAnisotropy());
  paintGlobals.paintMap.value = activeTexture.texture;
  outlineRimPass.patternTexture = activeTexture.texture;
  outlinePrimaryPass.patternTexture = activeTexture.texture;
  outlineSecondaryPass.patternTexture = activeTexture.texture;
  for (const painted of paintedObjects) {
    painted.material.map = activeTexture.texture;
    painted.material.needsUpdate = true;
    const depth = painted.base.customDepthMaterial;
    if (depth instanceof THREE.MeshDepthMaterial) {
      depth.needsUpdate = true;
    }
  }
  previous.dispose();
  applyTexturePreview(activeTexture.metadata, currentDebugMode);
  requiredElement<HTMLElement>('#seed-value').textContent = activeTexture.metadata.seedHex.toUpperCase();
}

function resetShaderControls(): void {
  clearSelection();
  applySceneControlDefaults(currentScene);
  const debugSelect = requiredElement<HTMLSelectElement>('#debug-mode');
  debugSelect.value = 'Final';
  debugSelect.dispatchEvent(new Event('change'));
  replacePaintTexture(73021);
  for (const object of paintedObjects) {
    object.group.position.copy(object.initialPosition);
    object.group.rotation.copy(object.initialRotation);
    object.group.scale.copy(object.initialScale);
  }
  elapsedTime = 0;
  paused = true;
  requiredElement<HTMLInputElement>('#pause-motion').checked = true;
  applyPreset(currentScene.preferredPreset ?? 'noir', true);
  setCameraBookmark('design');
}

function applySceneControlDefaults(sceneDefinition: PaintSceneDefinition): void {
  const values: Partial<Record<keyof PaintGlobalUniforms, number>> = {
    ...defaultControls,
    ...sceneDefinition.controlOverrides,
  };
  for (const [name, value] of Object.entries(values)) {
    const uniform = paintGlobals[name as keyof PaintGlobalUniforms];
    if (uniform && typeof value === 'number') uniform.value = value;
  }
  document.querySelectorAll<HTMLInputElement>('input[type="range"][data-uniform]').forEach((input) => {
    const key = input.dataset.uniform as keyof PaintGlobalUniforms;
    const value = values[key];
    if (value === undefined) return;
    input.value = String(value);
    updateRangeOutput(input);
  });
}

function updateRangeOutput(input: HTMLInputElement): void {
  const output = document.querySelector<HTMLOutputElement>(`output[for="${input.id}"]`);
  if (!output) return;
  const precision = input.step.includes('.') ? Math.min(3, input.step.split('.')[1]?.length ?? 2) : 0;
  output.value = Number(input.value).toFixed(precision);
}

function setCameraBookmark(name: CameraBookmarkName): void {
  const bookmark = currentScene.cameraBookmarks[name];
  cameraGoal = {
    position: bookmark.position.clone(),
    target: bookmark.target.clone(),
  };
  document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.camera === name);
  });
}

function updateCameraGoal(delta: number): void {
  if (!cameraGoal) return;
  const blend = 1 - Math.exp(-delta * 5.5);
  camera.position.lerp(cameraGoal.position, blend);
  controls.target.lerp(cameraGoal.target, blend);
  if (
    camera.position.distanceToSquared(cameraGoal.position) < 0.0005
    && controls.target.distanceToSquared(cameraGoal.target) < 0.0005
  ) {
    camera.position.copy(cameraGoal.position);
    controls.target.copy(cameraGoal.target);
    cameraGoal = null;
  }
}

function onPointerMove(event: PointerEvent): void {
  const bounds = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  if (transformControls.dragging && event.button !== -1) {
    transformControls.pointerMove({
      x: pointer.x,
      y: pointer.y,
      button: -1,
    } as PointerEvent);
  }
  const pointerDeltaX = event.clientX - pointerDownClient.x;
  const pointerDeltaY = event.clientY - pointerDownClient.y;
  if (event.buttons !== 0 && pointerDeltaX * pointerDeltaX + pointerDeltaY * pointerDeltaY > 25) {
    pointerGestureMoved = true;
  }
}

function onPointerDown(event: PointerEvent): void {
  if (event.button !== 0) return;
  pointerDownClient.set(event.clientX, event.clientY);
  pointerGestureMoved = false;
  pointerGestureStartedOnGizmo = transformControls.axis !== null;
}

function onPointerUp(event: PointerEvent): void {
  if (event.button !== 0 || currentScene.id !== 'material-study') return;
  if (pointerGestureMoved || pointerGestureStartedOnGizmo || transformControls.dragging) return;
  const bounds = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(paintedObjects.map((object) => object.base), false)[0]?.object ?? null;
  selectPaintedObject(hit);
}

function updateHover(): void {
  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObjects(paintedObjects.map((object) => object.base), false);
  setHover(intersections[0]?.object ?? null);
}

function setHover(object: THREE.Object3D | null): void {
  if (hoveredMesh === object) return;
  hoveredMesh = object;
  renderer.domElement.style.cursor = object ? 'crosshair' : 'grab';
  updateObjectLabel();
}

function selectPaintedObject(mesh: THREE.Object3D | null): void {
  if (!mesh) {
    clearSelection();
    return;
  }
  const painted = paintedObjects.find((candidate) => candidate.base === mesh);
  if (!painted) return;
  selectedPaintedObject = painted;
  transformControls.attach(painted.group);
  const toolbar = requiredElement<HTMLElement>('#transform-toolbar');
  toolbar.hidden = false;
  requiredElement<HTMLElement>('#transform-object-name').textContent = painted.label;
  updateTransformReadout();
  updateObjectLabel();
}

function clearSelection(): void {
  selectedPaintedObject = null;
  transformControls.detach();
  const toolbar = document.querySelector<HTMLElement>('#transform-toolbar');
  if (toolbar) toolbar.hidden = true;
  updateObjectLabel();
}

function setTransformMode(mode: TransformControlsMode): void {
  transformControls.setMode(mode);
  transformControls.setSpace(mode === 'translate' ? 'world' : 'local');
  document.querySelectorAll<HTMLButtonElement>('[data-transform-mode]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.transformMode === mode);
  });
}

function updateTransformReadout(): void {
  const output = document.querySelector<HTMLOutputElement>('#transform-position');
  if (!output || !selectedPaintedObject) return;
  const { x, y, z } = selectedPaintedObject.group.position;
  output.value = `${x.toFixed(1)} ${y.toFixed(1)} ${z.toFixed(1)}`;
}

function updateObjectLabel(): void {
  const label = document.querySelector<HTMLElement>('#object-label');
  if (!label) return;
  if (selectedPaintedObject) {
    label.textContent = `${selectedPaintedObject.label} selected · W move · E rotate · R scale · Esc close`;
    label.classList.add('is-object', 'is-selected');
    return;
  }
  label.textContent = hoveredMesh?.userData.paintLabel
    ?? (currentScene.id === 'material-study'
      ? 'Click an object to move · drag to orbit · scroll to zoom'
      : 'Left drag to orbit · right drag to pan · scroll to zoom');
  label.classList.toggle('is-object', Boolean(hoveredMesh));
  label.classList.remove('is-selected');
}

function focusHoveredObject(): void {
  if (!hoveredMesh) return;
  const bounds = new THREE.Box3().setFromObject(hoveredMesh);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3()).length();
  const direction = camera.position.clone().sub(controls.target).normalize();
  cameraGoal = {
    target: center,
    position: center.clone().addScaledVector(direction, Math.max(size * 1.45, 4.8)),
  };
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
  if (event.key === '1') setCameraBookmark('near');
  if (event.key === '2') setCameraBookmark('design');
  if (event.key === '3') setCameraBookmark('far');
  if (selectedPaintedObject && event.key.toLowerCase() === 'w') setTransformMode('translate');
  if (selectedPaintedObject && event.key.toLowerCase() === 'e') setTransformMode('rotate');
  if (selectedPaintedObject && event.key.toLowerCase() === 'r') setTransformMode('scale');
  if (event.key === 'Escape') clearSelection();
  if (event.key.toLowerCase() === 'p') {
    paused = !paused;
    requiredElement<HTMLInputElement>('#pause-motion').checked = paused;
  }
}

function captureFrame(): void {
  renderFrame();
  renderer.domElement.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    link.download = `paint-shader-${currentScene.id}-${currentPreset}-${activeTexture.metadata.seedHex}.png`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }, 'image/png');
}

function exportSettings(): void {
  const preset = PRESETS[currentPreset];
  const payload: PaintLabSettingsExport = {
    format: 'paint-lab-settings',
    version: 2,
    exportedAt: new Date().toISOString(),
    threeRevision: THREE.REVISION,
    scene: {
      id: currentScene.id,
      label: currentScene.label,
    },
    look: {
      id: currentPreset,
      label: preset.label,
      palettes: preset.palettes,
    },
    paintTexture: activeTexture.metadata,
    controls: readPainterlyControls(paintGlobals),
    outlineColors: {
      primary: `#${(paintGlobals.outlinePrimaryColor.value as THREE.Color).getHexString()}`,
      secondary: `#${(paintGlobals.outlineSecondaryColor.value as THREE.Color).getHexString()}`,
    },
  };
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `paint-lab-${currentScene.id}-${currentPreset}-${activeTexture.metadata.seedHex}.json`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);

  const button = requiredElement<HTMLButtonElement>('#export-settings');
  button.textContent = 'JSON saved';
  window.setTimeout(() => {
    button.textContent = 'Export JSON';
  }, 1400);
}

function applyTexturePreview(metadata: PaintTextureMetadata, debugMode: number): void {
  const textureData = activeTexture.texture.image.data as Uint8Array;
  const sourceSize = metadata.width;
  const targetSize = 144;
  textureCanvas.width = targetSize;
  textureCanvas.height = targetSize;
  const image = textureContext.createImageData(targetSize, targetSize);
  for (let y = 0; y < targetSize; y += 1) {
    for (let x = 0; x < targetSize; x += 1) {
      const sourceX = Math.floor((x / targetSize) * sourceSize);
      const sourceY = Math.floor((y / targetSize) * sourceSize);
      const source = (sourceY * sourceSize + sourceX) * 4;
      const target = (y * targetSize + x) * 4;
      const r = textureData[source] ?? 128;
      const g = textureData[source + 1] ?? 128;
      const broad = textureData[source + 2] ?? 128;
      const detail = textureData[source + 3] ?? 128;
      if (debugMode === 2) {
        image.data.set([broad, broad, broad, 255], target);
      } else if (debugMode === 3 || debugMode === 6) {
        image.data.set([detail, detail, detail, 255], target);
      } else if (debugMode === 7 || debugMode === 8) {
        image.data.set([broad, detail, Math.round((broad + detail) * 0.38), 255], target);
      } else {
        const normalX = r / 127.5 - 1;
        const normalY = g / 127.5 - 1;
        const normalZ = Math.sqrt(Math.max(0, 1 - normalX * normalX - normalY * normalY));
        image.data.set([r, g, Math.round(normalZ * 127.5 + 127.5), 255], target);
      }
    }
  }
  textureContext.putImageData(image, 0, 0);
  requiredElement<HTMLElement>('#texture-meta').textContent = `${metadata.width}² · RG/B/A`;
  requiredElement<HTMLElement>('#seed-value').textContent = metadata.seedHex.toUpperCase();
}

function animate(frameTime: number): void {
  requestAnimationFrame(animate);
  const delta = Math.min(Math.max((frameTime - previousFrameTime) / 1000, 0), 0.05);
  previousFrameTime = frameTime;
  if (!paused) elapsedTime += delta;
  if (!paused) {
    for (const update of sceneFrameUpdaters) update(delta);
  }
  if (!paused && autoRotate) {
    for (const object of animatedObjects) {
      if (object === selectedPaintedObject) continue;
      object.group.rotation.x += object.spin.x * delta;
      object.group.rotation.y += object.spin.y * delta;
      object.group.rotation.z += object.spin.z * delta;
    }
  }

  updateCameraGoal(delta);
  controls.update(delta);
  updateHover();
  renderFrame(delta);

  frameCounter += 1;
  statsElapsed += delta;
  if (statsElapsed > 0.45) {
    fpsEstimate = Math.round(frameCounter / statsElapsed);
    frameCounter = 0;
    statsElapsed = 0;
    updateStats();
  }
}

function renderFrame(delta?: number): void {
  syncOutlinePasses();
  if (outlineRimPass.enabled || outlinePrimaryPass.enabled || outlineSecondaryPass.enabled) {
    composer.render(delta);
  } else {
    renderer.render(scene, camera);
  }
}

function updateStats(): void {
  const triangles = renderer.info.render.triangles;
  const calls = renderer.info.render.calls;
  requiredElement<HTMLElement>('#fps').textContent = String(fpsEstimate);
  requiredElement<HTMLElement>('#draw-calls').textContent = String(calls);
  requiredElement<HTMLElement>('#triangles').textContent = triangles > 999
    ? `${(triangles / 1000).toFixed(0)}K`
    : String(triangles);
  requiredElement<HTMLElement>('#elapsed').textContent = `${elapsedTime.toFixed(1)}s`;
}

function onResize(): void {
  const width = Math.max(viewport.clientWidth, 1);
  const height = Math.max(viewport.clientHeight, 1);
  (paintGlobals.viewportSize.value as THREE.Vector2).set(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  composer.setSize(width, height);
}

function pixelRatioForQuality(quality: 'balanced' | 'high' | 'ultra'): number {
  const limits = { balanced: 1, high: 1.5, ultra: 2 } as const;
  const cssPixels = Math.max(window.innerWidth * window.innerHeight, 1);
  const pixelBudget = quality === 'balanced' ? 1_050_000 : quality === 'high' ? 1_850_000 : 3_200_000;
  const budgetRatio = Math.sqrt(pixelBudget / cssPixels);
  return Math.max(0.75, Math.min(window.devicePixelRatio, limits[quality], budgetRatio));
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
}

function createInterfaceMarkup(): string {
  return `
    <main class="app-shell">
      <section id="viewport" class="viewport">
        <div id="loading" class="loading-card">
          <span class="loading-mark"></span>
          <span>Mixing pigments</span>
        </div>

        <header class="brand">
          <div class="brand-lockup">
            <div class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></div>
            <div>
              <p id="scene-eyebrow" class="kicker">THREE.JS R185 · ${initialScene.eyebrow}</p>
              <h1>Paint / Lab</h1>
            </div>
          </div>
          <label class="scene-picker" for="scene-select">
            <span>Active scene</span>
            <select id="scene-select" aria-label="Choose scene">
              ${PAINT_SCENES.map((paintScene) => `<option value="${paintScene.id}">${paintScene.label}</option>`).join('')}
            </select>
          </label>
          <button
            id="shader-toggle"
            class="shader-toggle is-active"
            type="button"
            aria-label="Turn painterly shader off"
            aria-pressed="true"
          >
            <span><i aria-hidden="true"></i>Painterly shader</span>
            <strong id="shader-toggle-state">ON</strong>
          </button>
        </header>

        <div class="shot-caption">
          <p id="preset-eyebrow" class="kicker">INK SHADOWS / HOT OIL</p>
          <p id="preset-name">Sunset noir</p>
          <span id="object-label">Left drag to orbit · right drag to pan · scroll to zoom</span>
        </div>

        <nav class="camera-dock" aria-label="Camera bookmarks">
          <button type="button" data-camera="near"><span>01</span> Detail</button>
          <button type="button" data-camera="design" class="is-active"><span>02</span> Hero</button>
          <button type="button" data-camera="far"><span>03</span> Wide</button>
        </nav>

        <div id="transform-toolbar" class="transform-toolbar" aria-label="Selected object tools" hidden>
          <strong id="transform-object-name">Object</strong>
          <output id="transform-position" aria-label="Object position">0.0 0.0 0.0</output>
          <button type="button" data-transform-mode="translate" class="is-active">Move <kbd>W</kbd></button>
          <button type="button" data-transform-mode="rotate">Rotate <kbd>E</kbd></button>
          <button type="button" data-transform-mode="scale">Scale <kbd>R</kbd></button>
          <button id="transform-close" type="button" aria-label="Close object gizmo">×</button>
        </div>

        <div class="runtime-pill" aria-label="Runtime statistics">
          <span><b id="fps">60</b> FPS</span>
          <span><b id="draw-calls">—</b> calls</span>
          <span><b id="triangles">—</b> tris</span>
          <span id="elapsed">0.0s</span>
        </div>
      </section>

      <aside class="control-panel" aria-label="Paint shader controls">
        <div class="panel-header">
          <div>
            <p class="kicker">LIVE MATERIAL GRAPH</p>
            <h2>Brush controls</h2>
          </div>
        </div>

        <div class="panel-scroll">
          <section class="preset-section">
            <div class="section-heading"><span>Look</span><small>01</small></div>
            <div class="preset-grid">
              <button type="button" data-preset="high-key"><i class="swatch high-key"></i>High key</button>
              <button type="button" data-preset="noir" class="is-active"><i class="swatch noir"></i>Noir</button>
              <button type="button" data-preset="ultraviolet"><i class="swatch ultraviolet"></i>UV</button>
              <button type="button" data-preset="earthy"><i class="swatch earthy"></i>Earthy</button>
              <button type="button" data-preset="sky"><i class="swatch sky"></i>Sky</button>
              <button type="button" data-preset="verdant"><i class="swatch verdant"></i>Verdant</button>
            </div>
          </section>

          <details open>
            <summary><span>Stroke field</span><small>02</small></summary>
            ${rangeMarkup('Brush scale', 'brush-scale', 'brushScale', 0.7, 8, 0.05)}
            ${rangeMarkup('Parallax depth', 'parallax-depth', 'parallaxDepth', 0, 0.12, 0.002)}
            ${rangeMarkup('Normal strength', 'normal-strength', 'normalStrength', 0, 1.8, 0.02)}
            ${rangeMarkup('Stroke contrast', 'stroke-contrast', 'strokeContrast', 0.2, 1, 0.01)}
            ${rangeMarkup('Bristle detail', 'detail-strength', 'detailStrength', 0, 1.5, 0.01)}
          </details>

          <details open>
            <summary><span>Painted light</span><small>03</small></summary>
            ${rangeMarkup('Shadow cut', 'shadow-threshold', 'shadowThreshold', -0.85, 0.25, 0.01)}
            ${rangeMarkup('Light cut', 'light-threshold', 'lightThreshold', 0.05, 0.9, 0.01)}
            ${rangeMarkup('Band feather', 'band-softness', 'bandSoftness', 0.005, 0.24, 0.005)}
            ${rangeMarkup('Shadow value', 'shadow-value', 'shadowValue', 0, 0.5, 0.01)}
            ${rangeMarkup('Midtone value', 'midtone-value', 'midtoneValue', 0.2, 0.85, 0.01)}
          </details>

          <details open>
            <summary><span>Oil &amp; relief</span><small>04</small></summary>
            ${rangeMarkup('Oil reflection', 'oil-strength', 'oilStrength', 0, 2.8, 0.01)}
            ${rangeMarkup('Reflection cut', 'oil-threshold', 'oilThreshold', -0.1, 0.9, 0.01)}
            ${rangeMarkup('Native sheen', 'native-sheen', 'nativeSheen', 0, 0.5, 0.005)}
            ${rangeMarkup('Highlight brush', 'highlight-brushiness', 'highlightBrushiness', 0, 1.5, 0.01)}
            ${rangeMarkup('Highlight steps', 'highlight-steps', 'highlightSteps', 1, 5, 1)}
            ${rangeMarkup('Roughness breakup', 'roughness-variation', 'roughnessVariation', 0, 0.75, 0.01)}
            ${rangeMarkup('Painted rim', 'rim-strength', 'rimStrength', 0, 2, 0.02)}
            ${rangeMarkup('Rim falloff', 'rim-power', 'rimPower', 0.7, 5, 0.05)}
          </details>

          <details open>
            <summary><span>Edges &amp; outlines</span><small>05</small></summary>
            ${rangeMarkup('Rim erosion', 'edge-erosion', 'edgeErosion', 0, 1, 0.01)}
            ${rangeMarkup('Bristle reach', 'edge-bristle-reach', 'edgeBristleReach', 0, 1, 0.01)}
            ${rangeMarkup('Erosion texture', 'erosion-scale', 'erosionScale', 0, 0.8, 0.01)}
            ${rangeMarkup('Curvature guard', 'curvature-guard', 'curvatureGuard', 1, 20, 0.25)}
            ${rangeMarkup('Outer rim width', 'outer-rim-width', 'outerRimWidth', 0, 0.11, 0.002)}
            ${rangeMarkup('Rim continuity', 'rim-continuity', 'rimContinuity', 0, 1, 0.01)}
            ${rangeMarkup('Outline width', 'outline-width', 'outlineWidth', 0, 0.24, 0.001)}
            <div class="outline-color-grid">
              ${colorMarkup('Primary loop', 'outline-primary-color', 'outlinePrimaryColor')}
              ${colorMarkup('Secondary loop', 'outline-secondary-color', 'outlineSecondaryColor')}
            </div>
            ${rangeMarkup('Width variation', 'outline-width-variation', 'outlineWidthVariation', 0, 1, 0.01)}
            ${rangeMarkup('Outline jitter', 'outline-jitter', 'outlineJitter', 0, 0.08, 0.002)}
            ${rangeMarkup('Loop separation', 'outline-separation', 'outlineSeparation', 1.05, 2.4, 0.01)}
            ${rangeMarkup('Loop breakup', 'outline-breakup', 'outlineBreakup', 0, 1, 0.01)}
            ${rangeMarkup('Loop stroke', 'outline-stroke-width', 'outlineStrokeWidth', 0.5, 3, 0.05)}
          </details>

          <details open>
            <summary><span>Stylized shadows</span><small>06</small></summary>
            ${rangeMarkup('Shadow erosion', 'shadow-erosion', 'shadowErosion', 0, 1, 0.01)}
            ${rangeMarkup('Mask cutoff', 'shadow-mask-offset', 'shadowMaskOffset', -0.4, 0.6, 0.01)}
            ${rangeMarkup('Shadow brush scale', 'shadow-brush-scale', 'shadowBrushScale', 0.35, 1.6, 0.01)}
          </details>

          <section class="diagnostics">
            <div class="section-heading"><span>Diagnostics</span><small>07</small></div>
            <div class="texture-card">
              <canvas id="texture-preview" width="144" height="144"></canvas>
              <div>
                <span>ONE PACKED MAP</span>
                <strong id="texture-meta">512² · RG/B/A</strong>
                <span>SEED <b id="seed-value">—</b></span>
                <button id="seed-shuffle" type="button">Shuffle field</button>
              </div>
            </div>
            <label class="select-row" for="debug-mode">
              <span>Output view</span>
              <select id="debug-mode"></select>
            </label>
            <p class="diagnostic-note"><span id="view-status">Final</span> · Surface-anchored brush outline · ACES output.</p>
          </section>

          <section class="playback-section">
            <div class="section-heading"><span>Presentation</span><small>07</small></div>
            <label class="select-row" for="quality">
              <span>Resolution</span>
              <select id="quality">
                <option value="balanced">Balanced</option>
                <option value="high" selected>High</option>
                <option value="ultra">Ultra</option>
              </select>
            </label>
            <div class="toggle-row">
              <label><input id="auto-rotate" type="checkbox" checked /><span></span> Object drift</label>
              <label><input id="pause-motion" type="checkbox" /><span></span> Freeze time</label>
            </div>
          </section>
        </div>

        <footer class="panel-footer">
          <button id="reset-controls" type="button">Reset</button>
          <button id="export-settings" type="button">Export JSON</button>
          <button id="capture-frame" class="primary-button" type="button">Capture PNG</button>
        </footer>
      </aside>
    </main>
  `;
}

function rangeMarkup(
  label: string,
  id: string,
  uniform: keyof PaintGlobalUniforms,
  min: number,
  max: number,
  step: number,
): string {
  return `
    <label class="range-row" for="${id}">
      <span>${label}</span>
      <output for="${id}">—</output>
      <input id="${id}" data-uniform="${uniform}" type="range" min="${min}" max="${max}" step="${step}" />
    </label>
  `;
}

function colorMarkup(
  label: string,
  id: string,
  uniform: 'outlinePrimaryColor' | 'outlineSecondaryColor',
): string {
  return `
    <label class="color-row" for="${id}">
      <span>${label}</span>
      <input
        id="${id}"
        data-color-uniform="${uniform}"
        type="color"
        aria-label="${label} color"
      />
    </label>
  `;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    transformControls.detach();
    transformControls.dispose();
    composer.dispose();
    renderer.dispose();
    environmentTarget.dispose();
    activeTexture.texture.dispose();
    window.removeEventListener('resize', onResize);
    document.removeEventListener('keydown', onKeyDown);
  });
}
