// Block orientation store. Keeps a sparse "world key" → orientation map,
// loaded/saved alongside chunk modifications.
//
// Orientation `facing` values are quarter-turns around Y:
//   0 = +Z, 1 = +X, 2 = -Z, 3 = -X
// `flip` is true for upside-down variants (slab top/bottom, etc.).

export interface BlockOrientation {
  facing: 0 | 1 | 2 | 3;
  flip: boolean;
}

const DEFAULT_ORIENT: BlockOrientation = { facing: 0, flip: false };

const orientations = new Map<string, BlockOrientation>();

function key(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

export function getBlockOrientation(x: number, y: number, z: number): BlockOrientation {
  return orientations.get(key(x, y, z)) ?? DEFAULT_ORIENT;
}

export function setBlockOrientation(
  x: number,
  y: number,
  z: number,
  orient: BlockOrientation,
): void {
  orientations.set(key(x, y, z), { facing: orient.facing, flip: orient.flip });
}

export function clearBlockOrientation(x: number, y: number, z: number): void {
  orientations.delete(key(x, y, z));
}

export function collectOrientations(): Record<string, BlockOrientation> {
  const out: Record<string, BlockOrientation> = {};
  orientations.forEach((v, k) => {
    out[k] = { facing: v.facing, flip: v.flip };
  });
  return out;
}

export function applyOrientations(map: Record<string, BlockOrientation> | undefined | null) {
  if (!map) return;
  for (const [k, v] of Object.entries(map)) {
    orientations.set(k, { facing: ((v.facing as number) & 3) as 0 | 1 | 2 | 3, flip: !!v.flip });
  }
}

/** Rotate a facing by N quarter-turns (positive = CCW around +Y). */
export function rotateFacing(facing: 0 | 1 | 2 | 3, steps: number): 0 | 1 | 2 | 3 {
  return (((facing + steps) % 4) + 4) % 4 as 0 | 1 | 2 | 3;
}
