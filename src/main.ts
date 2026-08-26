import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import './style.css';
import {
  PAINT_DEBUG_MODES,
  createPaintGlobalUniforms,
  createPainterlyMaterial,
  createPainterlyDepthMaterial,
  createPaintShellMaterial,
  debugModeIndex,
  installSmoothNormalAttribute,
  type PaintGlobalUniforms,
  type PaintPalette,
  type PainterlyMaterial,
} from './PainterlyMaterial.ts';
import { createPaintTexture, type PaintTextureMetadata } from './paintTexture.ts';

type PresetName = 'high-key' | 'noir' | 'ultraviolet';

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
  shells: THREE.ShaderMaterial[];
  paletteIndex: number;
  label: string;
  spin: THREE.Vector3;
  initialRotation: THREE.Euler;
}

interface CameraBookmark {
  position: THREE.Vector3;
  target: THREE.Vector3;
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
    exposure: 1.02,
    palettes: [
      {
        dark: '#05070d', light: '#172843', reflectionDark: '#a21019', reflectionLight: '#ff6a1f', rim: '#ffb05e', outline: '#86b9db', outlineSecondary: '#ffe2b7',
      },
      {
        dark: '#090411', light: '#382d49', reflectionDark: '#d3191c', reflectionLight: '#ff8a38', rim: '#ffc06d', outline: '#9ebde8', outlineSecondary: '#ffd284',
      },
      {
        dark: '#0c0712', light: '#50323f', reflectionDark: '#dc2118', reflectionLight: '#ff9b45', rim: '#ffd188', outline: '#b1cee6', outlineSecondary: '#fff0c4',
      },
      {
        dark: '#101726', light: '#536c83', reflectionDark: '#be1e1d', reflectionLight: '#ff7540', rim: '#ffb16d', outline: '#8ebbd1', outlineSecondary: '#ffbd7d',
      },
      {
        dark: '#12060b', light: '#7b201b', reflectionDark: '#f02e15', reflectionLight: '#ffb255', rim: '#ffe09b', outline: '#93c7dc', outlineSecondary: '#ffe497',
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
};

const CAMERA_BOOKMARKS: Record<'near' | 'design' | 'far', CameraBookmark> = {
  near: {
    position: new THREE.Vector3(1.1, 2.25, 7.4),
    target: new THREE.Vector3(-1.55, 0.35, 0.35),
  },
  design: {
    position: new THREE.Vector3(10.7, 6.2, 14.8),
    target: new THREE.Vector3(0.1, 0.75, -0.35),
  },
  far: {
    position: new THREE.Vector3(15.6, 9.5, 22.5),
    target: new THREE.Vector3(0, 0.7, -0.8),
  },
};

const defaultControls = {
  brushScale: 3.25,
  parallaxDepth: 0.048,
  normalStrength: 0.9,
  strokeContrast: 0.9,
  detailStrength: 0.72,
  shadowThreshold: -0.7,
  lightThreshold: 0.3,
  bandSoftness: 0.01,
  shadowValue: 0,
  midtoneValue: 0.25,
  oilStrength: 0.85,
  oilThreshold: 0.5,
  roughnessVariation: 0.36,
  rimStrength: 0.9,
  rimPower: 5,
  edgeErosion: 0.68,
  edgeBristleReach: 0.66,
  erosionScale: 0.58,
  curvatureGuard: 8,
  shadowErosion: 1,
  shadowMaskOffset: 0,
  outerRimWidth: 0.06,
  rimContinuity: 0.9,
  outlineWidth: 0.128,
  outlineJitter: 0.046,
  outlineSeparation: 1.72,
  outlineBreakup: 0.48,
  outlineStrokeWidth: 1.55,
};

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
camera.position.copy(CAMERA_BOOKMARKS.design.position);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = true;
controls.screenSpacePanning = false;
controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
controls.minDistance = 5.5;
controls.maxDistance = 35;
controls.minPolarAngle = 0.35;
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.copy(CAMERA_BOOKMARKS.design.target);
controls.update();

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
keyLight.shadow.camera.left = -13;
keyLight.shadow.camera.right = 13;
keyLight.shadow.camera.top = 12;
keyLight.shadow.camera.bottom = -8;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 38;
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
buildGallery();

let currentPreset: PresetName = 'noir';
let autoRotate = true;
let paused = false;
let elapsedTime = 0;
let currentDebugMode = 0;
let cameraGoal: CameraBookmark | null = null;
let frameCounter = 0;
let statsElapsed = 0;
let fpsEstimate = 60;
let hoveredMesh: THREE.Object3D | null = null;

const pointer = new THREE.Vector2(2, 2);
const raycaster = new THREE.Raycaster();
let previousFrameTime = performance.now();

applyPreset('noir');
applyTexturePreview(activeTexture.metadata, currentDebugMode);
bindInterface();
onResize();

requestAnimationFrame(() => {
  loading.classList.add('is-hidden');
  previousFrameTime = performance.now();
  requestAnimationFrame(animate);
});

function buildGallery(): void {
  const floorGeometry = installSmoothNormalAttribute(new THREE.PlaneGeometry(24, 18, 1, 1), 'existing');
  const floor = createPaintedObject({
    label: 'Painted ground',
    geometry: floorGeometry,
    paletteIndex: 4,
    position: new THREE.Vector3(0, -1.88, -1.2),
    rotation: new THREE.Euler(-Math.PI / 2, 0, -0.03),
    shells: false,
    roughness: 0.78,
    metalness: 0.02,
    clearcoat: 0.12,
  });
  floor.base.receiveShadow = true;

  const leftWallGeometry = installSmoothNormalAttribute(new THREE.PlaneGeometry(11, 11, 1, 1), 'existing');
  const leftWall = createPaintedObject({
    label: 'Painted wall',
    geometry: leftWallGeometry,
    paletteIndex: 2,
    position: new THREE.Vector3(-7.2, 3.25, -3.2),
    rotation: new THREE.Euler(0, Math.PI * 0.5, 0),
    shells: false,
    roughness: 0.8,
    metalness: 0,
    clearcoat: 0.08,
  });
  leftWall.base.receiveShadow = true;

  const heroSphere = createPaintedObject({
    label: 'Hero sphere',
    geometry: installSmoothNormalAttribute(new THREE.SphereGeometry(2.3, 128, 72), 'existing'),
    paletteIndex: 0,
    position: new THREE.Vector3(-2.45, 0.48, 0.85),
    spin: new THREE.Vector3(0, 0.11, 0),
    triplanarMacro: true,
    objectTextureScale: 0.2,
    roughness: 0.27,
    metalness: 0.5,
    clearcoat: 0.72,
    clearcoatRoughness: 0.16,
  });

  createPaintedObject({
    label: 'Floating sphere',
    geometry: installSmoothNormalAttribute(new THREE.SphereGeometry(1.55, 96, 56), 'existing'),
    paletteIndex: 1,
    position: new THREE.Vector3(-0.05, 3.25, -2.25),
    spin: new THREE.Vector3(0, -0.08, 0),
    triplanarMacro: true,
    objectTextureScale: 0.22,
    roughness: 0.31,
    metalness: 0.44,
    clearcoat: 0.64,
  });

  createPaintedObject({
    label: 'Mid sphere',
    geometry: installSmoothNormalAttribute(new THREE.SphereGeometry(1.38, 96, 56), 'existing'),
    paletteIndex: 2,
    position: new THREE.Vector3(1.35, 0.02, -1.35),
    spin: new THREE.Vector3(0, 0.13, 0),
    triplanarMacro: true,
    objectTextureScale: 0.24,
    roughness: 0.34,
    metalness: 0.38,
    clearcoat: 0.55,
  });

  const wedgeShape = new THREE.Shape();
  wedgeShape.moveTo(-2.2, -1.55);
  wedgeShape.lineTo(2.2, -1.55);
  wedgeShape.lineTo(0.2, 1.75);
  wedgeShape.closePath();
  const wedgeGeometry = new THREE.ExtrudeGeometry(wedgeShape, {
    depth: 2.65,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: 0.11,
    bevelThickness: 0.11,
  });
  wedgeGeometry.center();
  wedgeGeometry.computeVertexNormals();
  createPaintedObject({
    label: 'Wedge block',
    geometry: installSmoothNormalAttribute(wedgeGeometry, 'radial'),
    paletteIndex: 3,
    position: new THREE.Vector3(4.35, -0.1, 0.25),
    rotation: new THREE.Euler(-0.08, -0.64, 0.04),
    spin: new THREE.Vector3(0, -0.028, 0),
    triplanarMacro: true,
    objectTextureScale: 0.16,
    roughness: 0.52,
    metalness: 0.11,
    clearcoat: 0.36,
  });

  createPaintedObject({
    label: 'Suspended cylinder',
    geometry: installSmoothNormalAttribute(new THREE.CylinderGeometry(0.68, 0.68, 1.65, 72, 4), 'radial'),
    paletteIndex: 4,
    position: new THREE.Vector3(-2.0, 3.95, -2.65),
    rotation: new THREE.Euler(0.05, 0.1, Math.PI / 2),
    spin: new THREE.Vector3(0.04, 0.05, 0.12),
    roughness: 0.3,
    metalness: 0.46,
    clearcoat: 0.56,
  });

  createPaintedObject({
    label: 'Brush cylinder',
    geometry: installSmoothNormalAttribute(new THREE.CylinderGeometry(1.02, 1.02, 2.75, 84, 6), 'radial'),
    paletteIndex: 1,
    position: new THREE.Vector3(3.6, -0.5, -2.45),
    rotation: new THREE.Euler(Math.PI / 2, 0.15, -0.42),
    spin: new THREE.Vector3(0.03, 0.04, -0.02),
    roughness: 0.29,
    metalness: 0.5,
    clearcoat: 0.62,
  });

  createPaintedObject({
    label: 'Rounded monolith',
    geometry: installSmoothNormalAttribute(new RoundedBoxGeometry(1.2, 2.6, 1.2, 8, 0.18), 'radial'),
    paletteIndex: 3,
    position: new THREE.Vector3(5.35, 2.8, -3.55),
    rotation: new THREE.Euler(0.08, -0.24, -0.13),
    spin: new THREE.Vector3(0.02, -0.07, 0.025),
    triplanarMacro: true,
    objectTextureScale: 0.3,
    roughness: 0.38,
    metalness: 0.3,
    clearcoat: 0.48,
  });

  const pedestalGeometry = installSmoothNormalAttribute(new RoundedBoxGeometry(4.8, 0.48, 4.1, 5, 0.12), 'radial');
  const pedestal = createPaintedObject({
    label: 'Painted plinth',
    geometry: pedestalGeometry,
    paletteIndex: 3,
    position: new THREE.Vector3(0.55, -1.55, -1.3),
    rotation: new THREE.Euler(0, -0.08, 0),
    shells: false,
    roughness: 0.67,
    metalness: 0.04,
    clearcoat: 0.18,
  });
  pedestal.base.receiveShadow = true;

  heroSphere.group.userData.primary = true;
}

interface CreateObjectOptions {
  label: string;
  geometry: THREE.BufferGeometry;
  paletteIndex: number;
  position: THREE.Vector3;
  rotation?: THREE.Euler;
  spin?: THREE.Vector3;
  shells?: boolean;
  roughness?: number;
  metalness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  triplanarMacro?: boolean;
  objectTextureScale?: number;
}

function createPaintedObject(options: CreateObjectOptions): PaintedObject {
  const palette = PRESETS.noir.palettes[options.paletteIndex % PRESETS.noir.palettes.length];
  if (!palette) throw new Error('Missing palette.');
  const material = createPainterlyMaterial(paintGlobals, {
    palette,
    triplanarMacro: options.triplanarMacro,
    objectTextureScale: options.objectTextureScale,
    roughness: options.roughness,
    metalness: options.metalness,
    clearcoat: options.clearcoat,
    clearcoatRoughness: options.clearcoatRoughness,
    envMapIntensity: 0.82,
  });
  const base = new THREE.Mesh(options.geometry, material);
  base.castShadow = true;
  base.receiveShadow = true;
  base.userData.paintLabel = options.label;

  const depthMaterial = createPainterlyDepthMaterial(paintGlobals);
  base.customDepthMaterial = depthMaterial;

  const group = new THREE.Group();
  group.name = options.label;
  group.position.copy(options.position);
  if (options.rotation) group.rotation.copy(options.rotation);
  group.add(base);

  const shells: THREE.ShaderMaterial[] = [];
  if (options.shells !== false) {
    const rimMaterial = createPaintShellMaterial(paintGlobals, {
      kind: 'rim',
      color: palette.rim,
      layer: 0,
      widthMultiplier: 1,
      coverageBias: 0.08,
      objectTextureScale: options.objectTextureScale,
    });
    const rim = new THREE.Mesh(options.geometry, rimMaterial);
    rim.renderOrder = -1;
    rim.userData.paintShell = true;
    group.add(rim);
    shells.push(rimMaterial);

    const outlineA = createPaintShellMaterial(paintGlobals, {
      kind: 'outline',
      color: palette.outline,
      layer: 1,
      widthMultiplier: 1,
      coverageBias: -0.01,
      offsetDirection: new THREE.Vector2(0.85, 0.28).normalize(),
      objectTextureScale: options.objectTextureScale,
    });
    const outlineMeshA = new THREE.Mesh(options.geometry, outlineA);
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
      objectTextureScale: options.objectTextureScale,
    });
    const outlineMeshB = new THREE.Mesh(options.geometry, outlineB);
    outlineMeshB.renderOrder = -4;
    outlineMeshB.userData.paintShell = true;
    group.add(outlineMeshB);
    shells.push(outlineB);
  }

  const paintedObject: PaintedObject = {
    group,
    base,
    material,
    shells,
    paletteIndex: options.paletteIndex,
    label: options.label,
    spin: options.spin ?? new THREE.Vector3(),
    initialRotation: group.rotation.clone(),
  };
  paintedObjects.push(paintedObject);
  if (paintedObject.spin.lengthSq() > 0) animatedObjects.push(paintedObject);
  scene.add(group);
  return paintedObject;
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

function applyPreset(name: PresetName): void {
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
    const palette = preset.palettes[painted.paletteIndex % preset.palettes.length];
    if (!palette) continue;
    const materialPalette = painted.material.paintPalette;
    (materialPalette.dark.value as THREE.Color).set(palette.dark);
    (materialPalette.light.value as THREE.Color).set(palette.light);
    (materialPalette.reflectionDark.value as THREE.Color).set(palette.reflectionDark);
    (materialPalette.reflectionLight.value as THREE.Color).set(palette.reflectionLight);
    (materialPalette.rim.value as THREE.Color).set(palette.rim);
    painted.shells.forEach((shell) => {
      const shellColor = shell.uniforms.uShellColor?.value as THREE.Color | undefined;
      const layer = shell.userData.paintShellLayer as number | undefined;
      shellColor?.set(layer === 0 ? palette.rim : layer === 2 ? palette.outlineSecondary : palette.outline);
    });
  }

  document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.preset === name);
  });
  requiredElement<HTMLElement>('#preset-eyebrow').textContent = preset.eyebrow;
  requiredElement<HTMLElement>('#preset-name').textContent = preset.label;
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

  document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((button) => {
    button.addEventListener('click', () => applyPreset(button.dataset.preset as PresetName));
  });

  document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach((button) => {
    button.addEventListener('click', () => setCameraBookmark(button.dataset.camera as keyof typeof CAMERA_BOOKMARKS));
  });

  const debugSelect = requiredElement<HTMLSelectElement>('#debug-mode');
  debugSelect.innerHTML = PAINT_DEBUG_MODES.map((mode) => `<option value="${mode}">${mode}</option>`).join('');
  debugSelect.addEventListener('change', () => {
    currentDebugMode = debugModeIndex(debugSelect.value as (typeof PAINT_DEBUG_MODES)[number]);
    paintGlobals.debugMode.value = currentDebugMode;
    applyTexturePreview(activeTexture.metadata, currentDebugMode);
    requiredElement<HTMLElement>('#view-status').textContent = debugSelect.value;
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
  requiredElement<HTMLButtonElement>('#capture-frame').addEventListener('click', captureFrame);
  requiredElement<HTMLButtonElement>('#panel-toggle').addEventListener('click', () => {
    document.body.classList.toggle('panel-collapsed');
  });

  renderer.domElement.addEventListener('pointermove', onPointerMove);
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

function replacePaintTexture(seed: number): void {
  const previous = activeTexture.texture;
  activeTexture = createPaintTexture({ size: 512, seed });
  activeTexture.texture.anisotropy = Math.min(12, renderer.capabilities.getMaxAnisotropy());
  paintGlobals.paintMap.value = activeTexture.texture;
  for (const painted of paintedObjects) {
    painted.material.map = activeTexture.texture;
    painted.material.needsUpdate = true;
    const depth = painted.base.customDepthMaterial;
    if (depth instanceof THREE.MeshDepthMaterial) {
      depth.map = activeTexture.texture;
      depth.needsUpdate = true;
    }
  }
  previous.dispose();
  applyTexturePreview(activeTexture.metadata, currentDebugMode);
  requiredElement<HTMLElement>('#seed-value').textContent = activeTexture.metadata.seedHex.toUpperCase();
}

function resetShaderControls(): void {
  for (const [name, value] of Object.entries(defaultControls)) {
    const uniform = paintGlobals[name as keyof PaintGlobalUniforms];
    if (uniform) uniform.value = value;
  }
  document.querySelectorAll<HTMLInputElement>('input[type="range"][data-uniform]').forEach((input) => {
    const key = input.dataset.uniform as keyof typeof defaultControls;
    const value = defaultControls[key];
    if (value === undefined) return;
    input.value = String(value);
    updateRangeOutput(input);
  });
  const debugSelect = requiredElement<HTMLSelectElement>('#debug-mode');
  debugSelect.value = 'Final';
  debugSelect.dispatchEvent(new Event('change'));
  replacePaintTexture(73021);
  for (const object of paintedObjects) object.group.rotation.copy(object.initialRotation);
  elapsedTime = 0;
  paused = true;
  requiredElement<HTMLInputElement>('#pause-motion').checked = true;
  applyPreset('noir');
  setCameraBookmark('design');
}

function updateRangeOutput(input: HTMLInputElement): void {
  const output = document.querySelector<HTMLOutputElement>(`output[for="${input.id}"]`);
  if (!output) return;
  const precision = input.step.includes('.') ? Math.min(3, input.step.split('.')[1]?.length ?? 2) : 0;
  output.value = Number(input.value).toFixed(precision);
}

function setCameraBookmark(name: keyof typeof CAMERA_BOOKMARKS): void {
  const bookmark = CAMERA_BOOKMARKS[name];
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
  const label = requiredElement<HTMLElement>('#object-label');
  label.textContent = object?.userData.paintLabel ?? 'Left drag to orbit · right drag to pan · scroll to zoom';
  label.classList.toggle('is-object', Boolean(object));
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
  if (event.key === '1') setCameraBookmark('near');
  if (event.key === '2') setCameraBookmark('design');
  if (event.key === '3') setCameraBookmark('far');
  if (event.key.toLowerCase() === 'p') {
    paused = !paused;
    requiredElement<HTMLInputElement>('#pause-motion').checked = paused;
  }
  if (event.key.toLowerCase() === 'h') document.body.classList.toggle('panel-collapsed');
}

function captureFrame(): void {
  renderer.render(scene, camera);
  renderer.domElement.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    link.download = `paint-shader-${currentPreset}-${activeTexture.metadata.seedHex}.png`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }, 'image/png');
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
      } else if (debugMode === 7) {
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
  if (!paused && autoRotate) {
    for (const object of animatedObjects) {
      object.group.rotation.x += object.spin.x * delta;
      object.group.rotation.y += object.spin.y * delta;
      object.group.rotation.z += object.spin.z * delta;
    }
  }

  updateCameraGoal(delta);
  controls.update(delta);
  updateHover();
  renderer.render(scene, camera);

  frameCounter += 1;
  statsElapsed += delta;
  if (statsElapsed > 0.45) {
    fpsEstimate = Math.round(frameCounter / statsElapsed);
    frameCounter = 0;
    statsElapsed = 0;
    updateStats();
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
  camera.aspect = width / height;
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
    <main class="app-shell">
      <section id="viewport" class="viewport">
        <div id="loading" class="loading-card">
          <span class="loading-mark"></span>
          <span>Mixing pigments</span>
        </div>

        <header class="brand">
          <div class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></div>
          <div>
            <p class="kicker">THREE.JS R185 · MATERIAL STUDY</p>
            <h1>Paint / Lab</h1>
          </div>
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
          <button id="panel-toggle" class="icon-button" type="button" aria-label="Collapse controls">×</button>
        </div>

        <div class="panel-scroll">
          <section class="preset-section">
            <div class="section-heading"><span>Look</span><small>01</small></div>
            <div class="preset-grid">
              <button type="button" data-preset="high-key"><i class="swatch high-key"></i>High key</button>
              <button type="button" data-preset="noir" class="is-active"><i class="swatch noir"></i>Noir</button>
              <button type="button" data-preset="ultraviolet"><i class="swatch ultraviolet"></i>UV</button>
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
            ${rangeMarkup('Shadow erosion', 'shadow-erosion', 'shadowErosion', 0, 1, 0.01)}
            ${rangeMarkup('Shadow mask offset', 'shadow-mask-offset', 'shadowMaskOffset', -0.4, 0.6, 0.01)}
            ${rangeMarkup('Outer rim width', 'outer-rim-width', 'outerRimWidth', 0.002, 0.11, 0.002)}
            ${rangeMarkup('Rim continuity', 'rim-continuity', 'rimContinuity', 0, 1, 0.01)}
            ${rangeMarkup('Outline width', 'outline-width', 'outlineWidth', 0.005, 0.24, 0.002)}
            ${rangeMarkup('Outline jitter', 'outline-jitter', 'outlineJitter', 0, 0.08, 0.002)}
            ${rangeMarkup('Loop separation', 'outline-separation', 'outlineSeparation', 1.05, 2.4, 0.01)}
            ${rangeMarkup('Loop breakup', 'outline-breakup', 'outlineBreakup', 0, 1, 0.01)}
            ${rangeMarkup('Loop stroke', 'outline-stroke-width', 'outlineStrokeWidth', 0.5, 3, 0.05)}
          </details>

          <section class="diagnostics">
            <div class="section-heading"><span>Diagnostics</span><small>06</small></div>
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
            <p class="diagnostic-note"><span id="view-status">Final</span> · No post stack. ACES is the single output transform.</p>
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
          <button id="capture-frame" class="primary-button" type="button">Capture PNG</button>
        </footer>
      </aside>

      <button id="panel-reopen" class="panel-reopen" type="button" onclick="document.body.classList.remove('panel-collapsed')">Tune shader</button>
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

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    renderer.dispose();
    environmentTarget.dispose();
    activeTexture.texture.dispose();
    window.removeEventListener('resize', onResize);
    document.removeEventListener('keydown', onKeyDown);
  });
}
