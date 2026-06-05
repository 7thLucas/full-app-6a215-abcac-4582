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
import { CraftingTableUI } from "../crafting/crafting-table-ui";
import { BlueprintHud, BlueprintMenu } from "../architecture/blueprint-ui";
import { PointerLockTooltip } from "./PointerLockTooltip";
import { useState } from "react";

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
  const [hasLockedOnce, setHasLockedOnce] = useState(false);

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

  // Track first successful pointer-lock acquire for onboarding tooltip.
  useEffect(() => {
    const onChange = () => {
      if (document.pointerLockElement) {
        setHasLockedOnce(true);
      }
    };
    document.addEventListener("pointerlockchange", onChange);
    return () => document.removeEventListener("pointerlockchange", onChange);
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
        } else if (store.craftingOpen) {
          store.setCraftingOpen(false);
        } else if (store.blueprintMenuOpen) {
          store.setBlueprintMenuOpen(false);
        } else if (store.blueprintMode) {
          store.setBlueprintMode(false);
          sceneRef.current?.blueprintManager.reset();
          store.pushToast("Blueprint mode OFF");
        } else {
          store.setPaused(true);
        }
      } else if (e.code.startsWith("Digit")) {
        const n = Number(e.code.replace("Digit", ""));
        if (n >= 1 && n <= 9) {
          store.setHotbarIndex(n - 1);
        }
      } else if (e.code === "KeyR") {
        // Architecture: cycle placement orientation around Y.
        // Shift+R toggles flip (slab top/bottom, stair upside-down).
        if (e.shiftKey) {
          store.togglePlacementFlip();
        } else {
          store.rotatePlacement();
        }
        store.pushToast(
          `Rotation: ${["+Z", "+X", "-Z", "-X"][useGameStore.getState().placementFacing]}${
            useGameStore.getState().placementFlip ? " (flipped)" : ""
          }`,
        );
      } else if (e.code === "KeyB") {
        // Toggle blueprint mode; if already on and a corner B exists,
        // tapping B again opens the save/load menu.
        if (store.blueprintMode) {
          if (store.blueprintMenuOpen) {
            store.setBlueprintMenuOpen(false);
          } else {
            store.setBlueprintMenuOpen(true);
            sceneRef.current?.player.exitPointerLock();
          }
        } else {
          store.setBlueprintMode(true);
          store.pushToast("Blueprint mode ON");
        }
      } else if (e.code === "KeyZ" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const ok = sceneRef.current?.undo() ?? false;
        if (ok) store.pushToast("Undo");
        else store.pushToast("Nothing to undo");
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
      <PointerLockTooltip accentColor={props.accentColor} hasLockedOnce={hasLockedOnce} />
      <Hud />
      <Hotbar accentColor={props.accentColor} />
      <Toasts accentColor={props.accentColor} />
      <Inventory accentColor={props.accentColor} />
      <CraftingTableUI accentColor={props.accentColor} />
      <BlueprintHud accentColor={props.accentColor} />
      <BlueprintMenu
        accentColor={props.accentColor}
        getSelectionBounds={() => sceneRef.current?.blueprintManager.selectionBounds() ?? null}
        saveAs={(name) => {
          const r = sceneRef.current?.blueprintManager.saveSelectionAs(name) ?? null;
          if (r) useGameStore.getState().pushToast(`Saved "${name}"`);
          return !!r;
        }}
        beginPaste={(name) => {
          sceneRef.current?.blueprintManager.beginPaste(name);
          useGameStore.getState().pushToast(`Paste pending: "${name}"`);
        }}
        cancelPaste={() => sceneRef.current?.blueprintManager.cancelPaste()}
        hasPaste={() => !!sceneRef.current?.blueprintManager.pastePending}
      />
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
