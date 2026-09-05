import { useEffect, useMemo, useRef, useState } from "react";
import COLORS from "../../../lib/theme";
import { disconnectSocket, socket } from "../../../lib/socket";
import {
  EVENT_NAMES,
  GRID_WIDTH,
  GRID_HEIGHT,
  SHIP_SIZES,
  Cell,
  SeaBattleGameOverPayload,
  ShotResultPayload,
  Ship,
} from "../../../types/sea-battle";

interface SeaBattleBoardProps {
  roomId: string;
  myFleet: Ship[];
  initialTurnSocketId: string;
  onExit: () => void;
  onPlayAgain?: () => void;
}

interface ShotLogEntry {
  row: number;
  col: number;
  result: "hit" | "miss";
}

interface PendingResult {
  result: "hit" | "miss";
  sunkShipCells: Cell[] | null;
}

interface InFlightShot {
  id: string;
  row: number;
  col: number;
  startTime: number;
}

interface Explosion {
  id: string;
  x: number;
  y: number;
  startedAt: number;
}

const FLIGHT_DURATION_MS = 550;
const ARC_HEIGHT_PX = 90;
const CANNON_GAP_PX = 20;
const EXPLOSION_DURATION_MS = 450;

function cellKey(row: number, col: number) {
  return `${row}:${col}`;
}

function useGridPixelSize(wrapperRef: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const measure = () => {
      const box = element.getBoundingClientRect();
      const cell = Math.floor(
        Math.min(box.width / GRID_WIDTH, box.height / GRID_HEIGHT),
      );
      const safeCell = Math.max(cell, 12);
      setSize({
        width: safeCell * GRID_WIDTH,
        height: safeCell * GRID_HEIGHT,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [wrapperRef]);

  return size;
}

function getCellCenterPx(
  gridEl: HTMLDivElement,
  row: number,
  col: number,
): { x: number; y: number } | null {
  const cellEl = gridEl.querySelector<HTMLElement>(
    `[data-row="${row}"][data-col="${col}"]`,
  );
  if (!cellEl) return null;

  const gridRect = gridEl.getBoundingClientRect();
  const cellRect = cellEl.getBoundingClientRect();

  return {
    x: cellRect.left + cellRect.width / 2 - gridRect.left,
    y: cellRect.top + cellRect.height / 2 - gridRect.top,
  };
}

function summarizeFleetSizes(sizes: number[]) {
  const counts = new Map<number, number>();
  sizes.forEach((size) => counts.set(size, (counts.get(size) || 0) + 1));
  return counts;
}

export default function SeaBattleBoard({
  roomId,
  myFleet,
  initialTurnSocketId,
  onExit,
  onPlayAgain,
}: SeaBattleBoardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const attackWrapperRef = useRef<HTMLDivElement | null>(null);
  const attackGridRef = useRef<HTMLDivElement | null>(null);
  const fleetWrapperRef = useRef<HTMLDivElement | null>(null);

  const [availableHeight, setAvailableHeight] = useState<number | null>(null);

  const inFlightRef = useRef<Map<string, InFlightShot>>(new Map());
  const pendingResultsRef = useRef<Map<string, PendingResult>>(new Map());
  const explosionsRef = useRef<Map<string, Explosion>>(new Map());
  const cannonAngleRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const [, forceRender] = useState(0);

  const mySocketId = socket.id ?? "";
  const [currentTurnSocketId, setCurrentTurnSocketId] =
    useState(initialTurnSocketId);
  const [myShotsFired, setMyShotsFired] = useState<ShotLogEntry[]>([]);
  const [opponentShotsReceived, setOpponentShotsReceived] = useState<
    ShotLogEntry[]
  >([]);
  const [sunkShipCellKeys, setSunkShipCellKeys] = useState<Set<string>>(
    new Set(),
  );
  const [sunkShipSizes, setSunkShipSizes] = useState<number[]>([]);
  const [gameOver, setGameOver] = useState<SeaBattleGameOverPayload | null>(
    null,
  );
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [error, setError] = useState("");

  const attackSize = useGridPixelSize(attackWrapperRef);
  const fleetSize = useGridPixelSize(fleetWrapperRef);

  useEffect(() => {
    const updateHeight = () => {
      if (!containerRef.current) return;
      const top = containerRef.current.getBoundingClientRect().top;
      const height = window.innerHeight - top - 16;
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

  const myFleetCells = useMemo(() => {
    const set = new Map<string, boolean>();
    myFleet.forEach((ship) =>
      ship.cells.forEach((cell) => set.set(cellKey(cell.row, cell.col), true)),
    );
    return set;
  }, [myFleet]);

  const myShotMap = useMemo(() => {
    const map = new Map<string, "hit" | "miss">();
    myShotsFired.forEach((shot) =>
      map.set(cellKey(shot.row, shot.col), shot.result),
    );
    return map;
  }, [myShotsFired]);

  const incomingShotMap = useMemo(() => {
    const map = new Map<string, "hit" | "miss">();
    opponentShotsReceived.forEach((shot) =>
      map.set(cellKey(shot.row, shot.col), shot.result),
    );
    return map;
  }, [opponentShotsReceived]);

  const myHitCount = myShotsFired.filter((s) => s.result === "hit").length;
  const opponentHitCount = opponentShotsReceived.filter(
    (s) => s.result === "hit",
  ).length;

  const totalFleetBySize = useMemo(() => summarizeFleetSizes(SHIP_SIZES), []);
  const sunkFleetBySize = useMemo(
    () => summarizeFleetSizes(sunkShipSizes),
    [sunkShipSizes],
  );
  const uniqueSizesDescending = useMemo(
    () => Array.from(new Set(SHIP_SIZES)).sort((a, b) => b - a),
    [],
  );

  const finalizeShot = (shot: InFlightShot, pending: PendingResult) => {
    setMyShotsFired((prev) => [
      ...prev,
      { row: shot.row, col: shot.col, result: pending.result },
    ]);

    if (pending.sunkShipCells) {
      const cells = pending.sunkShipCells;
      setSunkShipCellKeys((prev) => {
        const next = new Set(prev);
        cells.forEach((cell) => next.add(cellKey(cell.row, cell.col)));
        return next;
      });
      setSunkShipSizes((prev) => [...prev, cells.length]);
    }

    const gridEl = attackGridRef.current;
    if (gridEl) {
      const point = getCellCenterPx(gridEl, shot.row, shot.col);
      if (point) {
        const explosionId = `${shot.id}-explosion`;
        explosionsRef.current.set(explosionId, {
          id: explosionId,
          x: point.x,
          y: point.y,
          startedAt: Date.now(),
        });
      }
    }

    inFlightRef.current.delete(shot.id);
    pendingResultsRef.current.delete(cellKey(shot.row, shot.col));
  };

  const ensureAnimationLoop = () => {
    if (animFrameRef.current !== null) return;

    const step = () => {
      const now = Date.now();
      const gridEl = attackGridRef.current;

      const flying = Array.from(inFlightRef.current.values());
      const aimingAt = flying[flying.length - 1];
      if (aimingAt && gridEl) {
        const target = getCellCenterPx(gridEl, aimingAt.row, aimingAt.col);
        if (target) {
          const cannonPoint = {
            x: attackSize.width / 2,
            y: attackSize.height + CANNON_GAP_PX,
          };
          const dx = target.x - cannonPoint.x;
          const dy = target.y - cannonPoint.y;
          cannonAngleRef.current = (Math.atan2(dx, -dy) * 180) / Math.PI;
        }
      }

      inFlightRef.current.forEach((shot) => {
        const elapsed = now - shot.startTime;
        if (elapsed >= FLIGHT_DURATION_MS) {
          const pending = pendingResultsRef.current.get(
            cellKey(shot.row, shot.col),
          );
          if (pending) {
            finalizeShot(shot, pending);
          }
        }
      });

      const expiredExplosions: string[] = [];
      explosionsRef.current.forEach((explosion, id) => {
        if (now - explosion.startedAt >= EXPLOSION_DURATION_MS) {
          expiredExplosions.push(id);
        }
      });
      expiredExplosions.forEach((id) => explosionsRef.current.delete(id));

      forceRender((n) => n + 1);

      if (inFlightRef.current.size > 0 || explosionsRef.current.size > 0) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleShotResult = (payload: ShotResultPayload) => {
      if (payload.roomId !== roomId) return;

      setCurrentTurnSocketId(payload.currentTurnSocketId);

      if (payload.shooterSocketId === mySocketId) {
        pendingResultsRef.current.set(cellKey(payload.row, payload.col), {
          result: payload.result,
          sunkShipCells: payload.sunkShipCells,
        });
        ensureAnimationLoop();
      } else {
        setOpponentShotsReceived((prev) => [
          ...prev,
          { row: payload.row, col: payload.col, result: payload.result },
        ]);
      }
    };

    const handleGameOver = (payload: SeaBattleGameOverPayload) => {
      if (payload.roomId !== roomId) return;
      setGameOver(payload);
    };

    const handleOpponentLeft = () => setOpponentLeft(true);

    const handleError = (payload: { message?: string }) => {
      setError(payload.message || "Unable to take that shot.");
    };

    socket.on(EVENT_NAMES.SHOT_RESULT, handleShotResult);
    socket.on(EVENT_NAMES.SEA_BATTLE_GAME_OVER, handleGameOver);
    socket.on(EVENT_NAMES.OPPONENT_LEFT, handleOpponentLeft);
    socket.on(EVENT_NAMES.ERROR, handleError);

    return () => {
      socket.off(EVENT_NAMES.SHOT_RESULT, handleShotResult);
      socket.off(EVENT_NAMES.SEA_BATTLE_GAME_OVER, handleGameOver);
      socket.off(EVENT_NAMES.OPPONENT_LEFT, handleOpponentLeft);
      socket.off(EVENT_NAMES.ERROR, handleError);
    };
  }, [mySocketId, roomId]);

  const canFire =
    currentTurnSocketId === mySocketId && !gameOver && !opponentLeft;

  const fireShot = (row: number, col: number) => {
    if (!canFire) return;

    const alreadyShot = myShotsFired.some(
      (shot) => shot.row === row && shot.col === col,
    );
    if (alreadyShot) return;

    const isAlreadyInFlight = Array.from(inFlightRef.current.values()).some(
      (shot) => shot.row === row && shot.col === col,
    );
    if (isAlreadyInFlight) return;

    const id = `${Date.now()}-${row}-${col}`;
    inFlightRef.current.set(id, { id, row, col, startTime: Date.now() });
    ensureAnimationLoop();

    socket.emit(EVENT_NAMES.FIRE_SHOT, { roomId, row, col });
  };

  // FIX: this previously only called onExit(), never actually disconnecting
  // the socket — so the server never saw a disconnect event and had no way
  // to notify the opponent. That's exactly why a remaining player got stuck
  // when the other one "left."
  const leaveGame = () => {
    disconnectSocket();
    onExit();
  };

  function renderGrid(
    wrapperRef: React.RefObject<HTMLDivElement | null>,
    gridElRef: React.RefObject<HTMLDivElement | null> | null,
    pixelSize: { width: number; height: number },
    cells: Map<string, boolean>,
    shotResults: Map<string, "hit" | "miss">,
    interactive: boolean,
    onCellClick?: (row: number, col: number) => void,
    showCannon?: boolean,
    sunkKeys?: Set<string>,
  ) {
    return (
      <div
        ref={wrapperRef}
        className="flex-1 min-h-0 flex items-center justify-center"
        style={{ paddingBottom: showCannon ? 44 : 0 }}
      >
        <div
          ref={gridElRef ?? undefined}
          className="relative grid gap-1 p-2 rounded-2xl"
          style={{
            width: pixelSize.width || undefined,
            height: pixelSize.height || undefined,
            gridTemplateColumns: `repeat(${GRID_WIDTH}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${GRID_HEIGHT}, minmax(0, 1fr))`,
            background: "#EAF5FF",
            border: `1px solid ${COLORS.border}`,
            overflow: "visible",
          }}
        >
          {showCannon && (
            <div
              className="absolute inset-0"
              style={{ pointerEvents: "none", zIndex: 10, overflow: "visible" }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: pixelSize.height + CANNON_GAP_PX,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    width: 20,
                    height: 20,
                    background: "#1F2937",
                    borderRadius: "50%",
                    left: -10,
                    top: -4,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    width: 8,
                    height: 24,
                    background: "#374151",
                    borderRadius: 3,
                    left: -4,
                    top: -24,
                    transformOrigin: "bottom center",
                    transform: `rotate(${cannonAngleRef.current}deg)`,
                  }}
                />
              </div>

              {Array.from(inFlightRef.current.values()).map((shot) => {
                const gridEl = gridElRef?.current;
                if (!gridEl) return null;

                const target = getCellCenterPx(gridEl, shot.row, shot.col);
                if (!target) return null;

                const cannonPoint = {
                  x: pixelSize.width / 2,
                  y: pixelSize.height + CANNON_GAP_PX,
                };

                const now = Date.now();
                const elapsed = now - shot.startTime;
                const progress = Math.min(elapsed / FLIGHT_DURATION_MS, 1);
                const hasLanded = elapsed >= FLIGHT_DURATION_MS;
                const hasResult = pendingResultsRef.current.has(
                  cellKey(shot.row, shot.col),
                );

                if (hasLanded) {
                  if (!hasResult) {
                    return (
                      <div
                        key={shot.id}
                        style={{
                          position: "absolute",
                          left: target.x - 5,
                          top: target.y - 5,
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: "#EF4444",
                          opacity: 0.6 + 0.4 * Math.sin(now / 120),
                        }}
                      />
                    );
                  }
                  return null;
                }

                const linearX =
                  cannonPoint.x + (target.x - cannonPoint.x) * progress;
                const linearY =
                  cannonPoint.y + (target.y - cannonPoint.y) * progress;
                const arc = -ARC_HEIGHT_PX * Math.sin(Math.PI * progress);
                const currentY = linearY + arc;

                return (
                  <div
                    key={shot.id}
                    style={{
                      position: "absolute",
                      left: linearX - 5,
                      top: currentY - 5,
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "#374151",
                    }}
                  />
                );
              })}

              {Array.from(explosionsRef.current.values()).map((explosion) => {
                const age = Date.now() - explosion.startedAt;
                const progress = Math.min(age / EXPLOSION_DURATION_MS, 1);
                const opacity = 1 - progress;
                const rayLength = 6 + progress * 22;
                const rayCount = 8;

                return (
                  <svg
                    key={explosion.id}
                    style={{
                      position: "absolute",
                      left: explosion.x - 30,
                      top: explosion.y - 30,
                      width: 60,
                      height: 60,
                      overflow: "visible",
                    }}
                  >
                    <g transform="translate(30, 30)">
                      {Array.from({ length: rayCount }).map((_, i) => {
                        const rayAngle = (i / rayCount) * Math.PI * 2;
                        return (
                          <line
                            key={i}
                            x1={Math.cos(rayAngle) * rayLength * 0.35}
                            y1={Math.sin(rayAngle) * rayLength * 0.35}
                            x2={Math.cos(rayAngle) * rayLength}
                            y2={Math.sin(rayAngle) * rayLength}
                            stroke={`rgba(239, 68, 68, ${opacity})`}
                            strokeWidth={3}
                          />
                        );
                      })}
                    </g>
                  </svg>
                );
              })}
            </div>
          )}

          {Array.from({ length: GRID_WIDTH * GRID_HEIGHT }).map((_, index) => {
            const row = Math.floor(index / GRID_WIDTH);
            const col = index % GRID_WIDTH;
            const key = cellKey(row, col);
            const hasShip = cells.has(key);
            const shotResult = shotResults.get(key);
            const isSunk = sunkKeys?.has(key) ?? false;

            let background = hasShip && !interactive ? "#BFDBFE" : "#F7FBFF";
            let borderColor = "#D7E8F7";
            let symbol: string | null = null;
            let symbolColor = "#6B7280";

            if (shotResult === "hit") {
              if (isSunk) {
                background = "#7F1D1D";
                borderColor = "#450A0A";
              } else {
                background = "#4B5563";
                borderColor = "#1F2937";
              }
              symbol = "\u25CF";
              symbolColor = "#F9FAFB";
            } else if (shotResult === "miss") {
              background = "#F3F4F6";
              borderColor = "#D1D5DB";
              symbol = "\u2715";
              symbolColor = "#9CA3AF";
            }

            return (
              <button
                key={key}
                type="button"
                data-row={row}
                data-col={col}
                onClick={() => {
                  if (interactive && onCellClick) onCellClick(row, col);
                }}
                disabled={!interactive}
                className="rounded-md border flex items-center justify-center"
                style={{
                  borderColor,
                  background,
                  minWidth: 0,
                  minHeight: 0,
                  cursor: interactive ? "pointer" : "default",
                }}
              >
                {symbol && (
                  <span
                    className="font-bold"
                    style={{ color: symbolColor, fontSize: "0.7em" }}
                  >
                    {symbol}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

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

  if (gameOver) {
    const title =
      gameOver.winnerSocketId === mySocketId ? "You won" : "You lost";

    return (
      <div
        className="max-w-xl mx-auto rounded-2xl border p-8 text-center"
        style={{ background: COLORS.card, borderColor: COLORS.border }}
      >
        <h2
          className="text-xl font-extrabold mb-2"
          style={{ color: COLORS.fg }}
        >
          {title}
        </h2>
        <p className="text-sm mb-6" style={{ color: COLORS.fg2 }}>
          Your hits: {myHitCount}. Opponent hits: {opponentHitCount}.
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
        height: availableHeight ?? "auto",
        maxHeight: availableHeight ?? undefined,
        overflow: "hidden",
      }}
    >
      <div className="flex items-center justify-between shrink-0 py-3 px-2">
        <div>
          <h2 className="text-xl font-extrabold" style={{ color: COLORS.fg }}>
            Sea Battle
          </h2>
          <p className="text-sm" style={{ color: COLORS.fg2 }}>
            {currentTurnSocketId === mySocketId
              ? "Your turn"
              : "Opponent's turn"}
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

      {error && (
        <div
          className="shrink-0 mx-2 mb-2 rounded-xl border px-3 py-2 text-xs"
          style={{
            background: "rgba(255, 102, 102, 0.08)",
            borderColor: "rgba(255, 102, 102, 0.2)",
            color: "#d14343",
          }}
        >
          {error}
        </div>
      )}

      <div
        className="shrink-0 mx-2 mb-2 px-3 py-2 flex justify-between rounded-lg border"
        style={{ borderColor: COLORS.border }}
      >
        <span className="text-xs font-bold" style={{ color: COLORS.fg }}>
          Your hits: <strong style={{ color: "#2563EB" }}>{myHitCount}</strong>
        </span>
        <span className="text-xs font-bold" style={{ color: COLORS.fg }}>
          Opponent hits:{" "}
          <strong style={{ color: "#EF4444" }}>{opponentHitCount}</strong>
        </span>
      </div>

      <div
        className="shrink-0 mx-2 mb-2 px-3 py-2 flex flex-wrap gap-2 rounded-lg border"
        style={{ borderColor: COLORS.border }}
      >
        {uniqueSizesDescending.map((size) => {
          const total = totalFleetBySize.get(size) || 0;
          const sunk = sunkFleetBySize.get(size) || 0;
          const complete = sunk >= total;
          return (
            <span
              key={size}
              className="text-xs font-bold px-2 py-1 rounded-lg border"
              style={{
                borderColor: complete ? "#7F1D1D" : COLORS.border,
                color: complete ? "#7F1D1D" : COLORS.fg2,
                background: complete
                  ? "rgba(127, 29, 29, 0.06)"
                  : "transparent",
              }}
            >
              {size}-cell: {sunk}/{total}
            </span>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-6 px-2 py-2">
        <div className="flex-1 min-h-0 flex flex-col">
          <h3
            className="text-sm font-bold mb-1 shrink-0"
            style={{ color: COLORS.fg }}
          >
            Attack
          </h3>
          {renderGrid(
            attackWrapperRef,
            attackGridRef,
            attackSize,
            new Map(),
            myShotMap,
            canFire,
            (row, col) => fireShot(row, col),
            true,
            sunkShipCellKeys,
          )}
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          <h3
            className="text-sm font-bold mb-1 shrink-0"
            style={{ color: COLORS.fg }}
          >
            Your fleet
          </h3>
          {renderGrid(
            fleetWrapperRef,
            null,
            fleetSize,
            myFleetCells,
            incomingShotMap,
            false,
          )}
        </div>
      </div>
    </div>
  );
}
