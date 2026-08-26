import * as THREE from 'three';
import { buildBranchGeometry } from 'seedthree/src/core/branch-mesh.js';
import { Rng } from 'seedthree/src/core/rng.js';
import {
  generateSkeleton,
  type SeedThreeStem,
} from 'seedthree/src/core/weber-penn.js';
import { americanBeech } from 'seedthree/src/species/american-beech.js';
import beechBarkUrl from 'seedthree/assets/bark/american_beech_albedo.png?url';
import beechLeafUrl from 'seedthree/assets/leaves/american_beech_single_albedo.png?url';
import type { PaintPalette } from '../PainterlyMaterial.ts';
import type { SceneBuildContext } from './sceneRegistry.ts';

const BEECH_SEED = 'paint-lab:american-beech';
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);
const GOLDEN_ANGLE = THREE.MathUtils.degToRad(137.5);

interface SeedThreeFoliageConfig {
  leavesPerBranch: number;
  size: number;
  sizeVar: number;
  widthRatio: number;
  taper: number;
  startFrac: number;
  downAngle: number;
  downAngleV: number;
  droop: number;
  droopV: number;
  bend: number;
  quads: number;
  trunkClearRadius: number;
}

const foliageDefaults: SeedThreeFoliageConfig = {
  leavesPerBranch: 14,
  size: 0.55,
  sizeVar: 0.3,
  widthRatio: 0.62,
  taper: 0.35,
  startFrac: 0.1,
  downAngle: 52,
  downAngleV: 18,
  droop: 22,
  droopV: 12,
  bend: 0,
  quads: 2,
  trunkClearRadius: 0,
};

const barkPalette: PaintPalette = {
  dark: '#17171a',
  light: '#9d9589',
  reflectionDark: '#4b4647',
  reflectionLight: '#e5c6a2',
  rim: '#f0bd85',
  outline: '#17131a',
  outlineSecondary: '#b3c9bf',
};

const leafPalette: PaintPalette = {
  dark: '#0b2012',
  light: '#6f9d3b',
  reflectionDark: '#24482f',
  reflectionLight: '#e1dc78',
  rim: '#f6bd5d',
  outline: '#07150d',
  outlineSecondary: '#b8da78',
};

const groundPalette: PaintPalette = {
  dark: '#18100d',
  light: '#4c3a26',
  reflectionDark: '#331818',
  reflectionLight: '#9f7651',
  rim: '#d49a61',
  outline: '#120d0d',
  outlineSecondary: '#65715a',
};

const loader = new THREE.TextureLoader();
const beechBarkTexture = configureColorTexture(loader.load(beechBarkUrl), true);
const beechLeafTexture = configureColorTexture(loader.load(beechLeafUrl), false);

export function buildSeedThreeBeechScene(context: SceneBuildContext): void {
  const skeletonRng = new Rng(`${americanBeech.name}:${BEECH_SEED}`);
  const { stems } = generateSkeleton(americanBeech.params, skeletonRng);
  const terminalStems = stems.filter((stem) => stem.level === stem.maxLevel);
  const branchGeometry = buildBranchGeometry(stems, {
    tileWorldSize: americanBeech.tileWorldSize ?? 1.5,
    radialScale: 1,
    ringStride: 1,
  });
  const leafRng = new Rng(`${americanBeech.name}:${BEECH_SEED}:foliage0`);
  const foliage = {
    ...foliageDefaults,
    ...americanBeech.foliage,
  } as SeedThreeFoliageConfig;
  const leafBuild = buildSeedThreeLeafGeometry(terminalStems, foliage, leafRng);
  const treeRotation = new THREE.Euler(0, -0.18, 0);
  const treePosition = new THREE.Vector3(0, -(americanBeech.plantSink ?? 0.2), 0);

  context.addPaintedObject({
    label: 'SeedThree beech branches',
    geometry: branchGeometry,
    palette: barkPalette,
    surfaceMap: beechBarkTexture,
    surfaceMapStrength: 0.9,
    sourceAlbedoWeight: 0.58,
    position: treePosition,
    rotation: treeRotation,
    smoothNormals: 'existing',
    triplanarMacro: true,
    objectTextureScale: 0.42,
    roughness: 0.88,
    metalness: 0,
    clearcoat: 0.04,
    clearcoatRoughness: 0.9,
  });

  context.addPaintedObject({
    label: 'SeedThree beech leaves',
    geometry: leafBuild.geometry,
    palette: leafPalette,
    surfaceMap: beechLeafTexture,
    surfaceMapStrength: 1,
    surfaceAlphaTest: 0.42,
    sourceAlbedoWeight: 0.5,
    position: treePosition,
    rotation: treeRotation,
    shells: false,
    smoothNormals: 'existing',
    objectTextureScale: 0.9,
    roughness: 0.92,
    metalness: 0,
    clearcoat: 0,
    side: THREE.DoubleSide,
  });

  const ground = context.addPaintedObject({
    label: 'Beech forest floor',
    geometry: new THREE.CircleGeometry(24, 128),
    palette: groundPalette,
    position: new THREE.Vector3(0, -0.34, 0),
    rotation: new THREE.Euler(-Math.PI / 2, 0, -0.08),
    shells: false,
    triplanarMacro: true,
    objectTextureScale: 0.18,
    roughness: 0.96,
    metalness: 0,
    clearcoat: 0.02,
  });
  ground.base.receiveShadow = true;

  context.root.userData.seedThree = {
    fork: 'SeloSlav/SeedThree',
    commit: '4c20609db11f99605018e94cf7833351692d569a',
    preset: `${americanBeech.name} (${americanBeech.latin})`,
    seed: BEECH_SEED,
    stemCount: stems.length,
    terminalStemCount: terminalStems.length,
    leafInstances: leafBuild.leafCount,
  };
}

function configureColorTexture(texture: THREE.Texture, repeat: boolean): THREE.Texture {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;
  return texture;
}

/**
 * WebGL render adapter for SeedThree's LOD0 leaf grammar. Placement, phyllotaxy,
 * droop, taper, trunk clearance, and RNG draw order mirror core/leaf-cards.js;
 * the instances are baked only because Paint/Lab's shader lifecycle owns meshes.
 */
function buildSeedThreeLeafGeometry(
  terminalStems: SeedThreeStem[],
  config: SeedThreeFoliageConfig,
  rng: Rng,
): { geometry: THREE.BufferGeometry; leafCount: number } {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  let minY = Infinity;
  let maxY = -Infinity;
  const canopyCenter = new THREE.Vector3();
  for (const stem of terminalStems) {
    canopyCenter.add(stem.points.at(-1) ?? new THREE.Vector3());
    for (const point of stem.points) {
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
  }
  canopyCenter.divideScalar(Math.max(terminalStems.length, 1));
  const crownSpan = Math.max(0.5, maxY - minY);
  const domeOrigin = new THREE.Vector3(
    canopyCenter.x,
    Math.min(minY - 0.5, canopyCenter.y - 1),
    canopyCenter.z,
  );

  const frame = new THREE.Quaternion();
  const leafRotation = new THREE.Quaternion();
  const phylloRotation = new THREE.Quaternion();
  const downRotation = new THREE.Quaternion();
  const bendRotation = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const droopAxis = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  let leafCount = 0;

  for (const stem of terminalStems) {
    const segmentCount = stem.points.length - 1;
    let phyllo = rng.range(0, Math.PI * 2);

    for (let index = 0; index < config.leavesPerBranch; index += 1) {
      const fraction = config.startFrac
        + (1 - config.startFrac) * ((index + rng.next()) / config.leavesPerBranch);
      const segment = Math.min(segmentCount - 1, Math.floor(fraction * segmentCount));
      const segmentAlpha = fraction * segmentCount - segment;
      position.copy(stem.points[segment]).lerp(stem.points[segment + 1], segmentAlpha);

      if (config.trunkClearRadius > 0) {
        const heightFraction = (position.y - minY) / crownSpan;
        const effectiveClearance = config.trunkClearRadius
          * Math.max(0, 1 - heightFraction / 0.65);
        if (effectiveClearance > 0 && Math.hypot(position.x, position.z) < effectiveClearance) {
          continue;
        }
      }

      frame.copy(stem.orients[segment]).slerp(stem.orients[segment + 1], segmentAlpha);
      phyllo += GOLDEN_ANGLE + rng.vary(0, 0.3);
      const down = THREE.MathUtils.degToRad(
        config.downAngle + rng.vary(0, config.downAngleV),
      );
      downRotation.setFromAxisAngle(X, down);
      phylloRotation.setFromAxisAngle(Y, phyllo);
      leafRotation.copy(frame).multiply(phylloRotation).multiply(downRotation);

      if (config.bend > 0) {
        direction.set(0, 0, 1).applyQuaternion(leafRotation);
        const targetAzimuth = Math.atan2(position.z, position.x);
        const bendAzimuth = targetAzimuth - Math.atan2(direction.z, direction.x);
        bendRotation.setFromAxisAngle(UP, config.bend * bendAzimuth);
        leafRotation.premultiply(bendRotation);
        direction.set(0, 0, 1).applyQuaternion(leafRotation);
        const forwardBend = Math.atan2(Math.hypot(direction.x, direction.z), direction.y);
        bendRotation.setFromAxisAngle(X, config.bend * forwardBend);
        leafRotation.multiply(bendRotation);
      }

      if (config.droop > 0) {
        direction.set(0, 1, 0).applyQuaternion(leafRotation);
        droopAxis.crossVectors(direction, DOWN);
        if (droopAxis.lengthSq() > 1e-6) {
          droopAxis.normalize();
          bendRotation.setFromAxisAngle(
            droopAxis,
            THREE.MathUtils.degToRad(config.droop + rng.vary(0, config.droopV)),
          );
          leafRotation.premultiply(bendRotation);
        }
      }

      const leafSize = config.size
        * (1 - config.taper * fraction)
        * (1 + rng.vary(0, config.sizeVar));
      scale.set(leafSize * config.widthRatio, leafSize, leafSize);
      matrix.compose(position, leafRotation, scale);
      appendLeafCards(
        matrix,
        Math.max(1, Math.round(config.quads)),
        domeOrigin,
        positions,
        normals,
        uvs,
        indices,
      );
      leafCount += 1;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { geometry, leafCount };
}

function appendLeafCards(
  matrix: THREE.Matrix4,
  cardCount: number,
  domeOrigin: THREE.Vector3,
  positions: number[],
  normals: number[],
  uvs: number[],
  indices: number[],
): void {
  const localCorners = [
    new THREE.Vector2(-0.5, 0),
    new THREE.Vector2(0.5, 0),
    new THREE.Vector2(0.5, 1),
    new THREE.Vector2(-0.5, 1),
  ];
  const cardUvs = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(1, 0),
    new THREE.Vector2(1, 1),
    new THREE.Vector2(0, 1),
  ];
  const vertex = new THREE.Vector3();
  const domeNormal = new THREE.Vector3();

  for (let card = 0; card < cardCount; card += 1) {
    const angle = (card * Math.PI) / cardCount;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const vertexOffset = positions.length / 3;
    for (let corner = 0; corner < 4; corner += 1) {
      const local = localCorners[corner];
      vertex.set(local.x * cosine, local.y, local.x * sine).applyMatrix4(matrix);
      domeNormal.copy(vertex).sub(domeOrigin).normalize().addScaledVector(UP, 0.45).normalize();
      positions.push(vertex.x, vertex.y, vertex.z);
      normals.push(domeNormal.x, domeNormal.y, domeNormal.z);
      uvs.push(cardUvs[corner].x, cardUvs[corner].y);
    }
    indices.push(
      vertexOffset,
      vertexOffset + 1,
      vertexOffset + 2,
      vertexOffset,
      vertexOffset + 2,
      vertexOffset + 3,
    );
  }
}
