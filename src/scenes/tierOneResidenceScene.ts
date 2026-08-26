import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PaintPalette } from '../PainterlyMaterial.ts';
import type {
  SceneBuildContext,
  ScenePaintedObjectOptions,
} from './sceneRegistry.ts';

const RESIDENCE_SEED = 137;
const SIDE_WINDOW_Z = -1.25;

type SurfaceSpec = {
  color: THREE.ColorRepresentation;
  palette: PaintPalette;
  map?: THREE.Texture;
  mapStrength?: number;
  roughness: number;
  metalness?: number;
  clearcoat?: number;
};

type BoxPart = {
  size: readonly [number, number, number];
  position: readonly [number, number, number];
  rotation?: readonly [number, number, number];
};

type WallOpening = {
  center: number;
  width: number;
  bottom: number;
  height: number;
};

const textureLoader = new THREE.TextureLoader();
const surfaceTextureCache = new Map<string, THREE.Texture>();
let thatchTexture: THREE.DataTexture | null = null;

export function buildTierOneResidenceScene(context: SceneBuildContext): void {
  const masonryMap = repeatingSurfaceTexture('/textures/buildings/masonry_diff.jpg', 2.2);
  const woodMap = repeatingSurfaceTexture('/textures/buildings/wood_planks_diff.jpg', 2.8);
  const thatchMap = proceduralThatchAlbedo();
  const surfaces = {
    plaster: surface('#fff4de', 0.96, undefined, 0, 0, '#4b3932'),
    limestone: surface('#d8d0c2', 0.97, masonryMap, 0.64, 0, '#55585b'),
    limestoneCap: surface('#f3eadb', 0.96, masonryMap, 0.58, 0, '#626365'),
    timber: surface('#a07a5d', 0.94, woodMap, 0.72, 0, '#36251c'),
    timberMid: surface('#aa866b', 0.9, woodMap, 0.76, 0, '#3b271d'),
    timberWeathered: surface('#d4c0a9', 0.96, woodMap, 0.7, 0, '#4b3c31'),
    thatch: surface('#8f928c', 1, thatchMap, 1, 0, '#494a45'),
    glass: surface('#303a39', 0.4, undefined, 0, 0.03, '#15191a'),
    interior: surface('#1a1410', 1, undefined, 0, 0, '#080604'),
    iron: surface('#4a4846', 0.55, undefined, 0, 0.72, '#141414'),
    earth: surface('#594331', 1, undefined, 0, 0, '#241a13'),
    grass: surface('#3f4936', 0.98, undefined, 0, 0, '#1f261b'),
  } as const;

  const plot = addSurfacePart(context, context.root, surfaces.grass, {
    label: 'Burgage grass plot',
    geometry: new THREE.PlaneGeometry(18, 16, 1, 1),
    position: new THREE.Vector3(0, -0.055, -0.4),
    rotation: new THREE.Euler(-Math.PI / 2, 0, 0),
    shells: false,
    objectTextureScale: 0.13,
  });
  plot.base.receiveShadow = true;

  const path = addSurfacePart(context, context.root, surfaces.earth, {
    label: 'Burgage footpath',
    geometry: new THREE.PlaneGeometry(2.25, 8.8, 1, 1),
    position: new THREE.Vector3(1.25, -0.025, 5.35),
    rotation: new THREE.Euler(-Math.PI / 2, 0, 0.035),
    shells: false,
    objectTextureScale: 0.2,
  });
  path.base.receiveShadow = true;

  const house = new THREE.Group();
  house.name = 'Tier 1 residence · medieval-road-system';
  house.rotation.y = -0.46;
  house.userData.sourceProject = 'medieval-road-system';
  house.userData.sourceConstructor = 'createResidenceMesh(seed, 1)';
  house.userData.residenceVisualSeed = RESIDENCE_SEED;
  house.userData.visualContract = {
    subject: 'tier-one burgage cottage',
    identity: ['lime plaster', 'limestone plinth', 'hewn timber', 'bundled grey thatch'],
    invariants: [
      'source surface hues remain distinct in Source albedo view',
      'the steep thatch roof and true door/window apertures remain readable without post processing',
      'the painterly shader is shared with the material-study scene',
    ],
  };
  context.root.add(house);

  const width = 5.17;
  const depth = 5.64;
  const foundationHeight = 0.4;
  const groundHeight = 2.15;
  const upperHeight = 0.12;
  const ridgeHeight = 2.85;
  const halfW = width * 0.5;
  const halfD = depth * 0.5;
  const wallTop = foundationHeight + groundHeight + upperHeight;
  const roofPitch = Math.atan2(ridgeHeight, halfW);
  const roofOverhang = 0.54;
  const roofDepthOverhang = 0.68;
  const roofHalfSpan = halfW + roofOverhang;
  const roofEaveDrop = roofOverhang * Math.tan(roofPitch);
  const slopeLength = roofHalfSpan / Math.cos(roofPitch);
  const frontZ = halfD - 0.075;
  const doorX = 1.38;
  const frontWindowX = -1.38;
  const windowCenterY = foundationHeight + groundHeight * 0.55;

  addSurfacePart(context, house, surfaces.limestone, {
    label: 'Residence limestone plinth',
    geometry: new THREE.BoxGeometry(width + 0.38, foundationHeight, depth + 0.38),
    position: new THREE.Vector3(0, foundationHeight * 0.5, 0),
    shells: true,
    objectTextureScale: 0.34,
  });
  addSurfacePart(context, house, surfaces.limestoneCap, {
    label: 'Residence limestone plinth cap',
    geometry: new THREE.BoxGeometry(width + 0.46, 0.13, depth + 0.46),
    position: new THREE.Vector3(0, foundationHeight - 0.035, 0),
    shells: false,
    objectTextureScale: 0.38,
  });

  const wallGeometry = createWallShellGeometry(
    width,
    depth,
    foundationHeight,
    wallTop,
    [
      { center: doorX, width: 1.14, bottom: foundationHeight + 0.035, height: 2.055 },
      { center: frontWindowX, width: 0.72, bottom: windowCenterY - 0.42, height: 0.84 },
    ],
    [{ center: SIDE_WINDOW_Z, width: 0.7, bottom: windowCenterY - 0.41, height: 0.82 }],
  );
  addSurfacePart(context, house, surfaces.plaster, {
    label: 'Residence limewashed wall shell',
    geometry: wallGeometry,
    shells: true,
    objectTextureScale: 0.29,
  });

  addGable(context, house, surfaces.plaster, halfW, wallTop, ridgeHeight, halfD - 0.065, 'front');
  addGable(context, house, surfaces.plaster, halfW, wallTop, ridgeHeight, -halfD + 0.065, 'rear');

  const cornerPosts = [-halfW, halfW].flatMap((x) => [-halfD, halfD].map((z) => ({
    size: [0.18, wallTop - foundationHeight + 0.1, 0.18] as const,
    position: [x, foundationHeight + (wallTop - foundationHeight) * 0.5, z] as const,
  })));
  addSurfacePart(context, house, surfaces.timber, {
    label: 'Residence hand-hewn corner posts',
    geometry: mergeBoxParts(cornerPosts),
    shells: false,
    objectTextureScale: 0.58,
  });

  addSurfacePart(context, house, surfaces.timber, {
    label: 'Residence hewn timber wall plate',
    geometry: new THREE.BoxGeometry(width + 0.12, 0.18, depth + 0.12),
    position: new THREE.Vector3(0, wallTop - 0.09, 0),
    shells: false,
    objectTextureScale: 0.5,
  });

  addSurfacePart(context, house, surfaces.timberWeathered, {
    label: 'Residence ventilated timber gable kingposts',
    geometry: mergeBoxParts([
      { size: [0.15, ridgeHeight - 0.08, 0.12], position: [0, wallTop + ridgeHeight * 0.48, halfD + 0.045] },
      { size: [0.15, ridgeHeight - 0.08, 0.12], position: [0, wallTop + ridgeHeight * 0.48, -halfD - 0.045] },
    ]),
    shells: false,
    objectTextureScale: 0.62,
  });

  for (const side of [-1, 1] as const) {
    addSurfacePart(context, house, surfaces.thatch, {
      label: `Residence main thatch roof ${side < 0 ? 'left' : 'right'}`,
      geometry: new THREE.BoxGeometry(slopeLength, 0.24, depth + roofDepthOverhang * 2),
      position: new THREE.Vector3(
        side * roofHalfSpan * 0.5,
        wallTop + (ridgeHeight - roofEaveDrop) * 0.5,
        0,
      ),
      rotation: new THREE.Euler(0, 0, side * -roofPitch),
      shells: true,
      objectTextureScale: 0.34,
    });

    addSurfacePart(context, house, surfaces.thatch, {
      label: `Residence bundled-thatch courses ${side < 0 ? 'left' : 'right'}`,
      geometry: createThatchCourseGeometry(
        side,
        roofHalfSpan,
        depth,
        roofDepthOverhang,
        wallTop,
        ridgeHeight,
        roofPitch,
        roofEaveDrop,
      ),
      shells: false,
      objectTextureScale: 0.36,
    });
  }

  addRoofEdgeCraft(
    context,
    house,
    surfaces.timberWeathered,
    roofHalfSpan,
    depth,
    roofDepthOverhang,
    halfD,
    wallTop,
    ridgeHeight,
    roofPitch,
    roofEaveDrop,
  );

  addDoor(context, house, surfaces, doorX, foundationHeight + 0.08, frontZ + 0.03);
  addFrontWindow(context, house, surfaces, frontWindowX, windowCenterY, frontZ + 0.02);
  addSideWindow(context, house, surfaces, -1, -halfW + 0.035, windowCenterY, SIDE_WINDOW_Z);
  addSideWindow(context, house, surfaces, 1, halfW - 0.035, windowCenterY, SIDE_WINDOW_Z);

  for (let step = 0; step < 2; step += 1) {
    addSurfacePart(context, house, step === 0 ? surfaces.limestone : surfaces.limestoneCap, {
      label: `Residence doorstep ${step + 1}`,
      geometry: new THREE.BoxGeometry(1.5 - step * 0.18, 0.16, 0.5),
      position: new THREE.Vector3(doorX, 0.08 + step * 0.12, halfD + 0.34 - step * 0.14),
      shells: false,
      objectTextureScale: 0.4,
    });
  }

  addEntryCanopy(
    context,
    house,
    surfaces,
    doorX,
    frontZ,
    foundationHeight,
  );
}

function addSurfacePart(
  context: SceneBuildContext,
  parent: THREE.Object3D,
  material: SurfaceSpec,
  options: Omit<ScenePaintedObjectOptions, 'palette' | 'surfaceColor' | 'surfaceMap' | 'surfaceMapStrength' | 'sourceAlbedoWeight' | 'roughness' | 'metalness' | 'clearcoat'>,
) {
  const belongsToResidence = parent !== context.root;
  return context.addPaintedObject({
    ...options,
    screenOutline: options.screenOutline ?? belongsToResidence,
    outlineGroup: options.outlineGroup ?? (belongsToResidence ? 'tier-one-residence' : undefined),
    palette: material.palette,
    surfaceColor: material.color,
    surfaceMap: material.map,
    surfaceMapStrength: material.mapStrength,
    sourceAlbedoWeight: 1,
    roughness: material.roughness,
    metalness: material.metalness ?? 0,
    clearcoat: material.clearcoat ?? 0.04,
  }, parent);
}

function surface(
  color: THREE.ColorRepresentation,
  roughness: number,
  map?: THREE.Texture,
  mapStrength = 1,
  metalness = 0,
  outline: THREE.ColorRepresentation = '#28211e',
): SurfaceSpec {
  return {
    color,
    roughness,
    metalness,
    map,
    mapStrength,
    palette: paletteFromSurface(color, outline),
  };
}

function paletteFromSurface(
  color: THREE.ColorRepresentation,
  outline: THREE.ColorRepresentation,
): PaintPalette {
  const base = new THREE.Color(color);
  const dark = base.clone().multiplyScalar(0.28);
  const light = base.clone().lerp(new THREE.Color('#fff7e9'), 0.26);
  const reflectionDark = base.clone().multiplyScalar(0.46);
  const reflectionLight = base.clone().lerp(new THREE.Color('#ffe1b7'), 0.62);
  const rim = base.clone().lerp(new THREE.Color('#fff1d9'), 0.74);
  return {
    dark: `#${dark.getHexString()}`,
    light: `#${light.getHexString()}`,
    reflectionDark: `#${reflectionDark.getHexString()}`,
    reflectionLight: `#${reflectionLight.getHexString()}`,
    rim: `#${rim.getHexString()}`,
    outline,
    outlineSecondary: `#${base.clone().lerp(new THREE.Color('#fff1cc'), 0.48).getHexString()}`,
  };
}

function createWallShellGeometry(
  width: number,
  depth: number,
  bottom: number,
  top: number,
  frontOpenings: readonly WallOpening[],
  sideOpenings: readonly WallOpening[],
): THREE.BufferGeometry {
  const halfW = width * 0.5;
  const halfD = depth * 0.5;
  const thickness = 0.18;
  const parts: BoxPart[] = [];
  appendPartitionedWall(parts, 'front-back', -halfW + 0.1, halfW - 0.1, bottom, top, halfD - thickness * 0.5, thickness, frontOpenings);
  appendPartitionedWall(parts, 'front-back', -halfW + 0.1, halfW - 0.1, bottom, top, -halfD + thickness * 0.5, thickness, []);
  for (const side of [-1, 1] as const) {
    appendPartitionedWall(parts, 'side', -halfD + 0.1, halfD - 0.1, bottom, top, side * (halfW - thickness * 0.5), thickness, sideOpenings);
  }
  return mergeBoxParts(parts);
}

function appendPartitionedWall(
  parts: BoxPart[],
  orientation: 'front-back' | 'side',
  horizontalMin: number,
  horizontalMax: number,
  verticalMin: number,
  verticalMax: number,
  fixedCoordinate: number,
  thickness: number,
  openings: readonly WallOpening[],
): void {
  const horizontalCuts = sortedCuts([
    horizontalMin,
    horizontalMax,
    ...openings.flatMap((opening) => [
      THREE.MathUtils.clamp(opening.center - opening.width * 0.5, horizontalMin, horizontalMax),
      THREE.MathUtils.clamp(opening.center + opening.width * 0.5, horizontalMin, horizontalMax),
    ]),
  ]);
  const verticalCuts = sortedCuts([
    verticalMin,
    verticalMax,
    ...openings.flatMap((opening) => [
      THREE.MathUtils.clamp(opening.bottom, verticalMin, verticalMax),
      THREE.MathUtils.clamp(opening.bottom + opening.height, verticalMin, verticalMax),
    ]),
  ]);

  for (let h = 0; h < horizontalCuts.length - 1; h += 1) {
    const start = horizontalCuts[h] ?? 0;
    const end = horizontalCuts[h + 1] ?? start;
    const horizontalCenter = (start + end) * 0.5;
    for (let v = 0; v < verticalCuts.length - 1; v += 1) {
      const cellBottom = verticalCuts[v] ?? 0;
      const cellTop = verticalCuts[v + 1] ?? cellBottom;
      const verticalCenter = (cellBottom + cellTop) * 0.5;
      const insideOpening = openings.some((opening) => (
        horizontalCenter > opening.center - opening.width * 0.5 + 1e-5
        && horizontalCenter < opening.center + opening.width * 0.5 - 1e-5
        && verticalCenter > opening.bottom + 1e-5
        && verticalCenter < opening.bottom + opening.height - 1e-5
      ));
      if (insideOpening || end - start < 1e-4 || cellTop - cellBottom < 1e-4) continue;
      parts.push(orientation === 'front-back'
        ? { size: [end - start, cellTop - cellBottom, thickness], position: [horizontalCenter, verticalCenter, fixedCoordinate] }
        : { size: [thickness, cellTop - cellBottom, end - start], position: [fixedCoordinate, verticalCenter, horizontalCenter] });
    }
  }
}

function sortedCuts(values: readonly number[]): number[] {
  return [...values]
    .sort((left, right) => left - right)
    .filter((value, index, sorted) => index === 0 || Math.abs(value - (sorted[index - 1] ?? value)) > 1e-6);
}

function addGable(
  context: SceneBuildContext,
  parent: THREE.Object3D,
  material: SurfaceSpec,
  halfSpan: number,
  wallTop: number,
  ridgeHeight: number,
  z: number,
  side: string,
): void {
  const shape = new THREE.Shape();
  shape.moveTo(-halfSpan + 0.06, 0);
  shape.lineTo(halfSpan - 0.06, 0);
  shape.lineTo(0, ridgeHeight);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false });
  geometry.translate(0, 0, -0.08);
  addSurfacePart(context, parent, material, {
    label: `Residence ${side} triangular gable`,
    geometry,
    position: new THREE.Vector3(0, wallTop, z),
    shells: false,
    objectTextureScale: 0.3,
  });
}

function createThatchCourseGeometry(
  side: -1 | 1,
  roofHalfSpan: number,
  depth: number,
  depthOverhang: number,
  wallTop: number,
  ridgeHeight: number,
  roofPitch: number,
  eaveDrop: number,
): THREE.BufferGeometry {
  const parts: BoxPart[] = [];
  const courseCount = 4;
  const roofDepth = depth + depthOverhang * 2;
  const slopeLength = roofHalfSpan / Math.cos(roofPitch);
  const courseLength = slopeLength / courseCount * 1.34;
  const normalX = side * Math.sin(roofPitch);
  const normalY = Math.cos(roofPitch);
  for (let row = 0; row < courseCount; row += 1) {
    const t = (row + 0.48) / courseCount;
    parts.push({
      size: [courseLength * (0.96 + ((row * 5 + RESIDENCE_SEED) % 5) * 0.012), 0.05, roofDepth - 0.012],
      position: [
        side * roofHalfSpan * (1 - t) + normalX * 0.052,
        wallTop - eaveDrop + (ridgeHeight + eaveDrop) * t + normalY * 0.052,
        0,
      ],
      rotation: [0, 0, side * -roofPitch],
    });
  }
  return mergeBoxParts(parts);
}

function addRoofEdgeCraft(
  context: SceneBuildContext,
  parent: THREE.Object3D,
  material: SurfaceSpec,
  roofHalfSpan: number,
  depth: number,
  depthOverhang: number,
  halfDepth: number,
  wallTop: number,
  ridgeHeight: number,
  roofPitch: number,
  eaveDrop: number,
): void {
  const roofDepth = depth + depthOverhang * 2;
  addSurfacePart(context, parent, material, {
    label: 'Residence wooden ridge cap',
    geometry: new THREE.BoxGeometry(0.3, 0.24, roofDepth + 0.12),
    position: new THREE.Vector3(0, wallTop + ridgeHeight + 0.055, 0),
    shells: false,
    objectTextureScale: 0.62,
  });

  const slopeLength = roofHalfSpan / Math.cos(roofPitch);
  const rakeParts: BoxPart[] = [];
  for (const zSign of [-1, 1] as const) {
    for (const side of [-1, 1] as const) {
      rakeParts.push({
        size: [slopeLength, 0.14, 0.145],
        position: [
          side * roofHalfSpan * 0.5,
          wallTop + (ridgeHeight - eaveDrop) * 0.5,
          zSign * (halfDepth + depthOverhang + 0.08),
        ],
        rotation: [0, 0, side * -roofPitch],
      });
    }
  }
  for (const side of [-1, 1] as const) {
    rakeParts.push({
      size: [0.16, 0.2, roofDepth + 0.08],
      position: [side * roofHalfSpan, wallTop - eaveDrop - 0.02, 0],
      rotation: [0, 0, side * -roofPitch],
    });
  }
  addSurfacePart(context, parent, material, {
    label: 'Residence weathered roof edge craft',
    geometry: mergeBoxParts(rakeParts),
    shells: false,
    objectTextureScale: 0.62,
  });
}

function addDoor(
  context: SceneBuildContext,
  parent: THREE.Object3D,
  materials: Record<string, SurfaceSpec>,
  x: number,
  baseY: number,
  z: number,
): void {
  addSurfacePart(context, parent, materials.interior!, {
    label: 'Residence shadowed plank door aperture',
    geometry: new THREE.BoxGeometry(1.08, 1.98, 0.12),
    position: new THREE.Vector3(x, baseY + 0.99, z - 0.08),
    shells: false,
    objectTextureScale: 0.5,
  });
  addSurfacePart(context, parent, materials.timberMid!, {
    label: 'Residence visible timber plank door leaf',
    geometry: new THREE.BoxGeometry(0.92, 1.82, 0.1),
    position: new THREE.Vector3(x, baseY + 0.91, z + 0.035),
    shells: false,
    objectTextureScale: 0.64,
  });
  const frameParts: BoxPart[] = [
    { size: [0.14, 2.05, 0.18], position: [x - 0.58, baseY + 1.025, z + 0.08] },
    { size: [0.14, 2.05, 0.18], position: [x + 0.58, baseY + 1.025, z + 0.08] },
    { size: [1.3, 0.16, 0.2], position: [x, baseY + 2.02, z + 0.08] },
    { size: [0.07, 1.72, 0.035], position: [x - 0.25, baseY + 0.91, z + 0.095] },
    { size: [0.07, 1.72, 0.035], position: [x + 0.25, baseY + 0.91, z + 0.095] },
  ];
  addSurfacePart(context, parent, materials.timberWeathered!, {
    label: 'Residence door hewn frame and planks',
    geometry: mergeBoxParts(frameParts),
    shells: false,
    objectTextureScale: 0.65,
  });
  addSurfacePart(context, parent, materials.iron!, {
    label: 'Residence door iron latch',
    geometry: new THREE.BoxGeometry(0.32, 0.055, 0.055),
    position: new THREE.Vector3(x + 0.22, baseY + 0.95, z + 0.14),
    shells: false,
    objectTextureScale: 0.7,
  });
}

function addFrontWindow(
  context: SceneBuildContext,
  parent: THREE.Object3D,
  materials: Record<string, SurfaceSpec>,
  x: number,
  y: number,
  z: number,
): void {
  addSurfacePart(context, parent, materials.interior!, {
    label: 'Residence front window recessed interior',
    geometry: new THREE.BoxGeometry(0.67, 0.79, 0.1),
    position: new THREE.Vector3(x, y, z - 0.1),
    shells: false,
    objectTextureScale: 0.5,
  });
  addSurfacePart(context, parent, materials.glass!, {
    label: 'Residence front window pane',
    geometry: new THREE.BoxGeometry(0.5, 0.6, 0.035),
    position: new THREE.Vector3(x, y, z + 0.025),
    shells: false,
    objectTextureScale: 0.5,
  });
  addSurfacePart(context, parent, materials.timber!, {
    label: 'Residence front window hewn casing',
    geometry: mergeBoxParts(windowFrameParts(x, y, z + 0.07, 0.72, 0.84, 'front')),
    shells: false,
    objectTextureScale: 0.65,
  });
}

function addSideWindow(
  context: SceneBuildContext,
  parent: THREE.Object3D,
  materials: Record<string, SurfaceSpec>,
  side: -1 | 1,
  x: number,
  y: number,
  z: number,
): void {
  addSurfacePart(context, parent, materials.interior!, {
    label: `Residence ${side < 0 ? 'left' : 'right'} window recessed interior`,
    geometry: new THREE.BoxGeometry(0.1, 0.77, 0.65),
    position: new THREE.Vector3(x + side * 0.1, y, z),
    shells: false,
    objectTextureScale: 0.5,
  });
  addSurfacePart(context, parent, materials.glass!, {
    label: `Residence ${side < 0 ? 'left' : 'right'} window pane`,
    geometry: new THREE.BoxGeometry(0.035, 0.58, 0.48),
    position: new THREE.Vector3(x + side * 0.025, y, z),
    shells: false,
    objectTextureScale: 0.5,
  });
  addSurfacePart(context, parent, materials.timber!, {
    label: `Residence ${side < 0 ? 'left' : 'right'} window hewn casing`,
    geometry: mergeBoxParts(windowFrameParts(x + side * 0.07, y, z, 0.7, 0.82, 'side')),
    shells: false,
    objectTextureScale: 0.65,
  });
}

function windowFrameParts(
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  face: 'front' | 'side',
): BoxPart[] {
  const rail = 0.09;
  if (face === 'front') {
    return [
      { size: [rail, height + 0.14, 0.12], position: [x - width * 0.5, y, z] },
      { size: [rail, height + 0.14, 0.12], position: [x + width * 0.5, y, z] },
      { size: [width + 0.16, rail, 0.12], position: [x, y - height * 0.5, z] },
      { size: [width + 0.16, rail, 0.12], position: [x, y + height * 0.5, z] },
      { size: [rail * 0.68, height, 0.13], position: [x, y, z + 0.01] },
      { size: [width, rail * 0.68, 0.13], position: [x, y, z + 0.01] },
    ];
  }
  return [
    { size: [0.12, height + 0.14, rail], position: [x, y, z - width * 0.5] },
    { size: [0.12, height + 0.14, rail], position: [x, y, z + width * 0.5] },
    { size: [0.12, rail, width + 0.16], position: [x, y - height * 0.5, z] },
    { size: [0.12, rail, width + 0.16], position: [x, y + height * 0.5, z] },
    { size: [0.13, height, rail * 0.68], position: [x, y, z] },
    { size: [0.13, rail * 0.68, width], position: [x, y, z] },
  ];
}

function addEntryCanopy(
  context: SceneBuildContext,
  parent: THREE.Object3D,
  materials: Record<string, SurfaceSpec>,
  entryX: number,
  frontZ: number,
  foundationHeight: number,
): void {
  const canopyY = foundationHeight + 2.08;
  addSurfacePart(context, parent, materials.thatch!, {
    label: 'Residence deep-eave door canopy roof',
    geometry: new THREE.BoxGeometry(1.72, 0.11, 0.92),
    position: new THREE.Vector3(entryX, canopyY, frontZ + 0.35),
    rotation: new THREE.Euler(0.18, 0, 0),
    shells: true,
    objectTextureScale: 0.42,
  });
  const braces = [-1, 1].map((side) => ({
    size: [0.1, 0.1, 0.82] as const,
    position: [entryX + side * 0.65, canopyY - 0.34, frontZ + 0.2] as const,
    rotation: [-0.67, 0, 0] as const,
  }));
  addSurfacePart(context, parent, materials.timber!, {
    label: 'Residence door canopy timber braces',
    geometry: mergeBoxParts(braces),
    shells: false,
    objectTextureScale: 0.65,
  });
}

function mergeBoxParts(parts: readonly BoxPart[]): THREE.BufferGeometry {
  const geometries = parts.map((part) => {
    const geometry = new THREE.BoxGeometry(...part.size);
    const rotation = part.rotation ?? [0, 0, 0];
    geometry.rotateX(rotation[0]);
    geometry.rotateY(rotation[1]);
    geometry.rotateZ(rotation[2]);
    geometry.translate(...part.position);
    return geometry;
  });
  const merged = mergeGeometries(geometries, false);
  for (const geometry of geometries) geometry.dispose();
  if (!merged) throw new Error('Could not merge tier-one residence geometry.');
  return merged;
}

function repeatingSurfaceTexture(url: string, repeat: number): THREE.Texture {
  const cached = surfaceTextureCache.get(url);
  if (cached) return cached;
  const texture = textureLoader.load(url);
  texture.name = `Imported residence surface · ${url.split('/').at(-1) ?? url}`;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 8;
  surfaceTextureCache.set(url, texture);
  return texture;
}

function proceduralThatchAlbedo(): THREE.DataTexture {
  if (thatchTexture) return thatchTexture;
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  const fibers = 56;
  const bundles = 11;
  const courses = 6;
  for (let pixelV = 0; pixelV < size; pixelV += 1) {
    const v = (pixelV + 0.5) / size;
    for (let pixelU = 0; pixelU < size; pixelU += 1) {
      const u = (pixelU + 0.5) / size;
      const broadWeather = periodicThatchNoise(u, v, 4, 13);
      const detailWeather = periodicThatchNoise(u, v, 11, 29);
      const weatherMottle = broadWeather * 0.72 + detailWeather * 0.28;
      const warpedFiber = v * fibers + Math.sin(u * Math.PI * 4 + v * Math.PI * 2) * 0.19 + (weatherMottle - 0.5) * 0.58;
      const fiberIndex = Math.floor(warpedFiber);
      const fiberT = wrappedUnit(warpedFiber);
      const fineFiber = Math.pow(Math.max(0, Math.cos((fiberT - 0.5) * Math.PI)), 5);
      const bundleT = wrappedUnit(v * bundles + Math.sin(u * Math.PI * 2 + fiberIndex * 0.73) * 0.08);
      const bundleCrown = Math.pow(Math.max(0, Math.cos((bundleT - 0.5) * Math.PI)), 2);
      const courseT = wrappedUnit(u * courses + (stableThatchHash(fiberIndex, 31) - 0.5) * 0.18);
      const courseShadow = 1 - smoothStep01((Math.min(courseT, 1 - courseT) - 0.015) / 0.075);
      const longitudinalCycles = 9 + Math.floor(stableThatchHash(fiberIndex, 47) * 6);
      const longitudinalGrain = 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * longitudinalCycles + fiberIndex * 1.91);
      const fleck = periodicThatchNoise(u, v, 32, 53);
      const darkFleck = smoothStep01((0.31 - fleck) / 0.14);
      const age = (stableThatchHash(fiberIndex, 71) - 0.5) * 16;
      const brightness = 0.88 + fineFiber * (0.57 + longitudinalGrain * 0.43) * 0.055 + bundleCrown * 0.045 + (longitudinalGrain - 0.5) * 0.07 + (weatherMottle - 0.5) * 0.17 - courseShadow * 0.045 - darkFleck * 0.1;
      const index = (pixelV * size + pixelU) * 4;
      data[index] = Math.round(THREE.MathUtils.clamp((226 + age) * brightness, 82, 244));
      data[index + 1] = Math.round(THREE.MathUtils.clamp((229 + age * 0.76) * brightness, 86, 246));
      data[index + 2] = Math.round(THREE.MathUtils.clamp((221 + age * 0.52) * brightness, 80, 240));
      data[index + 3] = 255;
    }
  }
  thatchTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  thatchTexture.name = 'Imported deterministic bundled-thatch albedo';
  thatchTexture.colorSpace = THREE.SRGBColorSpace;
  thatchTexture.wrapS = THREE.RepeatWrapping;
  thatchTexture.wrapT = THREE.RepeatWrapping;
  thatchTexture.repeat.set(2.5, 2.5);
  thatchTexture.minFilter = THREE.LinearMipmapLinearFilter;
  thatchTexture.magFilter = THREE.LinearFilter;
  thatchTexture.generateMipmaps = true;
  thatchTexture.anisotropy = 8;
  thatchTexture.needsUpdate = true;
  return thatchTexture;
}

function periodicThatchNoise(u: number, v: number, cells: number, seed: number): number {
  const x = wrappedUnit(u) * cells;
  const y = wrappedUnit(v) * cells;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = (x0 + 1) % cells;
  const y1 = (y0 + 1) % cells;
  const tx = smoothStep01(x - x0);
  const ty = smoothStep01(y - y0);
  const bottom = THREE.MathUtils.lerp(
    stableThatchHash(x0 + seed * 17, y0 + seed * 31),
    stableThatchHash(x1 + seed * 17, y0 + seed * 31),
    tx,
  );
  const top = THREE.MathUtils.lerp(
    stableThatchHash(x0 + seed * 17, y1 + seed * 31),
    stableThatchHash(x1 + seed * 17, y1 + seed * 31),
    tx,
  );
  return THREE.MathUtils.lerp(bottom, top, ty);
}

function stableThatchHash(first: number, second: number): number {
  const value = Math.sin(first * 17.173 + second * 91.733 + 0.419) * 15_731.743;
  return value - Math.floor(value);
}

function wrappedUnit(value: number): number {
  return value - Math.floor(value);
}

function smoothStep01(value: number): number {
  const clamped = THREE.MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}
