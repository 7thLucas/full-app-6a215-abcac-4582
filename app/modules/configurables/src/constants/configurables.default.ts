/*
 * Default Configurable Data — seeded into Mongo on first boot.
 *
 * BEFORE EDITING: read ./RULES.md (especially R5: schema and defaults must
 * stay in sync) and ./configurables.schema.ts. For per-type schema and
 * default-value samples, see RULES.md §5 "Field Type Reference".
 */

export type TBrandColor = {
  primary: string;
  secondary: string;
  accent: string;
};

export type TSkyColors = {
  day: string;
  sunset: string;
  night: string;
};

export type TDefaultConfigurableData = {
  appName: string;
  logoUrl: string;
  brandColor: TBrandColor;
  tagline?: string;
  playCtaLabel?: string;
  controlsHint?: string;
  versionTag?: string;
  skyColors?: TSkyColors;
  worldSeed?: number;
  dayDurationMinutes?: number;
  renderDistance?: number;
  enableStarterItems?: boolean;
  footerText?: string;
};

export const defaultConfigurablesData: TDefaultConfigurableData = {
  appName: "VoxelVerse",
  logoUrl: "https://api.iconify.design/lucide/box.svg?color=%23FFB347",
  brandColor: {
    primary: "#FFB347",
    secondary: "#6BBF59",
    accent: "#87CEEB",
  },
  tagline: "Open a tab. Build a world.",
  playCtaLabel: "Play",
  controlsHint: "WASD to move • Mouse to look • E for inventory",
  versionTag: "v0.1 MVP",
  skyColors: {
    day: "#87CEEB",
    sunset: "#FF8C61",
    night: "#0B1B3A",
  },
  worldSeed: 1337,
  dayDurationMinutes: 10,
  renderDistance: 3,
  enableStarterItems: true,
  footerText: "Cozy voxel sandbox, in your browser.",
};
