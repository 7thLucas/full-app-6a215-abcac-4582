// Onboarding tooltip for first-mount of the game canvas.
// Shows a centered overlay until the player acquires pointer-lock for the
// first time, then auto-dismisses. Does NOT gate gameplay.

import { useEffect, useState } from "react";
import { MousePointerClick } from "lucide-react";

export interface PointerLockTooltipProps {
  accentColor: string;
  /** Becomes true once pointer-lock has fired at least once. */
  hasLockedOnce: boolean;
}

const SEEN_KEY = "voxelverse:pointerlock-tooltip-seen";

export function PointerLockTooltip({ accentColor, hasLockedOnce }: PointerLockTooltipProps) {
  const [dismissed, setDismissed] = useState(false);
  const [hide, setHide] = useState(false);

  // If user has seen this in a prior session, start hidden.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(SEEN_KEY) === "1") {
      setHide(true);
    }
  }, []);

  // Auto-dismiss on first successful pointer-lock.
  useEffect(() => {
    if (hasLockedOnce) {
      setDismissed(true);
      try {
        window.localStorage.setItem(SEEN_KEY, "1");
      } catch {
        // ignore
      }
    }
  }, [hasLockedOnce]);

  if (hide || dismissed) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 8,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "rgba(20,22,28,0.78)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: `1px solid ${accentColor}`,
          borderRadius: 12,
          padding: "18px 22px",
          color: "#F5F5F0",
          maxWidth: 360,
          textAlign: "center",
          boxShadow: "0 12px 36px rgba(0,0,0,0.45)",
          animation: "voxel-tooltip-in 220ms ease-out",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            margin: "0 auto 10px",
            background: `${accentColor}22`,
            border: `1px solid ${accentColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: accentColor,
          }}
        >
          <MousePointerClick size={22} />
        </div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
          Click to start exploring
        </div>
        <div style={{ fontSize: 12, color: "rgba(245,245,240,0.75)", lineHeight: 1.55 }}>
          WASD to move · mouse to look · Esc to release
        </div>
      </div>
      <style>{`
        @keyframes voxel-tooltip-in {
          from { transform: scale(0.96) translateY(6px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
