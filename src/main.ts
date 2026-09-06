import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  TransformControls,
  type TransformControlsMode,
} from 'three/addons/controls/TransformControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SurfaceBrushwork, SCENE_BRUSH_DEFAULTS, type SceneBrushSettings } from './SurfaceBrushwork.ts';
import './style.css';
import {
  PAINT_DEBUG_MODES,
  createPaintGlobalUniforms,
  createPainterlyMaterial,
  createPainterlyDepthMaterial,
  debugModeIndex,
  installSmoothNormalAttribute,
  readPainterlyControls,
  type PaintGlobalUniforms,
  type PaintPalette,
  type PainterlyControlValues,
  type PainterlyMaterial,
} from './PainterlyMaterial.ts';
import { createPaintTexture, type PaintTextureMetadata } from './paintTexture.ts';
import { createPigmentTexture } from './pigmentTexture.ts';
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
  paletteIndex: number | null;
  label: string;
  spin: THREE.Vector3;
  initialPosition: THREE.Vector3;
  initialRotation: THREE.Euler;
  initialScale: THREE.Vector3;
}

interface PaintLabSettingsExport {
  format: 'paint-lab-settings';
  version: 4;
  sceneBrushwork: SceneBrushSettings & { enabled: boolean };
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
  pigmentTexture: { seed: number; size: number; channels: string[] };
  controls: PainterlyControlValues;
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
        dark: '#497b86', light: '#df8f91', reflectionDark: '#bd3f67', reflectionLight: '#fff0df', rim: '#fff7ea', outline: '#8ec8dc', outlineSecondary: '#fff2d1',
      },
      {
        dark: '#655397', light: '#d47ca7', reflectionDark: '#e75474', reflectionLight: '#ffd7c3', rim: '#fff4ee', outline: '#b8ffe8', outlineSecondary: '#ffc7d5',
      },
      {
        dark: '#4d8283', light: '#e18c88', reflectionDark: '#ef4b57', reflectionLight: '#ffe4b5', rim: '#fff2d7', outline: '#93dce0', outlineSecondary: '#fff4b5',
      },
      {
        dark: '#60818e', light: '#e2a095', reflectionDark: '#ed7257', reflectionLight: '#f7eee4', rim: '#fff7ed', outline: '#a9e7f0', outlineSecondary: '#ffd8bf',
      },
      {
        dark: '#b66d79', light: '#efcbbb', reflectionDark: '#ff4d55', reflectionLight: '#ffd8a4', rim: '#fff0dc', outline: '#b7eef4', outlineSecondary: '#fff6d8',
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
        dark: '#378f9a', light: '#e36a62', reflectionDark: '#d3132c', reflectionLight: '#ff7a38', rim: '#ffb05e', outline: '#86b9db', outlineSecondary: '#ffe2b7',
      },
      {
        dark: '#7354a2', light: '#c76a9d', reflectionDark: '#e21d2f', reflectionLight: '#ff9349', rim: '#ffc06d', outline: '#9ebde8', outlineSecondary: '#ffd284',
      },
      {
        dark: '#4a858c', light: '#e16b72', reflectionDark: '#e42a23', reflectionLight: '#ffa55a', rim: '#ffd188', outline: '#b1cee6', outlineSecondary: '#fff0c4',
      },
      {
        dark: '#4f8da6', light: '#84b7c8', reflectionDark: '#cf2631', reflectionLight: '#ff8650', rim: '#ffb16d', outline: '#8ebbd1', outlineSecondary: '#ffbd7d',
      },
      {
        dark: '#a65379', light: '#e87755', reflectionDark: '#f13a1b', reflectionLight: '#ffb45e', rim: '#ffe09b', outline: '#93c7dc', outlineSecondary: '#ffe497',
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
        dark: '#4d407d', light: '#806db2', reflectionDark: '#7f2b91', reflectionLight: '#65e0d4', rim: '#ff9fcb', outline: '#dfff55', outlineSecondary: '#72f4e6',
      },
      {
        dark: '#5e4a8f', light: '#aa6bb3', reflectionDark: '#e44c9e', reflectionLight: '#9ef3ef', rim: '#ffc5e9', outline: '#e9ff66', outlineSecondary: '#a2f7ef',
      },
      {
        dark: '#704873', light: '#c86b9f', reflectionDark: '#ef4c77', reflectionLight: '#ffc87e', rim: '#ffe0bd', outline: '#f2ff74', outlineSecondary: '#ffb3dd',
      },
      {
        dark: '#3f7180', light: '#68a8a5', reflectionDark: '#7659d3', reflectionLight: '#82f3dd', rim: '#c2fff0', outline: '#dcff52', outlineSecondary: '#94fff0',
      },
      {
        dark: '#75486f', light: '#d86d9a', reflectionDark: '#fa4b77', reflectionLight: '#ffcf9f', rim: '#ffe0c5', outline: '#efff7a', outlineSecondary: '#ffa8dd',
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
        dark: '#70503f', light: '#a66f54', reflectionDark: '#8f3423', reflectionLight: '#d98a45', rim: '#f4d2a1', outline: '#76846a', outlineSecondary: '#d9b77d',
      },
      {
        dark: '#5e6045', light: '#87906a', reflectionDark: '#71462b', reflectionLight: '#c79b58', rim: '#ead8aa', outline: '#8f9a69', outlineSecondary: '#c8a978',
      },
      {
        dark: '#725b46', light: '#ba946b', reflectionDark: '#9d4e31', reflectionLight: '#e1b56f', rim: '#f5dfb6', outline: '#79765e', outlineSecondary: '#d4c08b',
      },
      {
        dark: '#78573a', light: '#b78047', reflectionDark: '#a74025', reflectionLight: '#e2a94f', rim: '#f7d991', outline: '#6f8060', outlineSecondary: '#daba6c',
      },
      {
        dark: '#764d45', light: '#a96e60', reflectionDark: '#a63e2c', reflectionLight: '#d9875a', rim: '#f0c7a0', outline: '#7d7661', outlineSecondary: '#d8a77b',
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
        dark: '#315d7c', light: '#5992b6', reflectionDark: '#126a90', reflectionLight: '#9fe4f2', rim: '#fff5dd', outline: '#c8efff', outlineSecondary: '#ffb899',
      },
      {
        dark: '#4a668f', light: '#759dc3', reflectionDark: '#6b5bb0', reflectionLight: '#b8edff', rim: '#fff8e6', outline: '#d6f5ff', outlineSecondary: '#ffc6ad',
      },
      {
        dark: '#557990', light: '#82b4c7', reflectionDark: '#d06472', reflectionLight: '#ffd0ae', rim: '#fff6e0', outline: '#c4eff5', outlineSecondary: '#ffc1a2',
      },
      {
        dark: '#536d89', light: '#8da9c2', reflectionDark: '#b95f69', reflectionLight: '#ffd39f', rim: '#fff4d6', outline: '#d2f2ff', outlineSecondary: '#ffb58e',
      },
      {
        dark: '#3e6b7d', light: '#6e99a8', reflectionDark: '#2e7394', reflectionLight: '#afe7e3', rim: '#f3fbef', outline: '#bfeaff', outlineSecondary: '#ffd2b0',
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
        dark: '#41634e', light: '#63815f', reflectionDark: '#506c2c', reflectionLight: '#bfd26c', rim: '#eef1bd', outline: '#8bb99b', outlineSecondary: '#d8d999',
      },
      {
        dark: '#52694c', light: '#79936a', reflectionDark: '#7b5a2c', reflectionLight: '#d2bf69', rim: '#f2ecc0', outline: '#9bc0a0', outlineSecondary: '#d6cf89',
      },
      {
        dark: '#536f4e', light: '#819e70', reflectionDark: '#4d7a47', reflectionLight: '#afd486', rim: '#edf5ca', outline: '#89b6a1', outlineSecondary: '#c8d990',
      },
      {
        dark: '#6a5845', light: '#927457', reflectionDark: '#5d3e25', reflectionLight: '#c09a5a', rim: '#eadcae', outline: '#7fa28a', outlineSecondary: '#c9bb7a',
      },
      {
        dark: '#3f6b65', light: '#689389', reflectionDark: '#3c6f5f', reflectionLight: '#a8d0a3', rim: '#e9f0c1', outline: '#91c1a8', outlineSecondary: '#d6dc91',
      },
    ],
  },
};

// One canonical art direction owns every scene. The former Look buttons made
// palette, light colour, exposure, and environment change together, which
// obscured whether a dark patch came from pigment or actual lighting.
const REFERENCE_LOOK_ID: PresetName = 'noir';

const initialScene = paintSceneById(new URLSearchParams(location.search).get('scene') ?? '') ?? PAINT_SCENES[0];
if (!initialScene) throw new Error('The paint scene registry is empty.');

const defaultControls = {
  painterliness: 1,
  pigmentVariation: 0.85,
  impastoStrength: 0.85,
  brushScale: 0.7,
  parallaxDepth: 0.048,
  normalStrength: 0.66,
  strokeContrast: 0.9,
  detailStrength: 0.72,
  shadowThreshold: -0.36,
  lightThreshold: 0.18,
  bandSoftness: 0.06,
  shadowValue: 0.02,
  midtoneValue: 0.74,
  oilStrength: 0.14,
  oilThreshold: 0.34,
  nativeSheen: 0,
  highlightBrushiness: 1.08,
  highlightSteps: 4,
  roughnessVariation: 0.36,
  rimStrength: 0.12,
  rimPower: 5,
  edgeErosion: 0.24,
  edgeBristleReach: 0.76,
  erosionScale: 0.66,
  curvatureGuard: 8,
  shadowErosion: 0.3,
  shadowMaskOffset: -0.05,
  shadowBrushScale: 0.72,
  outerRimWidth: 0.001,
  rimContinuity: 0.5,
  outlineWidth: 0.014,
  outlineJitter: 0.026,
  outlineSeparation: 1.35,
  outlineBreakup: 0.78,
  outlineStrokeWidth: 1.45,
  outlineWidthVariation: 0.68,
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
// Buffer size follows ResizeObserver; CSS must keep filling the viewport
// after opening/closing the palette instead of retaining the initial pixels.
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = PRESETS.noir.exposure;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
renderer.domElement.setAttribute('aria-label', 'Interactive painterly shader scene');
viewport.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(PRESETS.noir.fog, 0.012);

const camera = new THREE.PerspectiveCamera(
  48,
  Math.max(viewport.clientWidth, 1) / Math.max(viewport.clientHeight, 1),
  0.1,
  320,
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
transformControls.addEventListener('objectChange', () => {
  updateTransformReadout();
  renderer.shadowMap.needsUpdate = true;
});

const room = new RoomEnvironment();
const pmrem = new THREE.PMREMGenerator(renderer);
const environmentTarget = pmrem.fromScene(room, 0.035);
scene.environment = environmentTarget.texture;
scene.environmentIntensity = 0.62;
room.dispose();
pmrem.dispose();

let activeTexture = createPaintTexture({ size: 512, seed: 73021 });
activeTexture.texture.anisotropy = Math.min(12, renderer.capabilities.getMaxAnisotropy());
let pigmentTexture = createPigmentTexture();
pigmentTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const paintGlobals = createPaintGlobalUniforms(activeTexture.texture, pigmentTexture);
(paintGlobals.viewportSize.value as THREE.Vector2).set(
  Math.max(viewport.clientWidth, 1),
  Math.max(viewport.clientHeight, 1),
);

const skyUniforms = {
  pigment: paintGlobals.pigmentMap,
  painterliness: paintGlobals.painterliness,
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
const sceneFrameUpdaters: Array<(deltaSeconds: number) => void> = [];
const sceneContentRoot = new THREE.Group();
sceneContentRoot.name = 'Active paint scene';
scene.add(sceneContentRoot);

const sceneBrushwork = new SurfaceBrushwork(paintGlobals);
let sceneBrushEnabled = true;

let currentPreset: PresetName = REFERENCE_LOOK_ID;
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
const pointerDownClient = new THREE.Vector2();
let pointerGestureMoved = false;
let pointerGestureStartedOnGizmo = false;

const pointer = new THREE.Vector2(2, 2);
let hoverDirty = true;
let orbiting = false;
let lastHoverCheck = 0;
const raycaster = new THREE.Raycaster();
let previousFrameTime = performance.now();
let sceneActivationId = 0;

activateScene(initialScene.id, true);
applyTexturePreview(activeTexture.metadata, currentDebugMode);
bindInterface();
new ResizeObserver(onResize).observe(viewport);
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
    emissive: options.emissive,
    emissiveIntensity: options.emissiveIntensity,
    palette,
    surfaceColor: options.surfaceColor,
    surfaceMap: options.surfaceMap,
    texturelessSurface: options.texturelessSurface,
    surfaceMapStrength: options.surfaceMapStrength,
    surfaceAlphaTest: options.surfaceAlphaTest,
    sourceAlbedoWeight: options.sourceAlbedoWeight,
    preserveSourceAlbedo: options.preserveSourceAlbedo,
    triplanarMacro: options.triplanarMacro,
    objectTextureScale: options.objectTextureScale,
    lightPaintScale: options.lightPaintScale,
    macroVariation: options.macroVariation,
    pigmentContrast: options.pigmentContrast,
    roughness: options.roughness,
    metalness: options.metalness,
    clearcoat: options.clearcoat,
    clearcoatRoughness: options.clearcoatRoughness,
    envMapIntensity: 0.82,
    side: options.side,
  });
  material.userData.pigmentContrast = options.pigmentContrast ?? 0.55;
  const nativeMaterial = options.nativeMaterial ?? createNativeMaterial(options, palette);
  const base = new THREE.Mesh(geometry, material);
  base.castShadow = true;
  base.receiveShadow = true;
  base.userData.paintLabel = options.label;
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


  const paintedObject: PaintedObject = {
    group,
    base,
    material,
    nativeMaterial,
    depthMaterial,
    paletteIndex,
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
  // Lettering remains legible; all other painted surfaces get genuine deposits.
  if (!options.surfaceMap) sceneBrushwork.addSurface(base, material, 0.16, 73021 + paintedObjects.length * 3571);
  return paintedObject;
}

function createNativeMaterial(
  options: CreateObjectOptions,
  palette: PaintPalette,
): THREE.MeshPhysicalMaterial {
  const hasSurfaceMap = Boolean(options.surfaceMap) && (options.surfaceMapStrength ?? 1) > 0;
  return new THREE.MeshPhysicalMaterial({
    name: `${options.label} · native`,
    emissive: options.emissive ?? '#000000',
    emissiveIntensity: options.emissiveIntensity ?? 0,
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
  disposeSceneContent();
  currentScene = nextScene;
  const sceneUrl = new URL(window.location.href);
  sceneUrl.searchParams.set('scene', nextScene.id);
  window.history.replaceState(null, '', sceneUrl);
  currentPreset = nextScene.preferredPreset ?? REFERENCE_LOOK_ID;
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
          if (buildContext.isActive()) syncSceneBrushwork();
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
  applyReferenceLook();

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
  sceneBrushwork.clearSurfaces();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();

  for (const painted of paintedObjects) {
    materials.add(painted.material);
    materials.add(painted.nativeMaterial);
    materials.add(painted.depthMaterial);
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
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
  paintedObjects.length = 0;
  animatedObjects.length = 0;
  sceneFrameUpdaters.length = 0;
  hoveredMesh = null;
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
      uniform sampler2D pigment;
      uniform float painterliness;
      varying vec3 vSkyDirection;
      void main() {
        float vertical = normalize( vSkyDirection ).y;
        float upper = smoothstep( -0.08, 0.36, vertical );
        float lower = smoothstep( -0.28, 0.02, vertical );
        vec3 color = mix( abyss, horizon, lower );
        color = mix( color, top, upper );
        vec3 direction = normalize( vSkyDirection );
        vec2 skyUv = vec2( atan( direction.z, direction.x ) / 6.28318, asin( direction.y ) / 3.14159 );
        vec4 stroke = texture2D( pigment, skyUv * vec2( 3.0, 1.7 ) );
        color *= 1.0 + ( stroke.r - 0.5 ) * 0.22 * painterliness;
        color += color * 0.035 * stroke.a * painterliness;
        gl_FragColor = vec4( color, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(270, 48, 24), material);
  mesh.onBeforeRender = () => { mesh.position.copy(camera.position); mesh.updateMatrixWorld(); };
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;
  return mesh;
}

function applyReferenceLook(): void {
  renderer.shadowMap.needsUpdate = true;
  const preset = PRESETS[currentScene.preferredPreset ?? REFERENCE_LOOK_ID];
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
  if (currentScene.id === 'provence') {
    skyUniforms.top.value.set('#4d91b1');
    skyUniforms.horizon.value.set('#f1dab7');
    skyUniforms.abyss.value.set('#a5ad77');
  }
  if (scene.fog instanceof THREE.FogExp2) {
    scene.fog.density = currentScene.id === 'provence' ? 0.005 : 0.009;
  }
  const lighting = currentScene.lighting;
  if (lighting) {
    skyUniforms.top.value.set(lighting.top);
    skyUniforms.horizon.value.set(lighting.horizon);
    skyUniforms.abyss.value.set(lighting.abyss);
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.set(lighting.fog); scene.fog.density = lighting.fogDensity;
    }
    keyLight.color.set(lighting.key); keyLight.intensity = lighting.keyIntensity;
    fillLight.color.set(lighting.fill); fillLight.intensity = lighting.fillIntensity;
    accentLight.intensity = 0;
    renderer.toneMappingExposure = lighting.exposure;
  }

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

  }


  requiredElement<HTMLElement>('#preset-eyebrow').textContent = currentScene.eyebrow;
  requiredElement<HTMLElement>('#preset-name').textContent = currentScene.title;
  requiredElement<HTMLElement>('#scene-story').textContent = currentScene.description;
  syncSceneBrushwork();
}

function syncSceneBrushwork(): void {
  sceneBrushwork.sync(shaderEnabled && sceneBrushEnabled && currentDebugMode === 0
    && Number(paintGlobals.painterliness.value) > 0 && sceneBrushwork.settings.amount > 0, keyLight.intensity);
}

function updateSceneBrushControls(): void {
  document.querySelectorAll<HTMLInputElement>('input[data-finish]').forEach(input => {
    input.value = String(sceneBrushwork.settings[input.dataset.finish as keyof SceneBrushSettings]);
    updateRangeOutput(input);
  });
}

function bindInterface(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-toggle-panel]').forEach(button => {
    button.addEventListener('click', () => {
      const shell = requiredElement<HTMLElement>('.app-shell');
      const hidden = shell.classList.toggle('is-panel-hidden');
      requiredElement<HTMLButtonElement>('#panel-toggle').setAttribute('aria-expanded', String(!hidden));
    });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-style]').forEach(button => {
    button.addEventListener('click', () => {
      const styles: Record<string, Partial<PainterlyControlValues>> = {
        impasto: { painterliness: 1, pigmentVariation: 0.85, impastoStrength: 0.85, brushScale: 0.85, bandSoftness: 0.055, oilStrength: 0.08, rimStrength: 0.08 },
        gouache: { painterliness: 1, pigmentVariation: 0.7, impastoStrength: 0.15, brushScale: 0.7, bandSoftness: 0.018, oilStrength: 0, rimStrength: 0.02 },
        study: { painterliness: 1, pigmentVariation: 0.48, impastoStrength: 0.42, brushScale: 1.7, bandSoftness: 0.17, oilStrength: 0, rimStrength: 0.035 },
      };
      const values = styles[button.dataset.style!];
      if (!values) return;
      for (const [key, value] of Object.entries(values)) paintGlobals[key as keyof PaintGlobalUniforms].value = value;
      renderer.shadowMap.needsUpdate = true;
      document.querySelectorAll<HTMLInputElement>('input[data-uniform]').forEach(input => {
        input.value = String(paintGlobals[input.dataset.uniform as keyof PaintGlobalUniforms].value);
        updateRangeOutput(input);
      });
      document.querySelectorAll<HTMLButtonElement>('[data-style]').forEach(b => {
        b.classList.toggle('is-active', b === button); b.setAttribute('aria-pressed', String(b === button));
      });
    });
  });

  document.querySelectorAll<HTMLInputElement>('input[type="range"][data-uniform]').forEach((input) => {
    const uniformName = input.dataset.uniform as keyof PaintGlobalUniforms;
    const uniform = paintGlobals[uniformName];
    if (!uniform) return;
    input.value = String(uniform.value);
    updateRangeOutput(input);
    input.addEventListener('input', () => {
      uniform.value = Number(input.value);
      renderer.shadowMap.needsUpdate = true;
      updateRangeOutput(input);
      document.querySelectorAll<HTMLButtonElement>('[data-style]').forEach(b => {
        b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false');
      });
    });
  });

  document.querySelectorAll<HTMLInputElement>('input[data-finish]').forEach(input => {
    input.addEventListener('input', () => {
      sceneBrushwork.settings[input.dataset.finish as keyof SceneBrushSettings] = Number(input.value);
      updateRangeOutput(input);
    });
  });
  updateSceneBrushControls();
  requiredElement<HTMLInputElement>('#scene-brush-enabled').addEventListener('change', event => {
    sceneBrushEnabled = (event.target as HTMLInputElement).checked;
  });
  requiredElement<HTMLSelectElement>('#scene-brush-view').addEventListener('change', event => {
    sceneBrushwork.uniforms.debug.value = Number((event.target as HTMLSelectElement).value);
  });

  document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach((button) => {
    button.addEventListener('click', () => setCameraBookmark(button.dataset.camera as CameraBookmarkName));
  });

  requiredElement<HTMLSelectElement>('#scene-select').addEventListener('change', (event) => {
    activateScene((event.target as HTMLSelectElement).value as SceneId);
  });
  document.querySelectorAll<HTMLButtonElement>('[data-gallery-step]').forEach(button => {
    button.addEventListener('click', () => {
      const index = PAINT_SCENES.findIndex(painting => painting.id === currentScene.id);
      const next = (index + Number(button.dataset.galleryStep) + PAINT_SCENES.length) % PAINT_SCENES.length;
      activateScene(PAINT_SCENES[next]!.id);
    });
  });

  requiredElement<HTMLButtonElement>('#shader-toggle').addEventListener('click', () => {
    setShaderEnabled(!shaderEnabled);
  });

  const debugSelect = requiredElement<HTMLSelectElement>('#debug-mode');
  debugSelect.innerHTML = PAINT_DEBUG_MODES.filter(mode => !['Rim erosion', 'Edge layers', 'Texture weights'].includes(mode)).map((mode) => `<option value="${mode}">${mode}</option>`).join('');
  debugSelect.addEventListener('change', () => {
    currentDebugMode = debugModeIndex(debugSelect.value as (typeof PAINT_DEBUG_MODES)[number]);
    paintGlobals.debugMode.value = currentDebugMode;
    applyTexturePreview(activeTexture.metadata, currentDebugMode);
    requiredElement<HTMLElement>('#view-status').textContent = debugSelect.value;
    syncSceneBrushwork();
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
    orbiting = true;
  });
  controls.addEventListener('end', () => { orbiting = false; hoverDirty = true; });
  controls.addEventListener('change', () => { hoverDirty = true; });
  window.addEventListener('resize', onResize);
  document.addEventListener('keydown', onKeyDown);
}

function setShaderEnabled(enabled: boolean): void {
  renderer.shadowMap.needsUpdate = true;
  shaderEnabled = enabled;
  for (const painted of paintedObjects) applyShaderModeToObject(painted);
  syncSceneBrushwork();

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

}

function replacePaintTexture(seed: number): void {
  renderer.shadowMap.needsUpdate = true;
  sceneBrushwork.uniforms.seedPhase.value = (seed % 10007) / 10007;
  const previousPigment = pigmentTexture;
  pigmentTexture = createPigmentTexture(seed);
  pigmentTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  paintGlobals.pigmentMap.value = pigmentTexture;
  previousPigment.dispose();
  const previous = activeTexture.texture;
  activeTexture = createPaintTexture({ size: 512, seed });
  activeTexture.texture.anisotropy = Math.min(12, renderer.capabilities.getMaxAnisotropy());
  paintGlobals.paintMap.value = activeTexture.texture;
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
  applyReferenceLook();
  setCameraBookmark('design');
}

function applySceneControlDefaults(sceneDefinition: PaintSceneDefinition): void {
  Object.assign(sceneBrushwork.settings, SCENE_BRUSH_DEFAULTS);
  sceneBrushEnabled = true;
  sceneBrushwork.uniforms.debug.value = 0;
  sceneBrushwork.uniforms.seedPhase.value = (73021 % 10007) / 10007;
  const finishToggle = document.querySelector<HTMLInputElement>('#scene-brush-enabled');
  if (finishToggle) finishToggle.checked = true;
  const finishView = document.querySelector<HTMLSelectElement>('#scene-brush-view');
  if (finishView) finishView.value = '0';
  updateSceneBrushControls();
  document.querySelectorAll<HTMLButtonElement>('[data-style]').forEach(button => {
    const selected = button.dataset.style === 'impasto';
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
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
  hoverDirty = true;
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
  if (event.button !== 0 || !event.shiftKey) return;
  if (pointerGestureMoved || pointerGestureStartedOnGizmo || transformControls.dragging) return;
  const bounds = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(paintedObjects.map((object) => object.base), false)[0]?.object ?? null;
  selectPaintedObject(hit);
}

function updateHover(): void {
  if (!hoverDirty || orbiting || cameraGoal || transformControls.dragging) return;
  if (Math.abs(pointer.x) > 1 || Math.abs(pointer.y) > 1) {
    hoverDirty = false; setHover(null); return;
  }
  const now = performance.now();
  if (now - lastHoverCheck < 100) return;
  lastHoverCheck = now;
  hoverDirty = false;
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
  const hoveredLabel = hoveredMesh?.userData.paintLabel;
  label.textContent = (hoveredLabel === 'Painted details' ? null : hoveredLabel)
    ?? 'Drag to orbit · right drag to pan · scroll to explore';
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
  const lookId = currentScene.preferredPreset ?? currentPreset;
  const preset = PRESETS[lookId];
  const payload: PaintLabSettingsExport = {
    format: 'paint-lab-settings',
    version: 4,
    sceneBrushwork: { ...sceneBrushwork.settings, enabled: sceneBrushEnabled },
    exportedAt: new Date().toISOString(),
    threeRevision: THREE.REVISION,
    scene: {
      id: currentScene.id,
      label: currentScene.label,
    },
    look: {
      id: lookId,
      label: preset.label,
      palettes: preset.palettes,
    },
    paintTexture: activeTexture.metadata,
    pigmentTexture: {
      seed: Number(activeTexture.metadata.seed), size: 512,
      channels: ['pigment value', 'pigment temperature', 'bristle relief', 'paint load'],
    },
    controls: readPainterlyControls(paintGlobals),

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
  const textureData = (debugMode >= 13 ? pigmentTexture : activeTexture.texture).image.data as Uint8Array;
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
      if (debugMode === 13) {
        image.data.set([r, g, 82, 255], target);
      } else if (debugMode === 14) {
        image.data.set([broad, broad, broad, 255], target);
      } else if (debugMode === 2) {
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
  const delta = Math.min(Math.max((frameTime - previousFrameTime) / 1000, 0), 0.05);
  previousFrameTime = frameTime;
  if (!paused) elapsedTime += delta;
  if (!paused) {
    for (const update of sceneFrameUpdaters) update(delta);
    if (sceneFrameUpdaters.length || (autoRotate && animatedObjects.length)) renderer.shadowMap.needsUpdate = true;
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
  renderFrame();

  frameCounter += 1;
  statsElapsed += delta;
  if (statsElapsed > 0.45) {
    fpsEstimate = Math.round(frameCounter / statsElapsed);
    frameCounter = 0;
    statsElapsed = 0;
    updateStats();
  }
  // Schedule only a successful frame; a compile failure must not flood the
  // browser with the same error every refresh tick during shader development.
  requestAnimationFrame(animate);
}

function renderFrame(): void {
  syncSceneBrushwork();
  renderer.info.autoReset = false;
  renderer.info.reset();
  renderer.render(scene, camera);
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
  // Preserve the composition's horizontal envelope on portrait screens.
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(
    Math.tan(THREE.MathUtils.degToRad(24)) * Math.max(1, 0.85 / camera.aspect),
  ));
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
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
    <main class="app-shell ${window.matchMedia('(max-width: 980px)').matches ? 'is-panel-hidden' : ''}">
      <section id="viewport" class="viewport">
        <button id="panel-toggle" class="palette-toggle" data-toggle-panel type="button" aria-label="Toggle painter’s palette" aria-expanded="${!window.matchMedia('(max-width: 980px)').matches}" aria-controls="paint-panel">☷ Palette</button>
        <div id="loading" class="loading-card">
          <span class="loading-mark"></span>
          <span>Mixing pigments</span>
        </div>

        <header class="brand">
          <div class="brand-lockup">
            <div class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></div>
            <div>
              <p id="scene-eyebrow" class="kicker">THREE.JS R185 · ${initialScene.eyebrow}</p>
              <h1>Paint / Lab<span class="brand-edition">THE ATELIER COLLECTION</span></h1>
            </div>
          </div>
          <div class="gallery-picker">
            <button type="button" data-gallery-step="-1" aria-label="Previous painting">‹</button>
            <label class="scene-picker" for="scene-select">
              <span>The collection</span>
              <select id="scene-select" aria-label="Choose scene">
                ${PAINT_SCENES.map((paintScene) => `<option value="${paintScene.id}">${paintScene.label}</option>`).join('')}
              </select>
            </label>
            <button type="button" data-gallery-step="1" aria-label="Next painting">›</button>
          </div>
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
          <p id="preset-eyebrow" class="kicker">TRUE SHADOW / WHITE PAINT</p>
          <p id="preset-name">Reference paint</p>
          <p id="scene-story"></p>
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

      <aside id="paint-panel" class="control-panel" aria-label="Paint shader controls">
        <div class="panel-header">
          <div>
            <p class="kicker">MAKE YOUR MARK</p>
            <h2>The painter’s palette</h2>
          </div>
          <button class="palette-close" data-toggle-panel type="button" aria-label="Close painter’s palette">×</button>
        </div>

        <div class="panel-scroll">
          <section class="medium-section">
            <p class="medium-intro">A world made of brushstrokes.</p>
            <div class="medium-picker" aria-label="Painting medium">
              <button type="button" data-style="impasto" class="is-active" aria-pressed="true"><i class="swatch-oil"></i>Impasto</button>
              <button type="button" data-style="gouache" aria-pressed="false"><i class="swatch-gouache"></i>Gouache</button>
              <button type="button" data-style="study" aria-pressed="false"><i class="swatch-study"></i>Soft study</button>
            </div>
            ${rangeMarkup('Painterliness', 'painterliness', 'painterliness', 0, 1, 0.01)}
            ${rangeMarkup('Pigment variation', 'pigment-variation', 'pigmentVariation', 0, 1.5, 0.01)}
            ${rangeMarkup('Impasto relief', 'impasto-strength', 'impastoStrength', 0, 1.5, 0.01)}
          </section>
          <details open class="scene-brush-section">
            <summary><span>Paint beyond the edges</span><small>04</small></summary>
            <p class="finish-note">Loaded strokes follow the surfaces, catch their light, and leave bristle tips at the silhouette.</p>
            <div class="toggle-row"><label><input id="scene-brush-enabled" type="checkbox" checked /><span></span> Whole-scene brushwork</label></div>
            ${finishRangeMarkup('Scene brushwork', 'amount', 0, 1, 0.01)}
            ${finishRangeMarkup('Silhouette splay', 'splay', 0, 2.5, 0.01)}
            ${finishRangeMarkup('Stroke size', 'size', 0.4, 2.5, 0.01)}
            ${finishRangeMarkup('Dry edges', 'dry', 0, 1, 0.01)}
            <label class="select-row" for="scene-brush-view"><span>Brushwork view</span><select id="scene-brush-view">
              <option value="0">Finished painting</option><option value="1">Brush deposits only</option><option value="2">Stroke coverage</option>
            </select></label>
          </details>

          <details open>
            <summary><span>Stroke field</span><small>01</small></summary>
            ${rangeMarkup('Brush scale', 'brush-scale', 'brushScale', 0.25, 8, 0.05)}
            ${rangeMarkup('Parallax depth', 'parallax-depth', 'parallaxDepth', 0, 0.12, 0.002)}
            ${rangeMarkup('Normal strength', 'normal-strength', 'normalStrength', 0, 1.8, 0.02)}
            ${rangeMarkup('Stroke contrast', 'stroke-contrast', 'strokeContrast', 0.2, 1, 0.01)}
            ${rangeMarkup('Bristle detail', 'detail-strength', 'detailStrength', 0, 1.5, 0.01)}
          </details>

          <details open>
            <summary><span>Painted light</span><small>02</small></summary>
            ${rangeMarkup('Shadow cut', 'shadow-threshold', 'shadowThreshold', -0.85, 0.25, 0.01)}
            ${rangeMarkup('Light cut', 'light-threshold', 'lightThreshold', 0.05, 0.9, 0.01)}
            ${rangeMarkup('Band feather', 'band-softness', 'bandSoftness', 0.005, 0.24, 0.005)}
            ${rangeMarkup('Shadow value', 'shadow-value', 'shadowValue', 0, 0.5, 0.01)}
            ${rangeMarkup('Midtone value', 'midtone-value', 'midtoneValue', 0.2, 0.85, 0.01)}
          </details>

          <details open>
            <summary><span>Oil &amp; relief</span><small>03</small></summary>
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
                <span>BRUSH + PIGMENT MAPS</span>
                <strong id="texture-meta">512² · RG/B/A</strong>
                <span>SEED <b id="seed-value">—</b></span>
                <button id="seed-shuffle" type="button">Shuffle field</button>
              </div>
            </div>
            <label class="select-row" for="debug-mode">
              <span>Output view</span>
              <select id="debug-mode"></select>
            </label>
            <p class="diagnostic-note"><span id="view-status">Final</span> · Object-anchored pigment &amp; bristle relief.</p>
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

function finishRangeMarkup(label: string, key: keyof SceneBrushSettings, min: number, max: number, step: number): string {
  return `<label class="range-row" for="finish-${key}"><span>${label}</span><output for="finish-${key}">—</output>
    <input id="finish-${key}" data-finish="${key}" type="range" min="${min}" max="${max}" step="${step}" /></label>`;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    transformControls.detach();
    transformControls.dispose();
    sceneBrushwork.dispose();
    renderer.dispose();
    environmentTarget.dispose();
    activeTexture.texture.dispose();
    window.removeEventListener('resize', onResize);
    document.removeEventListener('keydown', onKeyDown);
  });
}
