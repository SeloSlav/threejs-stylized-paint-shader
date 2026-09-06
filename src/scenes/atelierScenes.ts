import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PaintPalette } from '../PainterlyMaterial.ts';
import type { SceneBuildContext } from './sceneRegistry.ts';

type Point = [number, number, number];
const v = (p: Point) => new THREE.Vector3(...p);
function rng(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function palette(color: string): PaintPalette {
  return {
    dark: new THREE.Color(color).multiplyScalar(0.65), light: color,
    reflectionDark: color, reflectionLight: '#ffe3a5', rim: '#ffe9ba',
    outline: '#303a44', outlineSecondary: '#c18e62',
  };
}
function paint(ctx: SceneBuildContext, label: string, geometry: THREE.BufferGeometry, color: string, position: Point = [0, 0, 0], scale = 0.24, pigmentContrast = 0.65) {
  return ctx.addPaintedObject({
    label, geometry, palette: palette(color), position: v(position),
    surfaceColor: color, sourceAlbedoWeight: 1, preserveSourceAlbedo: true,
    texturelessSurface: true, objectTextureScale: scale, lightPaintScale: 0,
    pigmentContrast,
    shells: false, roughness: 0.95,
  });
}
function transformed(g: THREE.BufferGeometry, p: Point, s: Point, r: Point = [0, 0, 0]) {
  g.applyMatrix4(new THREE.Matrix4().compose(v(p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), v(s)));
  return g;
}
function batch(ctx: SceneBuildContext, label: string, pieces: THREE.BufferGeometry[], color: string, scale = 0.3) {
  if (!pieces.length) return;
  const normalized = pieces.map(g => g.index ? g.toNonIndexed() : g);
  const merged = mergeGeometries(normalized);
  for (const g of new Set([...pieces, ...normalized])) g.dispose();
  if (merged) return paint(ctx, label, merged, color, [0, 0, 0], scale);
}
function tube(points: Point[], radius: number) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v)), 16, radius, 5, false);
}
function height(x: number, z: number) {
  return -0.5 + Math.sin(x * 0.17 + z * 0.11) * 0.7 + Math.sin(z * 0.24) * 0.45;
}
function pathX(z: number) { return Math.sin(z * 0.16) * 2.5 + 1.2; }

export function buildProvenceScene(ctx: SceneBuildContext) {
  const random = rng(41923);
  const ground = new THREE.PlaneGeometry(150, 160, 96, 96);
  ground.rotateX(-Math.PI / 2);
  const pos = ground.getAttribute('position');
  for (let i = 0; i < pos.count; i++) pos.setY(i, height(pos.getX(i), pos.getZ(i)));
  ground.computeVertexNormals();
  paint(ctx, 'Ochre meadow', ground, '#a5aa51', [0, 0, 0], 0.15, 0.58).base.castShadow = false;

  const pathPositions: number[] = [], pathUvs: number[] = [], indices: number[] = [];
  for (let i = 0; i <= 100; i++) {
    const z = 20 - i * 0.72, x = pathX(z), width = 1.05 + Math.sin(z * 0.12) * 0.25;
    for (const side of [-1, 1]) {
      const px = x + width * side;
      pathPositions.push(px, height(px, z) + 0.045, z);
      pathUvs.push(side * 0.5 + 0.5, i / 10);
    }
    if (i < 100) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const path = new THREE.BufferGeometry();
  path.setAttribute('position', new THREE.Float32BufferAttribute(pathPositions, 3));
  path.setAttribute('uv', new THREE.Float32BufferAttribute(pathUvs, 2));
  path.setIndex(indices); path.computeVertexNormals();
  paint(ctx, 'The long way home', path, '#ddbb88', [0, 0, 0], 0.22).base.castShadow = false;

  // Layered distant hills keep the horizon closed even from the Wide bookmark.
  for (let layer = 0; layer < 3; layer++) {
    const hill = new THREE.PlaneGeometry(180, 50, 70, 16);
    hill.rotateX(-Math.PI / 2);
    const a = hill.getAttribute('position');
    for (let i = 0; i < a.count; i++) {
      const x = a.getX(i), z = a.getZ(i);
      a.setY(i, 2 + Math.sin(x * 0.055 + layer * 2) * 3 + Math.sin(x * 0.14 + layer) * 1.4 - z * z * 0.006);
    }
    hill.computeVertexNormals();
    paint(ctx, 'Lavender hills', hill, ['#6e8c85', '#84969a', '#999faa'][layer]!, [0, 0, -39 - layer * 14], 0.13, 0.27).base.castShadow = false;
  }

  const treePositions: Point[] = [[-5.8, 0, -2], [-8, 0, -7], [-4.7, 0, -13], [6.7, 0, -17], [8.4, 0, -21], [-11, 0, -23]];
  const foliage: THREE.BufferGeometry[][] = [[], [], []], trunks: THREE.BufferGeometry[] = [];
  treePositions.forEach(([x, , z], index) => {
    const base = height(x, z), tall = index === 0 ? 10 : 6 + random() * 3.5;
    trunks.push(transformed(new THREE.CylinderGeometry(0.11, 0.25, tall * 0.75, 7), [x, base + tall * 0.375, z], [1, 1, 1]));
    const points: THREE.Vector2[] = [];
    for (let j = 0; j <= 24; j++) {
      const t = j / 24;
      points.push(new THREE.Vector2(Math.max(0.018, Math.sin(Math.PI * Math.pow(t, 0.7)) * (0.85 + random() * 0.22)), t * tall));
    }
    foliage[0]!.push(transformed(new THREE.LatheGeometry(points, 16), [x, base + 0.3, z], [1, 1, 1]));
    for (let j = 0; j < 45; j++) {
      const t = 0.08 + random() * 0.82, angle = random() * Math.PI * 2;
      const radius = Math.sin(Math.PI * Math.pow(t, 0.7)) * 0.8;
      foliage[j % 3]!.push(transformed(new THREE.IcosahedronGeometry(1, 1),
        [x + Math.cos(angle) * radius * 0.8, base + t * tall + 0.4, z + Math.sin(angle) * radius * 0.8],
        [0.38 + random() * 0.25, 0.5 + random() * 0.45, 0.38 + random() * 0.25]));
    }
  });
  batch(ctx, 'Cypress trunks', trunks, '#686045');
  foliage.forEach((pieces, i) => batch(ctx, 'Cypress brush masses', pieces, ['#345e50', '#527150', '#6d8152'][i]!, 0.29));

  // A small warm focal point at the bend of the cool tree rhythm.
  const cx = 3.9, cz = -13, cy = height(cx, cz);
  paint(ctx, 'Sunwashed farmhouse', new THREE.BoxGeometry(4.3, 3.1, 3.4), '#e9c697', [cx, cy + 1.55, cz], 0.36);
  const roof = new THREE.ConeGeometry(3.4, 1.5, 4); roof.rotateY(Math.PI / 4); roof.scale(1, 1, 0.85);
  paint(ctx, 'Terracotta roof', roof, '#b5664d', [cx, cy + 3.85, cz], 0.35);
  paint(ctx, 'Farmhouse door', new THREE.BoxGeometry(0.68, 1.65, 0.06), '#3c5e61', [cx + 0.5, cy + 0.825, cz + 1.73]);
  for (const dx of [-1.25, 1.3]) paint(ctx, 'Blue shutters', new THREE.BoxGeometry(0.65, 0.82, 0.08), '#5b7b80', [cx + dx, cy + 2.05, cz + 1.75]);
  paint(ctx, 'Chimney', new THREE.BoxGeometry(0.55, 1.5, 0.55), '#c5a37c', [cx + 1.25, cy + 4.1, cz - 0.5]);

  // Hundreds of discrete daubs, batched by pigment into six draws.
  const petals: THREE.BufferGeometry[][] = [[], [], [], []];
  const stems: THREE.BufferGeometry[] = [], grasses: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 1050; i++) {
    const x = (random() - 0.5) * 42, z = 15 - random() * 48;
    if (Math.abs(x - pathX(z)) < 1.55) continue;
    const y = height(x, z), h = 0.22 + random() * 0.55;
    if (i % 3 === 0) {
      stems.push(transformed(new THREE.CylinderGeometry(0.016, 0.025, h, 3), [x, y + h / 2, z], [1, 1, 1], [0, 0, 0.12]));
      petals[i % 4]!.push(transformed(new THREE.SphereGeometry(1, 6, 4), [x, y + h, z], [0.12 + random() * 0.13, 0.08, 0.13 + random() * 0.1]));
    } else {
      grasses.push(transformed(new THREE.ConeGeometry(0.045 + random() * 0.06, h, 3), [x, y + h / 2, z], [1, 1, 1], [0, random() * 6, 0.25]));
    }
  }
  petals.forEach((pieces, i) => batch(ctx, 'Poppy and wildflower daubs', pieces, ['#dd5844', '#e88c57', '#f4d68a', '#b85459'][i]!, 0.5));
  batch(ctx, 'Wildflower stems', stems, '#65754b');
  batch(ctx, 'Meadow brush blades', grasses, '#b2ae60');

  const clouds: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 24; i++) clouds.push(transformed(new THREE.SphereGeometry(1, 16, 8),
    [-42 + i * 4.4 + random() * 2, 17 + Math.sin(i * 0.8) * 1.7, -49 - random() * 12],
    [3 + random() * 4, 0.7 + random() * 0.9, 1.5 + random() * 2]));
  const cloud = batch(ctx, 'Cream cloud strokes', clouds, '#f4dfc5', 0.11);
  if (cloud) {
    cloud.base.castShadow = false;
    const material = cloud.base.material as THREE.MeshPhysicalMaterial;
    const compile = material.onBeforeCompile.bind(material);
    const cacheKey = material.customProgramCacheKey();
    material.onBeforeCompile = (shader, renderer) => {
      compile(shader, renderer);
      // Cloud paint receives broad skylight instead of a dark solid underside.
      shader.fragmentShader = shader.fragmentShader.replace(
        'float pigmentLight = dot( paintBaseNormal, normalize( uPaintLightDirection ) );',
        'float pigmentLight = 0.9;',
      ).replace('pigmentStroke - 0.5 ) * 0.95', 'pigmentStroke - 0.5 ) * 0.24');
    };
    material.customProgramCacheKey = () => `${cacheKey}-cloud-skylight`;
  }
}

export function buildStillLifeScene(ctx: SceneBuildContext) {
  const random = rng(8193);
  paint(ctx, 'Rose plaster backdrop', new THREE.BoxGeometry(80, 40, 0.3), '#a87e72', [0, 12, -5], 0.22, 0.18);
  paint(ctx, 'Old walnut table', new THREE.BoxGeometry(80, 0.5, 65), '#8a6850', [0, -0.3, 0], 0.22, 0.28);
  const cloth = new THREE.PlaneGeometry(6.8, 7.5, 70, 70);
  const cp = cloth.getAttribute('position');
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i), z = cp.getY(i);
    cp.setXYZ(i, x + 1.3, 0.07 + Math.sin(x * 4.7 + z * 0.5) * 0.055 + Math.sin(z * 2.3) * 0.035, z + 0.3);
  }
  cloth.setIndex(Array.from(cloth.index!.array).reverse()); cloth.computeVertexNormals();
  paint(ctx, 'Folded linen', cloth, '#d8c9a6', [0, 0, 0], 0.34, 0.3);

  const profile = [[0.01, 0], [0.6, 0], [0.77, 0.1], [1.04, 0.55], [1.18, 1.15], [1.12, 1.75], [0.84, 2.23], [0.57, 2.52], [0.56, 2.82], [0.64, 2.92], [0.51, 2.95], [0.46, 2.8], [0.46, 2.54], [0.73, 2.2]];
  const curve = new THREE.SplineCurve(profile.map(([x, y]) => new THREE.Vector2(x!, y!)));
  const vase = paint(ctx, 'Ultramarine ceramic vase', new THREE.LatheGeometry(curve.getPoints(70), 72), '#376e89', [-0.9, 0.08, -0.8], 0.45);
  vase.group.userData.primary = true;
  const handles: THREE.BufferGeometry[] = [];
  handles.push(tube([[-1.75, 2.3, -0.8], [-2.55, 2.25, -0.8], [-2.45, 1.25, -0.8], [-1.9, 1.05, -0.8]], 0.13));
  batch(ctx, 'Handmade jug handle', handles, '#447b90', 0.45);

  const heads: Point[] = [[-2.25, 4.8, -0.55], [-0.3, 5.5, -0.9], [0.8, 4.45, -0.3], [-1.2, 4.0, 0.2], [-1.4, 6.1, -1.15], [-2.7, 3.8, -1.25], [0.35, 3.6, 0.25]];
  const stems: THREE.BufferGeometry[] = [], leaves: THREE.BufferGeometry[] = [];
  const flowerPetals: THREE.BufferGeometry[][] = [[], [], []], centers: THREE.BufferGeometry[] = [];
  heads.forEach(([x, y, z], i) => {
    stems.push(tube([[-0.9, 2.2, -0.8], [(x - 0.9) / 2, 3.25, z - 0.2], [x, y, z]], 0.04));
    const radius = i === 4 ? 0.47 : 0.55 + random() * 0.13;
    for (let j = 0; j < 14; j++) {
      const angle = j / 14 * Math.PI * 2;
      flowerPetals[j % 3]!.push(transformed(new THREE.SphereGeometry(1, 8, 6),
        [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, z + Math.sin(j * 2) * 0.06],
        [0.32 + random() * 0.08, 0.13, 0.075], [0.15, 0.2, angle]));
    }
    centers.push(transformed(new THREE.SphereGeometry(1, 16, 10), [x, y, z + 0.055], [radius * 0.56, radius * 0.56, 0.17]));
    for (let j = 0; j < 3; j++) {
      const side = j % 2 ? 1 : -1, ly = 2.6 + j * 0.45;
      leaves.push(transformed(new THREE.SphereGeometry(1, 8, 6), [(x - 0.9) / 2 + side * 0.35, ly, z], [0.46, 0.17, 0.055], [0.3, -0.25, side * 0.6]));
    }
  });
  batch(ctx, 'Sunflower stems', stems, '#60785a', 0.5);
  batch(ctx, 'Broad sunflower leaves', leaves, '#5d8065', 0.55);
  flowerPetals.forEach((pieces, i) => batch(ctx, 'Golden sunflower petals', pieces, ['#edb645', '#f6cd66', '#d79537'][i]!, 0.75));
  batch(ctx, 'Burnt umber flower hearts', centers, '#775137', 1.1);

  const plateProfile = [[0, 0], [0.5, 0.015], [1.0, 0.035], [1.35, 0.12], [1.55, 0.23], [1.56, 0.29], [1.35, 0.19], [1, 0.1], [0, 0.08]];
  paint(ctx, 'Celadon plate', new THREE.LatheGeometry(plateProfile.map(([x, y]) => new THREE.Vector2(x!, y!)), 64), '#8baba5', [2.1, 0.1, 1.1], 0.5);
  [[1.65, 0.55, 1.1], [2.6, 0.55, 1.4], [2.3, 0.5, 0.55], [-0.4, 0.48, 2.15]].forEach((p, i) => {
    const lemon = new THREE.SphereGeometry(0.47, 36, 24);
    lemon.scale(1.35, 0.92, 0.92); lemon.rotateY(i * 1.8);
    paint(ctx, 'Cadmium yellow lemon', lemon, i % 2 ? '#eabe43' : '#e6cb5b', p as Point, 0.85);
  });
  paint(ctx, 'Terracotta cup', new THREE.LatheGeometry([
    new THREE.Vector2(0.01, 0), new THREE.Vector2(0.42, 0), new THREE.Vector2(0.5, 0.85),
    new THREE.Vector2(0.43, 0.85), new THREE.Vector2(0.36, 0.13), new THREE.Vector2(0, 0.13),
  ], 48), '#b76b55', [-3.0, 0.06, 1.15], 0.65);
}
