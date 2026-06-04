import { useGameStore } from "../state/game-store";

export function PauseMenu({
  visible,
  onResume,
  onSave,
  onExit,
  accentColor,
}: {
  visible: boolean;
  onResume: () => void;
  onSave: () => void;
  onExit: () => void;
  accentColor: string;
}) {
  const inventoryOpen = useGameStore((s) => s.inventoryOpen);
  if (!visible || inventoryOpen) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(8,10,14,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 45,
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          background: "rgba(20,22,28,0.92)",
          padding: 28,
          borderRadius: 12,
          width: "min(360px, 92vw)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          color: "#F5F5F0",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Paused</h2>
        <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "rgba(245,245,240,0.65)" }}>
          Click resume or click the world to dive back in.
        </p>
        <button
          onClick={onResume}
          style={{
            background: accentColor,
            color: "#1A1A1A",
            border: "none",
            padding: "10px 14px",
            borderRadius: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Resume
        </button>
        <button
          onClick={onSave}
          style={{
            background: "transparent",
            color: "#F5F5F0",
            border: "1px solid rgba(255,255,255,0.2)",
            padding: "10px 14px",
            borderRadius: 12,
            fontWeight: 500,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Save world
        </button>
        <button
          onClick={onExit}
          style={{
            background: "transparent",
            color: "rgba(245,245,240,0.7)",
            border: "1px solid rgba(255,255,255,0.12)",
            padding: "10px 14px",
            borderRadius: 12,
            fontWeight: 500,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Exit to menu
        </button>
      </div>
    </div>
  );
}
