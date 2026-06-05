// CreatureRegistry — locked-default specs for all named wildlife.
// Plus the biome roster + herd-size table. EntityManager queries this to spawn.

import type { EntitySpec } from "./base-entity";
import { BIOMES, type Biome } from "../world/world-config";

export type CreatureKind = "sheep" | "cow" | "chicken" | "rabbit" | "sheep_snow";

export const CREATURE_SPECS: Record<CreatureKind, EntitySpec> = {
  sheep: {
    kind: "sheep",
    label: "Sheep",
    bodyColor: "#F2EEE6",
    headColor: "#E5DBC9",
    size: { width: 0.5, height: 1.1 },
    walkSpeed: 1.6,
    fleeSpeed: 4.2,
    herdRadius: 10,
    herdCohesion: 0.45,
    fleePanicDistance: 8,
    wanderRadius: 6,
    jumpChance: 0.05,
  },
  sheep_snow: {
    kind: "sheep_snow",
    label: "Snow Sheep",
    bodyColor: "#FFFFFF",
    headColor: "#F5F7FA",
    size: { width: 0.5, height: 1.1 },
    walkSpeed: 1.6,
    fleeSpeed: 4.2,
    herdRadius: 10,
    herdCohesion: 0.45,
    fleePanicDistance: 8,
    wanderRadius: 6,
    jumpChance: 0.05,
    variantTint: "#E8F0FA",
  },
  cow: {
    kind: "cow",
    label: "Cow",
    bodyColor: "#3C2A1E",
    headColor: "#FFFFFF",
    size: { width: 0.55, height: 1.3 },
    walkSpeed: 1.4,
    fleeSpeed: 3.6,
    herdRadius: 10,
    herdCohesion: 0.5,
    fleePanicDistance: 8,
    wanderRadius: 5,
    jumpChance: 0.03,
  },
  chicken: {
    kind: "chicken",
    label: "Chicken",
    bodyColor: "#F8F8F2",
    headColor: "#E84A4A",
    size: { width: 0.3, height: 0.7 },
    walkSpeed: 2.0,
    fleeSpeed: 4.6,
    herdRadius: 8,
    herdCohesion: 0.3,
    fleePanicDistance: 8,
    wanderRadius: 6,
    jumpChance: 0.15,
  },
  rabbit: {
    kind: "rabbit",
    label: "Rabbit",
    bodyColor: "#B8A082",
    headColor: "#9C8568",
    size: { width: 0.25, height: 0.5 },
    walkSpeed: 2.5,
    fleeSpeed: 5.4,
    herdRadius: 6,
    herdCohesion: 0.2,
    fleePanicDistance: 8,
    wanderRadius: 8,
    jumpChance: 0.2,
  },
};

export interface BiomeRosterEntry {
  kind: CreatureKind;
  herdMin: number;
  herdMax: number;
  weight: number;
  sparse?: boolean;
}

export const BIOME_ROSTER: Record<Biome, BiomeRosterEntry[]> = {
  [BIOMES.PLAINS]: [
    { kind: "sheep", herdMin: 3, herdMax: 8, weight: 1.0 },
    { kind: "cow", herdMin: 3, herdMax: 6, weight: 0.9 },
    { kind: "chicken", herdMin: 3, herdMax: 5, weight: 0.7 },
  ],
  [BIOMES.FOREST]: [
    { kind: "cow", herdMin: 3, herdMax: 6, weight: 0.8 },
    { kind: "chicken", herdMin: 3, herdMax: 5, weight: 0.8 },
    { kind: "rabbit", herdMin: 2, herdMax: 4, weight: 0.7 },
  ],
  [BIOMES.DESERT]: [
    { kind: "rabbit", herdMin: 1, herdMax: 2, weight: 0.4, sparse: true },
  ],
  [BIOMES.SNOW]: [
    { kind: "sheep_snow", herdMin: 3, herdMax: 6, weight: 0.7 },
    { kind: "rabbit", herdMin: 2, herdMax: 3, weight: 0.5 },
  ],
  [BIOMES.MOUNTAINS]: [
    { kind: "sheep", herdMin: 2, herdMax: 4, weight: 0.4, sparse: true },
  ],
};

export function getCreatureSpec(kind: CreatureKind): EntitySpec {
  return CREATURE_SPECS[kind];
}
