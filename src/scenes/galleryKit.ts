import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { SceneBuildContext } from './sceneRegistry.ts';

export type P = [number, number, number];
export const vec = (p: P) => new THREE.Vector3(...p);
export function seeded(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
export const colors = (color: string) => ({
  dark: new THREE.Color(color).multiplyScalar(0.65), light: color,
  reflectionDark: color, reflectionLight: '#ffe5b5', rim: '#ffeac8',
  outline: '#25343d', outlineSecondary: '#c79973',
});

/** World-sized pieces are compiled by pigment, preserving individual hard
 * normals and UV islands. This keeps complete little worlds under ~65 draws. */
export class GalleryKit {
  private batches = new Map<string, { pieces: THREE.BufferGeometry[]; color: string; scale: number; contrast: number; glow: number; label: string }>();
  constructor(readonly ctx: SceneBuildContext) {}
  add(g: THREE.BufferGeometry, color: string, p: P = [0, 0, 0], scale: P = [1, 1, 1], rotation: P = [0, 0, 0], contrast = 0.55, brushScale = 0.32, glow = 0, label = 'Painted details') {
    g.applyMatrix4(new THREE.Matrix4().compose(vec(p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), vec(scale)));
    const key = `${color}/${contrast}/${brushScale}/${glow}`;
    let batch = this.batches.get(key);
    if (!batch) { batch = { pieces: [], color, scale: brushScale, contrast, glow, label }; this.batches.set(key, batch); }
    batch.pieces.push(g);
  }
  box(p: P, size: P, color: string, rotation: P = [0, 0, 0], soft = 0) {
    this.add(soft ? new RoundedBoxGeometry(...size, 2, soft) : new THREE.BoxGeometry(...size), color, p, [1, 1, 1], rotation);
  }
  ball(p: P, size: P, color: string, rotation: P = [0, 0, 0]) {
    this.add(new THREE.SphereGeometry(1, 20, 12), color, p, size, rotation);
  }
  cylinder(p: P, radius: number, height: number, color: string, rotation: P = [0, 0, 0], topRadius = radius) {
    this.add(new THREE.CylinderGeometry(topRadius, radius, height, 20), color, p, [1, 1, 1], rotation);
  }
  torus(p: P, radius: number, tube: number, color: string, rotation: P = [0, 0, 0], scale: P = [1, 1, 1], arc = Math.PI * 2) {
    this.add(new THREE.TorusGeometry(radius, tube, 8, 48, arc), color, p, scale, rotation);
  }
  line(points: P[], radius: number, color: string) {
    this.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(vec)), Math.max(12, points.length * 5), radius, 6, false), color);
  }
  lathe(profile: [number, number][], p: P, color: string, scale: P = [1, 1, 1], rotation: P = [0, 0, 0]) {
    this.add(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 48), color, p, scale, rotation);
  }
  glow(p: P, size: P, color: string, strength = 1.4) {
    this.add(new THREE.SphereGeometry(1, 16, 10), color, p, size, [0, 0, 0], 0.12, 0.4, strength, 'Lamplight');
  }
  arch(p: P, width: number, height: number, color: string, glow = 0) {
    const r = width / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-r, 0); shape.lineTo(r, 0); shape.lineTo(r, height - r);
    shape.absarc(0, height - r, r, 0, Math.PI, false); shape.lineTo(-r, 0);
    this.add(new THREE.ExtrudeGeometry(shape, { depth: 0.11, bevelEnabled: false, curveSegments: 20 }), color, p, [1, 1, 1], [0, 0, 0], 0.3, 0.4, glow);
  }
  sign(p: P, width: number, height: number, lines: string[], ink = '#f7deb0', paper = '#244746', rotation: P = [0, 0, 0]) {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = Math.round(768 * height / width);
    const c = canvas.getContext('2d')!;
    c.fillStyle = paper; c.fillRect(0, 0, canvas.width, canvas.height);
    c.strokeStyle = ink; c.lineWidth = 3; c.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = ink;
    lines.forEach((line, i) => {
      c.font = `${i === 0 ? 'bold' : 'italic'} ${Math.min(canvas.height / (lines.length + 0.8), 768 / (line.length * 0.66))}px Georgia`;
      c.fillText(line, canvas.width / 2, canvas.height * (i + 0.5) / lines.length, 720);
    });
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    const handle = this.ctx.addPaintedObject({
      label: lines.join(' · '), geometry: new THREE.PlaneGeometry(width, height), position: vec(p), rotation: new THREE.Euler(...rotation),
      palette: colors(paper), surfaceColor: '#ffffff', surfaceMap: map, surfaceMapStrength: 1, sourceAlbedoWeight: 1,
      texturelessSurface: true, preserveSourceAlbedo: true, pigmentContrast: 0.12, objectTextureScale: 0.45, shells: false,
    });
    const material = handle.base.material as THREE.Material;
    material.addEventListener('dispose', () => map.dispose());
    handle.base.castShadow = false;
  }
  finish() {
    for (const batch of this.batches.values()) {
      const pieces = batch.pieces.map(g => g.index ? g.toNonIndexed() : g);
      const geometry = mergeGeometries(pieces);
      for (const g of new Set([...pieces, ...batch.pieces])) g.dispose();
      if (!geometry) throw new Error(`Could not assemble ${batch.label}`);
      geometry.computeBoundingSphere();
      const handle = this.ctx.addPaintedObject({
        label: batch.label, geometry, palette: colors(batch.color), surfaceColor: batch.color,
        sourceAlbedoWeight: 1, preserveSourceAlbedo: true, texturelessSurface: true,
        objectTextureScale: batch.scale, pigmentContrast: batch.contrast,
        emissive: batch.glow > 0 ? batch.color : '#000000', emissiveIntensity: batch.glow,
        lightPaintScale: 0, shells: false, roughness: 0.95,
      });
      if (batch.glow) handle.base.castShadow = false;
    }
    this.batches.clear();
  }
}

export function cup(k: GalleryKit, p: P, size = 1, color = '#e8d6ad') {
  const [x, y, z] = p;
  k.lathe([[0, 0], [0.18, 0], [0.23, 0.32], [0.19, 0.33], [0.16, 0.055], [0, 0.055]], p, color, [size, size, size]);
  k.cylinder([x, y + 0.265 * size, z], 0.177 * size, 0.015, '#513831');
  k.torus([x + 0.25 * size, y + 0.19 * size, z], 0.105 * size, 0.035 * size, color);
  k.cylinder([x, y - 0.025, z], 0.35 * size, 0.045, color);
}

export function leaf(k: GalleryKit, p: P, scale: P, color: string, rotation: P) {
  k.ball(p, scale, color, rotation);
}

export function plant(k: GalleryKit, p: P, size = 1) {
  const [x, y, z] = p;
  k.lathe([[0, 0], [0.28, 0], [0.38, 0.65], [0.42, 0.7], [0.34, 0.7], [0.3, 0.15], [0, 0.15]], p, '#b57057', [size, size, size]);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.399, h = (0.95 + (i % 3) * 0.22) * size;
    const tip: P = [x + Math.cos(a) * size * 0.45, y + h, z + Math.sin(a) * size * 0.45];
    k.line([[x, y + size * 0.5, z], [x, y + h * 0.88, z], tip], 0.025 * size, '#56725d');
    leaf(k, tip, [size * 0.16, size * 0.44, size * 0.07], i % 2 ? '#76936a' : '#3f6a59', [0.5, a, -0.65]);
  }
}
