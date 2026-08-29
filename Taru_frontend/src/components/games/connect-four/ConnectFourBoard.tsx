import { useEffect, useRef, useState } from "react";
import COLORS from "../../../lib/theme";
import { disconnectSocket, socket } from "../../../lib/socket";
import {
  EVENT_NAMES,
  FourGameOverPayload,
  FourGameStartedPayload,
  FourRoomStatePayload,
  Grid,
  OpponentLeftPayload,
  PieceDroppedPayload,
  WinningCell,
} from "../../../types/connect-four";

interface ConnectFourBoardProps {
  initialGame: FourGameStartedPayload;
  onExit: () => void;
}

const FALL_ANIMATION_MS = 700;

export default function ConnectFourBoard({
  initialGame,
  onExit,
}: ConnectFourBoardProps) {
  const [grid, setGrid] = useState<Grid>(initialGame.grid);
  const [currentTurnSocketId, setCurrentTurnSocketId] = useState(
    initialGame.currentTurnSocketId,
  );

  // Two-step game over state
  const [gameOver, setGameOver] = useState<FourGameOverPayload | null>(null);
  const [showGameOverScreen, setShowGameOverScreen] = useState(false);

  const [opponentLeft, setOpponentLeft] = useState(false);

  const gameOverTimeoutRef = useRef<number | null>(null);
  const screenTimeoutRef = useRef<number | null>(null);

  const mySocketId = socket.id;
  const isMyTurn = mySocketId === currentTurnSocketId;

  useEffect(() => {
    const handlePieceDropped = (payload: PieceDroppedPayload) => {
      if (payload.roomId !== initialGame.roomId) return;

      setGrid((currentGrid) =>
        currentGrid.map((row, rowIndex) =>
          row.map((cell, columnIndex) =>
            rowIndex === payload.row && columnIndex === payload.column
              ? payload.playerSocketId
              : cell,
          ),
        ),
      );
    };

    const handleRoomState = (payload: FourRoomStatePayload) => {
      if (payload.roomId !== initialGame.roomId) return;

      setGrid(payload.grid);
      setCurrentTurnSocketId(payload.currentTurnSocketId);
    };

    const handleGameOver = (payload: FourGameOverPayload) => {
      if (payload.roomId !== initialGame.roomId) return;

      // Step 1: Wait for the piece to fall, then trigger the winning line
      gameOverTimeoutRef.current = window.setTimeout(() => {
        setGameOver(payload);

        // Step 2: Wait for the line to draw (500ms) + pause so user can admire it (1000ms)
        screenTimeoutRef.current = window.setTimeout(() => {
          setShowGameOverScreen(true);
        }, 1500);
      }, FALL_ANIMATION_MS + 100);
    };

    const handleOpponentLeft = (payload: OpponentLeftPayload) => {
      if (payload.roomId !== initialGame.roomId) return;
      setOpponentLeft(true);
    };

    socket.on(EVENT_NAMES.PIECE_DROPPED, handlePieceDropped);
    socket.on(EVENT_NAMES.ROOM_STATE, handleRoomState);
    socket.on(EVENT_NAMES.FOUR_GAME_OVER, handleGameOver);
    socket.on(EVENT_NAMES.OPPONENT_LEFT, handleOpponentLeft);

    return () => {
      socket.off(EVENT_NAMES.PIECE_DROPPED, handlePieceDropped);
      socket.off(EVENT_NAMES.ROOM_STATE, handleRoomState);
      socket.off(EVENT_NAMES.FOUR_GAME_OVER, handleGameOver);
      socket.off(EVENT_NAMES.OPPONENT_LEFT, handleOpponentLeft);

      if (gameOverTimeoutRef.current !== null) {
        window.clearTimeout(gameOverTimeoutRef.current);
      }
      if (screenTimeoutRef.current !== null) {
        window.clearTimeout(screenTimeoutRef.current);
      }
    };
  }, [initialGame.roomId]);

  const dropPiece = (column: number) => {
    if (!isMyTurn || gameOver || opponentLeft || grid[5][column] !== null) {
      return;
    }

    socket.emit(EVENT_NAMES.DROP_PIECE, {
      roomId: initialGame.roomId,
      column,
    });
  };

  const leaveGame = () => {
    disconnectSocket();
    onExit();
  };

  const isWinningCell = (row: number, column: number) =>
    gameOver?.winningCells.some(
      (cell: WinningCell) => cell.row === row && cell.col === column,
    ) ?? false;

  let lineCoords = null;
  if (gameOver?.winningCells && gameOver.winningCells.length > 0) {
    const points = gameOver.winningCells.map((c) => ({
      x: c.col * 100 + 50,
      y: (5 - c.row) * 100 + 50,
    }));

    points.sort((a, b) => (a.x !== b.x ? a.x - b.x : a.y - b.y));

    const p1 = points[0];
    const p2 = points[points.length - 1];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    const offsetX = len === 0 ? 0 : (dx / len) * 40;
    const offsetY = len === 0 ? 0 : (dy / len) * 40;

    lineCoords = {
      x1: p1.x - offsetX,
      y1: p1.y - offsetY,
      x2: p2.x + offsetX,
      y2: p2.y + offsetY,
    };
  }

  // EARLY RETURNS for when we actually want to replace the board
  if (opponentLeft) {
    return (
      <GameMessage
        title="Your opponent left the game"
        description="You can return to the games list and start another match."
        action={leaveGame}
      />
    );
  }

  // Only show the Game Over screen AFTER the line animation finishes
  if (gameOver && showGameOverScreen) {
    const title =
      gameOver.winnerSocketId === null
        ? "It's a tie"
        : gameOver.winnerSocketId === mySocketId
          ? "You won!"
          : "Your opponent won";

    return (
      <GameMessage
        title={title}
        description="You can return to the games list when you are ready."
        action={leaveGame}
      />
    );
  }

  // Render the board (and winning line) while we wait for showGameOverScreen to become true
  return (
    <div className="max-w-xl mx-auto space-y-5">
      <style>{`
        .cf-board-container {
          background: #111111;
          padding: 0.75rem;
          border-radius: 1rem;
        }

        .cf-grid-wrapper {
          position: relative;
          background: #f9f9f9;
          border-radius: 0.5rem;
          overflow: hidden; 
        }

        .cf-board {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
        }

        .cf-column {
          display: flex;
          flex-direction: column;
          border: 0;
          padding: 0;
          background: transparent;
          cursor: pointer;
          outline: none;
        }

        .cf-column:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .cf-cell {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cf-piece {
          width: 90%;
          height: 90%;
          border-radius: 999px;
          animation: cf-fall ${FALL_ANIMATION_MS}ms cubic-bezier(.3,.8,.3,1) forwards;
          position: relative;
          z-index: 10;
        }

        .cf-overlay {
          position: absolute;
          inset: 0;
          z-index: 20;
          pointer-events: none;
          background-image: radial-gradient(circle, transparent 44%, #111111 45.5%);
          background-size: calc(100% / 7) calc(100% / 6);
        }

        @keyframes cf-fall {
          from {
            transform: translateY(calc(var(--fall-n) * -111.11%));
          }
          to {
            transform: translateY(0);
          }
        }

        .cf-winning-line {
          stroke: #F4C95D;
          stroke-width: 16px;
          stroke-linecap: round;
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: draw-line 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }

        @keyframes draw-line {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold" style={{ color: COLORS.fg }}>
            4 in a Row
          </h2>
          <p className="text-sm" style={{ color: COLORS.fg2 }}>
            {gameOver
              ? "Game Over"
              : isMyTurn
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

      <div className="cf-board-container">
        <div className="cf-grid-wrapper">
          <div className="cf-board" role="grid" aria-label="4 in a Row board">
            {Array.from({ length: 7 }, (_, column) => (
              <button
                type="button"
                key={column}
                className="cf-column"
                onClick={() => dropPiece(column)}
                disabled={!isMyTurn || gameOver !== null || opponentLeft}
                aria-label={`Drop piece in column ${column + 1}`}
              >
                {[5, 4, 3, 2, 1, 0].map((row, displayIndex) => {
                  const playerSocketId = grid[row][column];
                  const isMine = playerSocketId === mySocketId;

                  const fallDistanceStyle = {
                    "--fall-n": displayIndex + 1,
                  } as React.CSSProperties;

                  return (
                    <span
                      role="gridcell"
                      key={`${row}-${column}`}
                      className="cf-cell"
                    >
                      {playerSocketId && (
                        <span
                          key={`${row}-${column}-piece`}
                          className="cf-piece"
                          style={{
                            ...fallDistanceStyle,
                            background: isMine ? "#F28B82" : "#7AA7D9",
                            border: isWinningCell(row, column)
                              ? "6px solid #F4C95D"
                              : "none",
                            boxSizing: "border-box",
                          }}
                        />
                      )}
                    </span>
                  );
                })}
              </button>
            ))}
          </div>

          <div className="cf-overlay" aria-hidden="true" />

          {lineCoords && (
            <svg
              viewBox="0 0 700 600"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                zIndex: 30,
                pointerEvents: "none",
              }}
            >
              <line
                x1={lineCoords.x1}
                y1={lineCoords.y1}
                x2={lineCoords.x2}
                y2={lineCoords.y2}
                pathLength="1"
                className="cf-winning-line"
              />
            </svg>
          )}
        </div>
      </div>

      <div
        className="rounded-xl border px-4 py-3 text-center text-sm"
        style={{ background: COLORS.card, borderColor: COLORS.border }}
      >
        <span style={{ color: COLORS.fg2 }}>
          {gameOver
            ? "Match finished!"
            : isMyTurn
              ? "Choose a column"
              : "Waiting for your opponent"}
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
        className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:cursor-pointer"
        style={{ background: COLORS.primary }}
      >
        {actionLabel}
      </button>
    </div>
  );
}
