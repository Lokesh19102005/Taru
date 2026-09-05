const SHIP_SIZES = [5, 4, 3, 3, 2];
const GRID_WIDTH = 9;
const GRID_HEIGHT = 7;

function normalizeShip(ship) {
  if (!ship || !Array.isArray(ship.cells)) {
    return null;
  }

  return ship.cells.map((cell) => ({
    row: Number(cell.row),
    col: Number(cell.col),
    hit: cell.hit ?? false,
  }));
}

function sortCells(cells) {
  return [...cells].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });
}

function isStraightLineAndContiguous(cells) {
  if (cells.length === 0) return false;

  const rows = new Set(cells.map((cell) => cell.row));
  const cols = new Set(cells.map((cell) => cell.col));

  const allSameRow = rows.size === 1;
  const allSameCol = cols.size === 1;

  if (!allSameRow && !allSameCol) {
    return false;
  }

  if (allSameRow) {
    const ordered = sortCells(cells);
    for (let i = 1; i < ordered.length; i++) {
      if (ordered[i].col - ordered[i - 1].col !== 1) {
        return false;
      }
    }
    return true;
  }

  const ordered = sortCells(cells);
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i].row - ordered[i - 1].row !== 1) {
      return false;
    }
  }

  return true;
}

function validatePlacement(ships) {
  if (!Array.isArray(ships)) {
    return { valid: false, reason: "Ships must be an array" };
  }

  if (ships.length !== SHIP_SIZES.length) {
    return {
      valid: false,
      reason: `Expected ${SHIP_SIZES.length} ships, received ${ships.length}`,
    };
  }

  const shipSizes = ships
    .map((ship) => {
      const normalized = normalizeShip(ship);
      if (!normalized) return null;
      return normalized.length;
    })
    .sort((a, b) => a - b);

  const requiredSizes = [...SHIP_SIZES].sort((a, b) => a - b);

  if (shipSizes.length !== requiredSizes.length) {
    return { valid: false, reason: "Ship count is invalid" };
  }

  for (let i = 0; i < shipSizes.length; i++) {
    if (shipSizes[i] !== requiredSizes[i]) {
      return {
        valid: false,
        reason: "Ship sizes do not match the required fleet",
      };
    }
  }

  const seenCells = new Set();

  for (const ship of ships) {
    const normalized = normalizeShip(ship);

    if (!normalized) {
      return { valid: false, reason: "Each ship must include cells" };
    }

    if (normalized.length === 0) {
      return { valid: false, reason: "Ship cannot be empty" };
    }

    for (const cell of normalized) {
      if (
        !Number.isInteger(cell.row) ||
        !Number.isInteger(cell.col) ||
        cell.row < 0 ||
        cell.row >= GRID_HEIGHT ||
        cell.col < 0 ||
        cell.col >= GRID_WIDTH
      ) {
        return { valid: false, reason: "Ship extends outside the board" };
      }

      const key = `${cell.row}:${cell.col}`;
      if (seenCells.has(key)) {
        return { valid: false, reason: "Ships cannot overlap" };
      }

      seenCells.add(key);
    }

    if (!isStraightLineAndContiguous(normalized)) {
      return {
        valid: false,
        reason: "Each ship must be a contiguous straight line",
      };
    }
  }

  return { valid: true };
}

function createEmptyTrackingGrid() {
  return Array.from({ length: GRID_HEIGHT }, () =>
    Array.from({ length: GRID_WIDTH }, () => null),
  );
}

function resolveShot(ships, row, col) {
  if (!Array.isArray(ships)) {
    return "miss";
  }

  for (const ship of ships) {
    if (!Array.isArray(ship.cells)) continue;

    for (const cell of ship.cells) {
      if (cell.row === row && cell.col === col) {
        return "hit";
      }
    }
  }

  return "miss";
}

function markHit(ships, row, col) {
  return ships.map((ship) => {
    const cells = ship.cells.map((cell) => {
      if (cell.row === row && cell.col === col) {
        return { ...cell, hit: true };
      }
      return { ...cell };
    });

    return { ...ship, cells };
  });
}

function isFleetFullySunk(ships) {
  if (!Array.isArray(ships)) return false;

  for (const ship of ships) {
    if (!Array.isArray(ship.cells)) return false;

    for (const cell of ship.cells) {
      if (!cell.hit) {
        return false;
      }
    }
  }

  return true;
}

function hasCellBeenShot(shotsFired, row, col) {
  if (!Array.isArray(shotsFired) && !(shotsFired instanceof Set)) {
    return false;
  }

  if (shotsFired instanceof Set) {
    return shotsFired.has(`${row}:${col}`);
  }

  return shotsFired.some((shot) => shot.row === row && shot.col === col);
}

// Finds the specific ship (post-markHit, so its cells reflect current hit
// state) that occupies a given cell. Used to detect whether THIS ship (not
// the whole fleet) just became fully sunk from the most recent hit.
function findShipContainingCell(ships, row, col) {
  return (
    ships.find((ship) =>
      ship.cells.some((cell) => cell.row === row && cell.col === col),
    ) || null
  );
}

function isShipFullySunk(ship) {
  if (!ship || !Array.isArray(ship.cells)) return false;
  return ship.cells.every((cell) => cell.hit);
}

module.exports = {
  SHIP_SIZES,
  GRID_WIDTH,
  GRID_HEIGHT,
  validatePlacement,
  createEmptyTrackingGrid,
  resolveShot,
  markHit,
  isFleetFullySunk,
  hasCellBeenShot,
  findShipContainingCell,
  isShipFullySunk,
};
