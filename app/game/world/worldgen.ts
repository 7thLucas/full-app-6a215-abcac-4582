// Procedural terrain generation.
// Layers: elevation noise + temperature/moisture for biomes + scattered trees.
// Output is a flat Uint8Array indexed (x * H + y) * Z + z (CHUNK_SIZE x CHUNK_HEIGHT x CHUNK_SIZE).

import { createNoise2D } from "simplex-noise";
import {
  AIR,
  COAL_ORE,
  DIRT,
  GRASS,
  IRON_ORE,
  LEAVES,
  SAND,
  SNOW,
  STONE,
  WATER,
  WOOD_LOG,
  type BlockId,
} from "../blocks/block-registry";
import { mulberry32, hashSeed } from "../util/rng";
import { CHUNK_HEIGHT, CHUNK_SIZE, SEA_LEVEL, BIOMES, type Biome } from "./world-config";

export interface WorldGenerator {
  seed: number;
  generateChunk: (cx: number, cz: number) => Uint8Array;
  getHeightAt: (x: number, z: number) => number;
  getBiomeAt: (x: number, z: number) => Biome;
}

export function createWorldGenerator(seed: number): WorldGenerator {
  // Three independent 2D noise functions seeded from the world seed.
  const rng = mulberry32(seed);
  const elevNoise = createNoise2D(rng);
  const detailNoise = createNoise2D(mulberry32(seed + 9173));
  const tempNoise = createNoise2D(mulberry32(seed + 31337));
  const moistNoise = createNoise2D(mulberry32(seed + 7777));

  const getElevation = (x: number, z: number): number => {
    // Base continental shape
    const base = elevNoise(x * 0.008, z * 0.008);
    // Mid-scale rolling hills
    const hill = elevNoise(x * 0.03, z * 0.03) * 0.5;
    // Fine detail
    const detail = detailNoise(x * 0.1, z * 0.1) * 0.15;
    const combined = base + hill + detail; // roughly -1.65 .. 1.65
    // Map to height range. Sea level baseline around SEA_LEVEL.
    return Math.floor(SEA_LEVEL + combined * 14);
  };

  const getBiome = (x: number, z: number): Biome => {
    const t = tempNoise(x * 0.005, z * 0.005); // -1..1
    const m = moistNoise(x * 0.005, z * 0.005);
    // Whittaker-ish lookup.
    if (t < -0.35) return BIOMES.SNOW;
    if (t > 0.35 && m < -0.1) return BIOMES.DESERT;
    const elev = getElevation(x, z);
    if (elev > SEA_LEVEL + 10) return BIOMES.MOUNTAINS;
    if (m > 0.15) return BIOMES.FOREST;
    return BIOMES.PLAINS;
  };

  const surfaceFor = (biome: Biome, y: number, height: number): BlockId => {
    if (y > height) return AIR;
    if (y === height) {
      switch (biome) {
        case BIOMES.DESERT:
          return SAND;
        case BIOMES.SNOW:
          return SNOW;
        case BIOMES.MOUNTAINS:
          return y > SEA_LEVEL + 12 ? STONE : GRASS;
        default:
          return GRASS;
      }
    }
    if (y > height - 4) {
      switch (biome) {
        case BIOMES.DESERT:
          return SAND;
        case BIOMES.SNOW:
          return y > height - 1 ? SNOW : DIRT;
        default:
          return DIRT;
      }
    }
    return STONE;
  };

  const generateChunk = (cx: number, cz: number): Uint8Array => {
    const data = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const wx = cx * CHUNK_SIZE + lx;
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wz = cz * CHUNK_SIZE + lz;
        const biome = getBiome(wx, wz);
        const height = Math.max(1, Math.min(CHUNK_HEIGHT - 6, getElevation(wx, wz)));

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          let block: BlockId = AIR;
          if (y === 0) {
            block = STONE;
          } else if (y <= height) {
            block = surfaceFor(biome, y, height);
          } else if (y <= SEA_LEVEL) {
            block = WATER;
          }
          data[(lx * CHUNK_HEIGHT + y) * CHUNK_SIZE + lz] = block;
        }

        // Ore inlays — replace STONE with ores at the right Y range.
        // Deterministic via hashSeed shifted per ore.
        for (let y = 1; y < CHUNK_HEIGHT; y++) {
          if (data[(lx * CHUNK_HEIGHT + y) * CHUNK_SIZE + lz] !== STONE) continue;
          // Iron Y10..60
          if (y >= 10 && y <= 60) {
            const ri = hashSeed(seed + 31, wx, wz * 31 + y);
            if (ri < 0.012) {
              data[(lx * CHUNK_HEIGHT + y) * CHUNK_SIZE + lz] = IRON_ORE;
              continue;
            }
          }
          // Coal Y10..80 (capped at chunk height)
          if (y >= 10 && y <= Math.min(80, CHUNK_HEIGHT - 1)) {
            const rc = hashSeed(seed + 71, wx, wz * 31 + y);
            if (rc < 0.02) {
              data[(lx * CHUNK_HEIGHT + y) * CHUNK_SIZE + lz] = COAL_ORE;
            }
          }
        }

        // Beach sand if surface near sea level
        if (height <= SEA_LEVEL + 1 && height >= SEA_LEVEL - 1) {
          for (let y = Math.max(1, height - 2); y <= height; y++) {
            data[(lx * CHUNK_HEIGHT + y) * CHUNK_SIZE + lz] = SAND;
          }
        }

        // Trees (post-pass per column). Deterministic via hashSeed.
        if (
          (biome === BIOMES.FOREST || biome === BIOMES.PLAINS) &&
          height > SEA_LEVEL &&
          height < CHUNK_HEIGHT - 8
        ) {
          const r = hashSeed(seed, wx, wz);
          const density = biome === BIOMES.FOREST ? 0.04 : 0.008;
          if (r < density) {
            // Plant a small oak inside this column only (1 wide trunk + cap of leaves).
            const trunkTop = height + 4;
            for (let y = height + 1; y <= trunkTop; y++) {
              data[(lx * CHUNK_HEIGHT + y) * CHUNK_SIZE + lz] = WOOD_LOG;
            }
            // Leaf cap — confined to this column to avoid cross-chunk seams (kept simple for MVP).
            data[(lx * CHUNK_HEIGHT + (trunkTop + 1)) * CHUNK_SIZE + lz] = LEAVES;
          }
        }
      }
    }

    return data;
  };

  return {
    seed,
    generateChunk,
    getHeightAt: getElevation,
    getBiomeAt: getBiome,
  };
}
