# VoxelVerse — Design Guidelines

## Design Philosophy
Cozy, screenshot-worthy, low-friction. UI gets out of the way so the world is the hero. Think "Stardew Valley meets Minecraft, rendered in your browser tab."

## Color System
- **Sky (Day):** `#87CEEB` (warm sky blue) → transitions through warm sunset `#FF8C61` / `#FFD27D` → night `#0B1B3A` (deep peaceful navy, never pitch black).
- **Foliage/Plains:** Grass green `#6BBF59`, leaves `#4B8B3B`.
- **Earth tones:** Dirt `#7B5A3A`, Stone `#8C8C8C`, Sand `#E8D69A`, Snow `#F5F7FA`.
- **UI surface (overlays):** Soft charcoal `rgba(20, 22, 28, 0.72)` with backdrop blur.
- **UI accent:** Warm amber `#FFB347` for selected hotbar slot, action confirmations.
- **UI text:** `#F5F5F0` (warm off-white) on dark surfaces, `#1A1A1A` on light.
- **Danger/HP:** `#E5484D` (HP loss). **Hunger:** `#D4A437` (warm honey).

## Typography
- **Display / titles:** "Press Start 2P" or similar chunky pixel font, used sparingly (logo, big moments only).
- **UI body:** Inter or system-ui, 14-16px. Clean, readable, not pixelated everywhere.
- **HUD numbers (HP/hunger/coords):** Tabular-nums Inter, 13px.
- **Hierarchy:** Title 24px / Section 18px / Body 15px / HUD 13px. Generous line-height (1.4+).

## Elevation & Surfaces
- **In-world HUD:** No background, just text-shadow `0 1px 2px rgba(0,0,0,0.6)` so it reads on any sky.
- **Hotbar:** Floating row, 56px slots, `rgba(20,22,28,0.72)` bg, 4px border-radius, selected slot has amber outline `2px solid #FFB347` + slight scale 1.05.
- **Inventory modal:** Centered card, max-width 720px, `rgba(20,22,28,0.85)` + 16px backdrop-blur, 12px radius, 24px padding, soft shadow `0 20px 60px rgba(0,0,0,0.4)`.
- **Crosshair:** Tiny `+` 16x16 white with 1px black outline, centered.

## Components
- **Buttons:** 40px height, 12px radius, amber primary `#FFB347` with `#1A1A1A` text, ghost secondary (transparent + 1px border `rgba(255,255,255,0.2)`). Subtle hover lift `translateY(-1px)`.
- **Hotbar slot:** 56x56px, item icon centered, count badge bottom-right (12px, tabular-nums).
- **Inventory slot:** 48x48px, 9-column grid, 4px gap.
- **Block icon:** Rendered as small isometric voxel preview (or flat color tile in MVP fallback).
- **Toasts / pickup notifications:** Bottom-center, slide-up, auto-dismiss 2s, `rgba(20,22,28,0.85)` bg, amber left-border 3px.

## Motion
- **Hotbar swap:** 120ms ease-out scale + outline fade.
- **Inventory open/close:** 180ms ease-out, opacity + slight scale 0.96 → 1.
- **Block break feedback:** Crack overlay progresses through 4 stages, tiny screen-shake 80ms on completion.
- **Block place feedback:** 100ms subtle scale-in on placed block.
- **Day/night sky transition:** Continuous lerp over real-time cycle, never abrupt.
- **Camera:** Smooth pointer-lock, no acceleration spikes. Bobbing optional and subtle (≤2px).

## Iconography
- Lucide for UI chrome (settings, close, inventory).
- Custom voxel block previews for blocks.
- Crosshair is hand-drawn `+` not an icon font.

## Accessibility
- All HUD text passes 4.5:1 contrast against worst-case sky (use text-shadow as fallback).
- Pointer-lock has an obvious escape (Esc) hinted on first session.
- Key rebinds noted in settings (post-MVP, but reserve UI space).
- Reduced-motion: skip screen-shake, skip bobbing, instant day/night swap on toggle.

## Apple HIG-aligned principles applied to browser game UI
- **Clarity:** Crosshair, hotbar, and HP/hunger are unambiguous and always-visible.
- **Deference:** UI is translucent and minimal so the 3D world stays primary.
- **Depth:** Backdrop blur + soft shadows establish HUD layer above world without occluding it.

## Landing / Pre-game Screen
- Full-bleed hero showing a sunset voxel landscape screenshot (or live spinning camera).
- Center: VoxelVerse wordmark (pixel display font), one-line tagline ("Open a tab. Build a world."), single amber CTA "Play" (40px, full-radius).
- Bottom-right: tiny version tag + "WASD to move, E for inventory" hint.
- No signup, no friction. Click Play → pointer-lock → in world.
