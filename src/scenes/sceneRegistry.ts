import * as THREE from 'three';
import type { PaintGlobalUniforms, PaintPalette } from '../PainterlyMaterial.ts';
import { buildNightCafe, buildDuckAdmiral, buildPigeonMeeting, buildSnailRace } from './storyScenes.ts';
import { buildProvenceScene, buildStillLifeScene } from './atelierScenes.ts';

export type SceneId = 'provence' | 'still-life' | 'night-cafe' | 'duck-admiral' | 'pigeon-meeting' | 'snail-race';
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
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
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
  preserveSourceAlbedo?: boolean;
  nativeMaterial?: THREE.Material;
  roughness?: number;
  metalness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  side?: THREE.Side;
  triplanarMacro?: boolean;
  objectTextureScale?: number;
  lightPaintScale?: number;
  macroVariation?: number;
  pigmentContrast?: number;
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
  lighting?: {
    top: string; horizon: string; abyss: string;
    fog: string; fogDensity: number;
    key: string; keyIntensity: number; fill: string; fillIntensity: number;
    exposure: number;
  };
  controlOverrides?: Partial<Record<keyof PaintGlobalUniforms, number>>;
  build: (context: SceneBuildContext) => void | Promise<void>;
}

/**
 * Scene registry: add one definition here and its menu entry, camera envelope,
 * lifecycle, shader controls, diagnostics, and capture naming are wired up.
 */
export const PAINT_SCENES: readonly PaintSceneDefinition[] = [
  {
    id: 'provence', label: '01 / The long way home',
    description: 'Cypresses, a sunwashed farmhouse and a path through a poppy meadow.',
    eyebrow: 'PAINTING 01 · PROVENCE', title: 'The long way home',
    preferredPreset: 'sky', orbitDistance: { min: 5, max: 65 },
    controlOverrides: { brushScale: 1, oilStrength: 0, edgeErosion: 0, rimStrength: 0.035, shadowThreshold: -0.42, lightThreshold: 0.58, shadowValue: 0.24, midtoneValue: 0.65, outlineWidth: 0, outerRimWidth: 0 },
    cameraBookmarks: {
      near: { position: new THREE.Vector3(4, 3.8, 4), target: new THREE.Vector3(-1, 2.8, -8) },
      design: { position: new THREE.Vector3(10, 6.2, 21), target: new THREE.Vector3(-0.5, 3.4, -10) },
      far: { position: new THREE.Vector3(20, 14, 37), target: new THREE.Vector3(-1, 2, -11) },
    }, build: buildProvenceScene,
  },
  {
    id: 'still-life', label: '02 / A little sunshine',
    description: 'Sunflowers in ultramarine ceramic, lemons, linen and warm plaster.',
    eyebrow: 'PAINTING 02 · STILL LIFE', title: 'A little sunshine',
    preferredPreset: 'high-key', orbitDistance: { min: 4, max: 26 },
    controlOverrides: { brushScale: 0.85, oilStrength: 0.06, edgeErosion: 0.08, rimStrength: 0.05, shadowThreshold: -0.36, lightThreshold: 0.56, shadowValue: 0.20, midtoneValue: 0.67, outlineWidth: 0, outerRimWidth: 0 },
    cameraBookmarks: {
      near: { position: new THREE.Vector3(3.7, 4.4, 7.2), target: new THREE.Vector3(-0.3, 2.45, -0.1) },
      design: { position: new THREE.Vector3(6.0, 5.2, 11.5), target: new THREE.Vector3(-0.25, 2.9, -0.35) },
      far: { position: new THREE.Vector3(11.5, 9, 20), target: new THREE.Vector3(-0.25, 2.2, -0.35) },
    }, build: buildStillLifeScene,
  },
  {
    id: 'night-cafe', label: '03 / One more espresso',
    description: 'Midnight blue, golden windows, rain-polished cobbles. The last customer has whiskers.',
    eyebrow: 'PAINTING 03 · THE NIGHT CAFÉ', title: 'One more espresso',
    preferredPreset: 'noir', orbitDistance: { min: 5, max: 48 },
    lighting: { top: '#101c38', horizon: '#293a58', abyss: '#18283f', fog: '#1f304c', fogDensity: 0.012, key: '#bac7df', keyIntensity: 2, fill: '#566a95', fillIntensity: 0.3, exposure: 0.95 },
    controlOverrides: { brushScale: 0.85, oilStrength: 0, edgeErosion: 0, rimStrength: 0.025, shadowThreshold: -0.15, lightThreshold: 0.65, shadowValue: 0.12, midtoneValue: 0.48, outlineWidth: 0, outerRimWidth: 0 },
    cameraBookmarks: {
      near: { position: new THREE.Vector3(5, 4.5, 10), target: new THREE.Vector3(-2.2, 2.1, 1) },
      design: { position: new THREE.Vector3(10.5, 7.3, 17), target: new THREE.Vector3(0, 3.1, -0.3) },
      far: { position: new THREE.Vector3(20, 13, 30), target: new THREE.Vector3(0, 3.5, -2) },
    }, build: buildNightCafe,
  },
  {
    id: 'duck-admiral', label: '04 / The admiral’s day off',
    description: 'One very important rubber duck. A claw-foot flagship. Absolutely no responsibilities.',
    eyebrow: 'PAINTING 04 · BATH-TIME COMMAND', title: 'The admiral’s day off',
    preferredPreset: 'high-key', orbitDistance: { min: 4, max: 32 },
    lighting: { top: '#728d84', horizon: '#b6d0b7', abyss: '#acb2a0', fog: '#acc5b3', fogDensity: 0.006, key: '#ffe3b6', keyIntensity: 3, fill: '#9cbace', fillIntensity: 0.6, exposure: 1.05 },
    controlOverrides: { brushScale: 0.9, oilStrength: 0.03, edgeErosion: 0, rimStrength: 0.035, shadowThreshold: -0.36, lightThreshold: 0.58, shadowValue: 0.22, midtoneValue: 0.66, outlineWidth: 0, outerRimWidth: 0 },
    cameraBookmarks: {
      near: { position: new THREE.Vector3(6, 5, 8), target: new THREE.Vector3(-0.4, 2.6, 0) },
      design: { position: new THREE.Vector3(7, 5.9, 10), target: new THREE.Vector3(0, 2.6, -0.5) },
      far: { position: new THREE.Vector3(15, 11, 20), target: new THREE.Vector3(0, 2, -0.5) },
    }, build: buildDuckAdmiral,
  },
  {
    id: 'pigeon-meeting', label: '05 / The crumb committee',
    description: 'A rooftop board meeting. Three pigeons. One croissant. Extremely serious business.',
    eyebrow: 'PAINTING 05 · ROOFTOP AFFAIRS', title: 'The crumb committee',
    preferredPreset: 'sky', orbitDistance: { min: 4, max: 38 },
    lighting: { top: '#8f7ca8', horizon: '#efb392', abyss: '#b49398', fog: '#d5a5a7', fogDensity: 0.015, key: '#ffdaa5', keyIntensity: 3, fill: '#b8b0e5', fillIntensity: 0.55, exposure: 1.04 },
    controlOverrides: { brushScale: 0.9, oilStrength: 0, edgeErosion: 0, rimStrength: 0.03, shadowThreshold: -0.38, lightThreshold: 0.57, shadowValue: 0.22, midtoneValue: 0.66, outlineWidth: 0, outerRimWidth: 0 },
    cameraBookmarks: {
      near: { position: new THREE.Vector3(5.7, 4.1, 8), target: new THREE.Vector3(0, 2.15, 0.3) },
      design: { position: new THREE.Vector3(5.5, 4.5, 10.3), target: new THREE.Vector3(0, 2, 0) },
      far: { position: new THREE.Vector3(14, 10, 21), target: new THREE.Vector3(0, 1.8, -2) },
    }, build: buildPigeonMeeting,
  },
  {
    id: 'snail-race', label: '06 / The grand snail prix',
    description: 'A garden race of epic proportions, proceeding at approximately the speed of a Tuesday.',
    eyebrow: 'PAINTING 06 · SLOW SPORT', title: 'The grand snail prix',
    preferredPreset: 'verdant', orbitDistance: { min: 4, max: 46 },
    lighting: { top: '#79978c', horizon: '#d7d9ad', abyss: '#6e876d', fog: '#adbc91', fogDensity: 0.018, key: '#ffe8b8', keyIntensity: 3.1, fill: '#a7c6c4', fillIntensity: 0.55, exposure: 1.03 },
    controlOverrides: { brushScale: 0.9, oilStrength: 0.02, edgeErosion: 0, rimStrength: 0.03, shadowThreshold: -0.36, lightThreshold: 0.56, shadowValue: 0.22, midtoneValue: 0.66, outlineWidth: 0, outerRimWidth: 0 },
    cameraBookmarks: {
      near: { position: new THREE.Vector3(5.5, 4.5, 9), target: new THREE.Vector3(-1, 1.1, 0.5) },
      design: { position: new THREE.Vector3(8, 6.3, 15.5), target: new THREE.Vector3(0, 1.9, -1.4) },
      far: { position: new THREE.Vector3(18, 13, 28), target: new THREE.Vector3(0, 1.3, -2) },
    }, build: buildSnailRace,
  },
] as const;

export function paintSceneById(id: string): PaintSceneDefinition | undefined {
  return PAINT_SCENES.find((scene) => scene.id === id);
}
