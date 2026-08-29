const assert = require("assert");
const {
  createInitialState,
  stepBall,
  checkProjectileBallCollision,
  applyImpact,
  checkGoal,
  isDuckLoaded,
} = require("./physics");

function runTest(name, test) {
  try {
    test();
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

runTest("ball reflects from the left rail", () => {
  const ball = {
    x: 5,
    y: 100,
    vx: -10,
    vy: 0,
    radius: 10,
  };

  const nextBall = stepBall(ball, 1, 400);

  assert(nextBall.vx > 0);
  assert(nextBall.x >= nextBall.radius);
});

runTest("projectile collision detects overlapping circles", () => {
  const ball = {
    x: 100,
    y: 100,
    radius: 20,
  };

  const projectile = {
    x: 100,
    y: 100,
    radius: 5,
  };

  assert.strictEqual(checkProjectileBallCollision(projectile, ball), true);

  projectile.x = 500;

  assert.strictEqual(checkProjectileBallCollision(projectile, ball), false);
});

runTest("impact changes velocity in projectile direction", () => {
  const ball = {
    x: 100,
    y: 100,
    vx: 0,
    vy: 0,
    radius: 20,
  };

  const projectile = {
    x: 100,
    y: 100,
    vx: 10,
    vy: 0,
    radius: 5,
  };

  const impactedBall = applyImpact(ball, projectile, 100);

  assert(impactedBall.vx > 0);
  assert.strictEqual(impactedBall.vy, 0);
});

runTest("goal detection identifies top and bottom goals", () => {
  assert.strictEqual(checkGoal({ y: -25, radius: 10 }, 700), "top");

  assert.strictEqual(checkGoal({ y: 725, radius: 10 }, 700), "bottom");

  assert.strictEqual(checkGoal({ y: 350, radius: 10 }, 700), null);
});

runTest("duck loading respects the angle tolerance", () => {
  assert.strictEqual(isDuckLoaded(10, 25), true);
  assert.strictEqual(isDuckLoaded(24, 25), true);
  assert.strictEqual(isDuckLoaded(80, 25), false);
});

runTest("drag reduces ball speed", () => {
  let ball = {
    x: 200,
    y: 350,
    vx: 20,
    vy: 10,
    radius: 18,
  };

  let previousSpeed = Math.hypot(ball.vx, ball.vy);

  for (let index = 0; index < 5; index += 1) {
    ball = stepBall(ball, 0.985, 400);
    const currentSpeed = Math.hypot(ball.vx, ball.vy);

    assert(currentSpeed < previousSpeed);
    previousSpeed = currentSpeed;
  }
});

runTest("off-center impact transfers less speed than a dead-center hit", () => {
  const ball = { x: 100, y: 100, vx: 0, vy: 0, radius: 20 };

  const deadCenter = { x: 100, y: 130, vx: 0, vy: -50, radius: 5 };
  const grazing = { x: 130, y: 100, vx: 0, vy: -50, radius: 5 };

  const afterDeadCenter = applyImpact(ball, deadCenter, 100);
  const afterGrazing = applyImpact(ball, grazing, 100);

  const deadCenterSpeed = Math.hypot(afterDeadCenter.vx, afterDeadCenter.vy);
  const grazingSpeed = Math.hypot(afterGrazing.vx, afterGrazing.vy);

  assert(deadCenterSpeed > grazingSpeed);
});

const initialState = createInitialState();
assert(initialState.ball);
console.log("Beach Balls physics tests completed.");
