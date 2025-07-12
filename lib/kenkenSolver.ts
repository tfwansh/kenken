import { Op, Cage, Puzzle } from './types';

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */
export function solveKenKen(
  puzzle: Puzzle
): number[][] | null {
  const n = puzzle.size;
  if (n < 1) return null;

  /* -------------------------------------------------------------- */
  /*  Board & bookkeeping structures                                */
  /* -------------------------------------------------------------- */
  const grid: number[][] = Array.from({ length: n }, () =>
    Array<number>(n).fill(0)
  );

  // rowUsed[r][v]  ⇒ value v already used in row r
  // colUsed[c][v]  ⇒ value v already used in column c
  const rowUsed: boolean[][] = Array.from({ length: n }, () =>
    Array<boolean>(n + 1).fill(false)
  );
  const colUsed: boolean[][] = Array.from({ length: n }, () =>
    Array<boolean>(n + 1).fill(false)
  );

  // cell → cage lookup
  const cageOf = new Map<string, Cage>();
  for (const cage of puzzle.cages) {
    for (const [r, c] of cage.cells) cageOf.set(`${r},${c}`, cage);
  }

  /* -------------------------------------------------------------- */
  /*  Utility: test one cage under the current partial grid         */
  /* -------------------------------------------------------------- */
  function cageValidPartial(cage: Cage): boolean {
    const op = cage.op;
    const values: number[] = [];
    let unassigned = 0;

    for (const [r, c] of cage.cells) {
      const v = grid[r][c];
      v === 0 ? unassigned++ : null;
      values.push(v);
    }

    switch (op) {
      /* ----------------------- ADDITION ------------------------ */
      case '+': {
        const sum = values.reduce((s, v) => s + v, 0);
        if (unassigned === 0) return sum === cage.target;
        if (sum >= cage.target) return false;
        const minPossible = sum + 1 * unassigned;
        const maxPossible = sum + n * unassigned;
        return cage.target >= minPossible && cage.target <= maxPossible;
      }
      /* ------------------- MULTIPLICATION ---------------------- */
      case '*': {
        let prod = 1;
        for (const v of values) if (v !== 0) prod *= v;
        if (prod > cage.target || cage.target % prod !== 0) return false;
        if (unassigned === 0) return prod === cage.target;
        let maxPossible = prod;
        for (let i = 0; i < unassigned; i++) maxPossible *= n;
        return maxPossible >= cage.target;
      }
      /* ----------------------- SUBTRACTION --------------------- */
      case '-': {
        if (cage.cells.length !== 2) {
          // fall back to check only when complete
          return unassigned === 0
            ? Math.abs(values[0] - values[1]) === cage.target
            : true;
        }
        if (unassigned === 2) return true;
        if (unassigned === 0)
          return Math.abs(values[0] - values[1]) === cage.target;
        const known = values.find(v => v !== 0)!;
        const p1 = known + cage.target;
        const p2 = known - cage.target;
        return (
          (p1 >= 1 && p1 <= n) ||
          (p2 >= 1 && p2 <= n)
        );
      }
      /* ------------------------- DIVISION ---------------------- */
      case '/': {
        if (cage.cells.length !== 2) {
          return unassigned === 0
            ? Math.max(values[0], values[1]) /
                Math.min(values[0], values[1]) === cage.target
            : true;
        }
        if (unassigned === 2) return true;
        if (unassigned === 0) {
          const [a, b] = values.sort((x, y) => y - x);
          return a / b === cage.target;
        }
        const known = values.find(v => v !== 0)!;
        const asNum = known / cage.target;
        const asDen = known * cage.target;
        return (
          (Number.isInteger(asNum) && asNum >= 1 && asNum <= n) ||
          (asDen >= 1 && asDen <= n)
        );
      }
      /* ------------------------- EQUALITY ---------------------- */
      case '=': {
        return values[0] === 0 || values[0] === cage.target;
      }
      default:
        return false;
    }
  }

  /* -------------------------------------------------------------- */
  /*  Pre-assign single-cell “=” cages (tiny performance win)       */
  /* -------------------------------------------------------------- */
  for (const cage of puzzle.cages) {
    if (
      (cage.op === '=' || cage.cells.length === 1) &&
      cage.cells.length === 1
    ) {
      const [r, c] = cage.cells[0];
      const v = cage.target;
      if (v < 1 || v > n || rowUsed[r][v] || colUsed[c][v]) return null;
      grid[r][c] = v;
      rowUsed[r][v] = colUsed[c][v] = true;
    }
  }

  /* -------------------------------------------------------------- */
  /*  Helpers: candidate list & MRV cell selection                  */
  /* -------------------------------------------------------------- */
  function getCandidates(r: number, c: number): number[] {
    const cage = cageOf.get(`${r},${c}`);
    const out: number[] = [];

    for (let v = 1; v <= n; v++) {
      if (rowUsed[r][v] || colUsed[c][v]) continue;
      grid[r][c] = v;
      rowUsed[r][v] = colUsed[c][v] = true;
      const ok = cage ? cageValidPartial(cage) : true;
      rowUsed[r][v] = colUsed[c][v] = false;
      grid[r][c] = 0;
      if (ok) out.push(v);
    }
    return out;
  }

  function selectNext(): [number, number, number[]] | null {
    let best: [number, number] | null = null;
    let bestChoices: number[] = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (grid[r][c]) continue;
        const cand = getCandidates(r, c);
        if (cand.length === 0) return null; // dead end now
        if (!best || cand.length < bestChoices.length) {
          best = [r, c];
          bestChoices = cand;
          if (cand.length === 1) return [r, c, cand];
        }
      }
    }
    return best ? [best[0], best[1], bestChoices] : null;
  }

  /* -------------------------------------------------------------- */
  /*  Recursive back-tracking                                       */
  /* -------------------------------------------------------------- */
  function backtrack(): boolean {
    const pick = selectNext();
    if (!pick) {
      // If no unassigned cells remain, puzzle is solved
      for (const cage of puzzle.cages)
        if (!cageValidPartial(cage)) return false;
      return true;
    }

    const [r, c, cand] = pick;
    const cage = cageOf.get(`${r},${c}`)!;

    for (const v of cand) {
      grid[r][c] = v;
      rowUsed[r][v] = colUsed[c][v] = true;
      if (cageValidPartial(cage) && backtrack()) return true;
      grid[r][c] = 0;
      rowUsed[r][v] = colUsed[c][v] = false;
    }
    return false;
  }

  /* -------------------------------------------------------------- */
  /*  Kick off search                                               */
  /* -------------------------------------------------------------- */
  return backtrack() ? grid : null;
}