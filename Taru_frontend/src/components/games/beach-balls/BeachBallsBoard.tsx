import { useEffect, useRef, useState } from "react";
import COLORS from "../../../lib/theme";
import { disconnectSocket, socket } from "../../../lib/socket";
import {
  BeachBallsGameOverPayload,
  BeachBallsGameStartedPayload,
  BeachBallsGoalPayload,
  BeachBallsStatePayload,
  DUCK_LOAD_TOLERANCE_DEGREES,
  EVENT_NAMES,
  OpponentLeftPayload,
  POOL_HEIGHT,
  POOL_WIDTH,
} from "../../../types/beach-balls";

interface BeachBallsBoardProps {
  initialGame: BeachBallsGameStartedPayload;
  onExit: () => void;
}

type Side = "top" | "bottom";
type SplashKind = "trail" | "explosion";

interface Splash {
  x: number;
  y: number;
  startedAt: number;
  kind: SplashKind;
}

// How much extra canvas space to reserve above/below the pool for the ducks
// to sit in, and how far outside the pool edge each duck's center sits.
const DUCK_MARGIN = 120;
const DUCK_OFFSET = 55;
const TOTAL_WIDTH = POOL_WIDTH;
const TOTAL_HEIGHT = POOL_HEIGHT + DUCK_MARGIN * 2;

// Must match backend DEFAULT_CONFIG values exactly.
const GOAL_WIDTH = 200;
const RAIL_THICKNESS = 10;
const DUCK_ANGULAR_VELOCITY_DEG_PER_SEC = 110;
const TICK_MS = 50;

const TRAIL_SPLASH_DURATION_MS = 550;
const EXPLOSION_SPLASH_DURATION_MS = 500;
const TRAIL_MIN_SPEED = 1.5; // below this, the ball is "basically stopped"
const TRAIL_INTERVAL_MS = 110;

function normalizeAngle(angle: number) {
  return ((angle + 180) % 360) - 180;
}

function isDuckLoaded(angle: number) {
  return Math.abs(normalizeAngle(angle)) <= DUCK_LOAD_TOLERANCE_DEGREES;
}

export default function BeachBallsBoard({
  initialGame,
  onExit,
}: BeachBallsBoardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const stateRef = useRef<BeachBallsStatePayload>({
    roomId: initialGame.roomId,
    ball: initialGame.ball,
    ducks: initialGame.ducks,
    projectiles: initialGame.projectiles || [],
    scores: initialGame.scores,
    pausedUntil: initialGame.pausedUntil || 0,
    topPlayerSocketId: initialGame.topPlayerSocketId,
    bottomPlayerSocketId: initialGame.bottomPlayerSocketId,
  });
  const lastUpdateRef = useRef<number>(Date.now());
  const splashesRef = useRef<Splash[]>([]);
  const lastTrailAtRef = useRef<number>(0);
  const gameOverTimeoutRef = useRef<number | null>(null);

  const [availableHeight, setAvailableHeight] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState<BeachBallsGameOverPayload | null>(
    null,
  );
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [goalMessage, setGoalMessage] = useState("");
  const [fireFlash, setFireFlash] = useState(false);

  const mySocketId = socket.id ?? "";

  const mySide: Side =
    mySocketId === initialGame.topPlayerSocketId ? "top" : "bottom";

  const opponentSocketId =
    mySide === "top"
      ? initialGame.bottomPlayerSocketId
      : initialGame.topPlayerSocketId;

  const sideColors: Record<Side, string> = {
    top: mySide === "top" ? "#E88973" : "#6E9CC7",
    bottom: mySide === "bottom" ? "#E88973" : "#6E9CC7",
  };

  // Measure actual available space on the page so the board never overflows,
  // regardless of whatever header/nav chrome sits above this component.
  useEffect(() => {
    const updateHeight = () => {
      if (!containerRef.current) return;
      const top = containerRef.current.getBoundingClientRect().top;
      const height = window.innerHeight - top - 16; // 16px bottom breathing room
      setAvailableHeight(Math.max(height, 320));
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    window.addEventListener("orientationchange", updateHeight);

    return () => {
      window.removeEventListener("resize", updateHeight);
      window.removeEventListener("orientationchange", updateHeight);
    };
  }, []);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const state = stateRef.current;

    const elapsedMs = Date.now() - lastUpdateRef.current;
    const elapsedTicks = elapsedMs / TICK_MS;

    const extrapolatedBall = {
      ...state.ball,
      x: state.ball.x + state.ball.vx * elapsedTicks,
      y: state.ball.y + state.ball.vy * elapsedTicks,
    };

    const extrapolatedProjectiles = state.projectiles.map((p) => ({
      ...p,
      x: p.x + p.vx * elapsedTicks,
      y: p.y + p.vy * elapsedTicks,
    }));

    const extrapolatedDucks = {
      top: {
        angle:
          state.ducks.top.angle +
          DUCK_ANGULAR_VELOCITY_DEG_PER_SEC * (elapsedMs / 1000),
      },
      bottom: {
        angle:
          state.ducks.bottom.angle +
          DUCK_ANGULAR_VELOCITY_DEG_PER_SEC * (elapsedMs / 1000),
      },
    };

    const dpr = window.devicePixelRatio || 1;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.scale(dpr, dpr);

    const renderY = (actualY: number) =>
      mySide === "top" ? POOL_HEIGHT - actualY : actualY;

    const toCanvasY = (renderYValue: number) => renderYValue + DUCK_MARGIN;

    const renderAngle = (actualAngle: number, side: Side) => {
      const radians = (actualAngle * Math.PI) / 180;

      let directionX =
        side === "bottom" ? Math.sin(radians) : -Math.sin(radians);
      let directionY =
        side === "bottom" ? -Math.cos(radians) : Math.cos(radians);

      if (mySide === "top") {
        directionY *= -1;
      }

      return Math.atan2(directionY, directionX);
    };

    // Pool background
    context.fillStyle = "#DCEFF5";
    context.fillRect(0, toCanvasY(0), POOL_WIDTH, POOL_HEIGHT);

    // Narrow goal openings, centered
    const goalLeft = (POOL_WIDTH - GOAL_WIDTH) / 2;

    context.fillStyle = "#FF6B5B";
    context.fillRect(goalLeft, toCanvasY(0), GOAL_WIDTH, 6);

    context.fillStyle = "#3FA9F5";
    context.fillRect(goalLeft, toCanvasY(POOL_HEIGHT - 6), GOAL_WIDTH, 6);

    // Side rails as solid bands, matching the physics rail thickness exactly
    // so the ball visually stops right at the rail's inner face.
    context.fillStyle = "#7093A6";
    context.fillRect(0, toCanvasY(0), RAIL_THICKNESS, POOL_HEIGHT);
    context.fillRect(
      POOL_WIDTH - RAIL_THICKNESS,
      toCanvasY(0),
      RAIL_THICKNESS,
      POOL_HEIGHT,
    );

    // --- Splashes: wake trail (small, frequent) + explosions (bigger, on hit) ---
    splashesRef.current = splashesRef.current.filter((s) => {
      const duration =
        s.kind === "trail"
          ? TRAIL_SPLASH_DURATION_MS
          : EXPLOSION_SPLASH_DURATION_MS;
      return Date.now() - s.startedAt < duration;
    });

    for (const splash of splashesRef.current) {
      const canvasX = splash.x;
      const canvasY = toCanvasY(renderY(splash.y));

      if (splash.kind === "trail") {
        const progress =
          (Date.now() - splash.startedAt) / TRAIL_SPLASH_DURATION_MS;
        const radius = 4 + progress * 24;
        const opacity = 1 - progress;

        context.beginPath();
        context.arc(canvasX, canvasY, radius, 0, Math.PI * 2);
        context.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        context.lineWidth = 2;
        context.stroke();
      } else {
        const progress =
          (Date.now() - splash.startedAt) / EXPLOSION_SPLASH_DURATION_MS;
        const opacity = 1 - progress;
        const rayLength = 6 + progress * 26;
        const rayCount = 8;

        context.save();
        context.translate(canvasX, canvasY);
        for (let i = 0; i < rayCount; i++) {
          const rayAngle = (i / rayCount) * Math.PI * 2;
          context.beginPath();
          context.moveTo(
            Math.cos(rayAngle) * rayLength * 0.4,
            Math.sin(rayAngle) * rayLength * 0.4,
          );
          context.lineTo(
            Math.cos(rayAngle) * rayLength,
            Math.sin(rayAngle) * rayLength,
          );
          context.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
          context.lineWidth = 3;
          context.stroke();
        }
        context.restore();
      }
    }

    // Emit a wake trail splash periodically while the ball is moving fast enough
    const ballSpeed = Math.hypot(extrapolatedBall.vx, extrapolatedBall.vy);
    if (
      ballSpeed > TRAIL_MIN_SPEED &&
      Date.now() - lastTrailAtRef.current > TRAIL_INTERVAL_MS
    ) {
      splashesRef.current.push({
        x: extrapolatedBall.x,
        y: extrapolatedBall.y,
        startedAt: Date.now(),
        kind: "trail",
      });
      lastTrailAtRef.current = Date.now();
    }

    // --- Ducks (floatie style: ring + small head, keeps the "loaded" glow hole) ---
    const drawDuck = (side: Side, label: string) => {
      const duck = extrapolatedDucks[side];
      const actualY = side === "top" ? -DUCK_OFFSET : POOL_HEIGHT + DUCK_OFFSET;
      const x = POOL_WIDTH / 2;
      const y = toCanvasY(renderY(actualY));
      const loaded = isDuckLoaded(duck.angle);
      const color = sideColors[side];

      context.save();
      context.translate(x, y);

      // Outer ring (inner-tube body)
      context.beginPath();
      context.arc(0, 0, 26, 0, Math.PI * 2);
      context.fillStyle = "#F6C94B";
      context.fill();

      // Inner hole — lights up with this duck's color when loaded
      context.beginPath();
      context.arc(0, 0, 13, 0, Math.PI * 2);
      context.fillStyle = loaded ? color : "#FBE8A6";
      context.fill();

      // Head rotates around the ring to show facing direction — this IS the
      // direction/loaded indicator now, replacing the old separate line.
      const facingAngle = renderAngle(duck.angle, side);
      const headDistance = 32;

      context.save();
      context.rotate(facingAngle);
      context.translate(headDistance, 0);

      context.beginPath();
      context.arc(0, 0, 10, 0, Math.PI * 2);
      context.fillStyle = "#F6C94B";
      context.fill();

      // Eye on the front-facing side of the head
      context.beginPath();
      context.arc(3, -2, 1.6, 0, Math.PI * 2);
      context.fillStyle = "#2B2B2B";
      context.fill();

      // Beak on the side of the head (perpendicular to the outward-facing axis),
      // pointing in the rotation direction rather than straight outward.
      context.beginPath();
      context.moveTo(2, -8);
      context.lineTo(10, -13);
      context.lineTo(6, -4);
      context.closePath();
      context.fillStyle = "#E8873D";
      context.fill();

      context.restore();

      context.restore();

      context.fillStyle = "#31546B";
      context.font = "600 13px Nunito, sans-serif";
      context.textAlign = "center";
      context.fillText(label, x, y + 46);
    };

    drawDuck(mySide, "You");
    drawDuck(mySide === "top" ? "bottom" : "top", "Opponent");

    // Projectiles
    for (const projectile of extrapolatedProjectiles) {
      const x = projectile.x;
      const y = toCanvasY(renderY(projectile.y));
      const ownerIsMe = projectile.ownerSocketId === mySocketId;

      context.beginPath();
      context.arc(x, y, projectile.radius, 0, Math.PI * 2);
      context.fillStyle = ownerIsMe ? "#E88973" : "#6E9CC7";
      context.fill();
    }

    // Beach ball — alternating colored wedges + gloss highlight
    const drawBeachBall = (x: number, y: number, radius: number) => {
      const wedgeColors = [
        "#F4C95D",
        "#FFFFFF",
        "#E88973",
        "#FFFFFF",
        "#6E9CC7",
        "#FFFFFF",
      ];
      const wedgeCount = wedgeColors.length;

      context.save();
      context.translate(x, y);

      for (let i = 0; i < wedgeCount; i++) {
        const startAngle = (i / wedgeCount) * Math.PI * 2;
        const endAngle = ((i + 1) / wedgeCount) * Math.PI * 2;

        context.beginPath();
        context.moveTo(0, 0);
        context.arc(0, 0, radius, startAngle, endAngle);
        context.closePath();
        context.fillStyle = wedgeColors[i];
        context.fill();
      }

      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.strokeStyle = "#6E6E6E";
      context.lineWidth = 2;
      context.stroke();

      //   context.beginPath();
      //   context.arc(-radius * 0.3, -radius * 0.3, radius * 0.22, 0, Math.PI * 2);
      //   context.fillStyle = "rgba(255, 255, 255, 0.55)";
      //   context.fill();

      context.restore();
    };

    drawBeachBall(
      extrapolatedBall.x,
      toCanvasY(renderY(extrapolatedBall.y)),
      extrapolatedBall.radius,
    );

    frameRef.current = window.requestAnimationFrame(draw);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = TOTAL_WIDTH * dpr;
      canvas.height = TOTAL_HEIGHT * dpr;
      canvas.style.aspectRatio = `${TOTAL_WIDTH} / ${TOTAL_HEIGHT}`;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    frameRef.current = window.requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resizeCanvas);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [mySide]);

  useEffect(() => {
    const handleState = (payload: BeachBallsStatePayload) => {
      if (payload.roomId !== initialGame.roomId) return;
      stateRef.current = payload;
      lastUpdateRef.current = Date.now();
    };

    const handleHit = (payload: { roomId: string; x: number; y: number }) => {
      if (payload.roomId !== initialGame.roomId) return;
      splashesRef.current.push({
        x: payload.x,
        y: payload.y,
        startedAt: Date.now(),
        kind: "explosion",
      });
    };

    const handleGoal = (payload: BeachBallsGoalPayload) => {
      if (payload.roomId !== initialGame.roomId) return;

      setGoalMessage("Goal!");
      window.setTimeout(() => setGoalMessage(""), 1000);
    };

    const handleGameOver = (payload: BeachBallsGameOverPayload) => {
      if (payload.roomId !== initialGame.roomId) return;

      gameOverTimeoutRef.current = window.setTimeout(() => {
        setGameOver(payload);

        if (frameRef.current !== null) {
          window.cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
      }, 1000); // let the "Goal!" popup finish first
    };

    const handleOpponentLeft = (payload: OpponentLeftPayload) => {
      if (payload.roomId !== initialGame.roomId) return;

      setOpponentLeft(true);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };

    socket.on(EVENT_NAMES.BEACH_BALLS_STATE, handleState);
    socket.on(EVENT_NAMES.BEACH_BALLS_HIT, handleHit);
    socket.on(EVENT_NAMES.BEACH_BALLS_GOAL, handleGoal);
    socket.on(EVENT_NAMES.BEACH_BALLS_GAME_OVER, handleGameOver);
    socket.on(EVENT_NAMES.OPPONENT_LEFT, handleOpponentLeft);

    return () => {
      socket.off(EVENT_NAMES.BEACH_BALLS_STATE, handleState);
      socket.off(EVENT_NAMES.BEACH_BALLS_HIT, handleHit);
      socket.off(EVENT_NAMES.BEACH_BALLS_GOAL, handleGoal);
      socket.off(EVENT_NAMES.BEACH_BALLS_GAME_OVER, handleGameOver);
      socket.off(EVENT_NAMES.OPPONENT_LEFT, handleOpponentLeft);

      if (gameOverTimeoutRef.current !== null) {
        window.clearTimeout(gameOverTimeoutRef.current);
      }
    };
  }, [initialGame.roomId]);

  const handleCanvasClick = () => {
    if (gameOver || opponentLeft) return;

    socket.emit(EVENT_NAMES.FIRE_PROJECTILE, {
      roomId: initialGame.roomId,
    });

    setFireFlash(true);
    window.setTimeout(() => setFireFlash(false), 120);
  };

  const leaveGame = () => {
    disconnectSocket();
    onExit();
  };

  const scores = gameOver ? gameOver.scores : stateRef.current.scores;
  const myScore = scores[mySocketId] || 0;
  const opponentScore = scores[opponentSocketId] || 0;

  if (opponentLeft) {
    return (
      <GameMessage
        title="Your opponent left the game"
        description="You can return to the games list and start another match."
        action={leaveGame}
      />
    );
  }

  if (gameOver) {
    const title =
      gameOver.winnerSocketId === null
        ? "It's a tie"
        : gameOver.winnerSocketId === mySocketId
          ? "You won"
          : "Your opponent won";

    return (
      <GameMessage
        title={title}
        description={`Your score: ${myScore}. Opponent score: ${opponentScore}.`}
        action={leaveGame}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="max-w-xl mx-auto flex flex-col"
      style={{
        height: availableHeight ?? "auto",
        maxHeight: availableHeight ?? undefined,
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes goalPopup {
            0% { opacity: 0; transform: scale(0.6); }
            15% { opacity: 1; transform: scale(1.15); }
            30% { opacity: 1; transform: scale(1); }
            75% { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(1.05); }
        }
        .goal-popup {
            animation: goalPopup 1s ease forwards;
        }
        `}</style>
      <div className="flex items-center justify-between py-2 shrink-0">
        <div>
          <h2 className="text-xl font-extrabold" style={{ color: COLORS.fg }}>
            Beach Balls
          </h2>
          <p className="text-sm" style={{ color: COLORS.fg2 }}>
            Click inside the pool to shoot the Beach Ball
          </p>
        </div>

        <button
          type="button"
          onClick={leaveGame}
          className="px-3 py-2 rounded-xl border hover:cursor-pointer text-xs font-bold"
          style={{ borderColor: COLORS.border, color: COLORS.fg2 }}
        >
          Leave
        </button>
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="rounded-2xl cursor-pointer"
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            width: "auto",
            height: "auto",
            aspectRatio: `${TOTAL_WIDTH} / ${TOTAL_HEIGHT}`,
            opacity: fireFlash ? 0.82 : 1,
          }}
          aria-label="Beach Balls game pool"
        />

        {goalMessage && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className="goal-popup text-4xl font-extrabold px-6 py-3 rounded-2xl"
              style={{
                color: COLORS.fg,
                background: "rgba(255, 255, 255, 0.85)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              }}
            >
              {goalMessage}
            </div>
          </div>
        )}
      </div>
      <div
        className="flex justify-between rounded-xl border px-4 py-3 text-sm my-2 shrink-0"
        style={{ background: COLORS.card, borderColor: COLORS.border }}
      >
        <span style={{ color: COLORS.fg }}>
          You: <strong>{myScore}</strong>
        </span>
        <span style={{ color: COLORS.fg2 }}>
          Opponent: <strong>{opponentScore}</strong>
        </span>
      </div>
    </div>
  );
}

function GameMessage({
  title,
  description,
  action,
  actionLabel = "Return to games",
}: {
  title: string;
  description: string;
  action: () => void;
  actionLabel?: string;
}) {
  return (
    <div
      className="max-w-xl mx-auto rounded-2xl border p-8 text-center"
      style={{ background: COLORS.card, borderColor: COLORS.border }}
    >
      <h2 className="text-xl font-extrabold mb-2" style={{ color: COLORS.fg }}>
        {title}
      </h2>

      <p className="text-sm mb-6" style={{ color: COLORS.fg2 }}>
        {description}
      </p>

      <button
        type="button"
        onClick={action}
        className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
        style={{ background: COLORS.primary }}
      >
        {actionLabel}
      </button>
    </div>
  );
}
