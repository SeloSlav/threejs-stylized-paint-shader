import assert from 'node:assert/strict';
import * as THREE from 'three';
import { sampleBrushSurface } from '../src/brushSurface.ts';
import { SurfaceBrushwork } from '../src/SurfaceBrushwork.ts';
import { createPaintGlobalUniforms, createPainterlyMaterial } from '../src/PainterlyMaterial.ts';
import { createPaintTexture } from '../src/paintTexture.ts';
import { createPigmentTexture } from '../src/pigmentTexture.ts';

const plane = new THREE.PlaneGeometry(4, 2);
const samples = sampleBrushSurface(plane, 73021, 0.15, 1200);
assert.deepEqual(samples, sampleBrushSurface(plane, 73021, 0.15, 1200));
assert.notDeepEqual(samples.centers, sampleBrushSurface(plane, 13, 0.15, 1200).centers);
assert.ok(samples.count <= 1200);
for (let i = 0; i < samples.count; i++) {
  assert.ok(Math.abs(samples.centers[i * 3]!) <= 2);
  assert.ok(Math.abs(samples.centers[i * 3 + 1]!) <= 1);
  assert.equal(samples.centers[i * 3 + 2], 0);
  assert.ok(Math.abs(new THREE.Vector3().fromArray(samples.normals, i * 3).length() - 1) < 1e-5);
  assert.ok(Number.isFinite(samples.sizes[i]) && samples.sizes[i]! > 0);
}

// One triangle has nine times the area of the other. Vertex count must not
// bias the distribution toward tiny triangles or heavily tessellated features.
const unequal = new THREE.BufferGeometry();
unequal.setAttribute('position', new THREE.Float32BufferAttribute([
  0,0,0, 1,0,0, 0,1,0, 10,0,0, 13,0,0, 10,3,0,
],3));
const weighted = sampleBrushSurface(unequal, 91, 0.02, 1000);
let large = 0;
for (let i = 0; i < weighted.count; i++) if (weighted.centers[i * 3]! > 5) large++;
assert.ok(Math.abs(large / weighted.count - 0.9) < 0.005);
const degenerate = new THREE.BufferGeometry();
degenerate.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,0,0,0,0,0,0],3));
assert.equal(sampleBrushSurface(degenerate, 4).count,0);
assert.throws(() => sampleBrushSurface(plane, 3, 0),RangeError);
assert.throws(() => sampleBrushSurface(plane, 3, 1, 0),RangeError);

const packed = createPaintTexture({size:32,seed:73021});
const pigment = createPigmentTexture(73021,32);
const globals = createPaintGlobalUniforms(packed.texture,pigment);
const material = createPainterlyMaterial(globals, {
  surfaceColor:'#9ebac9', texturelessSurface:true,
  palette:{dark:'#334c60',light:'#9ebac9',reflectionDark:'#45505e',reflectionLight:'#e9c88c',rim:'#f0dca2',outline:'#364346',outlineSecondary:'#bc9978'},
});
// Register while the original mesh is in native comparison mode, too.
const native = new THREE.MeshBasicMaterial();
const source = new THREE.Mesh(plane,native);
const brushes = new SurfaceBrushwork(globals);
brushes.addSurface(source,material);
const brush = source.children[0] as THREE.Mesh<THREE.InstancedBufferGeometry,THREE.ShaderMaterial>;
const attributes = ['aCenter','aNormal','aSize','aSeed'].map(name => brush.geometry.getAttribute(name));
const before = attributes.map(a => Array.from(a.array));
for (let frame = 0; frame < 100; frame++) {
  source.position.set(frame * 0.02,2,1); source.rotation.y = frame * 0.01;
  source.updateMatrixWorld(true); brushes.sync(true,3);
}
attributes.forEach((attribute,i) => assert.deepEqual(Array.from(attribute.array),before[i]));
assert.equal(brush.parent,source);
let geometryDisposals = 0, materialDisposals = 0;
brush.geometry.addEventListener('dispose',() => geometryDisposals++);
brush.material.addEventListener('dispose',() => materialDisposals++);
brushes.uniforms.debug.value = 1; brushes.sync(true,3);
assert.equal(native.colorWrite,false);
brushes.clearSurfaces(); brushes.clearSurfaces();
assert.equal(source.children.length,0);
assert.equal(native.colorWrite,true);
assert.equal(geometryDisposals,1); assert.equal(materialDisposals,1);
for (const g of [plane,unequal,degenerate]) g.dispose();
material.dispose(); native.dispose(); packed.texture.dispose(); pigment.dispose();
console.log('Brushwork invariants passed: deterministic area sampling, bounded footprints, immutable surface data through motion, native comparison, and exact disposal.');
