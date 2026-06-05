// EntityManager — owns the live set of entities, runs LOD-tiered AI updates,
// handles biome-aware spawn/despawn, herd grouping, and Three.js mesh sync.

import * as THREE from "three";
import { BaseEntity, type EntityContext } from "./base-entity";
import {
  BIOME_ROSTER,
  CREATURE_SPECS,
  getCreatureSpec,
  type BiomeRosterEntry,
  type CreatureKind,
} from "./creature-registry";
import { buildCreatureRig, disposeRig, animateRig, type CreatureRig } from "./creature-mesh";
import type { ChunkStore } from "../world/chunk-store";
import { isSolid } from "../blocks/block-registry";
import { CHUNK_HEIGHT } from "../world/world-config";
import type { Biome } from "../world/world-config";

const NEAR_RADIUS = 32;
const MID_RADIUS = 64;
const FAR_RADIUS = 96;
const DESPAWN_RADIUS = 128;
const SPAWN_MIN_RADIUS = 24;
const SPAWN_MAX_RADIUS = 96;

const TIER_INTERVAL_SEC = [1 / 60, 1 / 10, 1, Infinity];

// Caps to keep the world calm and frame-stable
const GLOBAL_ENTITY_CAP = 60;
const SPAWN_INTERVAL_SEC = 2.5; // attempt every N seconds

interface HerdRecord {
  id: number;
  kind: CreatureKind;
  center: THREE.Vector3;
  members: Set<number>;
}

let _herdIdCounter = 1;

export interface EntityManagerOptions {
  scene: THREE.Scene;
  chunkStore: ChunkStore;
  getPlayerPos: () => THREE.Vector3;
  getBiomeAt: (x: number, z: number) => Biome;
  isDaytime: () => boolean;
  /**
   * Returns true if a world position lies inside the player's view cone
   * (so we avoid spawning monsters in plain sight).
   */
  isInsideViewCone: (x: number, y: number, z: number) => boolean;
}

export class EntityManager {
  private opts: EntityManagerOptions;
  private group: THREE.Group;
  private entities: BaseEntity[] = [];
  private herds = new Map<number, HerdRecord>();
  private rigs = new Map<number, CreatureRig>();
  private nextLodSweepAt = 0;
  private tierAccumulator = [0, 0, 0]; // seconds since last update per tier (0..2)
  private spawnTimer = 0;

  constructor(opts: EntityManagerOptions) {
    this.opts = opts;
    this.group = new THREE.Group();
    this.group.name = "Entities";
    opts.scene.add(this.group);
  }

  get count(): number {
    return this.entities.length;
  }

  dispose() {
    for (const rig of this.rigs.values()) disposeRig(rig);
    this.rigs.clear();
    this.entities.length = 0;
    this.herds.clear();
    this.group.parent?.remove(this.group);
  }

  /** Damage / scare the closest entity in front of the player (called on left-click). */
  attackNearest(origin: THREE.Vector3, dir: THREE.Vector3, maxDist = 4): BaseEntity | null {
    let best: BaseEntity | null = null;
    let bestDist = maxDist;
    const dirN = dir.clone().normalize();
    for (const e of this.entities) {
      const dx = e.position.x - origin.x;
      const dy = e.position.y + e.spec.size.height * 0.5 - origin.y;
      const dz = e.position.z - origin.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > bestDist) continue;
      const dot = (dx * dirN.x + dy * dirN.y + dz * dirN.z) / dist;
      if (dot < 0.7) continue;
      best = e;
      bestDist = dist;
    }
    if (best) best.onHit(origin);
    return best;
  }

  private pickRosterEntry(biome: Biome): BiomeRosterEntry | null {
    const list = BIOME_ROSTER[biome];
    if (!list || list.length === 0) return null;
    const total = list.reduce((s, e) => s + e.weight, 0);
    let r = Math.random() * total;
    for (const e of list) {
      r -= e.weight;
      if (r <= 0) return e;
    }
    return list[0];
  }

  private findGroundY(x: number, z: number): number | null {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    for (let y = CHUNK_HEIGHT - 2; y >= 1; y--) {
      const here = this.opts.chunkStore.getBlock(ix, y, iz);
      const above = this.opts.chunkStore.getBlock(ix, y + 1, iz);
      if (isSolid(here) && !isSolid(above)) return y + 1;
    }
    return null;
  }

  /**
   * Attempt to spawn a herd. Pick a ring point around player, check biome roster,
   * verify standing room, and skip if inside view cone or already saturated.
   */
  private trySpawnHerd() {
    if (this.entities.length >= GLOBAL_ENTITY_CAP) return;
    if (!this.opts.isDaytime()) return; // daylight active only

    const player = this.opts.getPlayerPos();
    // Pick a random ring point
    const angle = Math.random() * Math.PI * 2;
    const radius = SPAWN_MIN_RADIUS + Math.random() * (SPAWN_MAX_RADIUS - SPAWN_MIN_RADIUS);
    const sx = player.x + Math.cos(angle) * radius;
    const sz = player.z + Math.sin(angle) * radius;
    const sy = this.findGroundY(sx, sz);
    if (sy == null) return;
    // No spawning in plain sight
    if (this.opts.isInsideViewCone(sx, sy, sz)) return;

    const biome = this.opts.getBiomeAt(sx, sz);
    const entry = this.pickRosterEntry(biome);
    if (!entry) return;
    const spec = getCreatureSpec(entry.kind);
    const desired = Math.floor(entry.herdMin + Math.random() * (entry.herdMax - entry.herdMin + 1));
    if (entry.sparse && Math.random() < 0.6) return; // even sparser

    const herdId = _herdIdCounter++;
    const center = new THREE.Vector3(sx, sy, sz);
    const herd: HerdRecord = {
      id: herdId,
      kind: entry.kind,
      center,
      members: new Set(),
    };
    this.herds.set(herdId, herd);

    for (let i = 0; i < desired; i++) {
      const jitterAngle = Math.random() * Math.PI * 2;
      const jitterR = Math.random() * Math.min(spec.herdRadius, 5);
      const ex = sx + Math.cos(jitterAngle) * jitterR;
      const ez = sz + Math.sin(jitterAngle) * jitterR;
      const ey = this.findGroundY(ex, ez);
      if (ey == null) continue;
      if (this.entities.length >= GLOBAL_ENTITY_CAP) break;
      const ent = new BaseEntity(spec, new THREE.Vector3(ex + 0.5, ey, ez + 0.5), herdId);
      this.entities.push(ent);
      herd.members.add(ent.id);
      // Build mesh
      const rig = buildCreatureRig(spec);
      this.group.add(rig.group);
      this.rigs.set(ent.id, rig);
      ent.mesh = rig.group;
    }
  }

  /** Recompute LOD tier per entity + cull beyond despawn radius. */
  private sweepLodAndCull() {
    const player = this.opts.getPlayerPos();
    const survivors: BaseEntity[] = [];
    for (const e of this.entities) {
      const dx = e.position.x - player.x;
      const dz = e.position.z - player.z;
      const dist = Math.hypot(dx, dz);
      if (dist > DESPAWN_RADIUS) {
        // Remove rig
        const rig = this.rigs.get(e.id);
        if (rig) {
          disposeRig(rig);
          this.rigs.delete(e.id);
        }
        // Remove from herd
        if (e.herdId != null) {
          const h = this.herds.get(e.herdId);
          if (h) {
            h.members.delete(e.id);
            if (h.members.size === 0) this.herds.delete(e.herdId);
          }
        }
        continue;
      }
      if (dist < NEAR_RADIUS) e.lodTier = 0;
      else if (dist < MID_RADIUS) e.lodTier = 1;
      else if (dist < FAR_RADIUS) e.lodTier = 2;
      else e.lodTier = 3;
      survivors.push(e);
    }
    this.entities = survivors;
  }

  private updateHerdCenters() {
    for (const herd of this.herds.values()) {
      let sx = 0;
      let sz = 0;
      let n = 0;
      for (const id of herd.members) {
        const e = this.entities.find((x) => x.id === id);
        if (!e) continue;
        sx += e.position.x;
        sz += e.position.z;
        n++;
      }
      if (n > 0) {
        herd.center.set(sx / n, herd.center.y, sz / n);
      }
    }
  }

  update(dt: number) {
    const now = performance.now();
    // Cull + LOD every 0.5s
    this.nextLodSweepAt -= dt;
    if (this.nextLodSweepAt <= 0) {
      this.sweepLodAndCull();
      this.updateHerdCenters();
      this.nextLodSweepAt = 0.5;
    }

    // Spawn attempts
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.trySpawnHerd();
      this.spawnTimer = SPAWN_INTERVAL_SEC;
    }

    // Tier-paced AI ticking — tier 0 every frame, tier 1 ~10Hz, tier 2 ~1Hz, tier 3 sleep.
    for (let t = 0; t < 3; t++) this.tierAccumulator[t] += dt;

    const playerPos = this.opts.getPlayerPos();
    for (const e of this.entities) {
      if (e.lodTier === 3) continue;
      const tier = e.lodTier;
      const interval = TIER_INTERVAL_SEC[tier];
      const acc = this.tierAccumulator[tier];
      if (acc < interval) continue;
      // Compute effective dt for this tier
      const effDt = Math.min(0.2, Math.max(dt, interval));
      const ctx: EntityContext = {
        chunkStore: this.opts.chunkStore,
        playerPos,
        now,
        herdCenter: e.herdId != null ? this.herds.get(e.herdId)?.center ?? null : null,
        herdmateCount: e.herdId != null ? this.herds.get(e.herdId)?.members.size ?? 0 : 0,
      };
      e.update(effDt, ctx);
    }
    // Reset tier accumulators that fired
    for (let t = 0; t < 3; t++) {
      if (this.tierAccumulator[t] >= TIER_INTERVAL_SEC[t]) this.tierAccumulator[t] = 0;
    }

    // Sync meshes (every frame for near-tier, less often for far)
    for (const e of this.entities) {
      const rig = this.rigs.get(e.id);
      if (!rig) continue;
      if (e.lodTier === 3) {
        rig.group.visible = false;
        continue;
      }
      rig.group.visible = true;
      rig.group.position.set(e.position.x, e.position.y, e.position.z);
      rig.group.rotation.y = e.yaw + Math.PI; // face forward (model +Z)
      if (e.lodTier <= 1) animateRig(rig, e.bobPhase);
    }
  }
}

export function listCreatureKinds(): CreatureKind[] {
  return Object.keys(CREATURE_SPECS) as CreatureKind[];
}
