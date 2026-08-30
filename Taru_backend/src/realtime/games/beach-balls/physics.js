/*
Beach Balls coordinate system:
- x increases from left to right.
- y increases from top to bottom.
- y = 0 is the top goal.
- y = poolHeight is the bottom goal.
- An angle of 0 degrees points upward.
- Positive angles rotate clockwise.
- Duck angles are local angles relative to their inward-facing direction.
*/

const DEFAULT_CONFIG = {
  poolWidth: 300,
  poolHeight: 450,
  ballRadius: 30,
  projectileRadius: 9,
  ballDragFactor: 0.9,
  projectileSpeed: 480,
  impactForce: 260,
  angularVelocityDegPerSec: 110,
  duckLoadToleranceDegrees: 70,
  duckOffset: 60,
  projectileMaxLifetimeMs: 4000,
  goalPauseMs: 1500,
  goalsToWin: 3,
  goalWidth: 200, // narrower than poolWidth — the actual scoring opening
  railThickness: 10,
};

function createInitialState(config = {}) {
  const settings = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  return {
    poolWidth: settings.poolWidth,
    poolHeight: settings.poolHeight,
    ballRadius: settings.ballRadius,
    projectileRadius: settings.projectileRadius,

    ball: {
      x: settings.poolWidth / 2,
      y: settings.poolHeight / 2,
      vx: 0,
      vy: 0,
      radius: settings.ballRadius,
    },

    ducks: {
      top: {
        angle: 0,
      },
      bottom: {
        angle: 0,
      },
    },

    projectiles: [],
    scores: {},
    pausedUntil: 0,
    moveSequence: 0,

    config: settings,
  };
}

function stepBall(
  ball,
  dragFactor,
  poolWidth,
  poolHeight,
  goalWidth,
  railThickness = 0,
) {
  const nextBall = {
    ...ball,
    x: ball.x + ball.vx,
    y: ball.y + ball.vy,
    vx: ball.vx * dragFactor,
    vy: ball.vy * dragFactor,
  };

  const leftLimit = nextBall.radius + railThickness;
  const rightLimit = poolWidth - nextBall.radius - railThickness;

  if (nextBall.x < leftLimit) {
    nextBall.x = leftLimit;
    nextBall.vx = Math.abs(nextBall.vx);
  }

  if (nextBall.x > rightLimit) {
    nextBall.x = rightLimit;
    nextBall.vx = -Math.abs(nextBall.vx);
  }

  // Only reflect off the top/bottom edges OUTSIDE the goal opening.
  // Inside the goal opening, let the ball through so checkGoal can catch it.
  if (poolHeight !== undefined && goalWidth !== undefined) {
    const goalLeft = (poolWidth - goalWidth) / 2;
    const goalRight = goalLeft + goalWidth;
    const inGoalXRange =
      nextBall.x + nextBall.radius > goalLeft &&
      nextBall.x - nextBall.radius < goalRight;

    if (!inGoalXRange) {
      if (nextBall.y < nextBall.radius) {
        nextBall.y = nextBall.radius;
        nextBall.vy = Math.abs(nextBall.vy);
      }
      if (nextBall.y > poolHeight - nextBall.radius) {
        nextBall.y = poolHeight - nextBall.radius;
        nextBall.vy = -Math.abs(nextBall.vy);
      }
    }
  }

  return nextBall;
}

function stepProjectile(projectile, poolWidth, railThickness = 0) {
  const nextProjectile = {
    ...projectile,
    x: projectile.x + projectile.vx,
    y: projectile.y + projectile.vy,
    ageMs: (projectile.ageMs || 0) + (projectile.tickMs || 0),
  };

  // Rails only exist within the pool's actual vertical extent — outside
  // that (in the duck's outer margin), there's nothing to bounce off.
  const withinPoolVertically =
    nextProjectile.y >= 0 && nextProjectile.y <= nextProjectile.poolHeight;

  if (withinPoolVertically) {
    const leftLimit = nextProjectile.radius + railThickness;
    const rightLimit = poolWidth - nextProjectile.radius - railThickness;

    if (nextProjectile.x < leftLimit) {
      nextProjectile.x = leftLimit;
      nextProjectile.vx = Math.abs(nextProjectile.vx);
    }

    if (nextProjectile.x > rightLimit) {
      nextProjectile.x = rightLimit;
      nextProjectile.vx = -Math.abs(nextProjectile.vx);
    }
  }

  if (nextProjectile.ageMs >= nextProjectile.maxLifetimeMs) {
    return null;
  }

  const margin = nextProjectile.spawnMargin || 0;

  if (
    nextProjectile.y + nextProjectile.radius < -margin ||
    nextProjectile.y - nextProjectile.radius >
      nextProjectile.poolHeight + margin
  ) {
    return null;
  }

  return nextProjectile;
}

function checkProjectileBallCollision(projectile, ball) {
  const dx = projectile.x - ball.x;
  const dy = projectile.y - ball.y;
  const combinedRadius = projectile.radius + ball.radius;

  return dx * dx + dy * dy <= combinedRadius * combinedRadius;
}

function applyImpact(ball, projectile, impactForce) {
  const projectileSpeed = Math.hypot(projectile.vx, projectile.vy);

  if (projectileSpeed === 0) {
    return { ...ball };
  }

  const projectileDirX = projectile.vx / projectileSpeed;
  const projectileDirY = projectile.vy / projectileSpeed;

  const dx = ball.x - projectile.x;
  const dy = ball.y - projectile.y;
  const distance = Math.hypot(dx, dy);

  // The direction the ball actually flies off in is the line connecting the
  // two centers at impact -- not the projectile's own travel direction.
  // Falls back to the projectile's direction only in the degenerate case of
  // (near) exact overlap, which is a true dead-center hit anyway.
  const normalX = distance < 0.001 ? projectileDirX : dx / distance;
  const normalY = distance < 0.001 ? projectileDirY : dy / distance;

  // cosTheta: how aligned the projectile's motion is with that line.
  // 1 = dead-center hit (full transfer), 0 = a pure graze (no transfer),
  // exactly like an off-center shot in snooker/billiards.
  const cosTheta = projectileDirX * normalX + projectileDirY * normalY;
  const transferMagnitude = impactForce * Math.max(0, cosTheta);

  return {
    ...ball,
    vx: ball.vx + normalX * transferMagnitude,
    vy: ball.vy + normalY * transferMagnitude,
  };
}

function checkGoal(ball, poolHeight, poolWidth, goalWidth) {
  if (poolWidth !== undefined && goalWidth !== undefined) {
    const goalLeft = (poolWidth - goalWidth) / 2;
    const goalRight = goalLeft + goalWidth;
    const inGoalXRange =
      ball.x + ball.radius > goalLeft && ball.x - ball.radius < goalRight;
    if (!inGoalXRange) return null;
  }

  // Touches the line now, not "fully past" it.
  if (ball.y - ball.radius <= 0) return "top";
  if (ball.y + ball.radius >= poolHeight) return "bottom";

  return null;
}

function isDuckLoaded(duckAngle, toleranceDegrees) {
  const normalized = ((duckAngle + 180) % 360) - 180;
  return Math.abs(normalized) <= toleranceDegrees;
}

function advanceDuckAngle(
  currentAngle,
  angularVelocityDegPerSec,
  deltaSeconds,
) {
  return (
    (((currentAngle + angularVelocityDegPerSec * deltaSeconds) % 360) + 360) %
    360
  );
}

module.exports = {
  DEFAULT_CONFIG,
  createInitialState,
  stepBall,
  stepProjectile,
  checkProjectileBallCollision,
  applyImpact,
  checkGoal,
  isDuckLoaded,
  advanceDuckAngle,
};
