// Client-only flow: shows LandingScreen until the player hits Play,
// then mounts the Three.js GameCanvas. Pulls all settings from useConfigurables().

import { useEffect, useState } from "react";
import { useConfigurables } from "~/modules/configurables";
import { LandingScreen } from "./LandingScreen";
import { GameCanvas } from "./GameCanvas";
import { hasSave as hasSaveFn, loadWorld } from "../save/save-system";

type FlowMode = "landing" | "play";

export default function GameFlow() {
  const { config } = useConfigurables();
  const [mode, setMode] = useState<FlowMode>("landing");
  const [hasSavedWorld, setHasSavedWorld] = useState(false);
  const [continueExisting, setContinueExisting] = useState(false);

  const worldName = `voxelverse-${config?.worldSeed ?? 1337}`;

  useEffect(() => {
    setHasSavedWorld(hasSaveFn(worldName));
  }, [worldName]);

  const startNew = () => {
    setContinueExisting(false);
    setMode("play");
  };
  const continueExistingWorld = () => {
    setContinueExisting(true);
    setMode("play");
  };

  const exit = () => {
    setMode("landing");
    setHasSavedWorld(hasSaveFn(worldName));
  };

  const seed = config?.worldSeed ?? 1337;
  const renderDistance = Math.max(1, Math.min(6, config?.renderDistance ?? 3));
  const dayDurationMinutes = Math.max(1, Math.min(60, config?.dayDurationMinutes ?? 10));
  const starterItems = config?.enableStarterItems ?? true;
  const skyColors = config?.skyColors ?? {
    day: "#87CEEB",
    sunset: "#FF8C61",
    night: "#0B1B3A",
  };
  const accentColor = config?.brandColor?.primary ?? "#FFB347";

  if (mode === "landing") {
    return (
      <LandingScreen
        hasSave={hasSavedWorld}
        onPlay={startNew}
        onContinue={continueExistingWorld}
      />
    );
  }

  const initial = continueExisting ? loadWorld(worldName) : null;

  return (
    <GameCanvas
      seed={seed}
      worldName={worldName}
      starterItems={starterItems && !initial}
      renderDistance={renderDistance}
      dayDurationMinutes={dayDurationMinutes}
      skyColors={skyColors}
      accentColor={accentColor}
      initialSave={initial}
      onExit={exit}
    />
  );
}
