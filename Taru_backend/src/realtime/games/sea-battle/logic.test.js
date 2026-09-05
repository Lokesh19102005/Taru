const assert = require("assert");
const {
  SHIP_SIZES,
  GRID_SIZE,
  validatePlacement,
  resolveShot,
  markHit,
  isFleetFullySunk,
  hasCellBeenShot,
} = require("./logic");

function makeFleet() {
  return [
    {
      cells: [
        { row: 0, col: 0, hit: false },
        { row: 0, col: 1, hit: false },
        { row: 0, col: 2, hit: false },
        { row: 0, col: 3, hit: false },
        { row: 0, col: 4, hit: false },
      ],
    },
    {
      cells: [
        { row: 2, col: 2, hit: false },
        { row: 3, col: 2, hit: false },
        { row: 4, col: 2, hit: false },
        { row: 5, col: 2, hit: false },
      ],
    },
    {
      cells: [
        { row: 6, col: 0, hit: false },
        { row: 6, col: 1, hit: false },
        { row: 6, col: 2, hit: false },
      ],
    },
    {
      cells: [
        { row: 4, col: 6, hit: false },
        { row: 4, col: 7, hit: false },
        { row: 4, col: 8, hit: false },
      ],
    },
    {
      cells: [
        { row: 0, col: 8, hit: false },
        { row: 1, col: 8, hit: false },
      ],
    },
  ];
}

function testValidClassicPlacement() {
  const fleet = makeFleet();
  const result = validatePlacement(fleet);
  assert.strictEqual(result.valid, true, "Valid fleet should pass");
}

function testWrongShipCountFails() {
  const fleet = makeFleet().slice(0, 4);
  const result = validatePlacement(fleet);
  assert.strictEqual(result.valid, false);
}

function testOverlapFails() {
  const fleet = makeFleet();
  fleet[1].cells.push({ row: 0, col: 2 });
  const result = validatePlacement(fleet);
  assert.strictEqual(result.valid, false);
}

function testOutOfBoundsFails() {
  const fleet = makeFleet();
  fleet[0].cells[4] = { row: 0, col: 10 };
  const result = validatePlacement(fleet);
  assert.strictEqual(result.valid, false);
}

function testNonStraightLineFails() {
  const fleet = makeFleet();
  fleet[0].cells = [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 2 },
    { row: 0, col: 3 },
    { row: 0, col: 4 },
  ];
  const result = validatePlacement(fleet);
  assert.strictEqual(result.valid, false);
}

function testResolveShotHitAndMiss() {
  const fleet = makeFleet();
  assert.strictEqual(resolveShot(fleet, 0, 2), "hit");
  assert.strictEqual(resolveShot(fleet, 9, 9), "miss");
}

function testFleetFullySunk() {
  const fleet = makeFleet().map((ship) => ({
    cells: ship.cells.map((cell) => ({ ...cell, hit: true })),
  }));

  assert.strictEqual(isFleetFullySunk(fleet), true);
}

function testFleetNotFullySunkUntilAllCellsHit() {
  const fleet = makeFleet().map((ship) => ({
    cells: ship.cells.map((cell, index) =>
      index === 0 ? { ...cell, hit: true } : { ...cell, hit: false },
    ),
  }));

  assert.strictEqual(isFleetFullySunk(fleet), false);
}

function testDuplicateShotCheck() {
  const firedShots = [
    { row: 3, col: 4 },
    { row: 5, col: 5 },
  ];
  assert.strictEqual(hasCellBeenShot(firedShots, 3, 4), true);
  assert.strictEqual(hasCellBeenShot(firedShots, 1, 1), false);
}

function testMarkHit() {
  const fleet = makeFleet();
  const updated = markHit(fleet, 0, 2);

  assert.strictEqual(updated[0].cells[2].hit, true);
  assert.strictEqual(updated[0].cells[0].hit, false);
}

function run() {
  testValidClassicPlacement();
  testWrongShipCountFails();
  testOverlapFails();
  testOutOfBoundsFails();
  testNonStraightLineFails();
  testResolveShotHitAndMiss();
  testFleetFullySunk();
  testFleetNotFullySunkUntilAllCellsHit();
  testDuplicateShotCheck();
  testMarkHit();

  console.log("Sea Battle logic tests passed");
}

run();
