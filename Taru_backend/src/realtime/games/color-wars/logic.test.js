const assert = require("assert");
const {
  FLOOR_COLS,
  FLOOR_ROWS,
  BASE_SPEED,
  BASE_ROLLER_RADIUS,
  POWERUP_PICKUP_RADIUS,
  createInitialGrid,
  movePlayer,
  paintRadius,
  countCellsByOwner,
  isWithinPickupRadius,
  pickRandomFreeCell,
} = require("./logic");

function testMovePlayerMovesAndClamps() {
  const player = {
    x: 2,
    y: 2,
    direction: { dx: 1, dy: 0 },
    speedMultiplier: 1,
  };

  const moved = movePlayer(player, 1);
  assert.strictEqual(moved.x, 2 + BASE_SPEED);
  assert.strictEqual(moved.y, 2);

  const edgePlayer = {
    x: FLOOR_COLS - 0.2,
    y: FLOOR_ROWS - 0.2,
    direction: { dx: 1, dy: 1 },
    speedMultiplier: 1,
  };

  const clamped = movePlayer(edgePlayer, 1);
  assert.strictEqual(clamped.x, FLOOR_COLS);
  assert.strictEqual(clamped.y, FLOOR_ROWS);
}

function testDiagonalDoesNotMoveFasterThanStraight() {
  const straight = movePlayer(
    { x: 0, y: 0, direction: { dx: 1, dy: 0 }, speedMultiplier: 1 },
    1,
  );

  const diagonal = movePlayer(
    { x: 0, y: 0, direction: { dx: 1, dy: 1 }, speedMultiplier: 1 },
    1,
  );

  const straightDistance = Math.hypot(straight.x, straight.y);
  const diagonalDistance = Math.hypot(diagonal.x, diagonal.y);

  assert.ok(diagonalDistance <= straightDistance + 0.0001);
}

function testPaintRadiusPaintsOnlyInsideRadiusAndReturnsOnlyChangedCells() {
  const grid = createInitialGrid();
  const result = paintRadius(grid, 5, 5, 1.2, "playerA");

  assert.ok(result.changedCells.length > 0);

  const allOwnedByPlayerA = result.changedCells.every(
    ({ row, col }) => result.grid[row][col] === "playerA",
  );
  assert.strictEqual(allOwnedByPlayerA, true);

  const sameOwnerResult = paintRadius(result.grid, 5, 5, 1.2, "playerA");
  assert.strictEqual(sameOwnerResult.changedCells.length, 0);
}

function testCountCellsByOwner() {
  const grid = createInitialGrid();
  grid[0][0] = "playerA";
  grid[0][1] = "playerA";
  grid[1][0] = "playerB";
  grid[2][2] = null;

  const counts = countCellsByOwner(grid);

  assert.strictEqual(counts.playerA, 2);
  assert.strictEqual(counts.playerB, 1);
}

function testIsWithinPickupRadius() {
  assert.strictEqual(isWithinPickupRadius(0, 0, 0.5, 0), true);
  assert.strictEqual(isWithinPickupRadius(0, 0, 2, 0), false);
  assert.strictEqual(
    isWithinPickupRadius(0, 0, POWERUP_PICKUP_RADIUS, 0),
    true,
  );
}

function testTerritoryStealWorks() {
  const grid = createInitialGrid();

  const a = paintRadius(grid, 5, 5, 2, "playerA");
  const b = paintRadius(a.grid, 5, 5, 1, "playerB");

  const centerCell = b.grid[5][5];
  assert.strictEqual(centerCell, "playerB");
}

function run() {
  testMovePlayerMovesAndClamps();
  testDiagonalDoesNotMoveFasterThanStraight();
  testPaintRadiusPaintsOnlyInsideRadiusAndReturnsOnlyChangedCells();
  testCountCellsByOwner();
  testIsWithinPickupRadius();
  testTerritoryStealWorks();

  console.log("Color Wars logic tests passed");
}

run();
