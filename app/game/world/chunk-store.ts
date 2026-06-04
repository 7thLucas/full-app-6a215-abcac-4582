// In-memory chunk store. Generated chunks are cached and modified blocks
// are tracked in an overlay map so we can persist only the diffs.

import { CHUNK_HEIGHT, CHUNK_SIZE, chunkKey } from "./world-config";
import { AIR, type BlockId } from "../blocks/block-registry";
import type { WorldGenerator } from "./worldgen";

export interface ChunkData {
  cx: number;
  cz: number;
  blocks: Uint8Array; // current state (gen + modifications applied)
  dirty: boolean; // mesh needs rebuild
  hasMods: boolean; // mark this chunk as needing save
}

export type BlockModifications = Record<string, number>; // "x,y,z" -> blockId

export interface ChunkStore {
  getChunk: (cx: number, cz: number) => ChunkData;
  hasChunk: (cx: number, cz: number) => boolean;
  getBlock: (x: number, y: number, z: number) => BlockId;
  setBlock: (x: number, y: number, z: number, id: BlockId) => boolean;
  markDirty: (cx: number, cz: number) => void;
  consumeDirty: () => Array<[number, number]>;
  collectModifications: () => BlockModifications;
  applyModifications: (mods: BlockModifications) => void;
  loadedKeys: () => string[];
  unloadChunk: (cx: number, cz: number) => void;
}

export function createChunkStore(world: WorldGenerator): ChunkStore {
  const chunks = new Map<string, ChunkData>();
  const modifications = new Map<string, number>(); // global key "x,y,z" -> id
  const dirtySet = new Set<string>();

  const ensureChunk = (cx: number, cz: number): ChunkData => {
    const key = chunkKey(cx, cz);
    const existing = chunks.get(key);
    if (existing) return existing;
    const blocks = world.generateChunk(cx, cz);
    // apply persisted mods that fall in this chunk
    let hasMods = false;
    modifications.forEach((id, mkey) => {
      const [mx, my, mz] = mkey.split(",").map(Number);
      const mcx = Math.floor(mx / CHUNK_SIZE);
      const mcz = Math.floor(mz / CHUNK_SIZE);
      if (mcx === cx && mcz === cz) {
        const lx = ((mx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const lz = ((mz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        if (my >= 0 && my < CHUNK_HEIGHT) {
          blocks[(lx * CHUNK_HEIGHT + my) * CHUNK_SIZE + lz] = id;
          hasMods = true;
        }
      }
    });
    const cd: ChunkData = { cx, cz, blocks, dirty: true, hasMods };
    chunks.set(key, cd);
    dirtySet.add(key);
    return cd;
  };

  const getBlock = (x: number, y: number, z: number): BlockId => {
    if (y < 0 || y >= CHUNK_HEIGHT) return AIR;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const cd = ensureChunk(cx, cz);
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return cd.blocks[(lx * CHUNK_HEIGHT + y) * CHUNK_SIZE + lz] as BlockId;
  };

  const setBlock = (x: number, y: number, z: number, id: BlockId): boolean => {
    if (y < 0 || y >= CHUNK_HEIGHT) return false;
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const cd = ensureChunk(cx, cz);
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const idx = (lx * CHUNK_HEIGHT + y) * CHUNK_SIZE + lz;
    if (cd.blocks[idx] === id) return false;
    cd.blocks[idx] = id;
    cd.dirty = true;
    cd.hasMods = true;
    dirtySet.add(chunkKey(cx, cz));
    modifications.set(`${x},${y},${z}`, id);
    // Neighbors might be on chunk borders — mark them dirty so faces re-render.
    if (lx === 0) dirtySet.add(chunkKey(cx - 1, cz));
    if (lx === CHUNK_SIZE - 1) dirtySet.add(chunkKey(cx + 1, cz));
    if (lz === 0) dirtySet.add(chunkKey(cx, cz - 1));
    if (lz === CHUNK_SIZE - 1) dirtySet.add(chunkKey(cx, cz + 1));
    return true;
  };

  return {
    getChunk: ensureChunk,
    hasChunk: (cx, cz) => chunks.has(chunkKey(cx, cz)),
    getBlock,
    setBlock,
    markDirty: (cx, cz) => dirtySet.add(chunkKey(cx, cz)),
    consumeDirty: () => {
      const out: Array<[number, number]> = [];
      dirtySet.forEach((k) => {
        const [a, b] = k.split(",").map(Number);
        if (chunks.has(k)) out.push([a, b]);
      });
      dirtySet.clear();
      return out;
    },
    collectModifications: () => {
      const out: BlockModifications = {};
      modifications.forEach((id, k) => {
        out[k] = id;
      });
      return out;
    },
    applyModifications: (mods) => {
      Object.entries(mods).forEach(([k, id]) => {
        modifications.set(k, id);
        const [x, y, z] = k.split(",").map(Number);
        const cx = Math.floor(x / CHUNK_SIZE);
        const cz = Math.floor(z / CHUNK_SIZE);
        if (chunks.has(chunkKey(cx, cz))) {
          setBlock(x, y, z, id as BlockId);
        }
      });
    },
    loadedKeys: () => [...chunks.keys()],
    unloadChunk: (cx, cz) => {
      const key = chunkKey(cx, cz);
      chunks.delete(key);
      dirtySet.delete(key);
    },
  };
}
