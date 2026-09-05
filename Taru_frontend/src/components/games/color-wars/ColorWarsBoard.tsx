import { useEffect, useRef, useState } from "react";
import COLORS from "../../../lib/theme";
import { disconnectSocket, socket } from "../../../lib/socket";
import VirtualJoystick from "./VirtualJoystick";
import {
  EVENT_NAMES,
  ColorWarsGameStartedPayload,
  ColorWarsGameOverPayload,
  ColorWarsStatePayload,
  Powerup,
} from "../../../types/color-wars";

interface ColorWarsBoardProps {
  initialGame: ColorWarsGameStartedPayload;
  onExit: () => void;
  onPlayAgain?: () => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// Micro-animation tracker type
type AnimatingPowerup = Powerup & { startTime: number };

export default function ColorWarsBoard({
  initialGame,
  onExit,
  onPlayAgain,
}: ColorWarsBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<Array<Array<string | null>>>(
    initialGame.grid.map((row) => [...row]),
  );

  const [game, setGame] = useState<ColorWarsGameStartedPayload>(initialGame);
  const [powerups, setPowerups] = useState<Powerup[]>([]);
  const [winner, setWinner] = useState<ColorWarsGameOverPayload | null>(null);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const lastEmitRef = useRef(0);
  const lastSentWasZeroRef = useRef(true);

  // Animation Refs
  const gameRef = useRef(game);
  const powerupsRef = useRef(powerups);
  const prevPowerupsRef = useRef<Powerup[]>([]);
  const animatingPickupsRef = useRef<AnimatingPowerup[]>([]);
  const playerPosRef = useRef<
    Record<string, { x: number; y: number; angle: number }>
  >({});
  const paintLayerRef = useRef<HTMLCanvasElement | null>(null);
  const lastPaintedPosRef = useRef<Record<string, { x: number; y: number }>>(
    {},
  );
  const PAINT_PX_PER_UNIT = 20; // fixed internal resolution, independent of screen size

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    powerupsRef.current = powerups;
  }, [powerups]);

  useEffect(() => {
    const cols = initialGame.floorCols;
    const rows = initialGame.floorRows;

    const layer = document.createElement("canvas");
    layer.width = cols * PAINT_PX_PER_UNIT;
    layer.height = rows * PAINT_PX_PER_UNIT;
    const ctx = layer.getContext("2d");
    if (ctx) {
      Object.values(initialGame.players).forEach((player) => {
        ctx.fillStyle = player.socketId === socket.id ? "#3b82f6" : "#ea580c";
        ctx.beginPath();
        ctx.arc(
          player.x * PAINT_PX_PER_UNIT,
          player.y * PAINT_PX_PER_UNIT,
          (player.rollerRadius ?? 3.6) * PAINT_PX_PER_UNIT,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        lastPaintedPosRef.current[player.socketId] = {
          x: player.x,
          y: player.y,
        };
      });
    }

    paintLayerRef.current = layer;
  }, []);

  // 1. Update handleState to ONLY update game state and powerups (remove paint drawing from here)
  useEffect(() => {
    const handleState = (payload: ColorWarsStatePayload) => {
      setGame((prev) => ({
        ...prev,
        roomId: payload.roomId,
        floorCols: payload.floorCols,
        floorRows: payload.floorRows,
        remainingMs: payload.remainingMs,
        players: payload.players,
      }));

      setPowerups(payload.powerups);

      for (const cell of payload.changedCells) {
        if (!cell.owner) continue;
        const row = cell.row;
        const col = cell.col;

        if (
          row >= 0 &&
          row < gridRef.current.length &&
          col >= 0 &&
          col < gridRef.current[0].length
        ) {
          gridRef.current[row][col] = cell.owner;
        }
      }
    };

    const handleGameOver = (payload: ColorWarsGameOverPayload) => {
      setWinner(payload);
      gridRef.current = payload.grid.map((row) => [...row]);
    };

    const handleOpponentLeft = () => {
      setOpponentLeft(true);
    };

    socket.on(EVENT_NAMES.COLOR_WARS_STATE, handleState);
    socket.on(EVENT_NAMES.COLOR_WARS_GAME_OVER, handleGameOver);
    socket.on(EVENT_NAMES.OPPONENT_LEFT, handleOpponentLeft);

    return () => {
      socket.off(EVENT_NAMES.COLOR_WARS_STATE, handleState);
      socket.off(EVENT_NAMES.COLOR_WARS_GAME_OVER, handleGameOver);
      socket.off(EVENT_NAMES.OPPONENT_LEFT, handleOpponentLeft);
    };
  }, []);

  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setViewport({
        width: Math.max(rect.width, 260),
        height: Math.max(rect.height, 260),
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  const emitDirection = (dx: number, dy: number) => {
    const now = Date.now();
    const x = clamp(dx, -1, 1);
    const y = clamp(dy, -1, 1);
    const isStopped = Math.abs(x) < 0.02 && Math.abs(y) < 0.02;

    if (isStopped) {
      // Always send the stop immediately — never throttle this, or the
      // player keeps drifting on the server indefinitely.
      if (!lastSentWasZeroRef.current) {
        lastSentWasZeroRef.current = true;
        lastEmitRef.current = now;
        socket.emit(EVENT_NAMES.SET_DIRECTION, {
          roomId: game.roomId,
          dx: 0,
          dy: 0,
        });
      }
      return;
    }

    lastSentWasZeroRef.current = false;

    // Throttle only continuous non-zero updates.
    if (now - lastEmitRef.current < 80) return;
    lastEmitRef.current = now;
    socket.emit(EVENT_NAMES.SET_DIRECTION, {
      roomId: game.roomId,
      dx: x,
      dy: y,
    });
  };

  // 60FPS Render Loop (Progressive Paint + Roller sync)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const currentGame = gameRef.current;
      const currentPowerups = powerupsRef.current;
      const prevPowerups = prevPowerupsRef.current;

      prevPowerups.forEach((p) => {
        if (!currentPowerups.find((cp) => cp.id === p.id)) {
          animatingPickupsRef.current.push({ ...p, startTime: Date.now() });

          // ONLY trigger a giant paint circle when a paint bomb is picked up!
          if (p.type === "paint_bomb" && paintLayerRef.current) {
            const paintCtx = paintLayerRef.current.getContext("2d");
            if (paintCtx) {
              // The server just updated the grid. Whoever picked it up now owns this cell.
              const ownerSocketId = gridRef.current[p.row][p.col];

              if (ownerSocketId) {
                paintCtx.fillStyle =
                  ownerSocketId === socket.id ? "#3b82f6" : "#ea580c";
                paintCtx.beginPath();
                // 10.4 perfectly matches the server's PAINT_BOMB_RADIUS
                paintCtx.arc(
                  (p.col + 0.5) * PAINT_PX_PER_UNIT,
                  (p.row + 0.5) * PAINT_PX_PER_UNIT,
                  10.4 * PAINT_PX_PER_UNIT,
                  0,
                  Math.PI * 2,
                );
                paintCtx.fill();
              }
            }
          }
        }
      });
      prevPowerupsRef.current = currentPowerups;

      const cols = currentGame.floorCols || 60;
      const rows = currentGame.floorRows || 40;

      const floorAspect = cols / rows;
      const containerAspect = (viewport.width - 2) / (viewport.height - 2);

      let drawWidth: number;
      let drawHeight: number;

      if (containerAspect > floorAspect) {
        drawHeight = viewport.height - 2;
        drawWidth = drawHeight * floorAspect;
      } else {
        drawWidth = viewport.width - 2;
        drawHeight = drawWidth / floorAspect;
      }

      canvas.width = drawWidth;
      canvas.height = drawHeight;

      const cellW = drawWidth / cols;
      const cellH = drawHeight / rows;

      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, drawWidth, drawHeight);

      // --- PROGRESSIVE 60FPS PAINT DRAWING ---
      // Drawing paint here using interpolated player positions (p.x, p.y)
      // guarantees the paint trail matches the roller's exact position instantly.
      const paintLayer = paintLayerRef.current;
      if (paintLayer) {
        const paintCtx = paintLayer.getContext("2d");
        if (paintCtx) {
          Object.values(currentGame.players || {}).forEach((player) => {
            const targetX = player.x;
            const targetY = player.y;

            if (!playerPosRef.current[player.socketId]) {
              playerPosRef.current[player.socketId] = {
                x: targetX,
                y: targetY,
                angle: 0,
              };
            }

            const p = playerPosRef.current[player.socketId];
            const last = lastPaintedPosRef.current[player.socketId] ?? {
              x: targetX,
              y: targetY,
            };

            // Smooth interpolation
            p.x += (targetX - p.x) * 0.25;
            p.y += (targetY - p.y) * 0.25;

            const rollerRadius = player.rollerRadius ?? 1.8;

            if (Math.hypot(p.x - last.x, p.y - last.y) > 0.001) {
              paintCtx.strokeStyle =
                player.socketId === socket.id ? "#3b82f6" : "#ea580c";

              // --- UPDATE THIS LINE ---
              // Multiplied by 2.2 to match the roller graphic's physical width
              paintCtx.lineWidth = rollerRadius * PAINT_PX_PER_UNIT * 1.6;

              paintCtx.lineCap = "round";
              paintCtx.lineJoin = "round";
              paintCtx.beginPath();
              paintCtx.moveTo(
                last.x * PAINT_PX_PER_UNIT,
                last.y * PAINT_PX_PER_UNIT,
              );
              paintCtx.lineTo(p.x * PAINT_PX_PER_UNIT, p.y * PAINT_PX_PER_UNIT);
              paintCtx.stroke();

              lastPaintedPosRef.current[player.socketId] = { x: p.x, y: p.y };
            }
          });
        }

        ctx.drawImage(paintLayer, 0, 0, drawWidth, drawHeight);
      }

      // Helper function to draw powerup icons
      const drawPowerupIcon = (
        type: string,
        x: number,
        y: number,
        alpha = 1,
      ) => {
        ctx.save();
        ctx.translate(x, y);
        const iconScale = Math.max(cellW, cellH) / 6;
        ctx.scale(iconScale, iconScale);
        ctx.globalAlpha = alpha;

        // White circular badge, consistent across all three types
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#111827";
        ctx.strokeStyle = "#111827";

        if (type === "speed_boost") {
          ctx.beginPath();
          ctx.moveTo(1, -6);
          ctx.lineTo(-4, 1);
          ctx.lineTo(-0.5, 1.5);
          ctx.lineTo(-2.5, 7);
          ctx.lineTo(4.5, -0.5);
          ctx.lineTo(1, -1);
          ctx.closePath();
          ctx.fill();
        } else if (type === "size_boost") {
          ctx.lineWidth = 1.4;
          for (let i = 0; i < 4; i++) {
            ctx.rotate(Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, 2);
            ctx.lineTo(0, 5.5);
            ctx.moveTo(-2, 3.8);
            ctx.lineTo(0, 5.5);
            ctx.lineTo(2, 3.8);
            ctx.stroke();
          }
        } else {
          ctx.beginPath();
          ctx.arc(0, 1.5, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(0, -2.5);
          ctx.lineTo(0, -5);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(1.5, -6, 1, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      };

      currentPowerups.forEach((powerup) => {
        drawPowerupIcon(
          powerup.type,
          powerup.col * cellW + cellW / 2,
          powerup.row * cellH + cellH / 2,
        );
      });

      animatingPickupsRef.current = animatingPickupsRef.current.filter((p) => {
        const age = Date.now() - p.startTime;
        const duration = 400;
        if (age > duration) return false;

        const progress = age / duration;
        const scale = 1 + progress * 2.5;
        const alpha = 1 - progress;

        ctx.save();
        ctx.translate(p.col * cellW + cellW / 2, p.row * cellH + cellH / 2);
        ctx.scale(scale, scale);
        drawPowerupIcon(p.type, 0, 0, alpha);
        ctx.restore();

        return true;
      });

      // Render Roller Graphics on top of synchronized paint
      Object.values(currentGame.players || {}).forEach((player) => {
        const p = playerPosRef.current[player.socketId];
        if (!p) return;

        const dx = player.x - p.x;
        const dy = player.y - p.y;
        if (Math.hypot(dx, dy) > 0.05) {
          p.angle = Math.atan2(dy, dx);
        }

        const x = p.x * cellW;
        const y = p.y * cellH;
        const radius =
          (player.rollerRadius ?? 1.8) * Math.max(cellW, cellH) * 0.55;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.angle);
        ctx.translate(radius * 1.2, 0);

        const rollerW = radius * 0.8;
        const rollerH = radius * 2.5;

        // Stick & Handle
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        // @ts-ignore
        ctx.roundRect(-radius * 2.2, -4, radius * 1.5, 8, 4);
        ctx.fill();

        // Metal Wire Frame
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-radius * 1.2, 0);
        ctx.lineTo(-radius * 0.6, 0);
        ctx.lineTo(-radius * 0.6, -rollerH / 2 - 4);
        ctx.lineTo(0, -rollerH / 2 - 4);
        ctx.lineTo(0, -rollerH / 2);
        ctx.stroke();

        // Roller Cylinder Cover
        ctx.fillStyle = player.socketId === socket.id ? "#2563eb" : "#ea580c";
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;

        ctx.beginPath();
        // @ts-ignore
        ctx.roundRect(-rollerW / 2, -rollerH / 2, rollerW, rollerH, 4);
        ctx.fill();

        ctx.restore();
      });

      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, drawWidth, drawHeight);

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [viewport]);

  const territory = (() => {
    const counts: Record<string, number> = {};
    const allCells = gridRef.current.flat();

    for (const owner of allCells) {
      if (!owner) continue;
      counts[owner] = (counts[owner] || 0) + 1;
    }

    const total = allCells.length || 1;
    const me = socket.id ? counts[socket.id] || 0 : 0;
    const opp = Object.entries(game.players).reduce((sum, [id]) => {
      if (id === socket.id) return sum;
      return sum + (counts[id] || 0);
    }, 0);

    return {
      me: (me / total) * 100,
      opp: (opp / total) * 100,
    };
  })();

  const leaveGame = () => {
    disconnectSocket();
    onExit();
  };

  const gameOverText =
    winner && winner.winnerSocketId === socket.id
      ? "You won!"
      : winner && winner.winnerSocketId === null
        ? "It's a tie"
        : "Your opponent won";

  if (opponentLeft) {
    return (
      <div
        className="max-w-xl mx-auto rounded-2xl border p-8 text-center"
        style={{ background: COLORS.card, borderColor: COLORS.border }}
      >
        <h2
          className="text-xl font-extrabold mb-2"
          style={{ color: COLORS.fg }}
        >
          Your opponent left the game
        </h2>
        <p className="text-sm mb-6" style={{ color: COLORS.fg2 }}>
          You can return to the games list and start another match.
        </p>
        <button
          type="button"
          onClick={leaveGame}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:cursor-pointer"
          style={{ background: COLORS.primary }}
        >
          Return to games
        </button>
      </div>
    );
  }

  if (winner) {
    return (
      <div
        className="max-w-xl mx-auto rounded-2xl border p-8 text-center"
        style={{ background: COLORS.card, borderColor: COLORS.border }}
      >
        <h2
          className="text-xl font-extrabold mb-2"
          style={{ color: COLORS.fg }}
        >
          {gameOverText}
        </h2>
        <p className="text-sm mb-6" style={{ color: COLORS.fg2 }}>
          Final territory — You {territory.me.toFixed(1)}% / Opponent{" "}
          {territory.opp.toFixed(1)}%.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          {onPlayAgain && (
            <button
              type="button"
              onClick={onPlayAgain}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: COLORS.primary }}
            >
              Play again
            </button>
          )}
          <button
            type="button"
            onClick={leaveGame}
            className="px-5 py-2.5 rounded-xl border text-sm font-bold"
            style={{ borderColor: COLORS.border, color: COLORS.fg }}
          >
            Return to all activities
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="max-w-2xl mx-auto flex flex-col"
      style={{
        height: "80vh",
        maxHeight: "80vh",
        minHeight: 420,
        overflow: "hidden",
      }}
    >
      <div className="flex items-center justify-between shrink-0 py-3 px-2">
        <div>
          <h2 className="text-xl font-extrabold" style={{ color: COLORS.fg }}>
            Color Wars
          </h2>
          <p className="text-sm" style={{ color: COLORS.fg2 }}>
            {Math.max(0, Math.ceil(game.remainingMs / 1000))}s left
          </p>
        </div>

        <button
          type="button"
          onClick={leaveGame}
          className="px-3 py-2 rounded-xl border text-xs font-bold hover:cursor-pointer"
          style={{ borderColor: COLORS.border, color: COLORS.fg2 }}
        >
          Leave
        </button>
      </div>

      <div
        className="shrink-0 mx-2 mb-2 px-3 py-2 flex justify-between rounded-lg border bg-white"
        style={{ borderColor: COLORS.border }}
      >
        <span className="text-xs font-bold" style={{ color: COLORS.fg }}>
          Your territory:{" "}
          <strong style={{ color: "#2563EB" }}>
            {territory.me.toFixed(1)}%
          </strong>
        </span>
        <span className="text-xs font-bold" style={{ color: COLORS.fg }}>
          Opponent territory:{" "}
          <strong style={{ color: "#EA580C" }}>
            {territory.opp.toFixed(1)}%
          </strong>
        </span>
      </div>

      <div
        className="relative flex-1 min-h-0 overflow-hidden rounded-2xl border bg-[#f8fafc]"
        style={{
          borderColor: COLORS.border,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            // objectFit: contain was removed here so the canvas fills exactly without letterboxing
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 24,
            zIndex: 2,
            pointerEvents: "auto",
          }}
        >
          <VirtualJoystick onDirectionChange={emitDirection} />
        </div>
      </div>
    </div>
  );
}
