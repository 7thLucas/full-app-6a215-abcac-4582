// BlueprintManager — holds runtime state for blueprint mode:
//   - Active selection (corner A, corner B)
//   - Save current selection to LocalStorage as a named blueprint
//   - Load a named blueprint and prepare a paste ghost
//   - Commit paste at world position (records into the undo stack)
//   - Undo stack: last 100 placement actions (single-block delta)

import type { ChunkStore } from "../world/chunk-store";
import { AIR, type BlockId } from "../blocks/block-registry";
import {
  clearBlockOrientation,
  getBlockOrientation,
  setBlockOrientation,
  type BlockOrientation,
} from "./rotation-system";

export interface SavedBlueprint {
  name: string;
  dims: [number, number, number]; // dx, dy, dz
  blocks: BlockId[]; // row-major: index = ((x * dy) + y) * dz + z
  orientations: Array<BlockOrientation | null>; // parallel to blocks
  savedAt: number;
}

export interface UndoAction {
  ops: Array<{
    x: number;
    y: number;
    z: number;
    prevId: BlockId;
    prevOrient: BlockOrientation | null;
    nextId: BlockId;
    nextOrient: BlockOrientation | null;
  }>;
}

const LS_KEY_PREFIX = "voxelverse-blueprints/";
const UNDO_LIMIT = 100;

export class BlueprintManager {
  private chunkStore: ChunkStore;
  cornerA: { x: number; y: number; z: number } | null = null;
  cornerB: { x: number; y: number; z: number } | null = null;
  pasteName: string | null = null;
  pastePending: SavedBlueprint | null = null;
  pasteAnchor: { x: number; y: number; z: number } | null = null;
  private undoStack: UndoAction[] = [];

  constructor(chunkStore: ChunkStore) {
    this.chunkStore = chunkStore;
  }

  reset() {
    this.cornerA = null;
    this.cornerB = null;
    this.pasteName = null;
    this.pastePending = null;
    this.pasteAnchor = null;
  }

  setCornerA(x: number, y: number, z: number) {
    this.cornerA = { x, y, z };
    this.cornerB = null;
  }
  setCornerB(x: number, y: number, z: number) {
    if (!this.cornerA) return;
    this.cornerB = { x, y, z };
  }

  selectionBounds(): { min: [number, number, number]; max: [number, number, number] } | null {
    if (!this.cornerA || !this.cornerB) return null;
    const min: [number, number, number] = [
      Math.min(this.cornerA.x, this.cornerB.x),
      Math.min(this.cornerA.y, this.cornerB.y),
      Math.min(this.cornerA.z, this.cornerB.z),
    ];
    const max: [number, number, number] = [
      Math.max(this.cornerA.x, this.cornerB.x),
      Math.max(this.cornerA.y, this.cornerB.y),
      Math.max(this.cornerA.z, this.cornerB.z),
    ];
    return { min, max };
  }

  /** Save current selection to LocalStorage. Returns the saved blueprint. */
  saveSelectionAs(name: string): SavedBlueprint | null {
    const b = this.selectionBounds();
    if (!b) return null;
    const dx = b.max[0] - b.min[0] + 1;
    const dy = b.max[1] - b.min[1] + 1;
    const dz = b.max[2] - b.min[2] + 1;
    const dims: [number, number, number] = [dx, dy, dz];
    const blocks: BlockId[] = new Array(dx * dy * dz);
    const orientations: Array<BlockOrientation | null> = new Array(dx * dy * dz);
    for (let x = 0; x < dx; x++) {
      for (let y = 0; y < dy; y++) {
        for (let z = 0; z < dz; z++) {
          const id = this.chunkStore.getBlock(b.min[0] + x, b.min[1] + y, b.min[2] + z);
          const orient = getBlockOrientation(b.min[0] + x, b.min[1] + y, b.min[2] + z);
          const idx = (x * dy + y) * dz + z;
          blocks[idx] = id;
          orientations[idx] = orient.facing === 0 && !orient.flip ? null : orient;
        }
      }
    }
    const bp: SavedBlueprint = { name, dims, blocks, orientations, savedAt: Date.now() };
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LS_KEY_PREFIX + name, JSON.stringify(bp));
      } catch {
        // best-effort
      }
    }
    return bp;
  }

  static listSaved(): string[] {
    if (typeof window === "undefined") return [];
    const out: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(LS_KEY_PREFIX)) out.push(k.slice(LS_KEY_PREFIX.length));
    }
    return out;
  }

  static load(name: string): SavedBlueprint | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(LS_KEY_PREFIX + name);
      if (!raw) return null;
      return JSON.parse(raw) as SavedBlueprint;
    } catch {
      return null;
    }
  }

  static deleteSaved(name: string) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(LS_KEY_PREFIX + name);
  }

  beginPaste(name: string) {
    const bp = BlueprintManager.load(name);
    if (!bp) return;
    this.pastePending = bp;
    this.pasteName = name;
  }

  cancelPaste() {
    this.pastePending = null;
    this.pasteName = null;
    this.pasteAnchor = null;
  }

  /** Commit current pending paste at anchor; records undo. */
  commitPasteAt(ax: number, ay: number, az: number): boolean {
    const bp = this.pastePending;
    if (!bp) return false;
    const [dx, dy, dz] = bp.dims;
    const ops: UndoAction["ops"] = [];
    for (let x = 0; x < dx; x++) {
      for (let y = 0; y < dy; y++) {
        for (let z = 0; z < dz; z++) {
          const wx = ax + x;
          const wy = ay + y;
          const wz = az + z;
          const idx = (x * dy + y) * dz + z;
          const newId = bp.blocks[idx];
          const newOrient = bp.orientations[idx] ?? null;
          const prevId = this.chunkStore.getBlock(wx, wy, wz);
          const prevOrient = { ...getBlockOrientation(wx, wy, wz) };
          this.chunkStore.setBlock(wx, wy, wz, newId);
          if (newOrient) setBlockOrientation(wx, wy, wz, newOrient);
          else clearBlockOrientation(wx, wy, wz);
          ops.push({
            x: wx, y: wy, z: wz,
            prevId, prevOrient,
            nextId: newId, nextOrient: newOrient,
          });
        }
      }
    }
    this.pushUndo({ ops });
    this.pastePending = null;
    this.pasteName = null;
    return true;
  }

  /** Record a single block placement for undo tracking (called from scene.ts). */
  recordPlace(x: number, y: number, z: number, prevId: BlockId) {
    const orient = getBlockOrientation(x, y, z);
    this.pushUndo({
      ops: [
        {
          x, y, z,
          prevId,
          prevOrient: null,
          nextId: this.chunkStore.getBlock(x, y, z),
          nextOrient: { ...orient },
        },
      ],
    });
  }

  recordBreak(x: number, y: number, z: number, prevId: BlockId, prevOrient: BlockOrientation) {
    this.pushUndo({
      ops: [
        {
          x, y, z,
          prevId,
          prevOrient: { ...prevOrient },
          nextId: AIR,
          nextOrient: null,
        },
      ],
    });
  }

  private pushUndo(a: UndoAction) {
    this.undoStack.push(a);
    while (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
  }

  undo(): boolean {
    const a = this.undoStack.pop();
    if (!a) return false;
    for (const op of a.ops) {
      this.chunkStore.setBlock(op.x, op.y, op.z, op.prevId);
      if (op.prevOrient) setBlockOrientation(op.x, op.y, op.z, op.prevOrient);
      else clearBlockOrientation(op.x, op.y, op.z);
    }
    return true;
  }

  undoStackSize(): number {
    return this.undoStack.length;
  }
}
