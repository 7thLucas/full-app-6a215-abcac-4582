// Landing-into-game route. Three.js is client-only so we lazy-load the flow
// component and render a neutral loader during SSR / first paint.

import { useEffect, useState } from "react";
import type { MetaFunction } from "@remix-run/node";
import { useConfigurables } from "~/modules/configurables";

export const meta: MetaFunction = () => {
  return [
    { title: "VoxelVerse — Open a tab. Build a world." },
    {
      name: "description",
      content: "A cozy, browser-native 3D voxel sandbox. No install, no launcher, just a tab.",
    },
  ];
};

export default function IndexPage() {
  const [GameFlowComp, setGameFlowComp] = useState<null | React.ComponentType>(null);
  const { config } = useConfigurables();

  useEffect(() => {
    let cancelled = false;
    import("~/game/ui/GameFlow").then((mod) => {
      if (!cancelled) setGameFlowComp(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const accent = config?.brandColor?.primary ?? "#FFB347";
  const skyDay = config?.skyColors?.day ?? "#87CEEB";

  if (!GameFlowComp) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: `linear-gradient(180deg, ${skyDay} 0%, #FFD27D 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, system-ui, sans-serif",
          color: "#1A1A1A",
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.7)",
            padding: "16px 22px",
            borderRadius: 12,
            backdropFilter: "blur(6px)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              background: accent,
              borderRadius: 2,
              marginRight: 8,
              verticalAlign: "middle",
              animation: "voxel-loading 1s ease-in-out infinite",
            }}
          />
          Loading VoxelVerse...
        </div>
        <style>{`
          @keyframes voxel-loading {
            0%,100% { transform: scale(1); }
            50% { transform: scale(1.4); }
          }
        `}</style>
      </div>
    );
  }

  return <GameFlowComp />;
}
