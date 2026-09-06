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
// STORY_SCENES
] as const;

export function paintSceneById(id: string): PaintSceneDefinition | undefined {
  return PAINT_SCENES.find((scene) => scene.id === id);
}
