// All locked-default recipes for the MVP crafting system.
// Order matters: more-specific shaped recipes come before shapeless catch-alls.

import {
  COBBLESTONE,
  CRAFTING_TABLE,
  IRON_INGOT,
  IRON_AXE,
  IRON_PICKAXE,
  IRON_SHOVEL,
  STICK,
  STONE_AXE,
  STONE_PICKAXE,
  STONE_SHOVEL,
  WOOD_AXE,
  WOOD_LOG,
  WOOD_PICKAXE,
  WOOD_PLANK,
  WOOD_SHOVEL,
} from "../blocks/block-registry";
import type { Recipe } from "./recipe-engine";

export const RECIPES: Recipe[] = [
  // 1 Wood Log → 4 Wood Planks (shapeless)
  {
    id: "log_to_planks",
    kind: "shapeless",
    ingredients: [WOOD_LOG],
    output: { id: WOOD_PLANK, count: 4 },
  },
  // 2 Wood Planks vertical → 4 Sticks
  {
    id: "planks_to_sticks",
    kind: "shaped",
    pattern: ["P", "P"],
    key: { P: WOOD_PLANK },
    output: { id: STICK, count: 4 },
  },
  // 4 Wood Planks 2x2 → Crafting Table
  {
    id: "crafting_table",
    kind: "shaped",
    pattern: ["PP", "PP"],
    key: { P: WOOD_PLANK },
    output: { id: CRAFTING_TABLE, count: 1 },
  },
  // ===== PICKAXES (3 heads top row + 2 sticks handle col) =====
  {
    id: "wood_pickaxe",
    kind: "shaped",
    pattern: ["PPP", ".S.", ".S."],
    key: { P: WOOD_PLANK, S: STICK },
    output: { id: WOOD_PICKAXE, count: 1 },
  },
  {
    id: "stone_pickaxe",
    kind: "shaped",
    pattern: ["CCC", ".S.", ".S."],
    key: { C: COBBLESTONE, S: STICK },
    output: { id: STONE_PICKAXE, count: 1 },
  },
  {
    id: "iron_pickaxe",
    kind: "shaped",
    pattern: ["III", ".S.", ".S."],
    key: { I: IRON_INGOT, S: STICK },
    output: { id: IRON_PICKAXE, count: 1 },
  },
  // ===== AXES (3 heads L shape + 2 sticks) =====
  {
    id: "wood_axe",
    kind: "shaped",
    pattern: ["PP", "PS", ".S"],
    key: { P: WOOD_PLANK, S: STICK },
    output: { id: WOOD_AXE, count: 1 },
  },
  {
    id: "stone_axe",
    kind: "shaped",
    pattern: ["CC", "CS", ".S"],
    key: { C: COBBLESTONE, S: STICK },
    output: { id: STONE_AXE, count: 1 },
  },
  {
    id: "iron_axe",
    kind: "shaped",
    pattern: ["II", "IS", ".S"],
    key: { I: IRON_INGOT, S: STICK },
    output: { id: IRON_AXE, count: 1 },
  },
  // ===== SHOVELS (1 head + 2 sticks vertical) =====
  {
    id: "wood_shovel",
    kind: "shaped",
    pattern: ["P", "S", "S"],
    key: { P: WOOD_PLANK, S: STICK },
    output: { id: WOOD_SHOVEL, count: 1 },
  },
  {
    id: "stone_shovel",
    kind: "shaped",
    pattern: ["C", "S", "S"],
    key: { C: COBBLESTONE, S: STICK },
    output: { id: STONE_SHOVEL, count: 1 },
  },
  {
    id: "iron_shovel",
    kind: "shaped",
    pattern: ["I", "S", "S"],
    key: { I: IRON_INGOT, S: STICK },
    output: { id: IRON_SHOVEL, count: 1 },
  },
];

export const FURNACE_RECIPES: Array<{
  input: number;
  fuel: number;
  output: { id: number; count: number };
}> = [
  // Iron Ore + Coal → 1 Iron Ingot
  {
    input: 15, // IRON_ORE
    fuel: 18, // COAL
    output: { id: IRON_INGOT, count: 1 },
  },
];
