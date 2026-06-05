// Tool tier definitions + lookup. Single source of truth for which tool gives
// which speed multiplier on which block kind, plus durability.

import {
  COAL_ORE,
  COBBLESTONE,
  DIRT,
  GRASS,
  IRON_AXE,
  IRON_INGOT,
  IRON_ORE,
  IRON_PICKAXE,
  IRON_SHOVEL,
  LEAVES,
  SAND,
  SNOW,
  STONE,
  STONE_AXE,
  STONE_PICKAXE,
  STONE_SHOVEL,
  WOOD_AXE,
  WOOD_LOG,
  WOOD_PICKAXE,
  WOOD_PLANK,
  WOOD_SHOVEL,
  type BlockId,
} from "../blocks/block-registry";

export type ToolKind = "pickaxe" | "axe" | "shovel" | "none";
export type ToolTier = "wood" | "stone" | "iron" | null;

export interface ToolSpec {
  id: BlockId;
  kind: ToolKind;
  tier: Exclude<ToolTier, null>;
  speedMultiplier: number;
  durability: number;
}

export const TOOLS: Record<number, ToolSpec> = {
  [WOOD_PICKAXE]: { id: WOOD_PICKAXE, kind: "pickaxe", tier: "wood", speedMultiplier: 1.5, durability: 60 },
  [STONE_PICKAXE]: { id: STONE_PICKAXE, kind: "pickaxe", tier: "stone", speedMultiplier: 2.5, durability: 150 },
  [IRON_PICKAXE]: { id: IRON_PICKAXE, kind: "pickaxe", tier: "iron", speedMultiplier: 4.0, durability: 300 },
  [WOOD_AXE]: { id: WOOD_AXE, kind: "axe", tier: "wood", speedMultiplier: 1.5, durability: 60 },
  [STONE_AXE]: { id: STONE_AXE, kind: "axe", tier: "stone", speedMultiplier: 2.5, durability: 150 },
  [IRON_AXE]: { id: IRON_AXE, kind: "axe", tier: "iron", speedMultiplier: 4.0, durability: 300 },
  [WOOD_SHOVEL]: { id: WOOD_SHOVEL, kind: "shovel", tier: "wood", speedMultiplier: 1.5, durability: 60 },
  [STONE_SHOVEL]: { id: STONE_SHOVEL, kind: "shovel", tier: "stone", speedMultiplier: 2.5, durability: 150 },
  [IRON_SHOVEL]: { id: IRON_SHOVEL, kind: "shovel", tier: "iron", speedMultiplier: 4.0, durability: 300 },
};

export function getTool(id: BlockId): ToolSpec | null {
  return TOOLS[id] ?? null;
}

const TIER_RANK: Record<Exclude<ToolTier, null>, number> = {
  wood: 1,
  stone: 2,
  iron: 3,
};

export function toolTierRank(tier: ToolTier): number {
  return tier ? TIER_RANK[tier] : 0;
}

/** Which tool kind is best for breaking a given block? */
export function preferredToolFor(blockId: BlockId): ToolKind {
  switch (blockId) {
    case STONE:
    case COBBLESTONE:
    case IRON_ORE:
    case COAL_ORE:
      return "pickaxe";
    case WOOD_LOG:
    case WOOD_PLANK:
    case LEAVES:
      return "axe";
    case DIRT:
    case SAND:
    case SNOW:
    case GRASS:
      return "shovel";
    default:
      return "none";
  }
}

/** Minimum tier required to actually drop the block when broken. */
export function requiredTierFor(blockId: BlockId): ToolTier {
  switch (blockId) {
    case STONE: // need stone tier+ to get the cobblestone drop
    case COBBLESTONE:
      return "wood"; // wood pickaxe drops cobble
    case IRON_ORE: // raw ore needs iron pickaxe via smelt — but the BLOCK can drop with stone+
      return "stone";
    case COAL_ORE:
      return "wood";
    default:
      return null;
  }
}

/** Override drop for the block based on tier requirement. Returns null if no drop allowed. */
export function dropForBlock(
  blockId: BlockId,
  toolKind: ToolKind,
  toolTier: ToolTier,
): { id: BlockId; count: number } | null {
  const req = requiredTierFor(blockId);
  if (req) {
    if (toolTierRank(toolTier) < toolTierRank(req)) {
      return null;
    }
    // Also wrong tool kind voids the drop for some blocks.
    const want = preferredToolFor(blockId);
    if (want === "pickaxe" && toolKind !== "pickaxe") return null;
  }
  // Special: Iron Ore drops the ore BLOCK (which the player smelts to get ingot).
  // Iron Ingot only drops directly if mined with iron-tier pickaxe — locked-default optional bonus.
  if (blockId === IRON_ORE) {
    if (toolTier === "iron" && toolKind === "pickaxe") {
      return { id: IRON_INGOT, count: 1 };
    }
    return { id: IRON_ORE, count: 1 };
  }
  // Default: fall back to block-registry's drop.
  return null;
}
