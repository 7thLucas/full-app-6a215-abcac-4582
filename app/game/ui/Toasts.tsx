import { useGameStore } from "../state/game-store";

export function Toasts({ accentColor }: { accentColor: string }) {
  const toasts = useGameStore((s) => s.toasts);
  return (
    <div
      style={{
        position: "absolute",
        bottom: 100,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        pointerEvents: "none",
        zIndex: 28,
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: "rgba(20,22,28,0.85)",
            color: "#F5F5F0",
            padding: "8px 14px",
            borderRadius: 6,
            borderLeft: `3px solid ${accentColor}`,
            fontSize: 13,
            fontWeight: 500,
            boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
            animation: "voxel-toast-slide 200ms ease-out",
          }}
        >
          {t.text}
        </div>
      ))}
      <style>{`
        @keyframes voxel-toast-slide {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
