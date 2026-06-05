// Recipe matcher — supports both shaped (3x3 with positions) and shapeless
// (set-of-ingredients) Minecraft-style recipes. Input is a 9-cell array
// (row-major: indices 0..8 → top-left → bottom-right).

import type { BlockId } from "../blocks/block-registry";

export type GridCell = { id: BlockId; count: number } | null;
export type Grid = GridCell[]; // length 9

export type RecipeKind = "shaped" | "shapeless";

export interface ShapedRecipe {
  id: string;
  kind: "shaped";
  /** Up to 3 rows, each a string of single-char keys. Use ' ' or '.' for empty. */
  pattern: string[];
  /** Map from char in pattern to required BlockId. */
  key: Record<string, BlockId>;
  /** Output item id + count. */
  output: { id: BlockId; count: number };
}

export interface ShapelessRecipe {
  id: string;
  kind: "shapeless";
  ingredients: BlockId[]; // multiset
  output: { id: BlockId; count: number };
}

export type Recipe = ShapedRecipe | ShapelessRecipe;

function gridIngredientCounts(grid: Grid): Map<BlockId, number> {
  const m = new Map<BlockId, number>();
  for (const c of grid) {
    if (!c || !c.id || c.count <= 0) continue;
    m.set(c.id, (m.get(c.id) ?? 0) + 1);
  }
  return m;
}

function isEmpty(c: GridCell): boolean {
  return !c || !c.id || c.count <= 0;
}

function patternToMatrix(rows: string[], key: Record<string, BlockId>): BlockId[][] {
  return rows.map((row) =>
    row.split("").map((ch) => {
      if (ch === " " || ch === "." || ch === "") return 0;
      return key[ch] ?? 0;
    }),
  );
}

function gridToMatrix(grid: Grid): BlockId[][] {
  // 3x3 row-major
  return [
    [grid[0]?.id ?? 0, grid[1]?.id ?? 0, grid[2]?.id ?? 0],
    [grid[3]?.id ?? 0, grid[4]?.id ?? 0, grid[5]?.id ?? 0],
    [grid[6]?.id ?? 0, grid[7]?.id ?? 0, grid[8]?.id ?? 0],
  ].map((row) => row.map((v) => v as BlockId));
}

function trimMatrix(m: BlockId[][]): { matrix: BlockId[][]; w: number; h: number } {
  let top = 0;
  let bottom = m.length - 1;
  let left = 0;
  let right = m[0].length - 1;
  while (top <= bottom && m[top].every((v) => v === 0)) top++;
  while (bottom >= top && m[bottom].every((v) => v === 0)) bottom--;
  while (left <= right && m.every((row) => row[left] === 0)) left++;
  while (right >= left && m.every((row) => row[right] === 0)) right--;
  if (top > bottom || left > right) return { matrix: [], w: 0, h: 0 };
  const trimmed: BlockId[][] = [];
  for (let r = top; r <= bottom; r++) {
    trimmed.push(m[r].slice(left, right + 1));
  }
  return { matrix: trimmed, w: right - left + 1, h: bottom - top + 1 };
}

function matrixEqual(a: BlockId[][], b: BlockId[][]): boolean {
  if (a.length !== b.length) return false;
  for (let r = 0; r < a.length; r++) {
    if (a[r].length !== b[r].length) return false;
    for (let c = 0; c < a[r].length; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

export interface RecipeMatch {
  recipe: Recipe;
  output: { id: BlockId; count: number };
}

export function matchRecipe(grid: Grid, recipes: Recipe[]): RecipeMatch | null {
  const counts = gridIngredientCounts(grid);
  if (counts.size === 0) return null;
  const gridMatrix = gridToMatrix(grid);
  const gridTrim = trimMatrix(gridMatrix);

  for (const recipe of recipes) {
    if (recipe.kind === "shapeless") {
      // Compare multisets
      const need = new Map<BlockId, number>();
      for (const id of recipe.ingredients) need.set(id, (need.get(id) ?? 0) + 1);
      if (need.size !== counts.size) continue;
      let ok = true;
      for (const [id, n] of need) {
        if ((counts.get(id) ?? 0) !== n) {
          ok = false;
          break;
        }
      }
      if (ok) return { recipe, output: { ...recipe.output } };
    } else {
      const patMatrix = patternToMatrix(recipe.pattern, recipe.key);
      const patTrim = trimMatrix(patMatrix);
      if (patTrim.w === 0) continue;
      if (matrixEqual(patTrim.matrix, gridTrim.matrix)) {
        return { recipe, output: { ...recipe.output } };
      }
    }
  }
  return null;
}

/** Consume one unit of each non-empty cell from the grid. */
export function consumeGrid(grid: Grid): Grid {
  return grid.map((cell) => {
    if (!cell || cell.count <= 0) return null;
    const nextCount = cell.count - 1;
    return nextCount > 0 ? { id: cell.id, count: nextCount } : null;
  });
}
