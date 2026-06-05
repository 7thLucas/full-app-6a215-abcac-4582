// Mining speed integration. Reads the active hotbar item, looks up the tool
// spec, and returns the modified hardness to use in the break timer.
// Also tracks per-tool durability via the inventory slot — when a tool's
// durability hits 0, the slot is cleared.

import { useGameStore } from "../state/game-store";
import { getDef, type BlockId } from "../blocks/block-registry";
import {
  dropForBlock,
  getTool,
  preferredToolFor,
  requiredTierFor,
  toolTierRank,
  type ToolKind,
  type ToolTier,
} from "./tool-registry";

export interface ActiveToolInfo {
  toolId: BlockId | null;
  kind: ToolKind;
  tier: ToolTier;
  speedMultiplier: number;
}

export function getActiveTool(): ActiveToolInfo {
  const s = useGameStore.getState();
  const slot = s.inventory[s.hotbarIndex];
  if (!slot || !slot.id) {
    return { toolId: null, kind: "none", tier: null, speedMultiplier: 1.0 };
  }
  const tool = getTool(slot.id);
  if (!tool) return { toolId: slot.id, kind: "none", tier: null, speedMultiplier: 1.0 };
  return {
    toolId: slot.id,
    kind: tool.kind,
    tier: tool.tier,
    speedMultiplier: tool.speedMultiplier,
  };
}

/** Returns effective hardness (seconds) to break this block with the active tool. */
export function effectiveHardness(blockId: BlockId): number {
  const def = getDef(blockId);
  const base = Math.max(0.05, def.hardness);
  const tool = getActiveTool();
  if (tool.kind === "none") return base;
  const want = preferredToolFor(blockId);
  if (want !== "none" && want !== tool.kind) {
    // Wrong tool — small speedup only.
    return base / Math.max(1.0, tool.speedMultiplier * 0.4);
  }
  return base / tool.speedMultiplier;
}

/** Resolve which item drops when this block is broken (with active tool). */
export function resolveDrop(blockId: BlockId): { id: BlockId; count: number } | null {
  const tool = getActiveTool();
  const required = requiredTierFor(blockId);
  if (required && toolTierRank(tool.tier) < toolTierRank(required)) {
    return null;
  }
  const override = dropForBlock(blockId, tool.kind, tool.tier);
  if (override) return override;
  const def = getDef(blockId);
  if (def.drop == null) return null;
  return { id: def.drop, count: 1 };
}

/**
 * Decrement durability on the active tool slot. Currently we model durability
 * via the count field — each break decrements 1, and at 0 the slot clears.
 * (We start tools at full durability when crafted via `addItem`.)
 */
export function consumeToolDurability(): void {
  const s = useGameStore.getState();
  const inv = [...s.inventory];
  const slot = inv[s.hotbarIndex];
  if (!slot || !slot.id) return;
  const tool = getTool(slot.id);
  if (!tool) return;
  const nextCount = slot.count - 1;
  if (nextCount <= 0) {
    inv[s.hotbarIndex] = { id: 0, count: 0 };
    useGameStore.getState().pushToast(`${getDef(slot.id).label} broke!`);
  } else {
    inv[s.hotbarIndex] = { id: slot.id, count: nextCount };
  }
  useGameStore.setState({ inventory: inv });
}

/** Initial durability for newly crafted tools (used when addItem grants a tool). */
export function initialDurabilityFor(blockId: BlockId): number {
  const tool = getTool(blockId);
  if (!tool) return 1;
  return tool.durability;
}
