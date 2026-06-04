// World constants — keep this small and authoritative.
// Chunk-based, browser-friendly numbers (no 384-tall verticals).

export const CHUNK_SIZE = 16; // X and Z chunk width
export const CHUNK_HEIGHT = 64; // world Y height
export const SEA_LEVEL = 28;
export const BEDROCK_LEVEL = 0;

export const BIOMES = {
  PLAINS: "plains",
  FOREST: "forest",
  DESERT: "desert",
  SNOW: "snow",
  MOUNTAINS: "mountains",
} as const;

export type Biome = (typeof BIOMES)[keyof typeof BIOMES];

export function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

export function worldToChunk(x: number, z: number): { cx: number; cz: number; lx: number; lz: number } {
  const cx = Math.floor(x / CHUNK_SIZE);
  const cz = Math.floor(z / CHUNK_SIZE);
  const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  return { cx, cz, lx, lz };
}
