// Pre-game screen. Hero gradient with stylized voxel-landscape SVG, wordmark, CTA.
// Reads all copy/colors from useConfigurables().

import { useConfigurables } from "~/modules/configurables";
import { useMemo } from "react";

export interface LandingScreenProps {
  hasSave: boolean;
  onPlay: () => void;
  onContinue: () => void;
}

export function LandingScreen({ hasSave, onPlay, onContinue }: LandingScreenProps) {
  const { config, loading } = useConfigurables();
  const appName = config?.appName ?? "VoxelVerse";
  const tagline = config?.tagline ?? "Open a tab. Build a world.";
  const playLabel = config?.playCtaLabel ?? "Play";
  const controls = config?.controlsHint ?? "WASD to move • Mouse to look • E for inventory";
  const versionTag = config?.versionTag ?? "v0.1 MVP";
  const sky = config?.skyColors ?? {
    day: "#87CEEB",
    sunset: "#FF8C61",
    night: "#0B1B3A",
  };
  const accent = config?.brandColor?.primary ?? "#FFB347";
  const footer = config?.footerText ?? "Cozy voxel sandbox, in your browser.";

  // Memoized hero gradient
  const heroBg = useMemo(
    () => `linear-gradient(180deg, ${sky.day} 0%, ${sky.sunset} 55%, ${sky.night} 100%)`,
    [sky.day, sky.sunset, sky.night],
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: heroBg,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#F5F5F0",
      }}
    >
      {/* Voxel silhouette artwork */}
      <VoxelHeroSilhouette accent={accent} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div
          style={{
            background: "rgba(20,22,28,0.55)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            padding: "32px 36px",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            maxWidth: 520,
            width: "100%",
          }}
        >
          <h1
            style={{
              fontFamily: "'Press Start 2P', 'Courier New', monospace",
              fontSize: 26,
              letterSpacing: 1.5,
              margin: 0,
              color: "#F5F5F0",
              textShadow: `0 2px 0 ${accent}, 0 4px 12px rgba(0,0,0,0.4)`,
            }}
          >
            {loading ? "..." : appName.toUpperCase()}
          </h1>
          <p style={{ marginTop: 12, marginBottom: 28, fontSize: 15, color: "rgba(245,245,240,0.85)" }}>
            {tagline}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={onPlay}
              style={{
                height: 44,
                borderRadius: 22,
                border: "none",
                background: accent,
                color: "#1A1A1A",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
                transition: "transform 120ms ease-out, box-shadow 120ms ease-out",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              }}
            >
              {hasSave ? `${playLabel} — New World` : playLabel}
            </button>
            {hasSave ? (
              <button
                onClick={onContinue}
                style={{
                  height: 40,
                  borderRadius: 20,
                  border: "1px solid rgba(255,255,255,0.25)",
                  background: "transparent",
                  color: "#F5F5F0",
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Continue previous world
              </button>
            ) : null}
          </div>

          <p style={{ marginTop: 22, fontSize: 12, color: "rgba(245,245,240,0.65)" }}>{controls}</p>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: 14,
          bottom: 12,
          fontSize: 11,
          color: "rgba(245,245,240,0.7)",
          textShadow: "0 1px 2px rgba(0,0,0,0.5)",
          zIndex: 2,
        }}
      >
        {versionTag}
      </div>
      <div
        style={{
          position: "absolute",
          left: 14,
          bottom: 12,
          fontSize: 11,
          color: "rgba(245,245,240,0.65)",
          textShadow: "0 1px 2px rgba(0,0,0,0.5)",
          zIndex: 2,
        }}
      >
        {footer}
      </div>
    </div>
  );
}

function VoxelHeroSilhouette({ accent }: { accent: string }) {
  // Stylized far hills + tree silhouettes baked into svg so the hero has voxel vibes without webgl.
  return (
    <svg
      viewBox="0 0 1200 600"
      preserveAspectRatio="xMidYEnd slice"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "62%",
        zIndex: 1,
        pointerEvents: "none",
      }}
      aria-hidden
    >
      {/* far hills */}
      <g opacity="0.55">
        <rect x="0" y="380" width="240" height="220" fill="#3a5a40" />
        <rect x="240" y="360" width="180" height="240" fill="#33523a" />
        <rect x="420" y="400" width="200" height="200" fill="#2e4a33" />
        <rect x="620" y="370" width="220" height="230" fill="#3a5a40" />
        <rect x="840" y="395" width="160" height="205" fill="#33523a" />
        <rect x="1000" y="380" width="200" height="220" fill="#2e4a33" />
      </g>
      {/* mid grass band */}
      <rect x="0" y="430" width="1200" height="170" fill="#5b8a3a" />
      <rect x="0" y="430" width="1200" height="14" fill="#6BBF59" />
      {/* foreground trees */}
      <g>
        <rect x="120" y="350" width="22" height="100" fill="#6E4A2A" />
        <rect x="92" y="300" width="78" height="62" fill="#4B8B3B" />
        <rect x="106" y="284" width="50" height="20" fill="#4B8B3B" />

        <rect x="940" y="360" width="22" height="90" fill="#6E4A2A" />
        <rect x="912" y="310" width="78" height="62" fill="#4B8B3B" />
        <rect x="924" y="296" width="54" height="18" fill="#4B8B3B" />
      </g>
      {/* sun */}
      <rect x="540" y="120" width="120" height="120" fill="#FFD27D" opacity="0.95" />
      <rect x="528" y="132" width="144" height="96" fill="#FFD27D" opacity="0.45" />
      {/* tiny clouds */}
      <g fill="#fdfdfd" opacity="0.9">
        <rect x="180" y="100" width="80" height="14" />
        <rect x="200" y="86" width="50" height="14" />
        <rect x="780" y="140" width="100" height="14" />
        <rect x="810" y="126" width="60" height="14" />
      </g>
      {/* accent torch glow on left tree */}
      <circle cx="140" cy="430" r="14" fill={accent} opacity="0.65" />
      <rect x="135" y="425" width="10" height="14" fill={accent} />
    </svg>
  );
}
