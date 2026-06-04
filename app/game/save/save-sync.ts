// Optional Mongo-backed cloud save sync. Best-effort, fire-and-forget.
// LocalStorage is the source of truth; this is just a backup.

import type { SaveBlob } from "./save-system";

export async function uploadSave(blob: SaveBlob): Promise<boolean> {
  try {
    const res = await fetch("/api/voxel/save", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        worldName: blob.worldName,
        seed: blob.seed,
        payload: blob,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchCloudSave(worldName: string): Promise<SaveBlob | null> {
  try {
    const res = await fetch(`/api/voxel/save/${encodeURIComponent(worldName)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { save: SaveBlob | null };
    return data?.save ?? null;
  } catch {
    return null;
  }
}
