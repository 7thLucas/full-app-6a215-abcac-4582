import { useGameStore } from "../state/game-store";
import { Heart, Drumstick, Compass } from "lucide-react";

export function Hud() {
  const hp = useGameStore((s) => s.hp);
  const hunger = useGameStore((s) => s.hunger);
  const pos = useGameStore((s) => s.playerPos);
  const tod = useGameStore((s) => s.timeOfDay);

  const todLabel = (() => {
    const t = tod;
    if (t < 0.2 || t > 0.8) return "Night";
    if (t < 0.3) return "Sunrise";
    if (t < 0.7) return "Day";
    return "Sunset";
  })();

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
        zIndex: 30,
        color: "#F5F5F0",
        textShadow: "0 1px 2px rgba(0,0,0,0.6)",
        fontSize: 13,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <StatBar
        icon={<Heart size={14} fill="#E5484D" stroke="#E5484D" />}
        label="HP"
        value={hp}
        max={100}
        color="#E5484D"
      />
      <StatBar
        icon={<Drumstick size={14} stroke="#D4A437" />}
        label="Hunger"
        value={hunger}
        max={100}
        color="#D4A437"
      />
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
        <Compass size={14} />
        <span>
          {pos.x.toFixed(0)} · {pos.y.toFixed(0)} · {pos.z.toFixed(0)}
        </span>
        <span style={{ opacity: 0.7, marginLeft: 8 }}>· {todLabel}</span>
      </div>
    </div>
  );
}

function StatBar({
  icon,
  label,
  value,
  max,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {icon}
      <div
        style={{
          width: 140,
          height: 8,
          borderRadius: 4,
          background: "rgba(20,22,28,0.55)",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            width: `${pct * 100}%`,
            height: "100%",
            background: color,
            transition: "width 200ms ease-out",
          }}
        />
      </div>
      <span style={{ minWidth: 28 }}>{value.toFixed(0)}</span>
    </div>
  );
}

export function Crosshair() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 25,
        width: 16,
        height: 16,
      }}
    >
      <svg viewBox="0 0 16 16" width={16} height={16}>
        <line x1="8" y1="2" x2="8" y2="14" stroke="white" strokeWidth="1.5" />
        <line x1="2" y1="8" x2="14" y2="8" stroke="white" strokeWidth="1.5" />
        <line x1="8" y1="2" x2="8" y2="14" stroke="black" strokeWidth="0.5" strokeDasharray="2" />
        <line x1="2" y1="8" x2="14" y2="8" stroke="black" strokeWidth="0.5" strokeDasharray="2" />
      </svg>
    </div>
  );
}
