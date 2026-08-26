/// <reference types="vite/client" />

declare module 'seedthree/src/core/rng.js' {
  export class Rng {
    constructor(seed: string | number);
    next(): number;
    range(min: number, max: number): number;
    vary(base: number, spread: number): number;
    int(min: number, max: number): number;
    chance(probability: number): boolean;
    pick<T>(values: readonly T[]): T;
  }
}

declare module 'seedthree/src/core/weber-penn.js' {
  import type * as THREE from 'three';

  export interface SeedThreeStem {
    points: THREE.Vector3[];
    radii: number[];
    orients: THREE.Quaternion[];
    winds?: number[];
    level: number;
    maxLevel: number;
  }

  export function generateSkeleton(
    params: Record<string, unknown>,
    rng: import('seedthree/src/core/rng.js').Rng,
  ): { stems: SeedThreeStem[]; tips: unknown[]; params: Record<string, unknown> };
}

declare module 'seedthree/src/core/branch-mesh.js' {
  import type * as THREE from 'three';
  import type { SeedThreeStem } from 'seedthree/src/core/weber-penn.js';

  export function buildBranchGeometry(
    stems: SeedThreeStem[],
    options?: {
      tileWorldSize?: number;
      radialScale?: number;
      ringStride?: number;
    },
  ): THREE.BufferGeometry;
}

declare module 'seedthree/src/species/american-beech.js' {
  export const americanBeech: {
    name: string;
    latin: string;
    params: Record<string, unknown>;
    foliage: Record<string, unknown>;
    tileWorldSize?: number;
    plantSink?: number;
  };
}
