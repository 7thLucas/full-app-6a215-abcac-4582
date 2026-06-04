// First-person player controller.
// Owns: camera, velocity, ground-check, raycast for break/place, pointer lock.
// All real-time state lives here (not Zustand) to avoid React rerenders per frame.

import * as THREE from "three";
import type { ChunkStore } from "../world/chunk-store";
import { AIR, isSolid, type BlockId } from "../blocks/block-registry";
import { CHUNK_HEIGHT } from "../world/world-config";

export interface PlayerConfig {
  domElement: HTMLElement;
}

export interface RayHit {
  block: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
  distance: number;
}

const PLAYER_HEIGHT = 1.8;
const PLAYER_EYE = 1.62;
const PLAYER_RADIUS = 0.32;
const GRAVITY = 28;
const JUMP_SPEED = 8.4;
const WALK_SPEED = 4.3;
const SPRINT_SPEED = 6.7;
const REACH = 5.5;

export class PlayerController {
  public camera: THREE.PerspectiveCamera;
  public yaw = 0;
  public pitch = 0;
  public position = new THREE.Vector3(0, 50, 0);
  public velocity = new THREE.Vector3();
  public onGround = false;
  public sprinting = false;
  public locked = false;

  private keys = new Set<string>();
  private chunkStore: ChunkStore | null = null;
  private dom: HTMLElement;

  // Break progress tracking
  public breakTarget: { x: number; y: number; z: number } | null = null;
  public breakProgress = 0;
  public breakingNow = false;
  public placingNow = false;
  public lastPlaceAt = 0;

  // Bobbing
  private bobPhase = 0;

  constructor(cfg: PlayerConfig) {
    this.dom = cfg.domElement;
    this.camera = new THREE.PerspectiveCamera(72, 1, 0.1, 600);
    this.camera.position.copy(this.position);
    this.bindEvents();
  }

  attach(chunkStore: ChunkStore) {
    this.chunkStore = chunkStore;
  }

  setSpawn(x: number, y: number, z: number, yaw = 0, pitch = 0) {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = pitch;
  }

  requestPointerLock() {
    if (typeof document === "undefined") return;
    if (document.pointerLockElement !== this.dom) {
      this.dom.requestPointerLock?.();
    }
  }

  exitPointerLock() {
    if (typeof document === "undefined") return;
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }

  setSize(width: number, height: number) {
    this.camera.aspect = Math.max(0.1, width / Math.max(1, height));
    this.camera.updateProjectionMatrix();
  }

  private bindEvents() {
    if (typeof window === "undefined") return;
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mouseup", this._onMouseUp);
    document.addEventListener("pointerlockchange", this._onPointerLockChange);
  }

  dispose() {
    if (typeof window === "undefined") return;
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("mousemove", this._onMouseMove);
    window.removeEventListener("mousedown", this._onMouseDown);
    window.removeEventListener("mouseup", this._onMouseUp);
    document.removeEventListener("pointerlockchange", this._onPointerLockChange);
  }

  private _onKeyDown(e: KeyboardEvent) {
    if (!this.locked) return;
    this.keys.add(e.code);
    if (e.code === "Space") e.preventDefault();
  }
  private _onKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.code);
  }
  private _onMouseMove(e: MouseEvent) {
    if (!this.locked) return;
    const sensitivity = 0.0022;
    this.yaw -= e.movementX * sensitivity;
    this.pitch -= e.movementY * sensitivity;
    const limit = Math.PI / 2 - 0.01;
    if (this.pitch > limit) this.pitch = limit;
    if (this.pitch < -limit) this.pitch = -limit;
  }
  private _onMouseDown(e: MouseEvent) {
    if (!this.locked) return;
    if (e.button === 0) this.breakingNow = true;
    if (e.button === 2) this.placingNow = true;
  }
  private _onMouseUp(e: MouseEvent) {
    if (e.button === 0) {
      this.breakingNow = false;
      this.breakTarget = null;
      this.breakProgress = 0;
    }
    if (e.button === 2) this.placingNow = false;
  }
  private _onPointerLockChange() {
    this.locked = document.pointerLockElement === this.dom;
    if (!this.locked) {
      this.keys.clear();
      this.breakingNow = false;
      this.placingNow = false;
    }
  }

  isKey(code: string) {
    return this.keys.has(code);
  }

  /** DDA voxel raycast. Returns the first solid block hit within REACH. */
  raycast(): RayHit | null {
    if (!this.chunkStore) return null;
    // origin = camera, direction from yaw/pitch
    const ox = this.position.x;
    const oy = this.position.y + PLAYER_EYE - PLAYER_HEIGHT / 2 + PLAYER_HEIGHT / 2;
    const oz = this.position.z;
    const dx = -Math.sin(this.yaw) * Math.cos(this.pitch);
    const dy = Math.sin(this.pitch);
    const dz = -Math.cos(this.yaw) * Math.cos(this.pitch);

    let x = Math.floor(ox);
    let y = Math.floor(oy);
    let z = Math.floor(oz);

    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;
    const stepZ = dz > 0 ? 1 : -1;

    const tDeltaX = Math.abs(1 / (dx || 1e-9));
    const tDeltaY = Math.abs(1 / (dy || 1e-9));
    const tDeltaZ = Math.abs(1 / (dz || 1e-9));

    const fracX = dx > 0 ? 1 - (ox - Math.floor(ox)) : ox - Math.floor(ox);
    const fracY = dy > 0 ? 1 - (oy - Math.floor(oy)) : oy - Math.floor(oy);
    const fracZ = dz > 0 ? 1 - (oz - Math.floor(oz)) : oz - Math.floor(oz);

    let tMaxX = fracX * tDeltaX;
    let tMaxY = fracY * tDeltaY;
    let tMaxZ = fracZ * tDeltaZ;

    let t = 0;
    let stepped: "x" | "y" | "z" = "x";
    while (t <= REACH) {
      if (y >= 0 && y < CHUNK_HEIGHT) {
        const id = this.chunkStore.getBlock(x, y, z);
        if (isSolid(id)) {
          const normal = { x: 0, y: 0, z: 0 };
          if (stepped === "x") normal.x = -stepX;
          else if (stepped === "y") normal.y = -stepY;
          else normal.z = -stepZ;
          return {
            block: { x, y, z },
            normal,
            distance: t,
          };
        }
      }
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        x += stepX;
        t = tMaxX;
        tMaxX += tDeltaX;
        stepped = "x";
      } else if (tMaxY < tMaxZ) {
        y += stepY;
        t = tMaxY;
        tMaxY += tDeltaY;
        stepped = "y";
      } else {
        z += stepZ;
        t = tMaxZ;
        tMaxZ += tDeltaZ;
        stepped = "z";
      }
    }
    return null;
  }

  private collidesAt(px: number, py: number, pz: number): boolean {
    if (!this.chunkStore) return false;
    // Player AABB: radius x [py - PLAYER_HEIGHT/2, py + PLAYER_HEIGHT/2]
    const minX = Math.floor(px - PLAYER_RADIUS);
    const maxX = Math.floor(px + PLAYER_RADIUS);
    const minZ = Math.floor(pz - PLAYER_RADIUS);
    const maxZ = Math.floor(pz + PLAYER_RADIUS);
    const minY = Math.floor(py - PLAYER_HEIGHT / 2);
    const maxY = Math.floor(py + PLAYER_HEIGHT / 2 - 0.01);
    for (let bx = minX; bx <= maxX; bx++) {
      for (let by = minY; by <= maxY; by++) {
        for (let bz = minZ; bz <= maxZ; bz++) {
          if (isSolid(this.chunkStore.getBlock(bx, by, bz))) return true;
        }
      }
    }
    return false;
  }

  update(dt: number): { bob: number } {
    if (!this.locked) {
      // Slow gravity even when not locked so the player rests on the ground.
      this.velocity.x = 0;
      this.velocity.z = 0;
    } else {
      const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

      const wish = new THREE.Vector3();
      if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) wish.add(forward);
      if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) wish.sub(forward);
      if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) wish.add(right);
      if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) wish.sub(right);
      if (wish.lengthSq() > 0) wish.normalize();
      this.sprinting = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
      const speed = this.sprinting ? SPRINT_SPEED : WALK_SPEED;
      this.velocity.x = wish.x * speed;
      this.velocity.z = wish.z * speed;
      if (this.onGround && this.keys.has("Space")) {
        this.velocity.y = JUMP_SPEED;
        this.onGround = false;
      }
    }

    // Apply gravity
    this.velocity.y -= GRAVITY * dt;
    if (this.velocity.y < -55) this.velocity.y = -55;

    // X axis
    let nx = this.position.x + this.velocity.x * dt;
    if (this.collidesAt(nx, this.position.y, this.position.z)) {
      nx = this.position.x;
      this.velocity.x = 0;
    }
    this.position.x = nx;
    // Z axis
    let nz = this.position.z + this.velocity.z * dt;
    if (this.collidesAt(this.position.x, this.position.y, nz)) {
      nz = this.position.z;
      this.velocity.z = 0;
    }
    this.position.z = nz;
    // Y axis
    let ny = this.position.y + this.velocity.y * dt;
    if (this.collidesAt(this.position.x, ny, this.position.z)) {
      if (this.velocity.y < 0) {
        this.onGround = true;
      }
      ny = this.position.y;
      this.velocity.y = 0;
    } else {
      this.onGround = false;
    }
    this.position.y = ny;

    // Bobbing while walking on ground.
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.onGround && horizontalSpeed > 0.5) {
      this.bobPhase += dt * (this.sprinting ? 10 : 7.5);
    } else {
      this.bobPhase *= 0.8;
    }
    const bob = Math.sin(this.bobPhase) * 0.04;

    // Camera follows
    this.camera.position.set(this.position.x, this.position.y + PLAYER_EYE - PLAYER_HEIGHT / 2 + bob, this.position.z);
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(this.pitch, this.yaw, 0);

    return { bob };
  }

}
