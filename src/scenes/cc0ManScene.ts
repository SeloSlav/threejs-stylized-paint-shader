import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { PaintPalette } from '../PainterlyMaterial.ts';
import type {
  SceneBuildContext,
  ScenePaintedMeshOptions,
} from './sceneRegistry.ts';

const MODEL_URL = '/models/villagers/quaternius-villager-man.glb';
const TARGET_HEIGHT = 1.72;
const GROUNDING_HEIGHT = 0.012;
const TEXTURELESS_STROKES_PER_METER = 4.2;
const TEXTURELESS_UNDERPAINT_WEIGHT = 0.72;
const CHARACTER_CONTOUR_SCALE = 1.25;

export async function buildCc0ManScene(context: SceneBuildContext): Promise<void> {
  const floor = context.addPaintedObject({
    label: 'Villager study ground',
    geometry: new THREE.CircleGeometry(4.2, 96),
    paletteIndex: 4,
    position: new THREE.Vector3(0, 0, 0),
    rotation: new THREE.Euler(-Math.PI / 2, 0, 0),
    shells: false,
    roughness: 0.84,
    metalness: 0,
    clearcoat: 0.04,
  });
  floor.base.receiveShadow = true;

  const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
  if (!context.isActive()) {
    disposeImportedScene(gltf.scene);
    return;
  }

  const model = gltf.scene;
  model.name = 'CC0 Quaternius man';
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const sourceSize = bounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(sourceSize.y) || sourceSize.y <= 0.001) {
    disposeImportedScene(model);
    throw new Error('The imported CC0 man has invalid bounds.');
  }

  const sourceCenter = bounds.getCenter(new THREE.Vector3());
  const modelScale = TARGET_HEIGHT / sourceSize.y;
  model.scale.setScalar(modelScale);
  model.position.set(
    -sourceCenter.x * modelScale,
    -bounds.min.y * modelScale + GROUNDING_HEIGHT,
    -sourceCenter.z * modelScale,
  );
  model.updateMatrixWorld(true);

  const sourceMeshes: THREE.Mesh[] = [];
  model.traverse((object) => {
    if (object instanceof THREE.Mesh) sourceMeshes.push(object);
  });
  if (sourceMeshes.length === 0) {
    disposeImportedScene(model);
    throw new Error('The imported CC0 man contains no renderable meshes.');
  }

  const sourceGeometries = new Set<THREE.BufferGeometry>();
  const sourceMaterials = new Set<THREE.Material>();
  const projectionScales: number[] = [];
  let materialLayerCount = 0;
  for (const sourceMesh of sourceMeshes) {
    const parent = sourceMesh.parent;
    if (!parent) continue;
    sourceGeometries.add(sourceMesh.geometry);
    const materials = Array.isArray(sourceMesh.material)
      ? sourceMesh.material
      : [sourceMesh.material];
    for (const material of materials) sourceMaterials.add(material);

    const layers = paintedLayers(sourceMesh, materials);
    for (const layer of layers) {
      const sourceMaterial = layer.material as THREE.MeshStandardMaterial;
      const surfaceColor = sourceMaterial.color?.clone() ?? new THREE.Color('#7a6252');
      const surfaceMap = sourceMaterial.map ?? null;
      const texturelessSurface = surfaceMap === null;
      const objectTextureScale = texturelessSurface
        ? metricProjectionScale(sourceMesh)
        : 0.22;
      projectionScales.push(objectTextureScale);
      const layerName = sourceMaterial.name || `Material ${materialLayerCount + 1}`;
      const options: ScenePaintedMeshOptions = {
        label: `CC0 man · ${layerName}`,
        source: sourceMesh,
        geometry: layer.geometry,
        palette: paletteFromSurface(surfaceColor),
        surfaceColor,
        surfaceMap,
        texturelessSurface,
        surfaceMapStrength: surfaceMap ? 1 : 0,
        surfaceAlphaTest: sourceMaterial.alphaTest ?? 0,
        sourceAlbedoWeight: texturelessSurface ? TEXTURELESS_UNDERPAINT_WEIGHT : 1,
        nativeMaterial: sourceMaterial.clone(),
        roughness: Math.max(0.48, sourceMaterial.roughness ?? 0.72),
        metalness: Math.min(0.08, sourceMaterial.metalness ?? 0),
        clearcoat: 0.08,
        clearcoatRoughness: 0.56,
        side: sourceMaterial.side,
        shells: true,
        shellWidthScale: texturelessSurface ? CHARACTER_CONTOUR_SCALE : 1,
        triplanarMacro: texturelessSurface,
        objectTextureScale,
      };
      context.addPaintedMesh(options, parent);
      materialLayerCount += 1;
    }
    sourceMesh.removeFromParent();
  }

  for (const material of sourceMaterials) material.dispose();
  for (const geometry of sourceGeometries) geometry.dispose();
  context.root.add(model);

  const walkClip = gltf.animations.find((clip) =>
    clip.name.toLowerCase().endsWith('man_walk'),
  ) ?? gltf.animations.find((clip) => clip.name.toLowerCase().includes('walk'));
  if (walkClip) {
    const mixer = new THREE.AnimationMixer(model);
    const walk = mixer.clipAction(walkClip, model);
    walk.setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY);
    walk.play();
    mixer.update(0);
    context.onFrame((deltaSeconds) => mixer.update(deltaSeconds));
  }

  context.root.userData.cc0Man = {
    asset: MODEL_URL,
    source: 'Quaternius Animated Men Pack (CC0 1.0)',
    targetHeight: TARGET_HEIGHT,
    materialLayers: materialLayerCount,
    animation: walkClip?.name ?? null,
    projectionScaleRange: [
      Math.min(...projectionScales),
      Math.max(...projectionScales),
    ],
  };
}

function metricProjectionScale(mesh: THREE.Mesh): number {
  const worldScale = mesh.getWorldScale(new THREE.Vector3());
  const localToWorldScale = Math.cbrt(
    Math.max(Math.abs(worldScale.x * worldScale.y * worldScale.z), 1e-9),
  );
  return THREE.MathUtils.clamp(
    localToWorldScale * TEXTURELESS_STROKES_PER_METER,
    0.26,
    96,
  );
}

function paintedLayers(
  sourceMesh: THREE.Mesh,
  materials: THREE.Material[],
): Array<{ geometry: THREE.BufferGeometry; material: THREE.Material }> {
  if (materials.length <= 1 || sourceMesh.geometry.groups.length === 0) {
    return [{ geometry: sourceMesh.geometry.clone(), material: materials[0]! }];
  }

  return sourceMesh.geometry.groups.map((group) => {
    const geometry = sourceMesh.geometry.clone();
    geometry.clearGroups();
    geometry.setDrawRange(group.start, group.count);
    return {
      geometry,
      material: materials[group.materialIndex ?? 0] ?? materials[0]!,
    };
  });
}

function paletteFromSurface(surface: THREE.Color): PaintPalette {
  const dark = surface.clone().multiplyScalar(0.24);
  const light = surface.clone().lerp(new THREE.Color('#fff0dd'), 0.28);
  const reflectionDark = surface.clone().multiplyScalar(0.42);
  const reflectionLight = surface.clone().lerp(new THREE.Color('#ffd5a8'), 0.58);
  const rim = surface.clone().lerp(new THREE.Color('#fff1d4'), 0.72);
  const outline = surface.clone().multiplyScalar(0.14);
  const outlineSecondary = surface.clone().lerp(new THREE.Color('#e8b77f'), 0.34);
  return { dark, light, reflectionDark, reflectionLight, rim, outline, outlineSecondary };
}

function disposeImportedScene(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of meshMaterials) materials.add(material);
  });
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
}
