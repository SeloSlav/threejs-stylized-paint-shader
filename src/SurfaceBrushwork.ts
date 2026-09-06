import * as THREE from 'three';
import { sampleBrushSurface } from './brushSurface.ts';
import type { PaintGlobalUniforms, PainterlyMaterial } from './PainterlyMaterial.ts';

export const SCENE_BRUSH_DEFAULTS = { amount: 0.54, splay: 0.8, size: 0.8, dry: 0.48 };
export type SceneBrushSettings = typeof SCENE_BRUSH_DEFAULTS;

const vertexShader = /* glsl */ `
  #include <common>
  #include <shadowmap_pars_vertex>
  #include <fog_pars_vertex>
  attribute vec3 aCenter;
  attribute vec3 aNormal;
  attribute float aSize;
  attribute float aSeed;
  uniform sampler2D pigmentMap;
  uniform vec3 surfaceColor;
  uniform vec3 lightDirection;
  uniform float projectionScale;
  uniform float brushScale;
  uniform float pigmentVariation;
  uniform float pigmentContrast;
  uniform float shadowThreshold;
  uniform float lightThreshold;
  uniform float bandSoftness;
  uniform float shadowValue;
  uniform float midtoneValue;
  uniform float strokeSize;
  uniform float splay;
  uniform float seedPhase;
  varying vec2 vBrush;
  varying vec3 vPigment;
  varying float vSeed;
  varying float vLight;

  vec4 pigmentAt(vec3 p, vec3 n) {
    vec3 w = pow(abs(n), vec3(5.0)); w /= max(w.x+w.y+w.z, 0.00001);
    vec3 signs = sign(n);
    return texture2D(pigmentMap, p.zy * vec2(signs.x,1)) * w.x
      + texture2D(pigmentMap, p.xz * vec2(signs.y,1)) * w.y
      + texture2D(pigmentMap, p.xy * vec2(-signs.z,1)) * w.z;
  }
  void main() {
    vBrush = uv; vSeed = fract(aSeed + seedPhase);
    vec3 n = normalize(aNormal);
    vec3 t = normalize(cross(n, abs(n.y) > 0.92 ? vec3(0,0,1) : vec3(0,1,0)));
    vec3 b = cross(n,t);
    float angle = (vSeed - 0.5) * 1.6;
    vec3 along = t*cos(angle) + b*sin(angle);
    vec3 across = cross(n,along);
    float radius = aSize * strokeSize;
    // Permanent object-space strokes. One loaded end lifts slightly off the
    // surface, so real bristle geometry can interrupt the silhouette. There is
    // no camera-facing rotation, framebuffer sampling, or screen-space size cap.
    vec3 transformed = aCenter
      + along * position.x * radius * 2.4
      + across * position.y * radius * (0.92 + vSeed * 0.35)
      + n * radius * (0.025 + (position.x + 0.5) * splay * 0.26);
    vec4 worldPosition = modelMatrix * vec4(transformed,1.0);
    vec4 mvPosition = viewMatrix * worldPosition;
    gl_Position = projectionMatrix * mvPosition;
    vec3 transformedNormal = normalize(normalMatrix * n);
    #include <shadowmap_vertex>
    #include <fog_vertex>

    // A stroke samples its own pigment at its permanent anchor. Camera motion
    // cannot change the chosen color, footprint, seed, or orientation.
    vec4 deposit = pigmentAt(aCenter * projectionScale * brushScale * 0.74, n);
    float stroke = smoothstep(0.176,0.824,deposit.r);
    float warmth = smoothstep(0.15,0.86,deposit.g);
    float variation = pigmentVariation * pigmentContrast;
    vec3 cool = surfaceColor * vec3(0.62,0.77,1.10) + vec3(0.023,0.018,0.045);
    vec3 warm = surfaceColor * vec3(1.16,1.02,0.72) + vec3(0.052,0.024,0.009);
    vec3 color = mix(surfaceColor, mix(cool,warm,warmth), variation);
    color *= 1.0 + (stroke-0.5) * 0.95 * variation;
    vec3 worldNormal = normalize(mat3(modelMatrix)*n);
    vLight = dot(worldNormal, normalize(lightDirection));
    float brokenLight = vLight + (stroke-0.5)*0.38*clamp(pigmentContrast/0.55,0.0,1.0);
    float feather = max(bandSoftness,0.018);
    float mid = smoothstep(shadowThreshold-feather,shadowThreshold+feather,brokenLight);
    float lit = smoothstep(lightThreshold-feather,lightThreshold+feather,brokenLight);
    vec3 shadow = color*mix(0.19,0.52,shadowValue*2.0)*vec3(0.72,0.83,1.18)+vec3(0.012,0.012,0.027);
    vPigment = mix(shadow, color*mix(0.53,1.05,midtoneValue), mid);
    vPigment = mix(vPigment, color*vec3(1.24,1.15,0.96),lit);
  }
`;

const fragmentShader = /* glsl */ `
  #include <common>
  #include <packing>
  #include <lights_pars_begin>
  #include <shadowmap_pars_fragment>
  #include <shadowmask_pars_fragment>
  #include <fog_pars_fragment>
  uniform float amount;
  uniform float dry;
  uniform float debug;
  uniform float keyIntensity;
  uniform vec3 emission;
  varying vec2 vBrush;
  varying vec3 vPigment;
  varying float vSeed;
  varying float vLight;
  float hash(float n) { return fract(sin(n*127.1+vSeed*631.7)*43758.5453); }
  void main() {
    vec2 p = vBrush*2.0-1.0;
    float bristle = floor(vBrush.y*17.0);
    float tip = 0.64 + hash(bristle)*0.35;
    float heel = 0.76 + hash(bristle+37.0)*0.22;
    float belly = 0.73 + 0.25*sin(vBrush.x*3.14159);
    float aa = max(fwidth(p.x),0.012);
    float footprint = (1.0-smoothstep(tip-aa,tip+aa,p.x))
      * smoothstep(-heel-aa,-heel+aa,p.x)
      * (1.0-smoothstep(belly-0.18,belly,abs(p.y)));
    float phase = vBrush.y*75.4 + sin(vBrush.x*9.0+vSeed*31.0)*0.6;
    float ridge = 0.5+0.5*sin(phase)*(1.0-smoothstep(1.4,3.8,fwidth(phase)));
    float gaps = smoothstep(0.05,0.28,ridge+(1.0-dry)*0.55);
    float alpha = amount*footprint*mix(1.0,gaps,dry);
    if (alpha < 0.025) discard;
    float receiver = getShadowMask()*smoothstep(0.10,1.05,max(vLight,0.0)*keyIntensity);
    vec3 color = vPigment*mix(0.60,1.08,receiver)*(0.98+ridge*0.045)+emission;
    if (debug > 0.5) color = debug > 1.5 ? vec3(0.82,0.38,0.08) : vPigment;
    gl_FragColor = vec4(color,alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/** Fixed surface geometry, shaded in the ordinary scene render. No render
 * targets, readbacks, camera-dependent color projection, or temporal history. */
export class SurfaceBrushwork {
  readonly settings = { ...SCENE_BRUSH_DEFAULTS };
  readonly uniforms = {
    amount: { value: SCENE_BRUSH_DEFAULTS.amount }, splay: { value: SCENE_BRUSH_DEFAULTS.splay },
    strokeSize: { value: SCENE_BRUSH_DEFAULTS.size }, dry: { value: SCENE_BRUSH_DEFAULTS.dry },
    seedPhase: { value: 0 }, debug: { value: 0 }, keyIntensity: { value: 3 },
  };
  private readonly surfaces: Array<{ source: THREE.Mesh; brush: THREE.Mesh }> = [];
  private readonly globals: PaintGlobalUniforms;
  strokeCount = 0;
  constructor(globals: PaintGlobalUniforms) { this.globals = globals; }

  addSurface(source: THREE.Mesh, paint: PainterlyMaterial, radius = 0.16, seed = 73021): void {
    const sampled = sampleBrushSurface(source.geometry, seed, radius, 2800);
    if (!sampled.count) return;
    const plane = new THREE.PlaneGeometry(1,1);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = plane.index;
    geometry.setAttribute('position',plane.getAttribute('position'));
    geometry.setAttribute('uv',plane.getAttribute('uv'));
    geometry.setAttribute('aCenter',new THREE.InstancedBufferAttribute(sampled.centers,3));
    geometry.setAttribute('aNormal',new THREE.InstancedBufferAttribute(sampled.normals,3));
    geometry.setAttribute('aSize',new THREE.InstancedBufferAttribute(sampled.sizes,1));
    geometry.setAttribute('aSeed',new THREE.InstancedBufferAttribute(sampled.seeds,1));
    geometry.instanceCount = sampled.count;
    const material = new THREE.ShaderMaterial({
      name: 'Permanent surface brushwork', vertexShader, fragmentShader,
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.lights),
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        ...this.uniforms,
        pigmentMap: this.globals.pigmentMap, lightDirection: this.globals.lightDirection,
        brushScale: this.globals.brushScale, pigmentVariation: this.globals.pigmentVariation,
        shadowThreshold: this.globals.shadowThreshold, lightThreshold: this.globals.lightThreshold,
        bandSoftness: this.globals.bandSoftness, shadowValue: this.globals.shadowValue,
        midtoneValue: this.globals.midtoneValue,
        surfaceColor: paint.paintSurface.color, projectionScale: paint.paintProjectionScale,
        pigmentContrast: { value: Number(paint.userData.pigmentContrast ?? 0.55) },
        emission: { value: paint.emissive.clone().multiplyScalar(paint.emissiveIntensity) },
      },
      lights: true, fog: true, transparent: true, depthTest: true, depthWrite: false,
      side: THREE.DoubleSide, forceSinglePass: true,
    });
    const brush = new THREE.Mesh(geometry,material);
    brush.name = `${source.name || 'Paint'} · fixed brush strokes`;
    brush.frustumCulled = false;
    brush.receiveShadow = true;
    brush.raycast = () => {};
    source.add(brush);
    this.surfaces.push({source,brush});
    this.strokeCount += sampled.count;
    plane.dispose();
  }
  sync(enabled: boolean, keyIntensity: number): void {
    this.uniforms.amount.value = this.settings.amount;
    this.uniforms.splay.value = this.settings.splay;
    this.uniforms.strokeSize.value = this.settings.size;
    this.uniforms.dry.value = this.settings.dry;
    this.uniforms.keyIntensity.value = keyIntensity;
    for (const {source,brush} of this.surfaces) {
      brush.visible = enabled;
      // Isolation preserves the originals as depth occluders. Rendering only
      // cards through the back of the scene would be a misleading diagnostic.
      const material = source.material as THREE.Material;
      material.colorWrite = !enabled || this.uniforms.debug.value < 0.5;
    }
  }
  clearSurfaces(): void {
    for (const {source,brush} of this.surfaces) {
      (source.material as THREE.Material).colorWrite = true;
      brush.removeFromParent(); brush.geometry.dispose();
      (brush.material as THREE.Material).dispose();
    }
    this.surfaces.length = 0; this.strokeCount = 0;
  }
  dispose(): void { this.clearSurfaces(); }
}
