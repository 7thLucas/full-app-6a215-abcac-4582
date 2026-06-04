# VoxelVerse — Product Memory

## Product
VoxelVerse is a browser-native 3D voxel sandbox game. Players spawn into a procedurally generated blocky world they can mine, shape, build in, and explore — all inside a single browser tab, no install, no launcher.

## Users
- **Primary:** Casual creative players (16-35) who grew up on Minecraft / Roblox and want a "just click and play" sandbox without installing anything.
- **Secondary:** Streamers, screenshot artists, and lo-fi gamers who care about cozy aesthetics — sunset shots, peaceful nights, slow exploration.
- **Tertiary:** Devs/tinkerers curious about WebGL voxel rendering and modular game architecture.

## Brand
- **Name:** VoxelVerse
- **Vibe:** Cozy, low-stakes, screenshot-worthy. Think Stardew-meets-Minecraft in the browser.
- **Voice:** Warm, playful, minimal. Never sweaty. Never "hardcore gamer."
- **Promise:** Open a tab, mine a tree, build a hut, watch the sun set. That's the whole pitch.

## Tone
- Friendly, calm, slightly whimsical.
- Microcopy reads like a friend handing you a shovel, not a tutorial wizard.
- No fear-mongering. Night is peaceful, not horror.

## Anti-references (what VoxelVerse is NOT)
- Not a survival horror voxel game (no scary monsters, no jump scares).
- Not a hyper-competitive PvP arena.
- Not a downloadable desktop client. Browser-native is the entire point.
- Not a single-monolith game file. Architecture is explicitly modular.
- Not Roblox-style UGC platform. It's one curated game.

## Strategic Principles
1. **Browser-first, always.** If it doesn't run smoothly in a Chrome tab on a mid-range laptop, it doesn't ship.
2. **Modular architecture.** Player controller, world gen, block registry, chunk system, inventory, crafting, UI, save/load, game state, rendering — each in its own area. No god-files.
3. **Performance is a feature.** Greedy meshing, chunked loading, frustum culling — these are MVP-gate, not "later."
4. **Cozy over hardcore.** Every design decision biases toward "this feels nice at sunset" over "this is technically optimal for speedrunners."
5. **Save what matters.** Persist modified chunks only (LocalStorage/IndexedDB), regenerate the rest from seed.
6. **Feel > features.** Smooth camera, satisfying break/place feedback, juicy hotbar swap — before any deep crafting tree.

## MVP Scope
- First-person controller: WASD + mouse look + jump (space) + sprint (shift).
- Procedural chunk-based voxel terrain (Simplex noise + greedy meshing).
- Block break (left-click, hardness-based timing).
- Block place (right-click, grid-snapped to face).
- 9-slot hotbar (scroll wheel + number keys 1-9).
- Inventory grid (E to open).
- Basic resource collection (broken blocks drop into inventory).
- Day-night cycle (~10 min real-time, sky color transitions).
- Save/load (LocalStorage or IndexedDB, only modified chunks).
- Clean minimal UI: crosshair, HP bar, hunger bar.

## Block Roster (MVP)
Grass, Dirt, Stone, Sand, Snow, Water, Wood log, Leaves, Wood plank, Cobblestone, Glass, Torch, Crafting table, Furnace (placeholder).

## Biomes (MVP)
Five biomes via temperature × moisture: Plains, Forest, Desert, Snow, Mountains.


#CORE TRUTH:
# VoxelVerse — Product Memory

## What it is
Browser-native 3D voxel sandbox game. Minecraft-inspired but cleaner, indie-modern, beginner-friendly. Runs in a browser tab. First-person open world. Cozy and creative, never hardcore.

## Problem
There's no cozy, modern, browser-native voxel sandbox today. Minecraft is the closest reference but feels dated, costs money, requires installation, and was never built for the browser. VoxelVerse fills that gap — a polished, beginner-friendly indie voxel sandbox that runs in a tab, with the full creative-survival loop (explore, mine, gather, craft, build) and a cozy non-hardcore atmosphere that invites players to stop and admire the world.

## Audience
Browser-first laptop/desktop players, roughly 13–35, who want cozy-creative voxel building without install friction or hardcore-survival pressure. Likely Minecraft-fatigued or never invested — the kind of player who opens a tab on a coffee break and stays for an hour building a tower. Cares about feel, polish, atmosphere, and losing track of time in a beautiful world. Design-curious, screenshot-happy, comfortable with WASD + mouse but not looking for a hardcore survival grind.

## Day-One P0 (the irreducible loop)
Step into a procedurally generated cube world in first-person, walk with WASD + mouse, left-click to break a block, right-click to place one, and feel the cube grid respond instantly. Items 1–4 of the MVP list (first-person movement + procedural terrain + block break + block place) compressed into one unbroken moment-to-moment loop. Everything else (hotbar/inventory UX, day-night cycle, save/load, ecosystem, crafting depth, logic systems, automation) hangs off this. If only this ships on day one, VoxelVerse still feels like VoxelVerse. If this isn't smooth and satisfying, nothing else matters.

## MVP scope (v1)
1. First-person movement (WASD + mouse look, spacebar jump, shift sprint, smooth camera)
2. Procedural voxel terrain (chunk-based, seed-deterministic)
3. Block break (left-click, hardness-based progress)
4. Block place (right-click, grid-snap, preview)
5. Hotbar (9 slots, scroll wheel + number keys)
6. Inventory (E key, stackable, drag-rearrange)
7. Basic resource collection (drops on break, auto-into-inventory)
8. Day-night cycle (~10 real-min full day, sky color + lighting transitions)
9. Save / load (LocalStorage or IndexedDB, only modified chunks)
10. Clean UI (crosshair, hearts, hunger, hotbar — no clutter)

## Tech direction
React + TypeScript + Three.js + React Three Fiber + Zustand.
Chunk-based architecture, 16-wide chunks, greedy meshing for perf (key gate for browser voxel).
Modular systems: Player controller / World gen / Block registry / Chunk system / Inventory / Crafting / UI / Save-load / Game state / Rendering — never one giant file.

## Worldgen direction
Simplex noise (Perlin fallback). Continental + elevation + detail noise layers. Sea level Y=32. Five MVP biomes (Plains, Forest, Desert, Snow, Mountains) selected via Whittaker-style temperature × moisture with smooth blending — no hard transitions. Trees: Oak, Large Oak (rare landmark), Pine (snow). Lakes with rounded shorelines, rivers that snake, beaches 3–12 wide. Caves via 3D noise. Ore tiers Coal / Iron / Gold / Diamond at typed Y-ranges.

## Block roster (MVP)
Natural: Grass, Dirt, Stone, Sand, Snow, Water, Wood log, Leaves.
Building: Wood plank, Cobblestone, Glass, Torch.
Utility: Crafting table, Furnace (placeholder).
Every block: unique id, texture/color, hardness, solidity, drop rule, placeability.

## Survival systems (light)
Health 100 HP, hunger 100, optional stamina for sprint. Fall damage. Slow health regen when fed. Cozy, not punishing.

## Spawn rules
Plains or Forest biome preferred. Solid ground, open sky, above water, not on cliffs. Debug starter items (10 Dirt / 10 Wood Planks / 1 Wood Pickaxe) toggle-able.

## Feel rules
Cozy. Relaxing. Screenshot-worthy at sunset. Golden hour matters. Night is peaceful, not horror — moonlight provides visibility. Wind, trees, water, lighting variety make the world feel alive without NPCs.
Avoid: realistic graphics, complex controls, dark night, cluttered UI, pay-to-win.

## Phase 2 — Ecosystem & Mobs (banked, post-MVP)
- Passive layer: Sheep / Cow / Chicken / Rabbit. Herd-based (3–8). Day-active. Drop meat / wool / leather / eggs / feathers.
- Neutral: Wolf, Deer.
- Hostile (night-only or dark caves): Zombie (20-block detect, 1.5 attack, 10 dmg, 40 HP), Skeleton (ranged arrows, 20-block range), Spider (fast, 8 dmg, 30 HP). Max 20 nearby hostiles.
- Ambient atmosphere: Butterflies (near flowers, day), Birds, Fireflies (night glow), Fish (lakes).
- Distance-based update LOD: Near 60fps / Medium 10fps / Far 1fps / Very far sleep.
- Spawn radius 24–96 blocks, despawn 128. Never spawn in player vision.
- Sunrise = hostiles despawn, animals wake. Sunset reverses.
- Lightweight pathfinding (avoid walls/cliffs/water). Stylized cute animations, spatial audio.
- Hooks for future: taming, pets, mounts, villagers, traders, raids, bosses.

## Phase 3 — Advanced Building & Progression (banked, long-tail)
- Block categories: Basic / Decorative (stone bricks, polished stone, wood panels, glass variants, colored, tile) / Structural (stairs, slabs, half-blocks, pillars, beams, roofs, corners) / Utility / Logic / Storage.
- Rotation: press R before placement.
- Blueprint system: select area, save structure, preview, place later. Copy/paste in creative. Undo last 100 actions.
- Storage: Chest 27 / Large Chest 54 / Barrel 18. Sort (alpha / qty / category / recent), filter, shift-click quick transfer.
- Farming: Wheat / Carrot / Potato / Pumpkin / Sugarcane. Hoe → farmland. Crop stages (seed → harvest). Light + water + time. Irrigation radius 4.
- Animal breeding (future): feed → offspring. Cow milk, chicken egg, sheep wool.
- Cooking: raw → cooked (higher hunger + regen). Furnace = input + fuel (wood/coal/charcoal) + output. Smelting: iron ore → ingot, gold ore → ingot, raw meat → cooked.
- Workbench tiers: Basic → Advanced → Industrial.
- Resource tiers: Wood → Stone → Iron → Gold → Diamond → future rare.
- Logic system (Redstone-inspired, simplified): Power source / Wire (15-block default range) / Switch / Button / Pressure plate / Lamp / Door / Repeater (extends signal).
- Automation hooks: auto-farm harvest, item transport (belts/pipes/conveyors), auto-sorting.
- Production chains (e.g. Farm → Wheat → Mill → Flour → Bakery → Bread).
- Soft goals + achievements (First Block, First Tool, First House, First Diamond).
- Player archetypes the system rewards: Builder / Explorer / Farmer / Engineer / Collector.

## Save system (full)
Persist: world seed (deterministic regen) / only modified chunks (never full world) / player position + inventory / storage contents / farm states / logic networks / progression flags.

## Future expansion hooks
Villages, NPCs, economy, trading, rail systems, vehicles, airships, magic, tech trees, multiplayer collab.

## Success criteria (MVP ship gate)
Player loads into world → moves smoothly → breaks blocks → collects items → places blocks → builds a simple house → opens inventory → saves → returns later and continues. If that 8-step loop is buttery in the browser, day one is a win.