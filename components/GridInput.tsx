import React, { useState } from 'react';
import { Cage, Puzzle, Op } from '../lib/types';
import { solveKenKen } from '../lib/kenkenSolver';

interface Props {
  defaultPuzzle?: Puzzle;
}

const DEFAULT_SIZE = 4;
const MIN_SIZE = 3;
const MAX_SIZE = 6;

const defaultCages = (size: number): Cage[] => {
  // For now, return an empty array for custom puzzles
  // (future: could provide a default for each size)
  return [];
};

const OPS: Op[] = ['+', '-', '*', '/', '='];

const CAGE_COLORS = [
  'bg-red-200', 'bg-green-200', 'bg-blue-200', 'bg-yellow-200', 'bg-pink-200', 'bg-purple-200', 'bg-orange-200', 'bg-teal-200', 'bg-indigo-200', 'bg-lime-200', 'bg-amber-200', 'bg-cyan-200', 'bg-fuchsia-200', 'bg-rose-200'
];

const GridInput: React.FC<Props> = ({ defaultPuzzle }) => {
  const [size, setSize] = useState<number>(defaultPuzzle?.size ?? DEFAULT_SIZE);
  const [pz, setPz] = useState<Puzzle>(
    defaultPuzzle ?? {
      size: DEFAULT_SIZE,
      cages: defaultCages(DEFAULT_SIZE)
    }
  );
  const [sol, setSol] = useState<number[][] | null>(null);
  const [selectedCells, setSelectedCells] = useState<Array<[number, number]>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showCageModal, setShowCageModal] = useState(false);
  const [cageOp, setCageOp] = useState<Op>('+');
  const [cageTarget, setCageTarget] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);

  // Handle grid size change
  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    setSize(newSize);
    setPz({ size: newSize, cages: defaultCages(newSize) });
    setSol(null);
  };

  // Helper: check if all cells are assigned to a cage
  const isPuzzleComplete = () => {
    const assigned = Array.from({ length: size }, () => Array(size).fill(false));
    for (const cage of pz.cages) {
      for (const [r, c] of cage.cells) {
        if (r >= 0 && r < size && c >= 0 && c < size) assigned[r][c] = true;
      }
    }
    return assigned.flat().every(Boolean);
  };

  const handleSolve = () => {
    if (!isPuzzleComplete()) {
      setShowIncompleteWarning(true);
      setTimeout(() => setShowIncompleteWarning(false), 2000);
      return;
    }
    const ans = solveKenKen(pz);
    setSol(ans);
    if (!ans) setError('No solution found for this puzzle!');
    else setError(null);
  };

  // Handle cell mouse events for selection
  const handleCellMouseDown = (r: number, c: number) => {
    setIsDragging(true);
    setSelectedCells([[r, c]]);
  };
  const handleCellMouseEnter = (r: number, c: number) => {
    if (isDragging) {
      setSelectedCells((prev) => {
        const exists = prev.some(([rr, cc]) => rr === r && cc === c);
        return exists ? prev : [...prev, [r, c]];
      });
    }
  };
  const handleMouseUp = () => {
    setIsDragging(false);
    if (selectedCells.length > 0) {
      // Check for overlap with existing cages
      const used = pz.cages.flatMap(cg => cg.cells.map(([r, c]) => `${r},${c}`));
      const overlap = selectedCells.some(([r, c]) => used.includes(`${r},${c}`));
      if (overlap) {
        setError('Selected cells overlap with an existing cage.');
        setSelectedCells([]);
        return;
      }
      setShowCageModal(true);
    }
  };

  const handleCageModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cageTarget || selectedCells.length === 0) return;
    const newCage: Cage = {
      cells: selectedCells,
      target: cageTarget,
      op: cageOp
    };
    setPz(prev => ({ ...prev, cages: [...prev.cages, newCage] }));
    setSelectedCells([]);
    setShowCageModal(false);
    setCageOp('+');
    setCageTarget(1);
    setError(null);
  };

  const handleCageModalClose = () => {
    setShowCageModal(false);
    setSelectedCells([]);
    setError(null);
  };

  // Find which cage (if any) a cell belongs to
  const cageAt = (r: number, c: number) => pz.cages.findIndex(cg => cg.cells.some(([rr, cc]) => rr === r && cc === c));
  const cageInfoAt = (r: number, c: number) => pz.cages.find(cg => cg.cells.some(([rr, cc]) => rr === r && cc === c));
  // For each cage, find its top-left cell (for op/target label)
  const isCageLabelCell = (cage: Cage, r: number, c: number) => {
    return cage.cells.reduce((min, [rr, cc]) => {
      if (rr < min[0] || (rr === min[0] && cc < min[1])) return [rr, cc];
      return min;
    }, cage.cells[0])[0] === r &&
      cage.cells.reduce((min, [rr, cc]) => {
        if (rr < min[0] || (rr === min[0] && cc < min[1])) return [rr, cc];
        return min;
      }, cage.cells[0])[1] === c;
  };

  // Render the interactive grid with cages
  const renderGrid = () => (
    <table
      className="border-collapse select-none cursor-pointer"
      onMouseLeave={() => setIsDragging(false)}
      onMouseUp={handleMouseUp}
    >
      <tbody>
        {Array.from({ length: size }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: size }).map((_, c) => {
              const isSelected = selectedCells.some(([rr, cc]) => rr === r && cc === c);
              const cageIdx = cageAt(r, c);
              const cage = cageInfoAt(r, c);
              const color = cageIdx >= 0 ? CAGE_COLORS[cageIdx % CAGE_COLORS.length] : '';
              return (
                <td
                  key={c}
                  className={`border w-12 h-12 text-center align-top relative transition-colors duration-100 ${
                    isSelected ? 'bg-yellow-300' : color || 'bg-white'
                  }`}
                  onMouseDown={() => handleCellMouseDown(r, c)}
                  onMouseEnter={() => handleCellMouseEnter(r, c)}
                >
                  {/* Show op/target in top-left if this is the label cell for a cage */}
                  {cage && isCageLabelCell(cage, r, c) && (
                    <div className="absolute left-1 top-0 text-xs font-bold text-gray-700">
                      {cage.target}{cage.op}
                    </div>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );

  // Remove a cage by index
  const handleRemoveCage = (idx: number) => {
    setPz(prev => ({ ...prev, cages: prev.cages.filter((_, i) => i !== idx) }));
    setSol(null);
  };

  // Example puzzles for each size
  const examplePuzzles: Record<number, Cage[]> = {
    3: [
      { cells: [[0,0]], target: 1, op: '=' },
      { cells: [[0,1]], target: 2, op: '=' },
      { cells: [[0,2]], target: 3, op: '=' },
      { cells: [[1,0]], target: 2, op: '=' },
      { cells: [[1,1]], target: 3, op: '=' },
      { cells: [[1,2]], target: 1, op: '=' },
      { cells: [[2,0]], target: 3, op: '=' },
      { cells: [[2,1]], target: 1, op: '=' },
      { cells: [[2,2]], target: 2, op: '=' },
    ],
    4: [
      { cells: [[0,0],[0,1]], target: 3, op: '+' },
      { cells: [[0,2],[1,2]], target: 4, op: '+' },
      { cells: [[0,3],[1,3]], target: 3, op: '/' },
      { cells: [[1,0],[2,0]], target: 3, op: '/' },
      { cells: [[1,1],[2,1]], target: 2, op: '/' },
      { cells: [[2,2],[2,3]], target: 3, op: '-' },
      { cells: [[3,0],[3,1]], target: 4, op: '+' },
      { cells: [[3,2],[3,3]], target: 1, op: '-' }
    ],
    5: [
      { cells: [[0,0]], target: 1, op: '=' },
      { cells: [[0,1]], target: 2, op: '=' },
      { cells: [[0,2]], target: 3, op: '=' },
      { cells: [[0,3]], target: 4, op: '=' },
      { cells: [[0,4]], target: 5, op: '=' },
      { cells: [[1,0]], target: 2, op: '=' },
      { cells: [[1,1]], target: 3, op: '=' },
      { cells: [[1,2]], target: 4, op: '=' },
      { cells: [[1,3]], target: 5, op: '=' },
      { cells: [[1,4]], target: 1, op: '=' },
      { cells: [[2,0]], target: 3, op: '=' },
      { cells: [[2,1]], target: 4, op: '=' },
      { cells: [[2,2]], target: 5, op: '=' },
      { cells: [[2,3]], target: 1, op: '=' },
      { cells: [[2,4]], target: 2, op: '=' },
      { cells: [[3,0]], target: 4, op: '=' },
      { cells: [[3,1]], target: 5, op: '=' },
      { cells: [[3,2]], target: 1, op: '=' },
      { cells: [[3,3]], target: 2, op: '=' },
      { cells: [[3,4]], target: 3, op: '=' },
      { cells: [[4,0]], target: 5, op: '=' },
      { cells: [[4,1]], target: 1, op: '=' },
      { cells: [[4,2]], target: 2, op: '=' },
      { cells: [[4,3]], target: 3, op: '=' },
      { cells: [[4,4]], target: 4, op: '=' },
    ],
    6: [
      { cells: [[0,0]], target: 1, op: '=' },
      { cells: [[0,1]], target: 2, op: '=' },
      { cells: [[0,2]], target: 3, op: '=' },
      { cells: [[0,3]], target: 4, op: '=' },
      { cells: [[0,4]], target: 5, op: '=' },
      { cells: [[0,5]], target: 6, op: '=' },
      { cells: [[1,0]], target: 2, op: '=' },
      { cells: [[1,1]], target: 3, op: '=' },
      { cells: [[1,2]], target: 4, op: '=' },
      { cells: [[1,3]], target: 5, op: '=' },
      { cells: [[1,4]], target: 6, op: '=' },
      { cells: [[1,5]], target: 1, op: '=' },
      { cells: [[2,0]], target: 3, op: '=' },
      { cells: [[2,1]], target: 4, op: '=' },
      { cells: [[2,2]], target: 5, op: '=' },
      { cells: [[2,3]], target: 6, op: '=' },
      { cells: [[2,4]], target: 1, op: '=' },
      { cells: [[2,5]], target: 2, op: '=' },
      { cells: [[3,0]], target: 4, op: '=' },
      { cells: [[3,1]], target: 5, op: '=' },
      { cells: [[3,2]], target: 6, op: '=' },
      { cells: [[3,3]], target: 1, op: '=' },
      { cells: [[3,4]], target: 2, op: '=' },
      { cells: [[3,5]], target: 3, op: '=' },
      { cells: [[4,0]], target: 5, op: '=' },
      { cells: [[4,1]], target: 6, op: '=' },
      { cells: [[4,2]], target: 1, op: '=' },
      { cells: [[4,3]], target: 2, op: '=' },
      { cells: [[4,4]], target: 3, op: '=' },
      { cells: [[4,5]], target: 4, op: '=' },
      { cells: [[5,0]], target: 6, op: '=' },
      { cells: [[5,1]], target: 1, op: '=' },
      { cells: [[5,2]], target: 2, op: '=' },
      { cells: [[5,3]], target: 3, op: '=' },
      { cells: [[5,4]], target: 4, op: '=' },
      { cells: [[5,5]], target: 5, op: '=' },
    ],
  };

  const handleClearAll = () => {
    setPz({ size, cages: [] });
    setSol(null);
    setError(null);
    setSelectedCells([]);
  };

  const handleLoadExample = () => {
    const cages = examplePuzzles[size];
    if (cages) {
      setPz({ size, cages });
      setSol(null);
      setError(null);
      setSelectedCells([]);
    } else {
      setError('No example for this size');
    }
  };

  return (
    <div className="flex flex-col items-center md:flex-row md:items-start gap-8 w-full max-w-5xl mx-auto p-4">
      <div className="w-full md:w-auto">
        <div className="mb-4 flex flex-wrap gap-4 items-center">
          <label htmlFor="grid-size" className="font-semibold">Grid Size:</label>
          <select
            id="grid-size"
            value={size}
            onChange={handleSizeChange}
            className="border rounded px-2 py-1"
          >
            {Array.from({ length: MAX_SIZE - MIN_SIZE + 1 }, (_, i) => MIN_SIZE + i).map((n) => (
              <option key={n} value={n}>{n} × {n}</option>
            ))}
          </select>
          <button
            onClick={handleClearAll}
            className="border rounded px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold transition"
            type="button"
          >
            Clear All
          </button>
          <button
            onClick={handleLoadExample}
            className="border rounded px-3 py-1 bg-green-500 hover:bg-green-600 text-white font-semibold transition"
            type="button"
          >
            Load Example
          </button>
        </div>
        <div className="mb-4 overflow-x-auto">
          {renderGrid()}
        </div>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <button
          onClick={handleSolve}
          className={`border rounded px-4 py-2 mb-4 font-bold shadow transition text-white ${isPuzzleComplete() ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'}`}
          disabled={!isPuzzleComplete()}
        >
          Solve
        </button>
        {showIncompleteWarning && (
          <div className="text-yellow-600 font-semibold mb-2">Define cages for all cells first!</div>
        )}
        {sol && (
          <table className='mt-4 border-collapse'>
            <tbody>
              {sol.map((row, r) => (
                <tr key={r}>
                  {row.map((v, c) => (
                    <td
                      key={c}
                      className='border w-8 h-8 text-center bg-white font-bold text-lg'
                    >
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!sol && <p className='mt-4 text-gray-500'>No solution yet…</p>}
      </div>
      {/* Cage List Sidebar */}
      <div className="w-full md:w-64 bg-white rounded shadow p-4 mt-6 md:mt-0">
        <h2 className="font-bold mb-2 text-lg">Cages</h2>
        {pz.cages.length === 0 && <div className="text-gray-400">No cages yet</div>}
        <ul className="space-y-2">
          {pz.cages.map((cg, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <span className={`inline-block w-3 h-3 rounded-full ${CAGE_COLORS[idx % CAGE_COLORS.length]}`}></span>
              <span className="text-sm">{cg.target}{cg.op} [{cg.cells.map(([r, c]) => `(${r+1},${c+1})`).join(', ')}]</span>
              <button
                className="ml-auto text-xs text-red-600 hover:underline"
                onClick={() => handleRemoveCage(idx)}
                title="Remove cage"
              >Remove</button>
            </li>
          ))}
        </ul>
      </div>
      {/* Cage Modal */}
      {showCageModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <form
            onSubmit={handleCageModalSubmit}
            className="bg-white rounded shadow-lg p-6 flex flex-col gap-4 min-w-[250px]"
            style={{ minWidth: 250 }}
          >
            <h2 className="text-lg font-bold mb-2">Define Cage</h2>
            <div>
              <span className="font-semibold">Cells:</span>
              <span className="ml-2 text-sm">{selectedCells.map(([r, c]) => `(${r+1},${c+1})`).join(', ')}</span>
            </div>
            <div className="flex gap-2 items-center">
              <label className="font-semibold">Op:</label>
              <select
                value={cageOp}
                onChange={e => setCageOp(e.target.value as Op)}
                className="border rounded px-2 py-1"
              >
                {OPS.map(op => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 items-center">
              <label className="font-semibold">Target:</label>
              <input
                type="number"
                value={cageTarget}
                min={1}
                onChange={e => setCageTarget(Number(e.target.value))}
                className="border rounded px-2 py-1 w-20"
                required
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >Add Cage</button>
              <button
                type="button"
                onClick={handleCageModalClose}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default GridInput; 