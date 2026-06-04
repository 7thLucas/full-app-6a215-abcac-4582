import { useGameStore, HOTBAR_SIZE } from "../state/game-store";
import { getDef } from "../blocks/block-registry";
import { BlockIcon } from "./block-icon";

interface HotbarProps {
  accentColor: string;
}

export function Hotbar({ accentColor }: HotbarProps) {
  const inventory = useGameStore((s) => s.inventory);
  const hotbarIndex = useGameStore((s) => s.hotbarIndex);
  const setHotbarIndex = useGameStore((s) => s.setHotbarIndex);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 18,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 6,
        padding: 6,
        borderRadius: 8,
        background: "rgba(20,22,28,0.72)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
        pointerEvents: "auto",
        zIndex: 30,
      }}
    >
      {Array.from({ length: HOTBAR_SIZE }).map((_, i) => {
        const slot = inventory[i];
        const selected = i === hotbarIndex;
        const def = slot?.id ? getDef(slot.id) : null;
        return (
          <button
            key={i}
            onClick={() => setHotbarIndex(i)}
            title={def ? def.label : "Empty slot"}
            style={{
              position: "relative",
              width: 56,
              height: 56,
              borderRadius: 6,
              padding: 0,
              border: selected ? `2px solid ${accentColor}` : "1px solid rgba(255,255,255,0.08)",
              background: selected ? "rgba(255,179,71,0.08)" : "rgba(255,255,255,0.04)",
              transform: selected ? "scale(1.05)" : "scale(1.0)",
              transition: "transform 120ms ease-out, border-color 120ms ease-out, background 120ms ease-out",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {slot?.id ? <BlockIcon id={slot.id} size={42} /> : null}
            {slot?.count > 0 ? (
              <span
                style={{
                  position: "absolute",
                  right: 4,
                  bottom: 2,
                  fontSize: 12,
                  fontVariantNumeric: "tabular-nums",
                  color: "#F5F5F0",
                  textShadow: "0 1px 2px rgba(0,0,0,0.7)",
                  fontWeight: 600,
                }}
              >
                {slot.count}
              </span>
            ) : null}
            <span
              style={{
                position: "absolute",
                top: 2,
                left: 4,
                fontSize: 10,
                color: "rgba(245,245,240,0.55)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {i + 1}
            </span>
          </button>
        );
      })}
    </div>
  );
}
