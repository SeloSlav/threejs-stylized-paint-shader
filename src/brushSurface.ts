import * as THREE from 'three';

export interface BrushSamples {
  centers: Float32Array;
  normals: Float32Array;
  sizes: Float32Array;
  seeds: Float32Array;
  count: number;
}

/** Area-stratified sampling, with a local triangle-size guard for eyes, stems,
 * and small details. The samples are permanent surface coordinates, not a
 * screen grid. Degenerate faces never receive deposits. */
export function sampleBrushSurface(geometry: THREE.BufferGeometry, seed: number, radius = 0.19, budget = 7000): BrushSamples {
  if (!Number.isFinite(radius) || radius <= 0 || !Number.isInteger(budget) || budget < 1 || !Number.isFinite(seed)) {
    throw new RangeError('Brush radius and seed must be finite; radius and integer budget must be positive.');
  }
  const positions = geometry.getAttribute('position');
  if (!positions) throw new Error('Brush sampling requires surface positions.');
  const normals = geometry.getAttribute('normal');
  const index = geometry.index;
  const triangles = Math.floor((index?.count ?? positions.count) / 3);
  const cdf = new Float64Array(triangles);
  const areas = new Float32Array(triangles);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const edge = new THREE.Vector3(), cross = new THREE.Vector3();
  let area = 0;
  const vertex = (i: number) => index ? index.getX(i) : i;
  for (let t = 0; t < triangles; t++) {
    a.fromBufferAttribute(positions, vertex(t * 3));
    b.fromBufferAttribute(positions, vertex(t * 3 + 1));
    c.fromBufferAttribute(positions, vertex(t * 3 + 2));
    const faceArea = edge.subVectors(b, a).cross(cross.subVectors(c, a)).length() * 0.5;
    areas[t] = Number.isFinite(faceArea) ? faceArea : 0;
    area += areas[t]!;
    cdf[t] = area;
  }
  const count = area > 1e-10 ? Math.min(budget, Math.max(12, Math.ceil(area / (radius * radius) * 2.4))) : 0;
  const centers = new Float32Array(count * 3), sampledNormals = new Float32Array(count * 3);
  const sizes = new Float32Array(count), seeds = new Float32Array(count);
  const na = new THREE.Vector3(), nb = new THREE.Vector3(), nc = new THREE.Vector3();
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  let face = 0;
  for (let i = 0; i < count; i++) {
    const target = (i + random()) / count * area;
    while (face < triangles - 1 && cdf[face]! <= target) face++;
    const ia = vertex(face * 3), ib = vertex(face * 3 + 1), ic = vertex(face * 3 + 2);
    a.fromBufferAttribute(positions, ia); b.fromBufferAttribute(positions, ib); c.fromBufferAttribute(positions, ic);
    const u = Math.sqrt(random()), v = random();
    const wa = 1 - u, wb = u * (1 - v), wc = u * v;
    edge.copy(a).multiplyScalar(wa).addScaledVector(b, wb).addScaledVector(c, wc);
    edge.toArray(centers, i * 3);
    if (normals) {
      na.fromBufferAttribute(normals, ia); nb.fromBufferAttribute(normals, ib); nc.fromBufferAttribute(normals, ic);
      na.multiplyScalar(wa).addScaledVector(nb, wb).addScaledVector(nc, wc).normalize();
    } else na.subVectors(b, a).cross(cross.subVectors(c, a)).normalize();
    na.toArray(sampledNormals, i * 3);
    sizes[i] = Math.min(radius, Math.sqrt(areas[face]!) * 3.1) * (0.72 + random() * 0.65);
    seeds[i] = random();
  }
  return { centers, normals: sampledNormals, sizes, seeds, count };
}
