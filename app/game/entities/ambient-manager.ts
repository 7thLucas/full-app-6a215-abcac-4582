// AmbientManager — cheap particle-like crowd systems for butterflies, birds,
// fireflies, and fish. Driven by biome + time-of-day; not gameplay-relevant
// but adds life to the world.
//
// Each system maintains a fixed pool of THREE.Points; per-frame we offset the
// position attribute in JS. No per-instance THREE.Object3D allocations.

import * as THREE from "three";
import type { ChunkStore } from "../world/chunk-store";
import { isSolid, WATER } from "../blocks/block-registry";
import { CHUNK_HEIGHT } from "../world/world-config";

export interface AmbientManagerOptions {
  scene: THREE.Scene;
  chunkStore: ChunkStore;
  getPlayerPos: () => THREE.Vector3;
  getBiomeAt: (x: number, z: number) => string;
  getTimeOfDay: () => number;
}

interface SwarmConfig {
  count: number;
  size: number;
  color: string;
  spread: number; // radius around player to keep populated
  speed: number;
  yBand: [number, number] | "surface" | "water";
  daytimeOnly?: boolean;
  nighttimeOnly?: boolean;
  needsGrass?: boolean;
}

interface SwarmInstance {
  cfg: SwarmConfig;
  geom: THREE.BufferGeometry;
  mat: THREE.PointsMaterial;
  points: THREE.Points;
  positions: Float32Array; // x,y,z per particle
  phases: Float32Array; // per-particle phase offset
  alive: Uint8Array;
}

const SWARMS: Record<string, SwarmConfig> = {
  butterflies: {
    count: 24,
    size: 0.35,
    color: "#FFD27D",
    spread: 36,
    speed: 0.6,
    yBand: "surface",
    daytimeOnly: true,
    needsGrass: true,
  },
  birds: {
    count: 12,
    size: 0.55,
    color: "#22202E",
    spread: 64,
    speed: 1.6,
    yBand: [42, 56],
    daytimeOnly: true,
  },
  fireflies: {
    count: 32,
    size: 0.28,
    color: "#FFE680",
    spread: 28,
    speed: 0.35,
    yBand: "surface",
    nighttimeOnly: true,
    needsGrass: true,
  },
  fish: {
    count: 16,
    size: 0.35,
    color: "#86C5FF",
    spread: 24,
    speed: 0.5,
    yBand: "water",
  },
};

export class AmbientManager {
  private opts: AmbientManagerOptions;
  private group: THREE.Group;
  private swarms = new Map<string, SwarmInstance>();
  private respawnTimer = 0;

  constructor(opts: AmbientManagerOptions) {
    this.opts = opts;
    this.group = new THREE.Group();
    this.group.name = "Ambient";
    opts.scene.add(this.group);
    for (const [name, cfg] of Object.entries(SWARMS)) {
      this.swarms.set(name, this.buildSwarm(cfg));
    }
  }

  private buildSwarm(cfg: SwarmConfig): SwarmInstance {
    const positions = new Float32Array(cfg.count * 3);
    const phases = new Float32Array(cfg.count);
    const alive = new Uint8Array(cfg.count);
    for (let i = 0; i < cfg.count; i++) phases[i] = Math.random() * Math.PI * 2;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(cfg.color),
      size: cfg.size,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const points = new THREE.Points(geom, mat);
    points.frustumCulled = false;
    this.group.add(points);
    return { cfg, geom, mat, points, positions, phases, alive };
  }

  dispose() {
    for (const s of this.swarms.values()) {
      s.geom.dispose();
      s.mat.dispose();
    }
    this.group.parent?.remove(this.group);
  }

  private isNight(t: number): boolean {
    return t < 0.2 || t > 0.82;
  }
  private isDay(t: number): boolean {
    return t > 0.22 && t < 0.78;
  }

  private surfaceY(x: number, z: number): number | null {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    for (let y = CHUNK_HEIGHT - 2; y >= 1; y--) {
      const here = this.opts.chunkStore.getBlock(ix, y, iz);
      const above = this.opts.chunkStore.getBlock(ix, y + 1, iz);
      if (isSolid(here) && !isSolid(above)) return y + 1;
    }
    return null;
  }

  /** Find a water column near (x,z) for fish. Returns y near mid-water. */
  private waterY(x: number, z: number): number | null {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    let topWater = -1;
    let bottomWater = -1;
    for (let y = CHUNK_HEIGHT - 2; y >= 1; y--) {
      const id = this.opts.chunkStore.getBlock(ix, y, iz);
      if (id === WATER) {
        if (topWater < 0) topWater = y;
        bottomWater = y;
      } else if (topWater >= 0 && bottomWater >= 0) {
        break;
      }
    }
    if (topWater < 0) return null;
    return (topWater + bottomWater) / 2;
  }

  private hasGrassNearby(x: number, z: number): boolean {
    // Cheap check: top block is grass-ish or there's leaves overhead.
    const y = this.surfaceY(x, z);
    if (y == null) return false;
    const id = this.opts.chunkStore.getBlock(Math.floor(x), y - 1, Math.floor(z));
    return id === 1 /* GRASS */;
  }

  private respawnParticle(swarmName: string, swarm: SwarmInstance, idx: number) {
    const cfg = swarm.cfg;
    const player = this.opts.getPlayerPos();
    const angle = Math.random() * Math.PI * 2;
    const r = 6 + Math.random() * cfg.spread;
    const x = player.x + Math.cos(angle) * r;
    const z = player.z + Math.sin(angle) * r;

    let y: number | null = null;
    if (cfg.yBand === "surface") {
      const s = this.surfaceY(x, z);
      if (s == null) {
        swarm.alive[idx] = 0;
        return;
      }
      y = s + 0.8 + Math.random() * 1.6;
      if (cfg.needsGrass && !this.hasGrassNearby(x, z)) {
        swarm.alive[idx] = 0;
        return;
      }
    } else if (cfg.yBand === "water") {
      const w = this.waterY(x, z);
      if (w == null) {
        swarm.alive[idx] = 0;
        return;
      }
      y = w;
    } else if (Array.isArray(cfg.yBand)) {
      y = cfg.yBand[0] + Math.random() * (cfg.yBand[1] - cfg.yBand[0]);
    }
    if (y == null) {
      swarm.alive[idx] = 0;
      return;
    }
    swarm.positions[idx * 3 + 0] = x;
    swarm.positions[idx * 3 + 1] = y;
    swarm.positions[idx * 3 + 2] = z;
    swarm.alive[idx] = 1;
    void swarmName;
  }

  update(dt: number) {
    const t = this.opts.getTimeOfDay();
    const day = this.isDay(t);
    const night = this.isNight(t);
    const player = this.opts.getPlayerPos();
    this.respawnTimer += dt;
    const wantRespawn = this.respawnTimer > 1.0;
    if (wantRespawn) this.respawnTimer = 0;

    for (const [name, swarm] of this.swarms) {
      const cfg = swarm.cfg;
      const active = (!cfg.daytimeOnly || day) && (!cfg.nighttimeOnly || night);
      swarm.points.visible = active;
      if (!active) continue;

      for (let i = 0; i < cfg.count; i++) {
        if (!swarm.alive[i]) {
          if (wantRespawn) this.respawnParticle(name, swarm, i);
          continue;
        }
        const baseIdx = i * 3;
        // Despawn if too far
        const dx = swarm.positions[baseIdx + 0] - player.x;
        const dz = swarm.positions[baseIdx + 2] - player.z;
        if (Math.hypot(dx, dz) > cfg.spread + 12) {
          swarm.alive[i] = 0;
          if (wantRespawn) this.respawnParticle(name, swarm, i);
          continue;
        }
        // Wander offset
        swarm.phases[i] += dt * cfg.speed * 2;
        const ph = swarm.phases[i];
        swarm.positions[baseIdx + 0] += Math.sin(ph) * cfg.speed * dt;
        swarm.positions[baseIdx + 2] += Math.cos(ph * 1.3) * cfg.speed * dt;
        if (cfg.yBand === "surface" || Array.isArray(cfg.yBand)) {
          swarm.positions[baseIdx + 1] += Math.sin(ph * 2.1) * 0.2 * dt;
        } else if (cfg.yBand === "water") {
          swarm.positions[baseIdx + 1] += Math.sin(ph * 1.7) * 0.05 * dt;
        }
      }
      (swarm.geom.attributes.position as THREE.BufferAttribute).needsUpdate = true;

      // Fireflies pulse opacity gently
      if (cfg.nighttimeOnly) {
        swarm.mat.opacity = 0.6 + Math.sin(performance.now() * 0.005) * 0.3;
      }
    }
  }
}
