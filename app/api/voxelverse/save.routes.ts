// Voxel save endpoints. Optional persistence layer alongside LocalStorage.
//
//   GET  /api/voxel/save/:worldName -> { save: SaveBlob | null }
//   PUT  /api/voxel/save             -> upsert (body: full SaveBlob)
//   GET  /api/voxel/seed             -> { seed }, derived from configurables (read-only echo)
//
// Endpoints are unauthenticated for the MVP — single-player browser game.

import { Router } from "express";
import { VoxelSaveModel } from "./save.model";

const router = Router();

router.get("/voxel/save/:worldName", async (req, res) => {
  try {
    const doc = await VoxelSaveModel.findOne({ worldName: req.params.worldName }).lean();
    res.json({ save: doc ? doc.payload : null });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put("/voxel/save", async (req, res) => {
  try {
    const body = req.body as { worldName?: string; seed?: number; payload?: unknown };
    if (!body?.worldName || typeof body.seed !== "number" || !body.payload) {
      return res.status(400).json({ error: "worldName, seed and payload required" });
    }
    const updated = await VoxelSaveModel.findOneAndUpdate(
      { worldName: body.worldName },
      {
        worldName: body.worldName,
        seed: body.seed,
        payload: body.payload as Record<string, unknown>,
        savedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    res.json({ ok: true, savedAt: updated?.savedAt });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/voxel/seed", async (_req, res) => {
  // Read the default seed from the configurables singleton so admins can pin a seed.
  try {
    const { ConfigurableModel } = await import("~/modules/configurables/src/models/configurables.model");
    const doc = await ConfigurableModel.findOne({ _singleton: true }).lean();
    const seed = (doc?.configurable_data as { worldSeed?: number } | undefined)?.worldSeed ?? 1337;
    res.json({ seed });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
