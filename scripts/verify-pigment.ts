import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { createPigmentTexture } from '../src/pigmentTexture.ts';

const textures = [73021, 73021, 73022, 0].map(seed => createPigmentTexture(seed, 128));
const digest = (texture: THREE.DataTexture) => createHash('sha256').update(texture.image.data as Uint8Array).digest('hex');
try {
  assert.equal(digest(textures[0]!), digest(textures[1]!), 'Reset must reproduce identical pigment bytes.');
  assert.notEqual(digest(textures[0]!), digest(textures[2]!), 'Seed changes must produce new stroke placements.');
  for (const texture of textures) {
    assert.equal(texture.colorSpace, THREE.NoColorSpace, 'Packed fields must never receive sRGB decoding.');
    assert.equal(texture.wrapS, THREE.RepeatWrapping);
    assert.equal(texture.wrapT, THREE.RepeatWrapping);
    assert.equal(texture.minFilter, THREE.LinearMipmapLinearFilter);
    assert.ok(texture.generateMipmaps, 'Distant bristles require prefiltered mips.');
    const bytes = texture.image.data as Uint8Array;
    assert.equal(bytes.length, 128 * 128 * 4);
    for (let channel = 0; channel < 4; channel++) {
      const values = new Set<number>();
      for (let i = channel; i < bytes.length; i += 4) values.add(bytes[i]!);
      assert.ok(values.size > 80, `Channel ${channel} must retain a useful paint field.`);
    }
  }
  assert.throws(() => createPigmentTexture(NaN), RangeError);
  assert.throws(() => createPigmentTexture(1, 0), RangeError);
  console.log(`Pigment invariants passed: repeatable reset, distinct seeds, four populated linear channels, mip filtering. SHA256 ${digest(textures[0]!).slice(0, 16)}`);
} finally { textures.forEach(texture => texture.dispose()); }
