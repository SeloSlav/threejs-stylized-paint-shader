import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    // This lab is WebGL. SeedThree's math/geometry modules import Three's
    // WebGPU entry for their host app, but only use core vectors and buffers.
    // Resolve those imports to the lab's single r185 runtime.
    alias: {
      'three/webgpu': 'three',
    },
  },
});
