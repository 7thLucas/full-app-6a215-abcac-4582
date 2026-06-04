// Client-only React wrapper for the Three.js VoxelScene.
// Keeps SSR out of the way and binds keyboard shortcuts for the inventory/hotbar.

import { useEffect, useRef } from "react";
import { useGameStore } from "../state/game-store";
import { VoxelScene } from "../render/scene";
import { Hotbar } from "./Hotbar";
import { Hud, Crosshair } from "./Hud";
import { Toasts } from "./Toasts";
import { Inventory } from "./Inventory";
import { PauseMenu } from "./PauseMenu";
import type { SaveBlob } from "../save/save-system";

export interface GameCanvasProps {
  seed: number;
  worldName: string;
  starterItems: boolean;
  renderDistance: number;
  dayDurationMinutes: number;
  skyColors: { day: string; sunset: string; night: string };
  accentColor: string;
  initialSave: SaveBlob | null;
  onExit: () => void;
}

export function GameCanvas(props: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<VoxelScene | null>(null);
  const paused = useGameStore((s) => s.paused);
  const inventoryOpen = useGameStore((s) => s.inventoryOpen);

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new VoxelScene({
      container: containerRef.current,
      seed: props.seed,
      worldName: props.worldName,
      starterItems: props.starterItems,
      renderDistance: props.renderDistance,
      dayDurationMinutes: props.dayDurationMinutes,
      skyColors: props.skyColors,
      initialSave: props.initialSave,
    });
    sceneRef.current = scene;
    scene.start();
    return () => {
      scene.saveNow();
      scene.stop();
      scene.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts (inventory + hotbar) handled at React layer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const store = useGameStore.getState();
      if (e.code === "KeyE") {
        e.preventDefault();
        store.toggleInventory();
        if (store.inventoryOpen) {
          sceneRef.current?.player.exitPointerLock();
        }
      } else if (e.code === "Escape") {
        if (store.inventoryOpen) {
          store.setInventoryOpen(false);
        } else {
          store.setPaused(true);
        }
      } else if (e.code.startsWith("Digit")) {
        const n = Number(e.code.replace("Digit", ""));
        if (n >= 1 && n <= 9) {
          store.setHotbarIndex(n - 1);
        }
      }
    };
    const onWheel = (e: WheelEvent) => {
      const store = useGameStore.getState();
      if (store.inventoryOpen) return;
      if (Math.abs(e.deltaY) < 1) return;
      store.shiftHotbar(e.deltaY > 0 ? 1 : -1);
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
    };
  }, []);

  const showCrosshair = !inventoryOpen && !paused;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#87CEEB",
        overflow: "hidden",
      }}
    >
      <div
        ref={containerRef}
        style={{ position: "absolute", inset: 0 }}
      />
      {showCrosshair ? <Crosshair /> : null}
      <Hud />
      <Hotbar accentColor={props.accentColor} />
      <Toasts accentColor={props.accentColor} />
      <Inventory accentColor={props.accentColor} />
      <PauseMenu
        visible={paused}
        accentColor={props.accentColor}
        onResume={() => {
          useGameStore.getState().setPaused(false);
          sceneRef.current?.player.requestPointerLock();
        }}
        onSave={() => {
          sceneRef.current?.saveNow();
        }}
        onExit={() => {
          sceneRef.current?.saveNow();
          props.onExit();
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 12,
          bottom: 12,
          color: "rgba(245,245,240,0.55)",
          fontSize: 11,
          pointerEvents: "none",
          textShadow: "0 1px 2px rgba(0,0,0,0.6)",
        }}
      >
        WASD move · Mouse look · LMB break · RMB place · E inventory · Esc pause
      </div>
    </div>
  );
}
