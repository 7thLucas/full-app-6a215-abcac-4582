// LocalStorage-backed save/load. We persist only modified chunks (the diff),
// plus player position, inventory, time-of-day, and the seed (deterministic regen).

import type { InventorySlot } from "../state/game-store";
import type { BlockModifications } from "../world/chunk-store";

export interface SaveBlob {
  version: 1;
  worldName: string;
  seed: number;
  playerPos: { x: number; y: number; z: number };
  yaw: number;
  pitch: number;
  hp: number;
  hunger: number;
  timeOfDay: number;
  hotbarIndex: number;
  inventory: InventorySlot[];
  modifications: BlockModifications;
  savedAt: number;
}

const KEY_PREFIX = "voxelverse:save:";

export function saveKey(worldName: string): string {
  return `${KEY_PREFIX}${worldName}`;
}

export function saveWorld(blob: SaveBlob): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(saveKey(blob.worldName), JSON.stringify(blob));
    return true;
  } catch (err) {
    console.warn("[save] failed:", err);
    return false;
  }
}

export function loadWorld(worldName: string): SaveBlob | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(saveKey(worldName));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveBlob;
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch (err) {
    console.warn("[save] load failed:", err);
    return null;
  }
}

export function hasSave(worldName: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(saveKey(worldName)) != null;
}

export function deleteSave(worldName: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(saveKey(worldName));
}
