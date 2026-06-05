// Cheap "blocky" creature meshes — a body box + head box + 4 legs.
// All instances of the same kind reuse the same geometries via a small cache;
// materials are per-instance because variants may tint differently.

import * as THREE from "three";
import type { EntitySpec } from "./base-entity";

interface CachedGeoms {
  body: THREE.BoxGeometry;
  head: THREE.BoxGeometry;
  leg: THREE.BoxGeometry;
}

const geomCache = new Map<string, CachedGeoms>();

function geomKey(spec: EntitySpec): string {
  return `${spec.kind}:${spec.size.width.toFixed(2)}:${spec.size.height.toFixed(2)}`;
}

function getGeoms(spec: EntitySpec): CachedGeoms {
  const k = geomKey(spec);
  const cached = geomCache.get(k);
  if (cached) return cached;
  const bw = spec.size.width * 1.6;
  const bh = spec.size.height * 0.5;
  const bd = spec.size.width * 2.2;
  const body = new THREE.BoxGeometry(bw, bh, bd);
  const head = new THREE.BoxGeometry(bw * 0.7, bh * 0.85, bd * 0.45);
  const leg = new THREE.BoxGeometry(spec.size.width * 0.35, spec.size.height * 0.45, spec.size.width * 0.35);
  const out: CachedGeoms = { body, head, leg };
  geomCache.set(k, out);
  return out;
}

export interface CreatureRig {
  group: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  legs: THREE.Mesh[];
}

export function buildCreatureRig(spec: EntitySpec): CreatureRig {
  const { body: bodyGeom, head: headGeom, leg: legGeom } = getGeoms(spec);
  const tint = spec.variantTint ?? null;
  const bodyColor = new THREE.Color(spec.bodyColor);
  if (tint) bodyColor.lerp(new THREE.Color(tint), 0.5);
  const headColor = new THREE.Color(spec.headColor ?? spec.bodyColor);

  const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
  const headMat = new THREE.MeshLambertMaterial({ color: headColor });
  const legMat = new THREE.MeshLambertMaterial({ color: bodyColor.clone().multiplyScalar(0.75) });

  const group = new THREE.Group();
  const bh = spec.size.height * 0.5;

  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.position.y = bh * 0.5 + spec.size.height * 0.45; // sit on legs
  group.add(body);

  const head = new THREE.Mesh(headGeom, headMat);
  head.position.set(0, body.position.y + bh * 0.3, spec.size.width * 1.1);
  group.add(head);

  const legs: THREE.Mesh[] = [];
  const lx = spec.size.width * 0.55;
  const lz = spec.size.width * 0.85;
  const legY = spec.size.height * 0.22;
  for (const [sx, sz] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]) {
    const leg = new THREE.Mesh(legGeom, legMat);
    leg.position.set(sx * lx, legY, sz * lz);
    group.add(leg);
    legs.push(leg);
  }

  return { group, body, head, legs };
}

export function disposeRig(rig: CreatureRig) {
  rig.group.parent?.remove(rig.group);
  (rig.body.material as THREE.Material).dispose();
  (rig.head.material as THREE.Material).dispose();
  if (rig.legs[0]) (rig.legs[0].material as THREE.Material).dispose();
}

export function animateRig(rig: CreatureRig, bobPhase: number) {
  const swing = Math.sin(bobPhase) * 0.5;
  if (rig.legs.length >= 4) {
    rig.legs[0].rotation.x = swing;
    rig.legs[3].rotation.x = swing;
    rig.legs[1].rotation.x = -swing;
    rig.legs[2].rotation.x = -swing;
  }
  rig.head.rotation.y = Math.sin(bobPhase * 0.3) * 0.15;
}
