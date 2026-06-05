// Block registry — single source of truth for all voxel types.
// Numeric IDs are stable, used by chunks and save files.
// Colors are HSL-friendly hex used both for in-world meshes and HUD icons.

export type BlockId = number;

export type BlockShape = "cube" | "stair" | "slab" | "halfblock";

export interface BlockDefinition {
  id: BlockId;
  name: string;
  label: string;
  color: string; // base face color
  topColor?: string; // optional top face tint (e.g. grass)
  sideColor?: string; // optional side tint
  bottomColor?: string; // optional bottom tint
  hardness: number; // seconds to break with bare hands
  solid: boolean; // collides + opaque for meshing
  transparent?: boolean; // glass / water — render but allow neighbor faces
  drop: BlockId | null; // what enters inventory when broken (null = none)
  placeable: boolean; // can the player place it
  emissive?: number; // 0..1 light emission (torch etc.)
  liquid?: boolean;
  shape?: BlockShape; // default "cube"; non-cube uses custom geometry hook
}

export const AIR: BlockId = 0;
export const GRASS: BlockId = 1;
export const DIRT: BlockId = 2;
export const STONE: BlockId = 3;
export const SAND: BlockId = 4;
export const SNOW: BlockId = 5;
export const WATER: BlockId = 6;
export const WOOD_LOG: BlockId = 7;
export const LEAVES: BlockId = 8;
export const WOOD_PLANK: BlockId = 9;
export const COBBLESTONE: BlockId = 10;
export const GLASS: BlockId = 11;
export const TORCH: BlockId = 12;
export const CRAFTING_TABLE: BlockId = 13;
export const FURNACE: BlockId = 14;
// Ore blocks (Mission 2 — Crafting)
export const IRON_ORE: BlockId = 15;
export const COAL_ORE: BlockId = 16;
// Item-only ids (cannot be placed in the world; inventory currency only).
export const STICK: BlockId = 17;
export const COAL: BlockId = 18;
export const IRON_INGOT: BlockId = 19;
// Tools (also items)
export const WOOD_PICKAXE: BlockId = 20;
export const STONE_PICKAXE: BlockId = 21;
export const IRON_PICKAXE: BlockId = 22;
export const WOOD_AXE: BlockId = 23;
export const STONE_AXE: BlockId = 24;
export const IRON_AXE: BlockId = 25;
export const WOOD_SHOVEL: BlockId = 26;
export const STONE_SHOVEL: BlockId = 27;
export const IRON_SHOVEL: BlockId = 28;
// Architecture variants (Mission 3) — 3 materials × {stair, slab, half-block}.
// Each entry's `variant` and `material` are also encoded in `name` for fast lookup.
export const STAIR_WOOD: BlockId = 29;
export const STAIR_COBBLE: BlockId = 30;
export const STAIR_STONE: BlockId = 31;
export const SLAB_WOOD: BlockId = 32;
export const SLAB_COBBLE: BlockId = 33;
export const SLAB_STONE: BlockId = 34;
export const HALFBLOCK_WOOD: BlockId = 35;
export const HALFBLOCK_COBBLE: BlockId = 36;
export const HALFBLOCK_STONE: BlockId = 37;

export const BLOCKS: Record<BlockId, BlockDefinition> = {
  [AIR]: {
    id: AIR,
    name: "air",
    label: "Air",
    color: "#000000",
    hardness: 0,
    solid: false,
    drop: null,
    placeable: false,
  },
  [GRASS]: {
    id: GRASS,
    name: "grass",
    label: "Grass",
    color: "#7B5A3A",
    topColor: "#6BBF59",
    sideColor: "#7B8B4A",
    bottomColor: "#7B5A3A",
    hardness: 0.6,
    solid: true,
    drop: DIRT,
    placeable: true,
  },
  [DIRT]: {
    id: DIRT,
    name: "dirt",
    label: "Dirt",
    color: "#7B5A3A",
    hardness: 0.5,
    solid: true,
    drop: DIRT,
    placeable: true,
  },
  [STONE]: {
    id: STONE,
    name: "stone",
    label: "Stone",
    color: "#8C8C8C",
    hardness: 1.5,
    solid: true,
    drop: COBBLESTONE,
    placeable: true,
  },
  [SAND]: {
    id: SAND,
    name: "sand",
    label: "Sand",
    color: "#E8D69A",
    hardness: 0.5,
    solid: true,
    drop: SAND,
    placeable: true,
  },
  [SNOW]: {
    id: SNOW,
    name: "snow",
    label: "Snow",
    color: "#F5F7FA",
    topColor: "#FFFFFF",
    hardness: 0.4,
    solid: true,
    drop: SNOW,
    placeable: true,
  },
  [WATER]: {
    id: WATER,
    name: "water",
    label: "Water",
    color: "#3B82F6",
    hardness: 9999,
    solid: false,
    transparent: true,
    liquid: true,
    drop: null,
    placeable: false,
  },
  [WOOD_LOG]: {
    id: WOOD_LOG,
    name: "wood_log",
    label: "Wood Log",
    color: "#6E4A2A",
    topColor: "#B58A56",
    sideColor: "#6E4A2A",
    hardness: 1.0,
    solid: true,
    drop: WOOD_LOG,
    placeable: true,
  },
  [LEAVES]: {
    id: LEAVES,
    name: "leaves",
    label: "Leaves",
    color: "#4B8B3B",
    hardness: 0.3,
    solid: true,
    transparent: false,
    drop: LEAVES,
    placeable: true,
  },
  [WOOD_PLANK]: {
    id: WOOD_PLANK,
    name: "wood_plank",
    label: "Wood Plank",
    color: "#C09865",
    hardness: 0.8,
    solid: true,
    drop: WOOD_PLANK,
    placeable: true,
  },
  [COBBLESTONE]: {
    id: COBBLESTONE,
    name: "cobblestone",
    label: "Cobblestone",
    color: "#6F6F6F",
    hardness: 1.5,
    solid: true,
    drop: COBBLESTONE,
    placeable: true,
  },
  [GLASS]: {
    id: GLASS,
    name: "glass",
    label: "Glass",
    color: "#CFE7F0",
    hardness: 0.3,
    solid: true,
    transparent: true,
    drop: GLASS,
    placeable: true,
  },
  [TORCH]: {
    id: TORCH,
    name: "torch",
    label: "Torch",
    color: "#FFB347",
    hardness: 0.1,
    solid: true,
    drop: TORCH,
    placeable: true,
    emissive: 0.9,
  },
  [CRAFTING_TABLE]: {
    id: CRAFTING_TABLE,
    name: "crafting_table",
    label: "Crafting Table",
    color: "#8B5A2B",
    topColor: "#A47148",
    hardness: 1.2,
    solid: true,
    drop: CRAFTING_TABLE,
    placeable: true,
  },
  [FURNACE]: {
    id: FURNACE,
    name: "furnace",
    label: "Furnace",
    color: "#5C5C5C",
    topColor: "#7A7A7A",
    hardness: 1.8,
    solid: true,
    drop: FURNACE,
    placeable: true,
  },
  [IRON_ORE]: {
    id: IRON_ORE,
    name: "iron_ore",
    label: "Iron Ore",
    color: "#A09080",
    hardness: 2.5,
    solid: true,
    drop: IRON_ORE, // raw block drop; ingot requires smelt
    placeable: true,
  },
  [COAL_ORE]: {
    id: COAL_ORE,
    name: "coal_ore",
    label: "Coal Ore",
    color: "#3A3A3A",
    hardness: 1.8,
    solid: true,
    drop: COAL,
    placeable: true,
  },
  // Item-only entries (placeable=false; in-world rendering not used)
  [STICK]: {
    id: STICK,
    name: "stick",
    label: "Stick",
    color: "#9C7B45",
    hardness: 0,
    solid: false,
    drop: null,
    placeable: false,
  },
  [COAL]: {
    id: COAL,
    name: "coal",
    label: "Coal",
    color: "#222222",
    hardness: 0,
    solid: false,
    drop: null,
    placeable: false,
  },
  [IRON_INGOT]: {
    id: IRON_INGOT,
    name: "iron_ingot",
    label: "Iron Ingot",
    color: "#D4D4D4",
    hardness: 0,
    solid: false,
    drop: null,
    placeable: false,
  },
  [WOOD_PICKAXE]: {
    id: WOOD_PICKAXE,
    name: "wood_pickaxe",
    label: "Wood Pickaxe",
    color: "#C09865",
    hardness: 0,
    solid: false,
    drop: null,
    placeable: false,
  },
  [STONE_PICKAXE]: {
    id: STONE_PICKAXE,
    name: "stone_pickaxe",
    label: "Stone Pickaxe",
    color: "#888888",
    hardness: 0,
    solid: false,
    drop: null,
    placeable: false,
  },
  [IRON_PICKAXE]: {
    id: IRON_PICKAXE,
    name: "iron_pickaxe",
    label: "Iron Pickaxe",
    color: "#D4D4D4",
    hardness: 0,
    solid: false,
    drop: null,
    placeable: false,
  },
  [WOOD_AXE]: {
    id: WOOD_AXE,
    name: "wood_axe",
    label: "Wood Axe",
    color: "#C09865",
    hardness: 0,
    solid: false,
    drop: null,
    placeable: false,
  },
  [STONE_AXE]: {
    id: STONE_AXE,
    name: "stone_axe",
    label: "Stone Axe",
    color: "#888888",
    hardness: 0,
    solid: false,
    drop: null,
    placeable: false,
  },
  [IRON_AXE]: {
    id: IRON_AXE,
    name: "iron_axe",
    label: "Iron Axe",
    color: "#D4D4D4",
    hardness: 0,
    solid: false,
    drop: null,
    placeable: false,
  },
  [WOOD_SHOVEL]: {
    id: WOOD_SHOVEL,
    name: "wood_shovel",
    label: "Wood Shovel",
    color: "#C09865",
    hardness: 0,
    solid: false,
    drop: null,
    placeable: false,
  },
  [STONE_SHOVEL]: {
    id: STONE_SHOVEL,
    name: "stone_shovel",
    label: "Stone Shovel",
    color: "#888888",
    hardness: 0,
    solid: false,
    drop: null,
    placeable: false,
  },
  [IRON_SHOVEL]: {
    id: IRON_SHOVEL,
    name: "iron_shovel",
    label: "Iron Shovel",
    color: "#D4D4D4",
    hardness: 0,
    solid: false,
    drop: null,
    placeable: false,
  },
  // ===== Architecture variants =====
  [STAIR_WOOD]: {
    id: STAIR_WOOD, name: "stair_wood", label: "Wood Stair", color: "#C09865",
    hardness: 0.8, solid: true, drop: STAIR_WOOD, placeable: true, shape: "stair",
  },
  [STAIR_COBBLE]: {
    id: STAIR_COBBLE, name: "stair_cobble", label: "Cobble Stair", color: "#6F6F6F",
    hardness: 1.5, solid: true, drop: STAIR_COBBLE, placeable: true, shape: "stair",
  },
  [STAIR_STONE]: {
    id: STAIR_STONE, name: "stair_stone", label: "Stone Stair", color: "#8C8C8C",
    hardness: 1.5, solid: true, drop: STAIR_STONE, placeable: true, shape: "stair",
  },
  [SLAB_WOOD]: {
    id: SLAB_WOOD, name: "slab_wood", label: "Wood Slab", color: "#C09865",
    hardness: 0.6, solid: true, drop: SLAB_WOOD, placeable: true, shape: "slab",
  },
  [SLAB_COBBLE]: {
    id: SLAB_COBBLE, name: "slab_cobble", label: "Cobble Slab", color: "#6F6F6F",
    hardness: 1.2, solid: true, drop: SLAB_COBBLE, placeable: true, shape: "slab",
  },
  [SLAB_STONE]: {
    id: SLAB_STONE, name: "slab_stone", label: "Stone Slab", color: "#8C8C8C",
    hardness: 1.2, solid: true, drop: SLAB_STONE, placeable: true, shape: "slab",
  },
  [HALFBLOCK_WOOD]: {
    id: HALFBLOCK_WOOD, name: "halfblock_wood", label: "Wood Half-block", color: "#C09865",
    hardness: 0.6, solid: true, drop: HALFBLOCK_WOOD, placeable: true, shape: "halfblock",
  },
  [HALFBLOCK_COBBLE]: {
    id: HALFBLOCK_COBBLE, name: "halfblock_cobble", label: "Cobble Half-block", color: "#6F6F6F",
    hardness: 1.2, solid: true, drop: HALFBLOCK_COBBLE, placeable: true, shape: "halfblock",
  },
  [HALFBLOCK_STONE]: {
    id: HALFBLOCK_STONE, name: "halfblock_stone", label: "Stone Half-block", color: "#8C8C8C",
    hardness: 1.2, solid: true, drop: HALFBLOCK_STONE, placeable: true, shape: "halfblock",
  },
};

/** True if this block uses a custom (non-cube) sub-volume. */
export function isNonCube(id: BlockId): boolean {
  const def = BLOCKS[id];
  return !!def && !!def.shape && def.shape !== "cube";
}

export function blockShape(id: BlockId): BlockShape {
  return BLOCKS[id]?.shape ?? "cube";
}

export function isSolid(id: BlockId): boolean {
  return BLOCKS[id]?.solid ?? false;
}

export function isTransparent(id: BlockId): boolean {
  if (id === AIR) return true;
  const def = BLOCKS[id];
  if (!def) return true;
  return !def.solid || !!def.transparent;
}

export function getDef(id: BlockId): BlockDefinition {
  return BLOCKS[id] ?? BLOCKS[AIR];
}

// The placeable block roster the player can select in the hotbar.
export const PLACEABLE_BLOCKS: BlockId[] = [
  GRASS,
  DIRT,
  STONE,
  SAND,
  WOOD_LOG,
  WOOD_PLANK,
  COBBLESTONE,
  GLASS,
  TORCH,
];

// Block types tagged as architecture variants (used by HUD, hotbar selectors).
export const ARCHITECTURE_BLOCKS: BlockId[] = [
  STAIR_WOOD,
  STAIR_COBBLE,
  STAIR_STONE,
  SLAB_WOOD,
  SLAB_COBBLE,
  SLAB_STONE,
  HALFBLOCK_WOOD,
  HALFBLOCK_COBBLE,
  HALFBLOCK_STONE,
];

// Helper: get block face colors for mesh rendering.
export function getFaceColor(id: BlockId, face: "top" | "bottom" | "side"): string {
  const def = getDef(id);
  if (face === "top" && def.topColor) return def.topColor;
  if (face === "bottom" && def.bottomColor) return def.bottomColor;
  if (face === "side" && def.sideColor) return def.sideColor;
  return def.color;
}
