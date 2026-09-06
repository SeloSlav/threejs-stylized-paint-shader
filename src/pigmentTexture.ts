import * as THREE from 'three';

/** Opaque, ordered brush deposits: R pigment value, G temperature, B relief,
 * A bristle load. All four channels belong to the SAME stroke. Linear data. */
export function createPigmentTexture(seed = 73021, size = 512): THREE.DataTexture {
  if (!Number.isFinite(seed)) throw new RangeError('Pigment seed must be finite.');
  if (!Number.isInteger(size) || size < 32 || size > 2048) throw new RangeError('Pigment map size must be an integer from 32 to 2048.');
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const pixels = new Float32Array(size * size * 4);
  for (let i = 0; i < pixels.length; i += 4) pixels.set([0.48, 0.5, 0.12, 0.6], i);
  // Wide loaded flats beneath smaller broken scumbles. Ordered alpha-over
  // preserves the identity of a new mark instead of pooling everything white.
  for (let layer = 0; layer < 3; layer++) {
    const count = [150, 380, 220][layer]!;
    for (let stroke = 0; stroke < count; stroke++) {
      const cx = random() * size, cy = random() * size;
      const angle = -0.5 + random() * 1.65 + (layer === 2 ? 1.6 : 0);
      const c = Math.cos(angle), s = Math.sin(angle);
      const length = size * (0.032 + random() * 0.085) / (1 + layer * 0.5);
      const width = length * (0.19 + random() * 0.22);
      const value = 0.12 + random() * 0.8, warmth = random();
      const phase = random() * 30, load = 0.4 + random() * 0.6;
      const radius = Math.ceil(length + width);
      for (let y = -radius; y <= radius; y++) for (let x = -radius; x <= radius; x++) {
        const along = (x * c + y * s) / length;
        const across = (-x * s + y * c) / width;
        const bend = across + Math.sin(along * 2.4 + phase) * 0.12;
        const bristle = 0.5 + 0.5 * Math.sin(bend * width * 1.45 + Math.sin(along * 3 + phase));
        const cap = Math.abs(along) + Math.sin(bend * 9 + phase) * 0.06;
        const edge = Math.max(cap, Math.abs(bend) * (0.85 + 0.25 * along * along));
        const coverage = Math.min(1, Math.max(0, (1 - edge) * 18));
        if (!coverage) continue;
        const dry = layer === 2 ? 0.36 + bristle * 0.64 : 0.87 + bristle * 0.13;
        const opacity = coverage * dry;
        const px = ((Math.floor(cx) + x) % size + size) % size;
        const py = ((Math.floor(cy) + y) % size + size) % size;
        const i = (py * size + px) * 4;
        const ridge = load * (0.22 + bristle * 0.28 + Math.pow(edge, 9) * 0.35);
        const channels = [value + (bristle - 0.5) * 0.08, warmth, ridge, bristle * load];
        for (let k = 0; k < 4; k++) pixels[i + k] = pixels[i + k]! * (1 - opacity) + channels[k]! * opacity;
      }
    }
  }
  const bytes = Uint8Array.from(pixels, v => Math.round(THREE.MathUtils.clamp(v, 0, 1) * 255));
  const texture = new THREE.DataTexture(bytes, size, size, THREE.RGBAFormat);
  texture.name = `Layered pigment / ${seed}`;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}
