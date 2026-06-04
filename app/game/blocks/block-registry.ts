// Block registry — single source of truth for all voxel types.
// Numeric IDs are stable, used by chunks and save files.
// Colors are HSL-friendly hex used both for in-world meshes and HUD icons.

export type BlockId = number;

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
};

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

// Helper: get block face colors for mesh rendering.
export function getFaceColor(id: BlockId, face: "top" | "bottom" | "side"): string {
  const def = getDef(id);
  if (face === "top" && def.topColor) return def.topColor;
  if (face === "bottom" && def.bottomColor) return def.bottomColor;
  if (face === "side" && def.sideColor) return def.sideColor;
  return def.color;
}
