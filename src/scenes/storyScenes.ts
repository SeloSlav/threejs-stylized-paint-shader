import * as THREE from 'three';
import type { SceneBuildContext } from './sceneRegistry.ts';
import { GalleryKit, cup, plant, seeded, type P } from './galleryKit.ts';

const TAU = Math.PI * 2;

function chair(k: GalleryKit, p: P, angle = 0) {
  k.frame(p, [0, angle, 0], 1, () => {
    k.cylinder([0, 1.1, 0], 0.52, 0.12, '#ba8860');
    for (const x of [-0.35, 0.35]) for (const z of [-0.32, 0.32]) {
      k.line([[x * 1.3, 0, z * 1.3], [x, 1.13, z]], 0.045, '#466568');
    }
    k.line([[-0.44, 1.05, -0.34], [-0.47, 1.9, -0.38], [0, 2.08, -0.42], [0.47, 1.9, -0.38], [0.44, 1.05, -0.34]], 0.065, '#466568');
    for (const x of [-0.25, 0, 0.25]) k.line([[x, 1.15, -0.36], [x, 1.96, -0.4]], 0.025, '#466568');
  });
}
function bistroTable(k: GalleryKit, p: P, radius = 0.95) {
  const [x, y, z] = p;
  k.cylinder([x, y + 1.55, z], radius, 0.12, '#d9b581');
  k.cylinder([x, y + 0.8, z], 0.09, 1.5, '#395555');
  for (let i = 0; i < 3; i++) {
    const a = i * TAU / 3;
    k.line([[x, y + 0.7, z], [x + Math.cos(a) * 0.4, y + 0.12, z + Math.sin(a) * 0.4], [x + Math.cos(a) * 0.64, y + 0.06, z + Math.sin(a) * 0.64]], 0.055, '#395555');
  }
}
function cat(k: GalleryKit, p: P, scale = 1, yaw = 0) {
  k.frame(p, [0, yaw, 0], scale, () => {
    k.ball([0, 0.58, 0], [0.42, 0.69, 0.36], '#b87641');
    k.ball([0, 1.32, 0.06], [0.47, 0.43, 0.37], '#d89b53');
    for (const side of [-1, 1]) {
      k.add(new THREE.ConeGeometry(0.24, 0.51, 3), '#d89b53', [side * 0.29, 1.73, 0.04], [1, 1, 0.5], [0, 0, side * -0.18]);
      k.add(new THREE.ConeGeometry(0.13, 0.3, 3), '#b46f69', [side * 0.29, 1.72, 0.145], [1, 1, 0.35]);
      k.ball([side * 0.24, 0.08, 0.25], [0.19, 0.11, 0.3], '#e4b570');
      k.ball([side * 0.2, 1.36, 0.39], [0.095, 0.065, 0.035], '#b7c68d');
      k.ball([side * 0.2, 1.36, 0.42], [0.025, 0.066, 0.015], '#29383c');
      k.ball([side * 0.09, 1.19, 0.4], [0.115, 0.09, 0.07], '#f0cea0');
      for (let j = 0; j < 3; j++) k.line([[side * 0.1, 1.18, 0.46], [side * 0.59, 1.18 + (j - 1) * 0.075, 0.43]], 0.009, '#f0cea0');
    }
    k.ball([0, 1.22, 0.475], [0.065, 0.04, 0.022], '#935652');
    k.line([[0.26, 0.2, -0.22], [0.65, 0.1, -0.15], [0.88, 0.3, 0.24], [0.74, 0.55, 0.35]], 0.12, '#b87641');
    k.torus([0, 0.99, 0], 0.31, 0.055, '#517b78', [Math.PI / 2, 0, 0], [1, 0.9, 1]);
    k.ball([0, 0.98, 0.36], [0.07, 0.085, 0.035], '#eec779');
  });
}

export function buildNightCafe(ctx: SceneBuildContext) {
  const k = new GalleryKit(ctx), random = seeded(47211);
  k.add(new THREE.BoxGeometry(60, 0.25, 65), '#293f58', [0, -0.23, -10], [1, 1, 1], [0, 0, 0], 0.25, 0.18, 0, 'Midnight cobblestones');
  for (let iz = 0; iz < 24; iz++) for (let ix = 0; ix < 28; ix++) {
    const x = (ix - 14) * 0.78 + (iz % 2) * 0.39, z = iz * 0.58 - 5;
    if (z < -1.3 && Math.abs(x) < 5.6) continue;
    k.box([x, -0.07 + random() * 0.015, z], [0.73, 0.1, 0.53], ['#354b62', '#3b5368', '#40536b'][Math.floor(random() * 3)]!, [0, 0, 0], 0.05, 0.25);
  }
  k.add(new THREE.BoxGeometry(11.2, 7.4, 5), '#a46846', [0, 3.6, -4], [1, 1, 1], [0, 0, 0], 0.32, 0.22, 0, 'The café after dark');
  k.box([0, 7.3, -4], [11.7, 0.28, 5.4], '#3a5264');
  k.box([0, 4.7, -1.35], [11.4, 0.16, 0.35], '#d49b56');
  for (const x of [-3.5, 0, 3.5]) {
    k.arch([x, 0.2, -1.36], 2.9, 3.8, '#385c61');
    k.arch([x, 0.36, -1.23], 2.5, 3.42, '#e4a047', 0.65);
    k.box([x, 1.73, -1.08], [0.075, 2.8, 0.08], '#5e654e');
    k.box([x, 2.6, -1.08], [2.45, 0.075, 0.08], '#5e654e');
    k.box([x, 0.34, -1.1], [2.5, 0.1, 0.12], '#ddb97b');
    // Warm silhouettes inside the glowing windows.
    k.cylinder([x - 0.55, 0.55, -0.99], 0.24, 0.28, '#816b46');
    k.ball([x - 0.55, 0.93, -0.99], [0.28, 0.36, 0.08], '#687644');
    k.box([x, 6.34, -1.35], [1.45, 1.42, 0.16], '#344d64');
    k.add(new THREE.BoxGeometry(1.16, 1.15, 0.1), '#bd9965', [x, 6.34, -1.23], [1, 1, 1], [0, 0, 0], 0.2, 0.3, 0.25);
    k.box([x, 6.34, -1.13], [0.065, 1.17, 0.1], '#3c5664');
    k.box([x, 6.34, -1.13], [1.16, 0.07, 0.1], '#3c5664');
  }
  k.sign([0, 5.12, -1.12], 8.6, 0.68, ['CAFÉ DE LA LUNE'], '#f9d999', '#364c54');
  for (let i = 0; i < 18; i++) {
    const color = i % 2 ? '#d9bb77' : '#477b78';
    k.box([-5.55 + i * 0.65, 4.13, -0.12], [0.65, 0.12, 2.35], color, [0.14, 0, 0]);
    k.box([-5.55 + i * 0.65, 3.89, 1.02], [0.65, 0.43, 0.11], color);
  }
  k.line([[-6, 5.8, 1.6], [-2, 4.7, 2.4], [2, 4.7, 2.4], [6.6, 5.9, 1.6]], 0.028, '#33494e');
  for (let i = 0; i < 14; i++) {
    const x = -5.6 + i * 0.88, y = 4.75 + Math.pow(x / 5.8, 2) * 1.02;
    k.line([[x, y, 2.2], [x, y - 0.18, 2.2]], 0.025, '#33494e');
    k.glow([x, y - 0.23, 2.2], [0.095, 0.14, 0.095], '#ffcf77', 1.1);
  }
  for (const x of [-8, 8.2]) {
    k.cylinder([x, 2.1, 2.8], 0.09, 4.2, '#33494e');
    k.cylinder([x, 0.15, 2.8], 0.26, 0.3, '#33494e');
    k.glow([x, 4.28, 2.8], [0.3, 0.38, 0.3], '#ffd789', 1.5);
    k.add(new THREE.ConeGeometry(0.43, 0.27, 8), '#33494e', [x, 4.77, 2.8]);
  }
  bistroTable(k, [-2.8, 0, 3.45]); chair(k, [-4.05, 0, 3.55], 0.6); chair(k, [-2.4, 0, 1.9], 0);
  cat(k, [-4.05, 1.17, 3.55], 0.95, 0.7);
  cup(k, [-3.05, 1.65, 3.6], 0.85);
  k.cylinder([-2.45, 1.65, 3.25], 0.33, 0.04, '#e2bd80');
  k.torus([-2.45, 1.77, 3.25], 0.2, 0.1, '#c78d42', [Math.PI / 2, 0, 0], [1, 1, 1], 4.8);
  bistroTable(k, [2.5, 0, 2.4], 0.85); chair(k, [3.8, 0, 2.6], -0.8); chair(k, [2.7, 0, 0.95]);
  cup(k, [2.6, 1.65, 2.45], 0.75);
  plant(k, [-5.8, 0, 0.4], 1.6); plant(k, [5.9, 0, 0.4], 1.7);
  k.box([0.4, 0.88, 4.5], [1.18, 1.75, 0.12], '#b99a67', [-0.14, 0, 0]);
  k.sign([0.4, 0.94, 4.65], 0.99, 1.4, ['OPEN LATE', 'coffee', '& cat hair'], '#ead7aa', '#304a48', [-0.14, 0, 0]);
  // Painted reflections: coherent short amber/blue strokes on the pavement.
  for (let i = 0; i < 65; i++) {
    const x = (random() - 0.5) * 13, z = 0.3 + random() * 12;
    k.add(new THREE.PlaneGeometry(0.12 + random() * 0.48, 0.28 + random() * 1.1), i % 3 ? '#96764c' : '#638185', [x, 0.003, z], [1, 1, 1], [-Math.PI / 2, 0, -0.1], 0.25, 0.6, 0.05);
  }
  for (let i = 0; i < 7; i++) {
    const x = -23 + i * 7.8, h = 9 + random() * 6;
    k.box([x, h / 2 - 0.1, -15], [6.9, h, 6], ['#293d5b', '#34465f', '#354a69'][i % 3]!, [0, 0, 0], 0, 0.15);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
      k.add(new THREE.BoxGeometry(0.72, 1.0, 0.1), random() > 0.5 ? '#be9b60' : '#4c657b', [x - 2 + col * 1.85, 1.8 + row * 2, -11.94], [1, 1, 1], [0, 0, 0], 0.2, 0.3, 0.12);
    }
  }
  k.glow([-5.5, 12.7, -18], [1.08, 1.08, 0.18], '#ecd9ad', 0.65);
  for (let i = 0; i < 35; i++) k.glow([(random() - 0.5) * 49, 11 + random() * 16, -25], [0.025 + random() * 0.035, 0.04, 0.02], '#c7d0c6', 0.5);
  k.finish();
}

function duck(k: GalleryKit, p: P, scale = 1, yaw = 0, captain = false) {
  k.frame(p, [0, yaw, 0], scale, () => {
    k.ball([0, 0.48, 0], [0.95, 0.63, 0.72], '#e7bc4b');
    k.ball([0, 1.16, 0.32], [0.54, 0.56, 0.49], '#f0cf60');
    k.ball([0, 0.96, 0.88], [0.42, 0.14, 0.4], '#dd8942');
    for (const side of [-1, 1]) {
      k.ball([side * 0.8, 0.51, 0.02], [0.17, 0.35, 0.49], '#d6a542', [0.2, 0, side * 0.1]);
      k.ball([side * 0.33, 1.29, 0.73], [0.058, 0.072, 0.043], '#253b48');
      k.ball([side * 0.32, 1.31, 0.76], [0.018, 0.022, 0.015], '#fff0c9');
    }
    k.add(new THREE.ConeGeometry(0.35, 0.65, 4), '#e7bc4b', [0, 0.72, -0.7], [1, 1, 1], [-0.65, 0, 0]);
    if (captain) {
      k.cylinder([0, 1.66, 0.32], 0.61, 0.1, '#2e475d');
      k.cylinder([0, 1.81, 0.24], 0.46, 0.26, '#e9dfc4', [0.04, 0, -0.08], 0.53);
      k.ball([0, 1.7, 0.77], [0.1, 0.105, 0.02], '#b38a3e');
      k.torus([0, 0.89, 0.16], 0.5, 0.065, '#577c89', [Math.PI / 2, 0, 0]);
    }
  });
}

export function buildDuckAdmiral(ctx: SceneBuildContext) {
  const k = new GalleryKit(ctx), random = seeded(26312);
  k.box([0, -0.22, 0], [100, 0.3, 100], '#a69682');
  for (let x = -10; x <= 10; x++) for (let z = -8; z <= 9; z++) k.box([x * 1.08, -0.05, z * 1.08], [1.045, 0.12, 1.045], (x + z) % 2 ? '#95b4ad' : '#e0d6b7', [0, 0, 0], 0, 0.25);
  k.add(new THREE.BoxGeometry(70, 25, 0.25), '#c7aea0', [0, 12.3, -6], [1, 1, 1], [0, 0, 0], 0.1, 0.18);
  k.box([0, 1.7, -5.79], [70, 0.15, 0.14], '#6c9892');
  k.box([0, 0.12, -5.79], [70, 0.24, 0.15], '#638a85');
  // The tub is a continuous revolved bowl with an inner wall and rolled rim.
  k.lathe([[0, 0], [0.8, 0], [1.08, 0.15], [1.3, 0.85], [1.43, 1.45], [1.4, 1.53], [1.28, 1.51], [1.16, 0.89], [0.99, 0.32], [0, 0.27]], [0, 0.65, 0], '#e5dcc5', [2.45, 1, 1.3]);
  k.torus([0, 2.13, 0], 1.35, 0.065, '#f0e5cd', [Math.PI / 2, 0, 0], [2.45, 1.3, 1]);
  k.add(new THREE.CircleGeometry(1.23, 80), '#75b5b8', [0, 1.9, 0], [2.45, 1.3, 1], [-Math.PI / 2, 0, 0], 0.32, 0.42, 0, 'A very small ocean');
  for (const x of [-2.35, 2.35]) for (const z of [-0.87, 0.87]) {
    k.ball([x, 0.36, z], [0.28, 0.41, 0.23], '#b49661', [0, 0, x * -0.08]);
    k.ball([x + Math.sign(x) * 0.15, 0.12, z + Math.sign(z) * 0.1], [0.36, 0.14, 0.3], '#b49661');
  }
  duck(k, [-0.7, 1.92, -0.1], 1.15, 0.2, true);
  duck(k, [1.72, 1.92, 0.18], 0.36, -0.45);
  duck(k, [0.75, 1.92, 0.76], 0.27, 0.7);
  duck(k, [2.02, 0.04, 2.65], 0.46, -0.3);
  for (let i = 0; i < 42; i++) {
    const a = random() * TAU, r = Math.sqrt(random());
    k.ball([Math.cos(a) * r * 2.75, 1.96 + random() * 0.05, Math.sin(a) * r * 1.25], [0.12 + random() * 0.18, 0.1, 0.12 + random() * 0.17], i % 2 ? '#dce8d7' : '#b8d7cd');
  }
  for (let i = 0; i < 12; i++) {
    const x = -0.3 + random() * 3, y = 3 + random() * 3.4, z = -0.4 + random();
    k.torus([x, y, z], 0.1 + random() * 0.2, 0.012, '#bedbd9', [0.1, 0.3, 0]);
  }
  k.line([[-2.8, 1.6, -1.1], [-2.8, 2.8, -1.1], [-2.4, 2.98, -0.9], [-2.25, 2.8, -0.7]], 0.075, '#c39d57');
  for (const dx of [-0.24, 0.24]) {
    k.cylinder([-2.8 + dx, 2.36, -1.1], 0.075, 0.24, '#c39d57');
    k.box([-2.8 + dx, 2.5, -1.1], [0.28, 0.05, 0.06], '#c39d57');
  }
  k.box([3.65, 0.85, -0.2], [1.4, 0.12, 1.35], '#ab7e56', [0, 0.15, 0], 0.05);
  for (const x of [3.2, 4.1]) for (const z of [-0.64, 0.24]) k.cylinder([x, 0.4, z], 0.07, 0.8, '#ab7e56');
  for (let i = 0; i < 3; i++) k.box([3.65, 1.01 + i * 0.14, -0.2], [1.12, 0.14, 0.89], i % 2 ? '#ce8c75' : '#e3c5a2', [0, 0.12, 0], 0.06);
  plant(k, [-5.15, 0, -2.5], 2.0);
  k.box([-3.8, 4.95, -5.69], [3.3, 4.1, 0.2], '#688e89');
  k.add(new THREE.PlaneGeometry(2.9, 3.7), '#b8d8cb', [-3.8, 4.95, -5.57], [1, 1, 1], [0, 0, 0], 0.12, 0.2, 0.3);
  k.box([-3.8, 4.95, -5.48], [0.08, 3.74, 0.08], '#e8d9bd');
  k.box([-3.8, 4.95, -5.48], [2.94, 0.09, 0.08], '#e8d9bd');
  k.sign([1.5, 4.95, -5.74], 3.3, 2.05, ['ADMIRAL', 'of absolutely', 'everything'], '#405a68', '#e4c58c');
  k.box([0.4, 0.06, 3.18], [4.5, 0.05, 1.6], '#dbac92', [0, 0.06, 0], 0.08);
  k.finish();
}

function pigeon(k: GalleryKit, p: P, scale: number, yaw: number, color: string, accessory: 'tie' | 'hat' | 'none' = 'none') {
  k.frame(p, [0, yaw, 0], scale, () => {
    k.ball([0, 0.83, 0], [0.59, 0.82, 0.53], color, [0.12, 0, 0]);
    k.ball([0, 1.52, 0.25], [0.33, 0.6, 0.35], '#598e86');
    k.ball([0, 2.02, 0.35], [0.38, 0.39, 0.36], color);
    for (const s of [-1, 1]) {
      k.ball([s * 0.47, 0.88, -0.08], [0.22, 0.6, 0.43], '#526c7f', [0.2, 0, s * -0.1]);
      k.ball([s * 0.23, 2.08, 0.63], [0.085, 0.095, 0.035], '#d8b65b');
      k.ball([s * 0.23, 2.09, 0.664], [0.038, 0.053, 0.022], '#25313c');
      k.line([[s * 0.23, 0.34, 0.1], [s * 0.24, 0.09, 0.18]], 0.047, '#be7e65');
      for (let j = 0; j < 3; j++) k.line([[s * 0.24, 0.09, 0.18], [s * 0.24 + (j - 1) * 0.15, 0.045, 0.45]], 0.033, '#be7e65');
    }
    k.add(new THREE.ConeGeometry(0.115, 0.34, 5), '#c99d64', [0, 1.98, 0.82], [1, 1, 1], [Math.PI / 2, 0, 0]);
    k.ball([0, 0.58, -0.6], [0.35, 0.17, 0.62], '#526c7f', [-0.28, 0, 0]);
    if (accessory === 'tie') {
      k.box([0, 1.48, 0.62], [0.52, 0.18, 0.07], '#b26862', [0, 0, 0.12]);
      k.ball([0, 1.47, 0.67], [0.1, 0.13, 0.05], '#d69476');
    }
    if (accessory === 'hat') {
      k.cylinder([0, 2.35, 0.33], 0.48, 0.08, '#5c4d55');
      k.cylinder([0, 2.57, 0.32], 0.31, 0.4, '#5c4d55');
      k.cylinder([0, 2.42, 0.32], 0.32, 0.09, '#b58f69');
    }
  });
}
function croissant(k: GalleryKit, p: P, size: number) {
  k.frame(p, [Math.PI / 2, 0, -0.55], size, () => {
    k.torus([0, 0, 0], 0.52, 0.21, '#ca9650', [0, 0, 0], [1, 1, 1], 4.5);
    for (let i = 0; i < 8; i++) {
      const a = 0.2 + i * 0.54;
      k.ball([Math.cos(a) * 0.52, Math.sin(a) * 0.52, 0.03], [0.25, 0.09, 0.19], '#e0b46c', [0, 0, a]);
    }
  });
}

export function buildPigeonMeeting(ctx: SceneBuildContext) {
  const k = new GalleryKit(ctx), random = seeded(59218);
  k.add(new THREE.BoxGeometry(50, 0.4, 45), '#b5a698', [0, -0.23, -7], [1, 1, 1], [0, 0, 0], 0.22, 0.2);
  k.box([0, 0.68, -4], [24, 1.4, 0.45], '#b7998a');
  k.box([0, 1.42, -4], [24.4, 0.13, 0.69], '#dcc2a5');
  for (let i = 0; i < 8; i++) k.box([-11 + i * 3.1, 0.75, -3.7], [0.06, 1.25, 0.02], '#a08680');
  k.cylinder([0, 1.5, 0.5], 1.9, 0.15, '#62958d');
  k.cylinder([0, 0.78, 0.5], 0.18, 1.45, '#577c77');
  k.cylinder([0, 0.08, 0.5], 0.95, 0.12, '#577c77');
  pigeon(k, [-2.5, 0, 0.75], 1.48, 0.5, '#8999a7', 'tie');
  pigeon(k, [2.55, 0, 0.55], 1.56, -0.65, '#9c9daa', 'hat');
  pigeon(k, [-0.4, 0, -1.55], 1.35, 0.08, '#7e93a4');
  k.cylinder([0.2, 1.61, 0.65], 0.82, 0.045, '#e5cfaa');
  croissant(k, [0.2, 1.87, 0.65], 1.0);
  cup(k, [-1.1, 1.62, 0.23], 0.74, '#d4b098'); cup(k, [1.1, 1.62, 0.1], 0.7, '#d4b098');
  for (let i = 0; i < 26; i++) k.ball([(random() - 0.5) * 2.5, 1.615, (random() - 0.5) * 2 + 0.6], [0.035, 0.022, 0.035], '#d7b27d');
  k.box([2.88, 0.28, 1.9], [1.02, 0.5, 0.34], '#79604d', [0, -0.25, 0], 0.07);
  k.torus([2.88, 0.61, 1.9], 0.18, 0.045, '#ba945c', [0, -0.25, 0], [1, 0.65, 1], Math.PI);
  k.sign([-0.45, 1.72, 1.85], 1.75, 0.42, ['CRUMB COMMITTEE'], '#634a42', '#e9d5b0', [-0.18, 0, 0]);
  plant(k, [-5.2, 0, -2.25], 1.55); plant(k, [5, 0, -2.7], 1.8);
  // Rooftops in receding violet/coral planes, with miniature chimney accents.
  for (let i = 0; i < 15; i++) {
    const x = (i - 7) * 3.8, h = 2.1 + random() * 4, z = -11 - random() * 8;
    k.box([x, h / 2 - 0.8, z], [3.3, h, 3.8], ['#988b9f', '#bba09e', '#a392a5'][i % 3]!, [0, 0, 0], 0, 0.16);
    k.add(new THREE.ConeGeometry(2.85, 1.65, 4), '#71798d', [x, h - 0.15, z], [1, 1, 0.92], [0, Math.PI / 4, 0], 0.18);
    k.box([x + 0.75, h + 0.65, z], [0.45, 1.6, 0.5], '#b69187');
    for (let j = 0; j < 3; j++) k.box([x - 1.05 + j * 1.05, h * 0.55, z + 1.93], [0.42, 0.7, 0.05], '#e0b989');
  }
  k.glow([-8, 10, -26], [2.0, 2.0, 0.3], '#edb78c', 0.15);
  k.finish();
}

function snail(k: GalleryKit, p: P, scale: number, shellColor: string, yaw: number, number: string) {
  k.frame(p, [0, yaw, 0], scale, () => {
    k.ball([0, 0.28, 0], [0.56, 0.3, 1.2], '#b6a37d');
    k.ball([0, 0.54, 0.77], [0.43, 0.5, 0.48], '#c5b88b');
    k.ball([0, 1.08, -0.21], [0.75, 0.87, 0.61], shellColor);
    // A raised spiral on the camera-facing shell side, derived from a single
    // center and growth curve instead of unrelated torus rings.
    const spiral: P[] = [];
    for (let i = 0; i <= 96; i++) {
      const t = i / 96, a = t * TAU * 2.25, r = 0.04 + t * 0.69;
      spiral.push([Math.cos(a) * r, 1.08 + Math.sin(a) * r * 1.09, 0.34 + t * 0.02]);
    }
    k.line(spiral, 0.065, '#edd09a');
    for (const s of [-1, 1]) {
      k.line([[s * 0.23, 0.76, 0.94], [s * 0.32, 1.28, 1.03], [s * 0.37, 1.5, 1.03]], 0.05, '#c5b88b');
      k.ball([s * 0.37, 1.51, 1.04], [0.12, 0.13, 0.12], '#e4d9ae');
      k.ball([s * 0.37, 1.52, 1.15], [0.05, 0.065, 0.025], '#33454a');
    }
    k.line([[-0.13, 0.56, 1.17], [0, 0.51, 1.21], [0.13, 0.56, 1.17]], 0.025, '#836954');
  });
  k.sign([p[0], p[1] + 0.35 * scale, p[2] + 1.27 * scale], 0.38 * scale, 0.3 * scale, [number], '#4b5961', '#efddb4');
}

export function buildSnailRace(ctx: SceneBuildContext) {
  const k = new GalleryKit(ctx), random = seeded(77413);
  k.add(new THREE.BoxGeometry(65, 0.3, 65), '#a3ab6a', [0, -0.28, -8], [1, 1, 1], [0, 0, 0], 0.38, 0.16);
  k.add(new THREE.BoxGeometry(11.5, 0.14, 24), '#c6ad82', [0, -0.035, -2], [1, 1, 1], [0, 0, 0], 0.3, 0.24, 0, 'The slow lane');
  for (const x of [-4.8, -1.6, 1.6, 4.8]) k.box([x, 0.05, -2], [0.065, 0.015, 23], '#e4d5ae');
  for (let i = 0; i < 14; i++) for (let j = 0; j < 2; j++) k.box([-5.15 + i * 0.79, 0.065, 3.55 + j * 0.7], [0.79, 0.018, 0.7], (i + j) % 2 ? '#43545b' : '#f0dfb7');
  snail(k, [-3.05, 0.07, 0.5], 1.12, '#b66e60', 0.05, '01');
  snail(k, [0, 0.07, -1.15], 1.36, '#5f96a0', -0.1, '02');
  snail(k, [3.2, 0.07, -2.9], 1.0, '#b89758', -0.15, '03');
  for (const x of [-5.75, 5.75]) {
    k.cylinder([x, 2.65, 4], 0.11, 5.35, '#a07850');
    k.glow([x, 5.4, 4], [0.17, 0.17, 0.17], '#d8ae5c', 0);
  }
  k.sign([0, 5.14, 4.02], 11.4, 0.82, ['THE GRAND SNAIL PRIX'], '#4b6262', '#e5c888');
  for (let i = 0; i < 9; i++) {
    k.add(new THREE.SphereGeometry(1, 28, 12), i % 2 ? '#8da17b' : '#9eae85', [-44 + i * 11, -1.6, -28 - i % 3 * 4], [15, 5.5 + i % 3, 9], [0, 0, 0], 0.18, 0.12, 0, 'Garden beyond the track');
  }
  k.sign([6.6, 1.0, 0.1], 1.65, 1.05, ['TOP SPEED', 'eventually'], '#59624e', '#e4d5ad', [0, -0.3, 0]);
  k.box([6.6, 0.4, 0], [0.08, 0.85, 0.12], '#9e8058');
  // A macro garden: mushrooms and little spectators dwarf the competitors.
  for (let i = 0; i < 14; i++) {
    const x = (i % 2 ? -1 : 1) * (6.7 + random() * 3.4), z = 2.5 - random() * 16, h = 0.9 + random() * 1.4;
    k.cylinder([x, h * 0.4, z], 0.17, h * 0.8, '#dbcea4', [0, 0, 0.12], 0.12);
    k.ball([x, h * 0.85, z], [0.65, 0.27, 0.6], i % 3 ? '#c4755f' : '#c5a367');
    for (let j = 0; j < 5; j++) {
      const a = j * TAU / 5;
      k.ball([x + Math.cos(a) * 0.35, h * 0.85 + 0.21, z + Math.sin(a) * 0.32], [0.075, 0.025, 0.08], '#efdcaf');
    }
  }
  for (let i = 0; i < 210; i++) {
    const x = (random() - 0.5) * 36, z = 11 - random() * 39;
    if (Math.abs(x) < 6) continue;
    const h = 0.3 + random() * 1.4;
    k.add(new THREE.ConeGeometry(0.08 + random() * 0.09, h, 3), i % 2 ? '#71845a' : '#b3b76d', [x, h / 2, z], [1, 1, 1], [0.2, random() * TAU, -0.25]);
  }
  for (let i = 0; i < 5; i++) {
    const x = -9 + i * 4.5;
    k.line([[x, 0, -12], [x + 0.4, 3, -12], [x, 5 + i % 2, -12]], 0.09, '#6e855a');
    k.ball([x, 5 + i % 2, -12], [0.32, 0.3, 0.16], '#b39358');
    for (let j = 0; j < 9; j++) {
      const a = j * TAU / 9;
      k.ball([x + Math.cos(a) * 0.48, 5 + i % 2 + Math.sin(a) * 0.48, -12], [0.37, 0.15, 0.08], '#e5d3a9', [0, 0, a]);
    }
  }
  k.finish();
}
