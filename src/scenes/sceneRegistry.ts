import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { PaintGlobalUniforms, PaintPalette } from '../PainterlyMaterial.ts';
import { buildCc0ManScene } from './cc0ManScene.ts';
import { buildSeedThreeBeechScene } from './seedThreeBeechScene.ts';
import { buildTextureStudyScene } from './textureStudyScene.ts';
import { buildTierOneResidenceScene } from './tierOneResidenceScene.ts';

export type SceneId =
  | 'material-study'
  | 'texture-study'
  | 'tier-one-residence'
  | 'seedthree-beech'
  | 'cc0-man';
export type CameraBookmarkName = 'near' | 'design' | 'far';
export type ScenePresetId = 'high-key' | 'noir' | 'ultraviolet' | 'earthy' | 'sky' | 'verdant';

export interface CameraBookmark {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export interface SceneObjectHandle {
  group: THREE.Group;
  base: THREE.Mesh;
}

export interface ScenePaintedObjectOptions {
  label: string;
  geometry: THREE.BufferGeometry;
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: THREE.Vector3;
  spin?: THREE.Vector3;
  shells?: boolean;
  screenOutline?: boolean;
  outlineGroup?: string;
  shellWidthScale?: number;
  smoothNormals?: 'radial' | 'existing';
  paletteIndex?: number;
  palette?: PaintPalette;
  surfaceColor?: THREE.ColorRepresentation;
  surfaceMap?: THREE.Texture | null;
  texturelessSurface?: boolean;
  surfaceMapStrength?: number;
  surfaceAlphaTest?: number;
  sourceAlbedoWeight?: number;
  nativeMaterial?: THREE.Material;
  roughness?: number;
  metalness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  side?: THREE.Side;
  triplanarMacro?: boolean;
  objectTextureScale?: number;
}

export interface ScenePaintedMeshOptions extends Omit<
  ScenePaintedObjectOptions,
  'geometry' | 'position' | 'rotation' | 'scale' | 'spin'
> {
  source: THREE.Mesh;
  geometry?: THREE.BufferGeometry;
}

export interface SceneBuildContext {
  root: THREE.Group;
  addPaintedObject: (
    options: ScenePaintedObjectOptions,
    parent?: THREE.Object3D,
  ) => SceneObjectHandle;
  addPaintedMesh: (
    options: ScenePaintedMeshOptions,
    parent?: THREE.Object3D,
  ) => SceneObjectHandle;
  isActive: () => boolean;
  onFrame: (update: (deltaSeconds: number) => void) => void;
}

export interface PaintSceneDefinition {
  id: SceneId;
  label: string;
  description: string;
  eyebrow: string;
  title: string;
  cameraBookmarks: Record<CameraBookmarkName, CameraBookmark>;
  orbitDistance: { min: number; max: number };
  preferredPreset?: ScenePresetId;
  controlOverrides?: Partial<Record<keyof PaintGlobalUniforms, number>>;
  build: (context: SceneBuildContext) => void | Promise<void>;
}

/**
 * Scene registry: add one definition here and its menu entry, camera envelope,
 * lifecycle, shader controls, diagnostics, and capture naming are wired up.
 */
export const PAINT_SCENES: readonly PaintSceneDefinition[] = [
  {
    id: 'material-study',
    label: 'Material study',
    description: 'Core forms for tuning strokes, rims, and oil response.',
    eyebrow: 'SCENE 01 · SHADER FORMS',
    title: 'Material study',
    orbitDistance: { min: 5.5, max: 35 },
    cameraBookmarks: {
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
    },
    build: buildMaterialStudyScene,
  },
  {
    id: 'texture-study',
    label: 'Texture study',
    description: 'Painterly shading over blended meadow, dense grass, dry grass, and forest litter.',
    eyebrow: 'SCENE 02 · BLENDED TERRAIN',
    title: 'Texture study',
    orbitDistance: { min: 3.2, max: 48 },
    preferredPreset: 'verdant',
    controlOverrides: {
      brushScale: 1.2,
      parallaxDepth: 0.026,
      normalStrength: 0.68,
      strokeContrast: 0.78,
      detailStrength: 0.56,
      shadowThreshold: -0.48,
      lightThreshold: 0.34,
      bandSoftness: 0.075,
      shadowValue: 0.16,
      midtoneValue: 0.52,
      oilStrength: 0.16,
      nativeSheen: 0.04,
      roughnessVariation: 0.18,
      rimStrength: 0.08,
      edgeErosion: 0,
      shadowErosion: 0.24,
    },
    cameraBookmarks: {
      near: {
        position: new THREE.Vector3(3.8, 2.7, 5.2),
        target: new THREE.Vector3(-1.8, -0.8, 0.4),
      },
      design: {
        position: new THREE.Vector3(12.5, 10.8, 15.8),
        target: new THREE.Vector3(0, -0.85, 0.1),
      },
      far: {
        position: new THREE.Vector3(19.5, 18.2, 25.5),
        target: new THREE.Vector3(0, -0.9, 0),
      },
    },
    build: buildTextureStudyScene,
  },
  {
    id: 'tier-one-residence',
    label: 'House',
    description: 'Burgage cottage imported from medieval-road-system.',
    eyebrow: 'SCENE 03 · IMPORTED ASSET',
    title: 'Tier 1 burgage',
    orbitDistance: { min: 4.2, max: 32 },
    controlOverrides: {
      outerRimWidth: 0.1,
      outlineWidth: 0.5,
      outlineJitter: 0,
      oilStrength: 0,
    },
    cameraBookmarks: {
      near: {
        position: new THREE.Vector3(6.1, 4.3, 7.2),
        target: new THREE.Vector3(0, 2.15, 0.45),
      },
      design: {
        position: new THREE.Vector3(10.8, 7.0, 13.6),
        target: new THREE.Vector3(0, 2.15, 0),
      },
      far: {
        position: new THREE.Vector3(16.8, 10.8, 21),
        target: new THREE.Vector3(0, 2.0, -0.3),
      },
    },
    build: buildTierOneResidenceScene,
  },
  {
    id: 'seedthree-beech',
    label: 'Tree',
    description: 'A deterministic American beech generated by SeloSlav/SeedThree.',
    eyebrow: 'SCENE 04 · PROCEDURAL VEGETATION',
    title: 'American beech',
    orbitDistance: { min: 10, max: 72 },
    controlOverrides: {
      outerRimWidth: 0,
      outlineWidth: 0,
      outlineJitter: 0,
      oilStrength: 0,
    },
    cameraBookmarks: {
      near: {
        position: new THREE.Vector3(13.5, 8.2, 15.5),
        target: new THREE.Vector3(-0.35, 6.2, 0.55),
      },
      design: {
        position: new THREE.Vector3(20.5, 12, 25),
        target: new THREE.Vector3(-0.45, 7.4, 0.65),
      },
      far: {
        position: new THREE.Vector3(35, 20, 42),
        target: new THREE.Vector3(-0.5, 7.5, 0.7),
      },
    },
    build: buildSeedThreeBeechScene,
  },
  {
    id: 'cc0-man',
    label: 'Man',
    description: 'Rigged Quaternius villager imported from medieval-road-system.',
    eyebrow: 'SCENE 05 · RIGGED CC0 ASSET',
    title: 'Painterly villager',
    orbitDistance: { min: 1.8, max: 14 },
    controlOverrides: {
      outerRimWidth: 0,
      outlineWidth: 0,
      outlineJitter: 0,
      oilStrength: 0,
    },
    cameraBookmarks: {
      near: {
        position: new THREE.Vector3(1.05, 1.68, 2.1),
        target: new THREE.Vector3(0, 1.22, 0),
      },
      design: {
        position: new THREE.Vector3(2.8, 2.05, 4.35),
        target: new THREE.Vector3(0, 0.9, 0),
      },
      far: {
        position: new THREE.Vector3(5.8, 3.35, 8.2),
        target: new THREE.Vector3(0, 0.88, 0),
      },
    },
    build: buildCc0ManScene,
  },
] as const;

export function paintSceneById(id: string): PaintSceneDefinition | undefined {
  return PAINT_SCENES.find((scene) => scene.id === id);
}

function buildMaterialStudyScene(context: SceneBuildContext): void {
  const floor = context.addPaintedObject({
    label: 'Painted ground',
    geometry: new THREE.PlaneGeometry(24, 18, 1, 1),
    paletteIndex: 4,
    position: new THREE.Vector3(0, -1.88, -1.2),
    rotation: new THREE.Euler(-Math.PI / 2, 0, -0.03),
    shells: false,
    roughness: 0.78,
    metalness: 0.02,
    clearcoat: 0.12,
  });
  floor.base.receiveShadow = true;

  const leftWall = context.addPaintedObject({
    label: 'Painted wall',
    geometry: new THREE.BoxGeometry(11, 11, 0.18, 1, 1, 1),
    paletteIndex: 2,
    position: new THREE.Vector3(-7.2, 3.25, -3.2),
    // Face the panel into both the design camera and the shared key-light
    // direction. A side-on 90° normal locked the whole plane in the dark toon
    // band, and translating it cannot change N dot L for a directional light.
    rotation: new THREE.Euler(0, Math.PI * 0.12, 0),
    shells: false,
    roughness: 0.8,
    metalness: 0,
    clearcoat: 0.08,
  });
  leftWall.base.receiveShadow = true;

  const heroSphere = context.addPaintedObject({
    label: 'Hero sphere',
    geometry: new THREE.SphereGeometry(2.3, 128, 72),
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

  context.addPaintedObject({
    label: 'Floating sphere',
    geometry: new THREE.SphereGeometry(1.55, 96, 56),
    paletteIndex: 1,
    position: new THREE.Vector3(-0.05, 3.25, -2.25),
    spin: new THREE.Vector3(0, -0.08, 0),
    triplanarMacro: true,
    objectTextureScale: 0.22,
    roughness: 0.31,
    metalness: 0.44,
    clearcoat: 0.64,
  });

  context.addPaintedObject({
    label: 'Mid sphere',
    geometry: new THREE.SphereGeometry(1.38, 96, 56),
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
  context.addPaintedObject({
    label: 'Wedge block',
    geometry: wedgeGeometry,
    paletteIndex: 3,
    position: new THREE.Vector3(4.35, -0.1, 0.25),
    rotation: new THREE.Euler(-0.08, -0.64, 0.04),
    spin: new THREE.Vector3(0, -0.028, 0),
    smoothNormals: 'radial',
    triplanarMacro: true,
    objectTextureScale: 0.16,
    roughness: 0.52,
    metalness: 0.11,
    clearcoat: 0.36,
  });

  context.addPaintedObject({
    label: 'Suspended cylinder',
    geometry: new THREE.CylinderGeometry(0.68, 0.68, 1.65, 72, 4),
    paletteIndex: 4,
    position: new THREE.Vector3(-2.0, 3.95, -2.65),
    rotation: new THREE.Euler(0.05, 0.1, Math.PI / 2),
    spin: new THREE.Vector3(0.04, 0.05, 0.12),
    smoothNormals: 'radial',
    roughness: 0.3,
    metalness: 0.46,
    clearcoat: 0.56,
  });

  context.addPaintedObject({
    label: 'Brush cylinder',
    geometry: new THREE.CylinderGeometry(1.02, 1.02, 2.75, 84, 6),
    paletteIndex: 1,
    position: new THREE.Vector3(3.6, -0.5, -2.45),
    rotation: new THREE.Euler(Math.PI / 2, 0.15, -0.42),
    spin: new THREE.Vector3(0.03, 0.04, -0.02),
    smoothNormals: 'radial',
    roughness: 0.29,
    metalness: 0.5,
    clearcoat: 0.62,
  });

  context.addPaintedObject({
    label: 'Rounded monolith',
    geometry: new RoundedBoxGeometry(1.2, 2.6, 1.2, 8, 0.18),
    paletteIndex: 3,
    position: new THREE.Vector3(5.35, 2.8, -3.55),
    rotation: new THREE.Euler(0.08, -0.24, -0.13),
    spin: new THREE.Vector3(0.02, -0.07, 0.025),
    smoothNormals: 'radial',
    triplanarMacro: true,
    objectTextureScale: 0.3,
    roughness: 0.38,
    metalness: 0.3,
    clearcoat: 0.48,
  });

  const pedestal = context.addPaintedObject({
    label: 'Painted plinth',
    geometry: new RoundedBoxGeometry(4.8, 0.48, 4.1, 5, 0.12),
    paletteIndex: 3,
    position: new THREE.Vector3(0.55, -1.55, -1.3),
    rotation: new THREE.Euler(0, -0.08, 0),
    shells: false,
    smoothNormals: 'radial',
    roughness: 0.67,
    metalness: 0.04,
    clearcoat: 0.18,
  });
  pedestal.base.receiveShadow = true;
  heroSphere.group.userData.primary = true;
}
