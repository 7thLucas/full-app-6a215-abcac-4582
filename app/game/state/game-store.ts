// Zustand store — UI-facing slices of game state.
// Player position is owned by the controller (refs in Canvas) for perf,
// but HUD-relevant numbers (HP, hunger, time of day, hotbar selection, inventory)
// live here so React components can subscribe.

import { create } from "zustand";
import { PLACEABLE_BLOCKS, type BlockId } from "../blocks/block-registry";

export const HOTBAR_SIZE = 9;
export const INVENTORY_ROWS = 3;
export const INVENTORY_COLS = 9;
export const INVENTORY_TOTAL = HOTBAR_SIZE + INVENTORY_ROWS * INVENTORY_COLS;
export const STACK_MAX = 99;

export interface InventorySlot {
  id: BlockId;
  count: number;
}

export interface GameStore {
  // Lifecycle
  started: boolean;
  paused: boolean;
  inventoryOpen: boolean;
  craftingOpen: boolean;
  blueprintMode: boolean;
  blueprintMenuOpen: boolean;

  // Survival
  hp: number;
  hpMax: number;
  hunger: number;
  hungerMax: number;

  // World
  timeOfDay: number; // 0..1, 0=midnight, 0.25=sunrise, 0.5=noon, 0.75=sunset
  worldSeed: number;
  worldName: string;

  // Player snapshot (HUD)
  playerPos: { x: number; y: number; z: number };
  biome: string;

  // Inventory: index 0..8 = hotbar, 9..35 = backpack
  inventory: InventorySlot[];
  hotbarIndex: number;

  // Architecture — placement orientation persistent across placements.
  placementFacing: 0 | 1 | 2 | 3;
  placementFlip: boolean;

  // Toasts
  toasts: { id: number; text: string }[];

  // Actions
  start: () => void;
  togglePause: () => void;
  setPaused: (p: boolean) => void;
  toggleInventory: () => void;
  setInventoryOpen: (open: boolean) => void;
  setCraftingOpen: (open: boolean) => void;
  setBlueprintMode: (on: boolean) => void;
  setBlueprintMenuOpen: (open: boolean) => void;

  setHotbarIndex: (i: number) => void;
  shiftHotbar: (delta: number) => void;
  rotatePlacement: () => void;
  togglePlacementFlip: () => void;

  addItem: (id: BlockId, count?: number) => boolean;
  removeFromSelected: (count?: number) => boolean;
  swapSlots: (a: number, b: number) => void;
  setInventoryDirect: (slots: InventorySlot[]) => void;

  setTimeOfDay: (t: number) => void;
  setPlayerSnapshot: (pos: { x: number; y: number; z: number }, biome: string) => void;
  setHp: (hp: number) => void;
  setHunger: (h: number) => void;

  pushToast: (text: string) => void;

  reset: (opts: { seed: number; worldName: string; starterItems: boolean }) => void;
  hydrateInventory: (slots: InventorySlot[], hotbarIndex: number) => void;
}

const emptySlots = (): InventorySlot[] =>
  Array.from({ length: INVENTORY_TOTAL }, () => ({ id: 0, count: 0 }));

let toastIdCounter = 1;

export const useGameStore = create<GameStore>((set, get) => ({
  started: false,
  paused: false,
  inventoryOpen: false,
  craftingOpen: false,
  blueprintMode: false,
  blueprintMenuOpen: false,

  hp: 100,
  hpMax: 100,
  hunger: 100,
  hungerMax: 100,

  timeOfDay: 0.3,
  worldSeed: 1337,
  worldName: "voxelverse-default",

  playerPos: { x: 0, y: 40, z: 0 },
  biome: "plains",

  inventory: emptySlots(),
  hotbarIndex: 0,

  placementFacing: 0,
  placementFlip: false,

  toasts: [],

  start: () => set({ started: true, paused: false }),

  togglePause: () => set({ paused: !get().paused }),
  setPaused: (p) => set({ paused: p }),
  toggleInventory: () => {
    const next = !get().inventoryOpen;
    set({ inventoryOpen: next, paused: next });
  },
  setInventoryOpen: (open) => set({ inventoryOpen: open, paused: open }),
  setCraftingOpen: (open) => set({ craftingOpen: open, paused: open }),
  setBlueprintMode: (on) => set({ blueprintMode: on }),
  setBlueprintMenuOpen: (open) => set({ blueprintMenuOpen: open, paused: open }),
  setInventoryDirect: (slots) => set({ inventory: slots }),

  setHotbarIndex: (i) => {
    const clamped = ((i % HOTBAR_SIZE) + HOTBAR_SIZE) % HOTBAR_SIZE;
    set({ hotbarIndex: clamped });
  },
  shiftHotbar: (delta) => {
    const next = ((get().hotbarIndex + delta) % HOTBAR_SIZE + HOTBAR_SIZE) % HOTBAR_SIZE;
    set({ hotbarIndex: next });
  },
  rotatePlacement: () => {
    const next = (((get().placementFacing + 1) % 4) + 4) % 4 as 0 | 1 | 2 | 3;
    set({ placementFacing: next });
  },
  togglePlacementFlip: () => set({ placementFlip: !get().placementFlip }),

  addItem: (id, count = 1) => {
    if (!id || count <= 0) return true;
    const inv = [...get().inventory];
    let remaining = count;
    // Tool items don't stack — each instance occupies its own slot with
    // its full durability as `count`. Detect tools by their numeric id range
    // (kept simple to avoid a registry import cycle here).
    const TOOL_MIN = 20;
    const TOOL_MAX = 28;
    const isTool = id >= TOOL_MIN && id <= TOOL_MAX;
    // Durability table, mirrored from tool-registry.ts
    const TOOL_DURABILITY: Record<number, number> = {
      20: 60, 21: 150, 22: 300,
      23: 60, 24: 150, 25: 300,
      26: 60, 27: 150, 28: 300,
    };
    if (isTool) {
      // Each crafted tool takes its own slot, count = durability.
      for (let i = 0; i < inv.length && remaining > 0; i++) {
        if (inv[i].count === 0) {
          inv[i] = { id, count: TOOL_DURABILITY[id] ?? 1 };
          remaining -= 1;
        }
      }
      set({ inventory: inv });
      return remaining === 0;
    }
    // Merge into existing stacks
    for (let i = 0; i < inv.length && remaining > 0; i++) {
      if (inv[i].id === id && inv[i].count < STACK_MAX) {
        const space = STACK_MAX - inv[i].count;
        const take = Math.min(space, remaining);
        inv[i] = { id, count: inv[i].count + take };
        remaining -= take;
      }
    }
    // Find empty slots
    for (let i = 0; i < inv.length && remaining > 0; i++) {
      if (inv[i].count === 0) {
        const take = Math.min(STACK_MAX, remaining);
        inv[i] = { id, count: take };
        remaining -= take;
      }
    }
    set({ inventory: inv });
    return remaining === 0;
  },

  removeFromSelected: (count = 1) => {
    const idx = get().hotbarIndex;
    const inv = [...get().inventory];
    if (inv[idx].count < count) return false;
    inv[idx] = { ...inv[idx], count: inv[idx].count - count };
    if (inv[idx].count === 0) {
      inv[idx] = { id: 0, count: 0 };
    }
    set({ inventory: inv });
    return true;
  },

  swapSlots: (a, b) => {
    if (a === b) return;
    const inv = [...get().inventory];
    [inv[a], inv[b]] = [inv[b], inv[a]];
    set({ inventory: inv });
  },

  setTimeOfDay: (t) => set({ timeOfDay: ((t % 1) + 1) % 1 }),
  setPlayerSnapshot: (pos, biome) => set({ playerPos: pos, biome }),
  setHp: (hp) => set({ hp: Math.max(0, Math.min(get().hpMax, hp)) }),
  setHunger: (h) => set({ hunger: Math.max(0, Math.min(get().hungerMax, h)) }),

  pushToast: (text) => {
    const id = toastIdCounter++;
    set({ toasts: [...get().toasts, { id, text }] });
    setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    }, 2000);
  },

  reset: ({ seed, worldName, starterItems }) => {
    const inv = emptySlots();
    if (starterItems) {
      // Pre-fill hotbar with placeables for the cozy MVP feel.
      const starter = [
        [PLACEABLE_BLOCKS[0], 32],
        [PLACEABLE_BLOCKS[1], 32],
        [PLACEABLE_BLOCKS[4], 16],
        [PLACEABLE_BLOCKS[5], 32],
        [PLACEABLE_BLOCKS[6], 16],
        [PLACEABLE_BLOCKS[7], 8],
        [PLACEABLE_BLOCKS[8], 4],
      ] as Array<[BlockId, number]>;
      starter.forEach(([id, count], i) => {
        if (i < HOTBAR_SIZE) inv[i] = { id, count };
      });
    }
    set({
      started: true,
      paused: false,
      inventoryOpen: false,
      hp: 100,
      hunger: 100,
      timeOfDay: 0.3,
      worldSeed: seed,
      worldName,
      inventory: inv,
      hotbarIndex: 0,
      toasts: [],
    });
  },

  hydrateInventory: (slots, hotbarIndex) => {
    // Pad/truncate to expected size.
    const next = emptySlots();
    for (let i = 0; i < Math.min(slots.length, next.length); i++) {
      if (slots[i]) next[i] = { id: slots[i].id, count: slots[i].count };
    }
    set({ inventory: next, hotbarIndex: Math.max(0, Math.min(HOTBAR_SIZE - 1, hotbarIndex)) });
  },
}));
