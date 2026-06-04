import { useState } from "react";
import {
  HOTBAR_SIZE,
  INVENTORY_COLS,
  INVENTORY_ROWS,
  useGameStore,
} from "../state/game-store";
import { getDef } from "../blocks/block-registry";
import { BlockIcon } from "./block-icon";
import { X } from "lucide-react";

export function Inventory({ accentColor }: { accentColor: string }) {
  const open = useGameStore((s) => s.inventoryOpen);
  const inventory = useGameStore((s) => s.inventory);
  const swap = useGameStore((s) => s.swapSlots);
  const toggle = useGameStore((s) => s.toggleInventory);
  const [pickedFrom, setPickedFrom] = useState<number | null>(null);

  if (!open) return null;

  const handleClick = (i: number) => {
    if (pickedFrom == null) {
      if (inventory[i].count === 0) return;
      setPickedFrom(i);
    } else {
      swap(pickedFrom, i);
      setPickedFrom(null);
    }
  };

  const backpackStart = HOTBAR_SIZE;
  const backpackEnd = HOTBAR_SIZE + INVENTORY_ROWS * INVENTORY_COLS;

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
        zIndex: 50,
        pointerEvents: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) toggle();
      }}
    >
      <div
        style={{
          width: "min(720px, 92vw)",
          background: "rgba(20,22,28,0.92)",
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
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Inventory</h2>
          <button
            onClick={toggle}
            aria-label="Close inventory"
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

        <p style={{ fontSize: 13, color: "rgba(245,245,240,0.6)", margin: "0 0 12px 0" }}>
          Click a slot to pick up, click another to place. Hotbar at the bottom. Press E to close.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${INVENTORY_COLS}, 48px)`,
            gap: 4,
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          {Array.from({ length: INVENTORY_ROWS * INVENTORY_COLS }).map((_, k) => {
            const idx = backpackStart + k;
            const slot = inventory[idx];
            const def = slot?.id ? getDef(slot.id) : null;
            const picked = pickedFrom === idx;
            return (
              <button
                key={idx}
                onClick={() => handleClick(idx)}
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
                {slot?.id ? <BlockIcon id={slot.id} size={32} /> : null}
                {slot?.count > 0 ? (
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
                    {slot.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

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
            const def = slot?.id ? getDef(slot.id) : null;
            const picked = pickedFrom === i;
            return (
              <button
                key={i}
                onClick={() => handleClick(i)}
                title={def?.label}
                style={{
                  position: "relative",
                  width: 48,
                  height: 48,
                  padding: 0,
                  borderRadius: 4,
                  background: picked ? "rgba(255,179,71,0.15)" : "rgba(255,255,255,0.05)",
                  border: picked ? `2px solid ${accentColor}` : "1px solid rgba(255,255,255,0.1)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {slot?.id ? <BlockIcon id={slot.id} size={32} /> : null}
                {slot?.count > 0 ? (
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
                    {slot.count}
                  </span>
                ) : null}
                <span
                  style={{
                    position: "absolute",
                    top: 1,
                    left: 3,
                    fontSize: 9,
                    color: "rgba(245,245,240,0.55)",
                  }}
                >
                  {i + 1}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes voxel-inv-in {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
