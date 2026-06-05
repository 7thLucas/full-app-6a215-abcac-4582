// Per-block geometry emitter for stairs, slabs, and half-blocks.
// Each variant is built from 1-2 axis-aligned sub-boxes which we emit as
// triangulated quads directly into the supplied position/normal/color buffers.

import * as THREE from "three";
import { getFaceColor, type BlockShape, type BlockId } from "../blocks/block-registry";
import type { BlockOrientation } from "./rotation-system";

interface BufferLists {
  positions: number[];
  normals: number[];
  colors: number[];
  indices: number[];
}

interface Box {
  // local-space [0..1] cube space
  min: [number, number, number];
  max: [number, number, number];
}

const _color = new THREE.Color();

function rotateBoxAroundYCenter(box: Box, steps: number): Box {
  // Rotate XZ around the cell center (0.5, _, 0.5) by `steps` quarter-turns CCW.
  steps = ((steps % 4) + 4) % 4;
  if (steps === 0) return box;
  let { min, max } = box;
  for (let i = 0; i < steps; i++) {
    // CCW: (x,z) -> (z, 1-x)
    const nMinX = min[2];
    const nMinZ = 1 - max[0];
    const nMaxX = max[2];
    const nMaxZ = 1 - min[0];
    min = [Math.min(nMinX, nMaxX), min[1], Math.min(nMinZ, nMaxZ)];
    max = [Math.max(nMinX, nMaxX), max[1], Math.max(nMinZ, nMaxZ)];
  }
  return { min, max };
}

function flipBoxY(box: Box): Box {
  return {
    min: [box.min[0], 1 - box.max[1], box.min[2]],
    max: [box.max[0], 1 - box.min[1], box.max[2]],
  };
}

/**
 * Push a single axis-aligned box (all 6 faces) into the buffer.
 * `origin` is the world-local cell corner; box coords are inside [0,1].
 */
function pushBox(
  out: BufferLists,
  box: Box,
  ox: number,
  oy: number,
  oz: number,
  id: BlockId,
) {
  const x0 = ox + box.min[0];
  const y0 = oy + box.min[1];
  const z0 = oz + box.min[2];
  const x1 = ox + box.max[0];
  const y1 = oy + box.max[1];
  const z1 = oz + box.max[2];

  const faces: Array<{
    normal: [number, number, number];
    faceKey: "top" | "bottom" | "side";
    verts: [number, number, number][];
  }> = [
    // +X
    {
      normal: [1, 0, 0],
      faceKey: "side",
      verts: [
        [x1, y0, z0],
        [x1, y0, z1],
        [x1, y1, z1],
        [x1, y1, z0],
      ],
    },
    // -X
    {
      normal: [-1, 0, 0],
      faceKey: "side",
      verts: [
        [x0, y0, z1],
        [x0, y0, z0],
        [x0, y1, z0],
        [x0, y1, z1],
      ],
    },
    // +Y
    {
      normal: [0, 1, 0],
      faceKey: "top",
      verts: [
        [x0, y1, z0],
        [x1, y1, z0],
        [x1, y1, z1],
        [x0, y1, z1],
      ],
    },
    // -Y
    {
      normal: [0, -1, 0],
      faceKey: "bottom",
      verts: [
        [x0, y0, z1],
        [x1, y0, z1],
        [x1, y0, z0],
        [x0, y0, z0],
      ],
    },
    // +Z
    {
      normal: [0, 0, 1],
      faceKey: "side",
      verts: [
        [x1, y0, z1],
        [x0, y0, z1],
        [x0, y1, z1],
        [x1, y1, z1],
      ],
    },
    // -Z
    {
      normal: [0, 0, -1],
      faceKey: "side",
      verts: [
        [x0, y0, z0],
        [x1, y0, z0],
        [x1, y1, z0],
        [x0, y1, z0],
      ],
    },
  ];

  for (const face of faces) {
    const color = getFaceColor(id, face.faceKey);
    _color.set(color);
    const baseIdx = out.positions.length / 3;
    for (const v of face.verts) {
      out.positions.push(v[0], v[1], v[2]);
      out.normals.push(face.normal[0], face.normal[1], face.normal[2]);
      out.colors.push(_color.r, _color.g, _color.b);
    }
    out.indices.push(baseIdx, baseIdx + 1, baseIdx + 2, baseIdx, baseIdx + 2, baseIdx + 3);
  }
}

function boxesFor(shape: BlockShape, orient: BlockOrientation): Box[] {
  switch (shape) {
    case "slab": {
      // Bottom half by default; flip → top half.
      const base: Box = { min: [0, 0, 0], max: [1, 0.5, 1] };
      return [orient.flip ? flipBoxY(base) : base];
    }
    case "halfblock": {
      // Half-block in +Z half by default (one full half of the cube).
      const base: Box = { min: [0, 0, 0], max: [1, 1, 0.5] };
      const rotated = rotateBoxAroundYCenter(base, orient.facing);
      return [rotated];
    }
    case "stair": {
      // Bottom slab + step half on +Z side (front).
      const bottom: Box = { min: [0, 0, 0], max: [1, 0.5, 1] };
      const step: Box = { min: [0, 0.5, 0], max: [1, 1, 0.5] };
      const out = [bottom, step].map((b) => rotateBoxAroundYCenter(b, orient.facing));
      return orient.flip ? out.map(flipBoxY) : out;
    }
    default:
      return [{ min: [0, 0, 0], max: [1, 1, 1] }];
  }
}

export function emitNonCubeGeometry(
  out: BufferLists,
  shape: BlockShape,
  id: BlockId,
  lx: number,
  ly: number,
  lz: number,
  orient: BlockOrientation,
) {
  const boxes = boxesFor(shape, orient);
  for (const b of boxes) pushBox(out, b, lx, ly, lz, id);
}
