// Tiny seeded RNG (mulberry32) used to derive deterministic per-seed
// behaviour like tree placement and noise seeding.

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return function () {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(seed: number, x: number, z: number): number {
  // Cheap hash combining seed + coords, deterministic.
  let h = seed | 0;
  h = Math.imul(h ^ x, 2654435761);
  h = Math.imul(h ^ z, 1597334677);
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
