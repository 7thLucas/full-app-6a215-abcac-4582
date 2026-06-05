// BaseEntity — minimal stateful actor in the world.
// Owns position/velocity/yaw plus a per-entity AI tick.
// Render is a cheap box mesh (no skinned models) — performance first.

import * as THREE from "three";
import type { ChunkStore } from "../world/chunk-store";
import { isSolid } from "../blocks/block-registry";
import { CHUNK_HEIGHT } from "../world/world-config";

export type EntityState = "idle" | "wander" | "flee" | "ambient";

export interface EntityBoundsSize {
  width: number; // x/z radius (half-extent)
  height: number; // full height
}

export interface EntitySpec {
  kind: string;
  label: string;
  bodyColor: string;
  headColor?: string;
  size: EntityBoundsSize;
  walkSpeed: number;
  fleeSpeed: number;
  herdRadius: number; // 0 = solo
  herdCohesion: number; // 0..1 strength of pull toward herd center
  fleePanicDistance: number; // blocks
  wanderRadius: number; // blocks
  jumpChance: number; // per-second chance to hop
  variantTint?: string | null; // optional variant overlay (e.g., snow sheep)
}

export interface EntityContext {
  chunkStore: ChunkStore;
  playerPos: THREE.Vector3;
  now: number; // ms perf
  herdCenter?: THREE.Vector3 | null;
  herdmateCount?: number;
}

let _entityIdCounter = 1;

export class BaseEntity {
  readonly id: number;
  spec: EntitySpec;
  position: THREE.Vector3;
  velocity = new THREE.Vector3();
  yaw = 0;
  state: EntityState = "wander";
  alive = true;
  onGround = false;
  panicUntil = 0; // ms
  wanderTargetYaw = 0;
  wanderTimer = 0; // seconds until pick new direction
  herdId: number | null = null;
  spawnedAt: number;
  // Render — assigned by EntityManager
  mesh: THREE.Group | null = null;
  bobPhase = Math.random() * Math.PI * 2;
  lastTickAt = 0;
  // LOD tier influences update cadence
  lodTier: 0 | 1 | 2 | 3 = 0; // 0=near, 1=mid, 2=far, 3=sleep

  constructor(spec: EntitySpec, pos: THREE.Vector3, herdId: number | null = null) {
    this.id = _entityIdCounter++;
    this.spec = spec;
    this.position = pos.clone();
    this.herdId = herdId;
    this.spawnedAt = performance.now();
    this.wanderTargetYaw = Math.random() * Math.PI * 2;
    this.yaw = this.wanderTargetYaw;
  }

  /** External hit (e.g., player attacked). Triggers flee. */
  onHit(fromPos: THREE.Vector3) {
    this.state = "flee";
    this.panicUntil = performance.now() + 4000;
    // Face away from threat
    const dx = this.position.x - fromPos.x;
    const dz = this.position.z - fromPos.z;
    this.yaw = Math.atan2(dx, dz);
  }

  /** Sample heightmap at world (x,z). Returns Y of top solid block + 1. */
  groundYAt(chunkStore: ChunkStore, x: number, z: number): number {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const startY = Math.min(CHUNK_HEIGHT - 1, Math.floor(this.position.y) + 4);
    for (let y = startY; y >= 0; y--) {
      if (isSolid(chunkStore.getBlock(ix, y, iz))) return y + 1;
    }
    return 0;
  }

  collidesAt(chunkStore: ChunkStore, x: number, y: number, z: number): boolean {
    const r = this.spec.size.width;
    const h = this.spec.size.height;
    const minX = Math.floor(x - r);
    const maxX = Math.floor(x + r);
    const minZ = Math.floor(z - r);
    const maxZ = Math.floor(z + r);
    const minY = Math.floor(y);
    const maxY = Math.floor(y + h - 0.01);
    for (let bx = minX; bx <= maxX; bx++) {
      for (let by = minY; by <= maxY; by++) {
        for (let bz = minZ; bz <= maxZ; bz++) {
          if (isSolid(chunkStore.getBlock(bx, by, bz))) return true;
        }
      }
    }
    return false;
  }

  /**
   * Tick the AI + locomotion for dt seconds.
   * Designed to be called with variable dt depending on LOD tier.
   */
  update(dt: number, ctx: EntityContext) {
    if (!this.alive) return;
    const now = ctx.now;
    this.lastTickAt = now;

    // Flee timeout
    if (this.state === "flee" && now > this.panicUntil) {
      this.state = "wander";
    }

    // Panic-on-proximity check
    if (this.state !== "flee" && ctx.playerPos) {
      const dx = this.position.x - ctx.playerPos.x;
      const dz = this.position.z - ctx.playerPos.z;
      const dy = this.position.y - ctx.playerPos.y;
      const distSq = dx * dx + dz * dz + dy * dy;
      // Note: passive only flee when ATTACKED — but if player gets uncomfortably close to a flee-already entity, refresh.
      if (distSq < this.spec.fleePanicDistance * this.spec.fleePanicDistance * 0.25) {
        // close brush: small chance to bolt (skittish)
        if (Math.random() < 0.02 * dt * 60) {
          this.state = "flee";
          this.panicUntil = now + 2000;
          this.yaw = Math.atan2(dx, dz);
        }
      }
    }

    // Decide motion target
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0 && this.state !== "flee") {
      // Pick a new heading
      let target = Math.random() * Math.PI * 2;
      // Herd cohesion: pull toward herd center if outside ring
      if (ctx.herdCenter && this.spec.herdCohesion > 0) {
        const cx = ctx.herdCenter.x - this.position.x;
        const cz = ctx.herdCenter.z - this.position.z;
        const dist = Math.hypot(cx, cz);
        if (dist > this.spec.wanderRadius) {
          const toward = Math.atan2(cx, cz);
          target = target * (1 - this.spec.herdCohesion) + toward * this.spec.herdCohesion;
        }
      }
      this.wanderTargetYaw = target;
      this.wanderTimer = 1.5 + Math.random() * 3.5;
    }

    // Smoothly rotate yaw toward target
    const targetYaw = this.state === "flee" ? this.yaw : this.wanderTargetYaw;
    const yawDelta = wrapAngle(targetYaw - this.yaw);
    this.yaw += Math.sign(yawDelta) * Math.min(Math.abs(yawDelta), 2.4 * dt);

    const speed = this.state === "flee" ? this.spec.fleeSpeed : this.spec.walkSpeed;

    // Forward vector based on yaw (yaw=0 → +Z)
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    this.velocity.x = fx * speed;
    this.velocity.z = fz * speed;

    // Gravity
    this.velocity.y -= 28 * dt;
    if (this.velocity.y < -55) this.velocity.y = -55;

    // Try jump if path blocked (cheap step-up)
    if (this.onGround && Math.random() < this.spec.jumpChance * dt) {
      this.velocity.y = 6;
      this.onGround = false;
    }

    // Move X
    const nx = this.position.x + this.velocity.x * dt;
    if (!this.collidesAt(ctx.chunkStore, nx, this.position.y, this.position.z)) {
      this.position.x = nx;
    } else {
      // Try step up
      if (
        this.onGround &&
        !this.collidesAt(ctx.chunkStore, nx, this.position.y + 1, this.position.z) &&
        !this.collidesAt(ctx.chunkStore, this.position.x, this.position.y + 1, this.position.z)
      ) {
        this.position.y += 1;
        this.position.x = nx;
      } else {
        this.velocity.x = 0;
        // Pick a new direction soon
        this.wanderTimer = 0.5;
      }
    }
    // Move Z
    const nz = this.position.z + this.velocity.z * dt;
    if (!this.collidesAt(ctx.chunkStore, this.position.x, this.position.y, nz)) {
      this.position.z = nz;
    } else {
      if (
        this.onGround &&
        !this.collidesAt(ctx.chunkStore, this.position.x, this.position.y + 1, nz) &&
        !this.collidesAt(ctx.chunkStore, this.position.x, this.position.y + 1, this.position.z)
      ) {
        this.position.y += 1;
        this.position.z = nz;
      } else {
        this.velocity.z = 0;
        this.wanderTimer = 0.5;
      }
    }
    // Move Y
    const ny = this.position.y + this.velocity.y * dt;
    if (!this.collidesAt(ctx.chunkStore, this.position.x, ny, this.position.z)) {
      this.position.y = ny;
      this.onGround = false;
    } else {
      if (this.velocity.y < 0) this.onGround = true;
      this.velocity.y = 0;
    }

    // Snap to ground if we somehow are below it
    const groundY = this.groundYAt(ctx.chunkStore, this.position.x, this.position.z);
    if (this.position.y < groundY) {
      this.position.y = groundY;
      this.onGround = true;
      this.velocity.y = 0;
    }

    // Bob
    if (this.onGround && Math.hypot(this.velocity.x, this.velocity.z) > 0.5) {
      this.bobPhase += dt * 6;
    } else {
      this.bobPhase *= 0.9;
    }
  }
}

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
