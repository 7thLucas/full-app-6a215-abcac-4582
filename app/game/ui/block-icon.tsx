// Flat isometric-ish voxel preview: three colored tiles (top, left, right)
// arranged as a 2D cube approximation. Keeps the bundle tiny vs a real WebGL preview.

import { getDef, AIR, type BlockId } from "../blocks/block-registry";

export function BlockIcon({ id, size = 36 }: { id: BlockId; size?: number }) {
  if (!id || id === AIR) return <div style={{ width: size, height: size }} />;
  const def = getDef(id);
  const top = def.topColor ?? def.color;
  const side = def.sideColor ?? def.color;
  const front = def.color;

  // Diamond shape: top, left, right
  const half = size / 2;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label={def.label} role="img">
      {/* top face */}
      <polygon points="50,10 90,30 50,50 10,30" fill={top} stroke="rgba(0,0,0,0.25)" strokeWidth="1.2" />
      {/* left face */}
      <polygon points="10,30 50,50 50,92 10,72" fill={side} stroke="rgba(0,0,0,0.3)" strokeWidth="1.2" />
      {/* right face */}
      <polygon points="50,50 90,30 90,72 50,92" fill={front} stroke="rgba(0,0,0,0.3)" strokeWidth="1.2" />
    </svg>
  );
}
