// Blueprint mode UI — a small HUD indicator + a saved-blueprints menu.
// The menu offers: save current selection as <name>, list saved blueprints,
// click to begin paste, click trash to delete.

import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "../state/game-store";
import { BlueprintManager } from "./blueprint-manager";
import { X, Save, Trash2, Layers } from "lucide-react";

export interface BlueprintUIProps {
  accentColor: string;
  getSelectionBounds: () => { min: [number, number, number]; max: [number, number, number] } | null;
  saveAs: (name: string) => boolean;
  beginPaste: (name: string) => void;
  cancelPaste: () => void;
  hasPaste: () => boolean;
}

export function BlueprintHud({ accentColor }: { accentColor: string }) {
  const mode = useGameStore((s) => s.blueprintMode);
  if (!mode) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 14,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 5,
        padding: "8px 14px",
        borderRadius: 999,
        background: "rgba(20,22,28,0.7)",
        border: `1px solid ${accentColor}`,
        color: "#F5F5F0",
        fontSize: 12,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: 8,
        pointerEvents: "none",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        textShadow: "0 1px 2px rgba(0,0,0,0.6)",
      }}
    >
      <Layers size={14} color={accentColor} />
      BLUEPRINT MODE — left-click 2 corners · open menu (B again) to save · right-click to commit paste · Ctrl+Z undo
    </div>
  );
}

export function BlueprintMenu({
  accentColor,
  getSelectionBounds,
  saveAs,
  beginPaste,
  cancelPaste,
  hasPaste,
}: BlueprintUIProps) {
  const open = useGameStore((s) => s.blueprintMenuOpen);
  const setOpen = useGameStore((s) => s.setBlueprintMenuOpen);
  const [saved, setSaved] = useState<string[]>([]);
  const [name, setName] = useState("");
  const bounds = useMemo(() => (open ? getSelectionBounds() : null), [open, getSelectionBounds]);

  useEffect(() => {
    if (open) {
      setSaved(BlueprintManager.listSaved());
    }
  }, [open]);

  if (!open) return null;

  const dx = bounds ? bounds.max[0] - bounds.min[0] + 1 : 0;
  const dy = bounds ? bounds.max[1] - bounds.min[1] + 1 : 0;
  const dz = bounds ? bounds.max[2] - bounds.min[2] + 1 : 0;

  const onSave = () => {
    if (!name.trim()) return;
    const ok = saveAs(name.trim());
    if (ok) {
      setName("");
      setSaved(BlueprintManager.listSaved());
    }
  };
  const onDelete = (n: string) => {
    BlueprintManager.deleteSaved(n);
    setSaved(BlueprintManager.listSaved());
  };
  const onPaste = (n: string) => {
    beginPaste(n);
    setOpen(false);
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(8,10,14,0.45)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 70,
        pointerEvents: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        style={{
          width: "min(540px, 92vw)",
          background: "rgba(20,22,28,0.94)",
          borderRadius: 12,
          padding: 24,
          color: "#F5F5F0",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Layers size={18} color={accentColor} /> Blueprints
          </h2>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            style={{ background: "transparent", border: "none", color: "#F5F5F0", cursor: "pointer", padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <p style={{ margin: 0, fontSize: 12, color: "rgba(245,245,240,0.7)" }}>
            {bounds
              ? `Selection: ${dx} × ${dy} × ${dz} blocks (${dx * dy * dz} total)`
              : "No selection yet — left-click two corners in the world to define one."}
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input
              type="text"
              value={name}
              placeholder="Save as..."
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSave();
              }}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#F5F5F0",
                padding: "8px 10px",
                borderRadius: 6,
                fontSize: 13,
                outline: "none",
              }}
            />
            <button
              onClick={onSave}
              disabled={!bounds || !name.trim()}
              style={{
                background: bounds && name.trim() ? accentColor : "rgba(255,255,255,0.1)",
                color: bounds && name.trim() ? "#1A1A1A" : "rgba(245,245,240,0.4)",
                border: "none",
                borderRadius: 6,
                padding: "8px 14px",
                cursor: bounds && name.trim() ? "pointer" : "default",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Save size={14} /> Save
            </button>
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "rgba(245,245,240,0.7)" }}>
          Saved ({saved.length})
        </div>
        <div
          style={{
            maxHeight: 240,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {saved.length === 0 ? (
            <p style={{ fontSize: 12, color: "rgba(245,245,240,0.45)", margin: "8px 0" }}>
              No saved blueprints yet.
            </p>
          ) : (
            saved.map((n) => (
              <div
                key={n}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 6,
                  padding: "6px 10px",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span style={{ fontSize: 13 }}>{n}</span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => onPaste(n)}
                    style={{
                      background: accentColor,
                      color: "#1A1A1A",
                      border: "none",
                      borderRadius: 4,
                      padding: "4px 10px",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Paste
                  </button>
                  <button
                    onClick={() => onDelete(n)}
                    aria-label={`Delete ${n}`}
                    style={{
                      background: "rgba(255,80,80,0.15)",
                      color: "#FF8585",
                      border: "1px solid rgba(255,80,80,0.3)",
                      borderRadius: 4,
                      padding: 4,
                      cursor: "pointer",
                      display: "flex",
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {hasPaste() ? (
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => {
                cancelPaste();
                setOpen(false);
              }}
              style={{
                background: "transparent",
                color: "#F5F5F0",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Cancel pending paste
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
