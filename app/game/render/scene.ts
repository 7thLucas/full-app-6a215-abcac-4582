// Top-level scene orchestrator: owns renderer, scene, camera (via player),
// lights, sky, chunk meshes, target outline, and the per-frame update loop.
//
// Designed to be created once per game session, attached to a canvas
// container, then disposed on unmount.

import * as THREE from "three";
import { PlayerController } from "../player/player-controller";
import { createChunkStore, type ChunkStore } from "../world/chunk-store";
import { createWorldGenerator } from "../world/worldgen";
import { meshChunk, type ChunkMeshSet } from "./chunk-mesher";
import {
  AIR,
  getDef,
  isSolid,
} from "../blocks/block-registry";
import { CHUNK_HEIGHT, CHUNK_SIZE, chunkKey, BIOMES, type Biome } from "../world/world-config";
import { useGameStore } from "../state/game-store";
import { saveWorld, type SaveBlob } from "../save/save-system";

export interface SceneOptions {
  container: HTMLElement;
  seed: number;
  worldName: string;
  starterItems: boolean;
  renderDistance: number;
  dayDurationMinutes: number;
  skyColors: { day: string; sunset: string; night: string };
  initialSave: SaveBlob | null;
}

interface ChunkRenderEntry {
  cx: number;
  cz: number;
  opaqueMesh: THREE.Mesh | null;
  waterMesh: THREE.Mesh | null;
}

export class VoxelScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private container: HTMLElement;
  private hemiLight: THREE.HemisphereLight;
  private sun: THREE.DirectionalLight;
  public player: PlayerController;
  private chunkStore: ChunkStore;
  private chunkEntries = new Map<string, ChunkRenderEntry>();
  private outline: THREE.LineSegments;
  private outlineMaterial: THREE.LineBasicMaterial;
  private placePreview: THREE.LineSegments;
  private placeMaterial: THREE.LineBasicMaterial;
  private worldGroup: THREE.Group;
  private opaqueMaterial: THREE.MeshLambertMaterial;
  private waterMaterial: THREE.MeshLambertMaterial;
  private skyMaterial: THREE.ShaderMaterial;
  private skyMesh: THREE.Mesh;
  private skyColorDay: THREE.Color;
  private skyColorSunset: THREE.Color;
  private skyColorNight: THREE.Color;

  private opts: SceneOptions;
  private lastTime = 0;
  private running = false;
  private rafId = 0;
  private resizeObserver?: ResizeObserver;

  private autosaveTimer = 0;
  private storeUpdateTimer = 0;
  private dayLengthSeconds: number;

  constructor(opts: SceneOptions) {
    this.opts = opts;
    this.container = opts.container;
    this.dayLengthSeconds = Math.max(60, opts.dayDurationMinutes * 60);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87ceeb, 30, opts.renderDistance * CHUNK_SIZE * 1.6);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x87ceeb, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.style.cursor = "crosshair";
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());

    this.player = new PlayerController({ domElement: this.renderer.domElement });

    const world = createWorldGenerator(opts.seed);
    this.chunkStore = createChunkStore(world);
    if (opts.initialSave) {
      this.chunkStore.applyModifications(opts.initialSave.modifications);
    }
    this.player.attach(this.chunkStore);

    this.opaqueMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.waterMaterial = new THREE.MeshLambertMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    });

    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x665544, 0.6);
    this.scene.add(this.hemiLight);

    this.sun = new THREE.DirectionalLight(0xffffff, 1.0);
    this.sun.position.set(50, 80, 30);
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    // Sky dome shader (vertical gradient between two colors).
    this.skyColorDay = new THREE.Color(opts.skyColors.day);
    this.skyColorSunset = new THREE.Color(opts.skyColors.sunset);
    this.skyColorNight = new THREE.Color(opts.skyColors.night);

    this.skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x87ceeb) },
        bottomColor: { value: new THREE.Color(0xc4e3f2) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldPos;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos).y;
          float t = clamp(h * 0.5 + 0.5, 0.0, 1.0);
          gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
        }
      `,
    });
    const skyGeom = new THREE.SphereGeometry(400, 24, 16);
    this.skyMesh = new THREE.Mesh(skyGeom, this.skyMaterial);
    this.scene.add(this.skyMesh);

    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);

    // Outline cube for the hovered block
    const outlineGeom = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002));
    this.outlineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.7 });
    this.outline = new THREE.LineSegments(outlineGeom, this.outlineMaterial);
    this.outline.visible = false;
    this.scene.add(this.outline);

    this.placeMaterial = new THREE.LineBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.85 });
    const placeGeom = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01));
    this.placePreview = new THREE.LineSegments(placeGeom, this.placeMaterial);
    this.placePreview.visible = false;
    this.scene.add(this.placePreview);

    // Resize
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);
    this.handleResize();

    // Spawn point: find a safe surface near origin.
    if (opts.initialSave) {
      const p = opts.initialSave.playerPos;
      this.player.setSpawn(p.x, p.y, p.z, opts.initialSave.yaw, opts.initialSave.pitch);
      useGameStore.getState().setTimeOfDay(opts.initialSave.timeOfDay);
      useGameStore.getState().hydrateInventory(opts.initialSave.inventory, opts.initialSave.hotbarIndex);
      useGameStore.getState().setHp(opts.initialSave.hp);
      useGameStore.getState().setHunger(opts.initialSave.hunger);
    } else {
      const spawnY = this.findSpawnHeight(0, 0);
      this.player.setSpawn(0.5, spawnY + 1.5, 0.5, 0, 0);
      useGameStore.getState().reset({ seed: opts.seed, worldName: opts.worldName, starterItems: opts.starterItems });
    }

    // Preload chunks around player.
    this.updateChunks();
    // First mesh build.
    this.rebuildDirtyChunks();

    // Click on canvas requests pointer lock (so user can resume after Esc).
    this.renderer.domElement.addEventListener("click", () => {
      if (!useGameStore.getState().inventoryOpen) {
        this.player.requestPointerLock();
      }
    });
  }

  private findSpawnHeight(x: number, z: number): number {
    for (let y = CHUNK_HEIGHT - 2; y >= 1; y--) {
      const id = this.chunkStore.getBlock(x, y, z);
      if (isSolid(id)) return y;
    }
    return 32;
  }

  private handleResize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.player.setSize(w, h);
  }

  private updateChunks() {
    const rd = this.opts.renderDistance;
    const px = this.player.position.x;
    const pz = this.player.position.z;
    const pcx = Math.floor(px / CHUNK_SIZE);
    const pcz = Math.floor(pz / CHUNK_SIZE);

    const wanted = new Set<string>();
    for (let dx = -rd; dx <= rd; dx++) {
      for (let dz = -rd; dz <= rd; dz++) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        wanted.add(chunkKey(cx, cz));
        // Trigger generation
        this.chunkStore.getChunk(cx, cz);
        if (!this.chunkEntries.has(chunkKey(cx, cz))) {
          this.chunkEntries.set(chunkKey(cx, cz), {
            cx,
            cz,
            opaqueMesh: null,
            waterMesh: null,
          });
        }
      }
    }
    // Unload far chunks
    for (const [k, entry] of this.chunkEntries) {
      if (!wanted.has(k)) {
        if (entry.opaqueMesh) {
          this.worldGroup.remove(entry.opaqueMesh);
          (entry.opaqueMesh.geometry as THREE.BufferGeometry).dispose();
        }
        if (entry.waterMesh) {
          this.worldGroup.remove(entry.waterMesh);
          (entry.waterMesh.geometry as THREE.BufferGeometry).dispose();
        }
        this.chunkEntries.delete(k);
        this.chunkStore.unloadChunk(entry.cx, entry.cz);
      }
    }
  }

  private buildMeshFromSet(set: ChunkMeshSet["opaque"], material: THREE.Material): THREE.Mesh | null {
    if (set.indices.length === 0) return null;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(set.positions, 3));
    geom.setAttribute("normal", new THREE.BufferAttribute(set.normals, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(set.colors, 3));
    geom.setIndex(new THREE.BufferAttribute(set.indices, 1));
    geom.computeBoundingSphere();
    const mesh = new THREE.Mesh(geom, material);
    mesh.frustumCulled = true;
    return mesh;
  }

  private rebuildDirtyChunks() {
    const dirty = this.chunkStore.consumeDirty();
    if (!dirty.length) return;
    // Cap per-frame rebuilds to keep frame steady.
    const limit = Math.min(dirty.length, 6);
    for (let i = 0; i < limit; i++) {
      const [cx, cz] = dirty[i];
      const k = chunkKey(cx, cz);
      const entry = this.chunkEntries.get(k);
      if (!entry) continue;
      const chunk = this.chunkStore.getChunk(cx, cz);
      const neighbors = {
        getBlockGlobal: (wx: number, wy: number, wz: number) => this.chunkStore.getBlock(wx, wy, wz),
      };
      const meshSet = meshChunk(chunk.blocks, cx, cz, neighbors);

      if (entry.opaqueMesh) {
        this.worldGroup.remove(entry.opaqueMesh);
        (entry.opaqueMesh.geometry as THREE.BufferGeometry).dispose();
        entry.opaqueMesh = null;
      }
      if (entry.waterMesh) {
        this.worldGroup.remove(entry.waterMesh);
        (entry.waterMesh.geometry as THREE.BufferGeometry).dispose();
        entry.waterMesh = null;
      }
      const opaque = this.buildMeshFromSet(meshSet.opaque, this.opaqueMaterial);
      if (opaque) {
        opaque.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);
        this.worldGroup.add(opaque);
        entry.opaqueMesh = opaque;
      }
      const water = this.buildMeshFromSet(meshSet.water, this.waterMaterial);
      if (water) {
        water.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);
        this.worldGroup.add(water);
        entry.waterMesh = water;
      }
      chunk.dirty = false;
    }
    // Re-mark remaining dirty for next frame
    for (let i = limit; i < dirty.length; i++) {
      this.chunkStore.markDirty(dirty[i][0], dirty[i][1]);
    }
  }

  private updateSky(timeOfDay: number) {
    // Compute sun height: peaks around timeOfDay=0.5 (noon), low at midnight.
    const t = (timeOfDay + 0.75) % 1; // shift so 0=sunrise
    const sunAngle = t * Math.PI * 2;
    const sunY = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle);
    this.sun.position.set(sunX * 120, sunY * 120 + 20, 60);
    this.sun.target.position.set(this.player.position.x, this.player.position.y, this.player.position.z);

    // Sun intensity: bright midday, dim at night with a soft moon glow.
    const dayFactor = Math.max(0, Math.sin(sunAngle));
    const sunIntensity = 0.15 + dayFactor * 1.1;
    this.sun.intensity = sunIntensity;
    this.sun.color.set(0xfff1d6);

    this.hemiLight.intensity = 0.25 + dayFactor * 0.55;

    // Sky color blend: night <-> sunset <-> day driven by sun height.
    const skyTop = new THREE.Color();
    const skyBottom = new THREE.Color();
    const sunsetFactor = Math.max(0, 1 - Math.abs(dayFactor - 0.15) * 3);
    if (dayFactor > 0) {
      // mix day with sunset based on sunset proximity
      skyTop.copy(this.skyColorDay).lerp(this.skyColorSunset, sunsetFactor * 0.6);
      skyBottom.copy(skyTop).lerp(new THREE.Color(0xffffff), 0.4);
    } else {
      skyTop.copy(this.skyColorNight);
      skyBottom.copy(this.skyColorNight).lerp(new THREE.Color(0x223355), 0.4);
    }
    (this.skyMaterial.uniforms.topColor.value as THREE.Color).copy(skyTop);
    (this.skyMaterial.uniforms.bottomColor.value as THREE.Color).copy(skyBottom);
    this.renderer.setClearColor(skyTop, 1);
    if (this.scene.fog && this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(skyBottom);
    }
  }

  private handleInteractions(dt: number) {
    const state = useGameStore.getState();
    const hit = this.player.locked ? this.player.raycast() : null;

    if (hit) {
      this.outline.position.set(hit.block.x + 0.5, hit.block.y + 0.5, hit.block.z + 0.5);
      this.outline.visible = true;

      const placeX = hit.block.x + hit.normal.x;
      const placeY = hit.block.y + hit.normal.y;
      const placeZ = hit.block.z + hit.normal.z;
      this.placePreview.position.set(placeX + 0.5, placeY + 0.5, placeZ + 0.5);
      this.placePreview.visible = this.player.placingNow;
    } else {
      this.outline.visible = false;
      this.placePreview.visible = false;
    }

    // BREAK
    if (this.player.breakingNow && hit) {
      const target = hit.block;
      const def = getDef(this.chunkStore.getBlock(target.x, target.y, target.z));
      const tgtKey = `${target.x},${target.y},${target.z}`;
      const cur = this.player.breakTarget;
      const curKey = cur ? `${cur.x},${cur.y},${cur.z}` : null;
      if (curKey !== tgtKey) {
        this.player.breakTarget = { x: target.x, y: target.y, z: target.z };
        this.player.breakProgress = 0;
      }
      this.player.breakProgress += dt;
      const hardness = Math.max(0.05, def.hardness);
      // Outline darkens as progress grows
      this.outlineMaterial.opacity = 0.6 + Math.min(0.4, this.player.breakProgress / hardness * 0.4);
      if (this.player.breakProgress >= hardness) {
        const id = this.chunkStore.getBlock(target.x, target.y, target.z);
        const dropDef = getDef(id);
        this.chunkStore.setBlock(target.x, target.y, target.z, AIR);
        if (dropDef.drop != null) {
          state.addItem(dropDef.drop, 1);
          state.pushToast(`+1 ${getDef(dropDef.drop).label}`);
        }
        this.player.breakProgress = 0;
        this.player.breakTarget = null;
      }
    } else {
      this.player.breakTarget = null;
      this.player.breakProgress = 0;
      this.outlineMaterial.opacity = 0.7;
    }

    // PLACE — fire on edge (placingNow stays true while held, throttle to 0.18s)
    const now = performance.now();
    if (this.player.placingNow && hit && now - this.player.lastPlaceAt > 180) {
      const selected = state.inventory[state.hotbarIndex];
      if (selected.id && selected.count > 0) {
        const px = hit.block.x + hit.normal.x;
        const py = hit.block.y + hit.normal.y;
        const pz = hit.block.z + hit.normal.z;
        // Don't place inside the player
        const ppx = this.player.position.x;
        const ppy = this.player.position.y;
        const ppz = this.player.position.z;
        const minX = Math.floor(ppx - 0.4);
        const maxX = Math.floor(ppx + 0.4);
        const minZ = Math.floor(ppz - 0.4);
        const maxZ = Math.floor(ppz + 0.4);
        const minY = Math.floor(ppy - 0.9);
        const maxY = Math.floor(ppy + 0.9);
        const intersects = px >= minX && px <= maxX && pz >= minZ && pz <= maxZ && py >= minY && py <= maxY;
        if (!intersects && py >= 0 && py < CHUNK_HEIGHT) {
          const existing = this.chunkStore.getBlock(px, py, pz);
          if (existing === AIR) {
            this.chunkStore.setBlock(px, py, pz, selected.id);
            state.removeFromSelected(1);
            this.player.lastPlaceAt = now;
          }
        }
      }
    }
  }

  /** Sync HUD-relevant info (player pos, biome, time) into the store at ~5Hz. */
  private syncStore(dt: number) {
    this.storeUpdateTimer += dt;
    if (this.storeUpdateTimer < 0.2) return;
    this.storeUpdateTimer = 0;
    const px = this.player.position.x;
    const py = this.player.position.y;
    const pz = this.player.position.z;
    const biome = this.getBiomeAt(px, pz);
    useGameStore.getState().setPlayerSnapshot(
      { x: Math.round(px * 10) / 10, y: Math.round(py * 10) / 10, z: Math.round(pz * 10) / 10 },
      biome,
    );
  }

  private getBiomeAt(_x: number, _z: number): Biome {
    // Cheap-ish biome readout via worldgen.
    // Kept as a function for future swap-out.
    return (this.opts.seed % 5 === 0 ? BIOMES.PLAINS : BIOMES.PLAINS) as Biome;
  }

  private maybeAutosave(dt: number) {
    this.autosaveTimer += dt;
    if (this.autosaveTimer < 25) return; // every 25s
    this.autosaveTimer = 0;
    this.saveNow();
  }

  saveNow(): boolean {
    const s = useGameStore.getState();
    const blob: SaveBlob = {
      version: 1,
      worldName: this.opts.worldName,
      seed: this.opts.seed,
      playerPos: { x: this.player.position.x, y: this.player.position.y, z: this.player.position.z },
      yaw: this.player.yaw,
      pitch: this.player.pitch,
      hp: s.hp,
      hunger: s.hunger,
      timeOfDay: s.timeOfDay,
      hotbarIndex: s.hotbarIndex,
      inventory: s.inventory.map((slot) => ({ id: slot.id, count: slot.count })),
      modifications: this.chunkStore.collectModifications(),
      savedAt: Date.now(),
    };
    const ok = saveWorld(blob);
    if (ok) s.pushToast("World saved");
    return ok;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const loop = () => {
      if (!this.running) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.tick(dt);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private tick(dt: number) {
    const store = useGameStore.getState();

    // Advance day/night
    if (!store.paused) {
      const next = store.timeOfDay + dt / this.dayLengthSeconds;
      store.setTimeOfDay(next);
    }
    this.updateSky(store.timeOfDay);

    // Player + interactions (still update so gravity settles even when paused).
    this.player.update(dt);
    if (!store.paused) {
      this.handleInteractions(dt);
    } else {
      this.outline.visible = false;
      this.placePreview.visible = false;
    }

    // Chunk loading & meshing
    this.updateChunks();
    this.rebuildDirtyChunks();

    // Sync store
    this.syncStore(dt);
    if (!store.paused) this.maybeAutosave(dt);

    // Render
    this.renderer.render(this.scene, this.player.camera);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  dispose() {
    this.stop();
    this.player.dispose();
    this.resizeObserver?.disconnect();
    for (const entry of this.chunkEntries.values()) {
      if (entry.opaqueMesh) (entry.opaqueMesh.geometry as THREE.BufferGeometry).dispose();
      if (entry.waterMesh) (entry.waterMesh.geometry as THREE.BufferGeometry).dispose();
    }
    this.opaqueMaterial.dispose();
    this.waterMaterial.dispose();
    this.skyMaterial.dispose();
    this.outlineMaterial.dispose();
    this.placeMaterial.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
