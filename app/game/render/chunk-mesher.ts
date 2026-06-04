// Greedy meshing for voxel chunks.
// For each of the 6 face directions, sweep the chunk and merge coplanar
// same-color visible faces into single quads. Two output meshes per chunk:
// opaque (default) and water (rendered semi-transparent with depthWrite off).

import * as THREE from "three";
import { CHUNK_HEIGHT, CHUNK_SIZE } from "../world/world-config";
import {
  AIR,
  WATER,
  getDef,
  getFaceColor,
  isTransparent,
  type BlockId,
} from "../blocks/block-registry";

export interface MeshOutput {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
}

export interface ChunkMeshSet {
  opaque: MeshOutput;
  water: MeshOutput;
}

interface BufferLists {
  positions: number[];
  normals: number[];
  colors: number[];
  indices: number[];
}

function emptyBuffers(): BufferLists {
  return { positions: [], normals: [], colors: [], indices: [] };
}

function finalize(buffers: BufferLists): MeshOutput {
  return {
    positions: new Float32Array(buffers.positions),
    normals: new Float32Array(buffers.normals),
    colors: new Float32Array(buffers.colors),
    indices: new Uint32Array(buffers.indices),
  };
}

interface NeighborChunks {
  getBlockGlobal: (wx: number, wy: number, wz: number) => BlockId;
}

interface FaceCell {
  id: BlockId;
  color: string;
}

function cellEqual(a: FaceCell | null, b: FaceCell | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.id === b.id && a.color === b.color;
}

const _color = new THREE.Color();

interface SweepDir {
  axis: 0 | 1 | 2;
  positive: boolean;
  faceKey: "top" | "bottom" | "side";
}

const DIRECTIONS: SweepDir[] = [
  { axis: 0, positive: true, faceKey: "side" },
  { axis: 0, positive: false, faceKey: "side" },
  { axis: 1, positive: true, faceKey: "top" },
  { axis: 1, positive: false, faceKey: "bottom" },
  { axis: 2, positive: true, faceKey: "side" },
  { axis: 2, positive: false, faceKey: "side" },
];

function visibleFor(
  blockA: BlockId,
  blockB: BlockId,
  positive: boolean,
  faceKey: "top" | "bottom" | "side",
): FaceCell | null {
  // Render face on the side of `blockA` (the solid one) facing `blockB`.
  if (blockA === AIR) return null;
  if (blockA === WATER) {
    // Only render water surface top.
    if (!positive || faceKey !== "top") return null;
    if (blockB === AIR) return { id: WATER, color: getFaceColor(WATER, "top") };
    return null;
  }
  const aDef = getDef(blockA);
  if (!aDef.solid) return null;
  // Visible when neighbor is air, water, or transparent different block.
  if (blockB === AIR || blockB === WATER) {
    return { id: blockA, color: getFaceColor(blockA, faceKey) };
  }
  if (isTransparent(blockB) && blockB !== blockA) {
    return { id: blockA, color: getFaceColor(blockA, faceKey) };
  }
  return null;
}

export function meshChunk(
  blocks: Uint8Array,
  cx: number,
  cz: number,
  neighbors: NeighborChunks,
): ChunkMeshSet {
  const opaque = emptyBuffers();
  const water = emptyBuffers();

  const baseX = cx * CHUNK_SIZE;
  const baseZ = cz * CHUNK_SIZE;

  const dims: [number, number, number] = [CHUNK_SIZE, CHUNK_HEIGHT, CHUNK_SIZE];

  const getLocal = (lx: number, ly: number, lz: number): BlockId => {
    if (ly < 0 || ly >= CHUNK_HEIGHT) return AIR;
    if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE) {
      return blocks[(lx * CHUNK_HEIGHT + ly) * CHUNK_SIZE + lz] as BlockId;
    }
    return neighbors.getBlockGlobal(baseX + lx, ly, baseZ + lz);
  };

  for (const dir of DIRECTIONS) {
    const { axis, positive, faceKey } = dir;
    const u = ((axis + 1) % 3) as 0 | 1 | 2;
    const v = ((axis + 2) % 3) as 0 | 1 | 2;
    const dimAxis = dims[axis];
    const dimU = dims[u];
    const dimV = dims[v];

    const mask: Array<FaceCell | null> = new Array(dimU * dimV).fill(null);
    const sign = positive ? 1 : -1;

    for (let slice = 0; slice < dimAxis; slice++) {
      // Build mask: at each (i,j) of this slice plane, find the face cell.
      let n = 0;
      for (let j = 0; j < dimV; j++) {
        for (let i = 0; i < dimU; i++) {
          const pos: [number, number, number] = [0, 0, 0];
          pos[axis] = slice;
          pos[u] = i;
          pos[v] = j;
          const neighborPos: [number, number, number] = [pos[0], pos[1], pos[2]];
          neighborPos[axis] += sign;
          const a = getLocal(pos[0], pos[1], pos[2]);
          const b = getLocal(neighborPos[0], neighborPos[1], neighborPos[2]);
          mask[n++] = visibleFor(a, b, positive, faceKey);
        }
      }

      // Greedy merge mask -> quads
      n = 0;
      for (let j = 0; j < dimV; j++) {
        for (let i = 0; i < dimU; ) {
          const cell = mask[n];
          if (cell) {
            // width across u
            let w = 1;
            while (i + w < dimU && cellEqual(mask[n + w], cell)) w++;
            // height across v
            let h = 1;
            let done = false;
            while (j + h < dimV && !done) {
              for (let k = 0; k < w; k++) {
                if (!cellEqual(mask[n + k + h * dimU], cell)) {
                  done = true;
                  break;
                }
              }
              if (!done) h++;
            }

            // Quad corner anchor in chunk-local coords.
            const corner: [number, number, number] = [0, 0, 0];
            corner[axis] = positive ? slice + 1 : slice;
            corner[u] = i;
            corner[v] = j;

            const du: [number, number, number] = [0, 0, 0];
            const dv: [number, number, number] = [0, 0, 0];
            du[u] = w;
            dv[v] = h;

            const normal: [number, number, number] = [0, 0, 0];
            normal[axis] = positive ? 1 : -1;

            _color.set(cell.color);

            const target = cell.id === WATER ? water : opaque;
            const baseIdx = target.positions.length / 3;
            // Wind order depending on direction so the visible face points outward.
            const p0: [number, number, number] = [corner[0], corner[1], corner[2]];
            const p1: [number, number, number] = [
              corner[0] + du[0],
              corner[1] + du[1],
              corner[2] + du[2],
            ];
            const p2: [number, number, number] = [
              corner[0] + du[0] + dv[0],
              corner[1] + du[1] + dv[1],
              corner[2] + du[2] + dv[2],
            ];
            const p3: [number, number, number] = [
              corner[0] + dv[0],
              corner[1] + dv[1],
              corner[2] + dv[2],
            ];

            const verts = positive ? [p0, p1, p2, p3] : [p0, p3, p2, p1];
            for (const v3 of verts) {
              target.positions.push(v3[0], v3[1], v3[2]);
              target.normals.push(normal[0], normal[1], normal[2]);
              target.colors.push(_color.r, _color.g, _color.b);
            }
            target.indices.push(
              baseIdx,
              baseIdx + 1,
              baseIdx + 2,
              baseIdx,
              baseIdx + 2,
              baseIdx + 3,
            );

            // Clear used mask cells
            for (let l = 0; l < h; l++) {
              for (let k = 0; k < w; k++) {
                mask[n + k + l * dimU] = null;
              }
            }

            i += w;
            n += w;
          } else {
            i++;
            n++;
          }
        }
      }
    }
  }

  return { opaque: finalize(opaque), water: finalize(water) };
}
