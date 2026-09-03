// Coordinate system:
// - x increases to the right
// - y increases downward
// - floor spans x: 0..FLOOR_COLS and y: 0..FLOOR_ROWS
// - a cell at row/col is derived by Math.floor(y), Math.floor(x)

const FLOOR_COLS = 60;
const FLOOR_ROWS = 40;

const BASE_SPEED = 20;
const BASE_ROLLER_RADIUS = 3.6;
const POWERUP_PICKUP_RADIUS = 1.9;
const SPEED_BOOST_MULTIPLIER = 2.1;
const SIZE_BOOST_MULTIPLIER = 1.5;
const PAINT_BOMB_RADIUS = 10.4;
const BUFF_DURATION_MS = 5000;
const POWERUP_LIFETIME_MS = 8000;
const ROUND_DURATION_MS = 45000;

const POWERUP_TYPES = ["speed_boost", "size_boost", "paint_bomb"];

function createInitialGrid() {
  return Array.from({ length: FLOOR_ROWS }, () =>
    Array.from({ length: FLOOR_COLS }, () => null),
  );
}

function clampPosition(position) {
  return {
    x: Math.min(Math.max(position.x, 0), FLOOR_COLS),
    y: Math.min(Math.max(position.y, 0), FLOOR_ROWS),
  };
}

function normalizeDirection(dx, dy) {
  const mag = Math.hypot(dx, dy) || 1;
  return {
    dx: dx / mag,
    dy: dy / mag,
  };
}

function movePlayer(player, deltaSeconds) {
  const direction =
    player && player.direction
      ? normalizeDirection(player.direction.dx, player.direction.dy)
      : { dx: 0, dy: 0 };

  const speedMultiplier = player.speedMultiplier || 1;
  const moveX = direction.dx * BASE_SPEED * speedMultiplier * deltaSeconds;
  const moveY = direction.dy * BASE_SPEED * speedMultiplier * deltaSeconds;

  return clampPosition({
    x: player.x + moveX,
    y: player.y + moveY,
  });
}

function paintRadius(grid, centerX, centerY, radius, ownerSocketId) {
  const newGrid = grid.map((row) => row.map((cell) => cell));
  const changedCells = [];

  for (let row = 0; row < newGrid.length; row++) {
    for (let col = 0; col < newGrid[row].length; col++) {
      const cellCenterX = col + 0.5;
      const cellCenterY = row + 0.5;

      const distance = Math.hypot(cellCenterX - centerX, cellCenterY - centerY);

      if (distance <= radius) {
        if (newGrid[row][col] !== ownerSocketId) {
          changedCells.push({ row, col, owner: ownerSocketId });
          newGrid[row][col] = ownerSocketId;
        }
      }
    }
  }

  return { grid: newGrid, changedCells };
}

function countCellsByOwner(grid) {
  const counts = {};
  for (const row of grid) {
    for (const owner of row) {
      if (!owner) continue;
      counts[owner] = (counts[owner] || 0) + 1;
    }
  }
  return counts;
}

function isWithinPickupRadius(
  playerX,
  playerY,
  powerupX,
  powerupY,
  playerRadius = 0,
) {
  const distance = Math.hypot(playerX - powerupX, playerY - powerupY);
  return distance <= POWERUP_PICKUP_RADIUS + playerRadius;
}

function pickRandomFreeCell(grid) {
  const row = Math.floor(Math.random() * grid.length);
  const col = Math.floor(Math.random() * grid[0].length);
  return { row, col };
}

module.exports = {
  FLOOR_COLS,
  FLOOR_ROWS,
  BASE_SPEED,
  BASE_ROLLER_RADIUS,
  POWERUP_PICKUP_RADIUS,
  SPEED_BOOST_MULTIPLIER,
  SIZE_BOOST_MULTIPLIER,
  PAINT_BOMB_RADIUS,
  BUFF_DURATION_MS,
  POWERUP_LIFETIME_MS,
  ROUND_DURATION_MS,
  POWERUP_TYPES,
  createInitialGrid,
  clampPosition,
  movePlayer,
  paintRadius,
  countCellsByOwner,
  isWithinPickupRadius,
  pickRandomFreeCell,
};
