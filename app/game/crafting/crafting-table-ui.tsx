// 3x3 crafting table modal. Drag/click items between the player inventory and
// the 9-cell crafting grid; when the grid matches a recipe, the output slot
// previews — clicking it consumes one of each input and gives the player the output.

import { useState } from "react";
import {
  HOTBAR_SIZE,
  INVENTORY_COLS,
  INVENTORY_ROWS,
  STACK_MAX,
  useGameStore,
} from "../state/game-store";
import { getDef } from "../blocks/block-registry";
import { BlockIcon } from "../ui/block-icon";
import { X, ArrowRight } from "lucide-react";
import { matchRecipe, consumeGrid, type Grid, type GridCell } from "./recipe-engine";
import { RECIPES } from "./recipe-registry";

export function CraftingTableUI({ accentColor }: { accentColor: string }) {
  const open = useGameStore((s) => s.craftingOpen);
  const setOpen = useGameStore((s) => s.setCraftingOpen);
  const inventory = useGameStore((s) => s.inventory);
  const addItem = useGameStore((s) => s.addItem);
  const setInventory = useGameStore((s) => s.setInventoryDirect);
  const pushToast = useGameStore((s) => s.pushToast);

  const [grid, setGrid] = useState<Grid>(() => Array.from({ length: 9 }, () => null));
  const [pickedFrom, setPickedFrom] = useState<
    | { from: "inv"; idx: number }
    | { from: "grid"; idx: number }
    | null
  >(null);

  if (!open) return null;

  const match = matchRecipe(grid, RECIPES);

  const closeAndReturn = () => {
    // Return everything from grid to inventory
    const inv = [...inventory];
    grid.forEach((c) => {
      if (c && c.id && c.count > 0) {
        // Inline merge
        let remaining = c.count;
        for (let i = 0; i < inv.length && remaining > 0; i++) {
          if (inv[i].id === c.id && inv[i].count < STACK_MAX) {
            const take = Math.min(STACK_MAX - inv[i].count, remaining);
            inv[i] = { id: c.id, count: inv[i].count + take };
            remaining -= take;
          }
        }
        for (let i = 0; i < inv.length && remaining > 0; i++) {
          if (inv[i].count === 0) {
            const take = Math.min(STACK_MAX, remaining);
            inv[i] = { id: c.id, count: take };
            remaining -= take;
          }
        }
      }
    });
    setInventory(inv);
    setGrid(Array.from({ length: 9 }, () => null));
    setPickedFrom(null);
    setOpen(false);
  };

  const onClickInv = (idx: number) => {
    const slot = inventory[idx];
    if (pickedFrom == null) {
      if (slot.count === 0) return;
      setPickedFrom({ from: "inv", idx });
      return;
    }
    if (pickedFrom.from === "inv") {
      // swap inventory slots
      if (pickedFrom.idx !== idx) {
        const inv = [...inventory];
        [inv[pickedFrom.idx], inv[idx]] = [inv[idx], inv[pickedFrom.idx]];
        setInventory(inv);
      }
      setPickedFrom(null);
    } else if (pickedFrom.from === "grid") {
      // move from grid to inventory slot
      const gridCell = grid[pickedFrom.idx];
      if (!gridCell) {
        setPickedFrom(null);
        return;
      }
      const inv = [...inventory];
      const target = inv[idx];
      if (target.count === 0) {
        inv[idx] = { id: gridCell.id, count: gridCell.count };
        const g = [...grid];
        g[pickedFrom.idx] = null;
        setGrid(g);
        setInventory(inv);
      } else if (target.id === gridCell.id && target.count + gridCell.count <= STACK_MAX) {
        inv[idx] = { id: target.id, count: target.count + gridCell.count };
        const g = [...grid];
        g[pickedFrom.idx] = null;
        setGrid(g);
        setInventory(inv);
      } else if (target.id !== gridCell.id) {
        // swap grid<->inv
        const g = [...grid];
        g[pickedFrom.idx] = { id: target.id, count: target.count };
        inv[idx] = { id: gridCell.id, count: gridCell.count };
        setGrid(g);
        setInventory(inv);
      }
      setPickedFrom(null);
    }
  };

  const onClickGrid = (idx: number) => {
    const cell = grid[idx];
    if (pickedFrom == null) {
      if (!cell || cell.count === 0) return;
      setPickedFrom({ from: "grid", idx });
      return;
    }
    if (pickedFrom.from === "grid") {
      // swap grid slots
      if (pickedFrom.idx !== idx) {
        const g = [...grid];
        [g[pickedFrom.idx], g[idx]] = [g[idx], g[pickedFrom.idx]];
        setGrid(g);
      }
      setPickedFrom(null);
    } else if (pickedFrom.from === "inv") {
      const invCell = inventory[pickedFrom.idx];
      if (!invCell || invCell.count === 0) {
        setPickedFrom(null);
        return;
      }
      const g = [...grid];
      const inv = [...inventory];
      // Move 1 from inv -> grid (Minecraft-like one-at-a-time on click)
      const existing = g[idx];
      if (!existing) {
        g[idx] = { id: invCell.id, count: 1 };
      } else if (existing.id === invCell.id && existing.count < STACK_MAX) {
        g[idx] = { id: invCell.id, count: existing.count + 1 };
      } else if (existing.id !== invCell.id) {
        // swap: send whole grid stack back to invSlot and put 1 of new
        const back = existing;
        g[idx] = { id: invCell.id, count: 1 };
        // try to merge back into inventory
        let placed = false;
        for (let i = 0; i < inv.length && !placed; i++) {
          if (inv[i].id === back.id && inv[i].count + back.count <= STACK_MAX) {
            inv[i] = { id: back.id, count: inv[i].count + back.count };
            placed = true;
          }
        }
        if (!placed) {
          for (let i = 0; i < inv.length && !placed; i++) {
            if (inv[i].count === 0) {
              inv[i] = back;
              placed = true;
            }
          }
        }
      }
      const nextCount = invCell.count - 1;
      inv[pickedFrom.idx] = nextCount > 0 ? { id: invCell.id, count: nextCount } : { id: 0, count: 0 };
      setGrid(g);
      setInventory(inv);
      // Keep pickedFrom if there's still stack; release if consumed
      if (nextCount <= 0) setPickedFrom(null);
    }
  };

  const onCraft = () => {
    if (!match) return;
    const out = match.output;
    // Try to give the player the output first; if no space, refuse.
    // Use a temp inventory copy to test.
    const ok = addItem(out.id, out.count);
    if (!ok) {
      pushToast("Inventory full");
      return;
    }
    setGrid(consumeGrid(grid));
  };

  const renderSlot = (
    cell: GridCell | null,
    onClick: () => void,
    picked: boolean,
    key: string,
    badge?: string,
  ) => {
    const def = cell?.id ? getDef(cell.id) : null;
    return (
      <button
        key={key}
        onClick={onClick}
        title={def?.label}
        style={{
          position: "relative",
          width: 48,
          height: 48,
          padding: 0,
          borderRadius: 4,
          background: picked ? "rgba(255,179,71,0.15)" : "rgba(255,255,255,0.04)",
          border: picked ? `2px solid ${accentColor}` : "1px solid rgba(255,255,255,0.08)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {cell?.id ? <BlockIcon id={cell.id} size={32} /> : null}
        {cell && cell.count > 1 ? (
          <span
            style={{
              position: "absolute",
              right: 3,
              bottom: 1,
              fontSize: 10,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              color: "#F5F5F0",
              textShadow: "0 1px 2px rgba(0,0,0,0.7)",
            }}
          >
            {cell.count}
          </span>
        ) : null}
        {badge ? (
          <span
            style={{
              position: "absolute",
              top: 1,
              left: 3,
              fontSize: 9,
              color: "rgba(245,245,240,0.55)",
            }}
          >
            {badge}
          </span>
        ) : null}
      </button>
    );
  };

  const backpackStart = HOTBAR_SIZE;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(8,10,14,0.45)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 60,
        pointerEvents: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAndReturn();
      }}
    >
      <div
        style={{
          width: "min(760px, 94vw)",
          background: "rgba(20,22,28,0.94)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          color: "#F5F5F0",
          animation: "voxel-inv-in 180ms ease-out",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Crafting Table</h2>
          <button
            onClick={closeAndReturn}
            aria-label="Close crafting"
            style={{
              background: "transparent",
              border: "none",
              color: "#F5F5F0",
              cursor: "pointer",
              padding: 4,
              display: "flex",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: "rgba(245,245,240,0.6)", margin: "0 0 16px 0" }}>
          Click an inventory slot to pick up, click a grid cell to drop one. When the recipe matches, click the
          output to craft. Close to return items to inventory.
        </p>

        <div style={{ display: "flex", gap: 28, alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
          {/* 3x3 grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 48px)", gap: 4 }}>
            {grid.map((cell, i) =>
              renderSlot(
                cell,
                () => onClickGrid(i),
                pickedFrom?.from === "grid" && pickedFrom.idx === i,
                `g${i}`,
              ),
            )}
          </div>

          <ArrowRight size={28} color="rgba(245,245,240,0.55)" />

          {/* Output preview */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 6,
              border: `2px dashed ${match ? accentColor : "rgba(255,255,255,0.15)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: match ? "pointer" : "default",
              background: match ? "rgba(255,179,71,0.08)" : "transparent",
              position: "relative",
            }}
            onClick={() => match && onCraft()}
            title={match ? `Click to craft: ${getDef(match.output.id).label}` : "No recipe"}
          >
            {match ? <BlockIcon id={match.output.id} size={44} /> : null}
            {match && match.output.count > 1 ? (
              <span
                style={{
                  position: "absolute",
                  right: 4,
                  bottom: 2,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#F5F5F0",
                  textShadow: "0 1px 2px rgba(0,0,0,0.7)",
                }}
              >
                {match.output.count}
              </span>
            ) : null}
          </div>
        </div>

        {/* Backpack grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${INVENTORY_COLS}, 48px)`,
            gap: 4,
            justifyContent: "center",
            marginBottom: 14,
          }}
        >
          {Array.from({ length: INVENTORY_ROWS * INVENTORY_COLS }).map((_, k) => {
            const idx = backpackStart + k;
            const slot = inventory[idx];
            return renderSlot(
              slot && slot.count > 0 ? { id: slot.id, count: slot.count } : null,
              () => onClickInv(idx),
              pickedFrom?.from === "inv" && pickedFrom.idx === idx,
              `i${idx}`,
            );
          })}
        </div>

        {/* Hotbar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${HOTBAR_SIZE}, 48px)`,
            gap: 4,
            justifyContent: "center",
            paddingTop: 12,
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {Array.from({ length: HOTBAR_SIZE }).map((_, i) => {
            const slot = inventory[i];
            return renderSlot(
              slot && slot.count > 0 ? { id: slot.id, count: slot.count } : null,
              () => onClickInv(i),
              pickedFrom?.from === "inv" && pickedFrom.idx === i,
              `h${i}`,
              String(i + 1),
            );
          })}
        </div>
      </div>
    </div>
  );
}
