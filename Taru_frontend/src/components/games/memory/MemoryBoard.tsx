import { useEffect, useRef, useState } from "react";
import COLORS from "../../../lib/theme";
import { disconnectSocket, socket } from "../../../lib/socket";
import {
  Card,
  CardFlippedPayload,
  EVENT_NAMES,
  GameOverPayload,
  GameStartedPayload,
  OpponentLeftPayload,
  RoomStatePayload,
  TurnResultPayload,
} from "../../../types/game";

interface MemoryBoardProps {
  initialGame: GameStartedPayload;
  onExit: () => void;
  onPlayAgain: () => void;
}

const cardColors = [
  "#FDE8E8",
  "#E0F2FE",
  "#FEF3C7",
  "#DCFCE7",
  "#EDE9FE",
  "#FCE7F3",
  "#CFFAFE",
  "#FFEDD5",
];

export default function MemoryBoard({
  initialGame,
  onExit,
  onPlayAgain,
}: MemoryBoardProps) {
  const [board, setBoard] = useState<Card[]>(initialGame.board);
  const [currentTurnSocketId, setCurrentTurnSocketId] = useState(
    initialGame.currentTurnSocketId,
  );
  const [scores, setScores] = useState(initialGame.scores);
  const [result, setResult] = useState("");
  const [gameOver, setGameOver] = useState<GameOverPayload | null>(null);
  const [opponentLeft, setOpponentLeft] = useState(false);

  // --- animation-only state, no effect on game logic ---
  const [turnPulse, setTurnPulse] = useState(false);
  const [scorePop, setScorePop] = useState<{
    key: number;
    owner: string;
  } | null>(null);
  const popCounter = useRef(0);
  const prevScores = useRef(scores);

  const mySocketId = socket.id;
  const isMyTurn = mySocketId === currentTurnSocketId;

  useEffect(() => {
    const handleCardFlipped = (payload: CardFlippedPayload) => {
      if (payload.roomId !== initialGame.roomId) return;

      setBoard((currentBoard) =>
        currentBoard.map((card) =>
          card.id === payload.cardId
            ? { ...card, faceUp: true, pairId: payload.pairId }
            : card,
        ),
      );
    };

    const handleTurnResult = (payload: TurnResultPayload) => {
      if (payload.roomId !== initialGame.roomId) return;

      setScores(payload.scores);
      setCurrentTurnSocketId(payload.currentTurnSocketId);
      setResult(payload.matched ? "Match found." : "No match.");

      window.setTimeout(() => setResult(""), 1200);
    };

    const handleRoomState = (payload: RoomStatePayload) => {
      if (payload.roomId !== initialGame.roomId) return;

      setBoard(payload.board);
      setScores(payload.scores);
      setCurrentTurnSocketId(payload.currentTurnSocketId);
    };

    const handleGameOver = (payload: GameOverPayload) => {
      if (payload.roomId !== initialGame.roomId) return;

      setScores(payload.scores);
      setGameOver(payload);
    };

    const handleOpponentLeft = (payload: OpponentLeftPayload) => {
      if (payload.roomId !== initialGame.roomId) return;
      setOpponentLeft(true);
    };

    socket.on(EVENT_NAMES.CARD_FLIPPED, handleCardFlipped);
    socket.on(EVENT_NAMES.TURN_RESULT, handleTurnResult);
    socket.on(EVENT_NAMES.ROOM_STATE, handleRoomState);
    socket.on(EVENT_NAMES.GAME_OVER, handleGameOver);
    socket.on(EVENT_NAMES.OPPONENT_LEFT, handleOpponentLeft);

    return () => {
      socket.off(EVENT_NAMES.CARD_FLIPPED, handleCardFlipped);
      socket.off(EVENT_NAMES.TURN_RESULT, handleTurnResult);
      socket.off(EVENT_NAMES.ROOM_STATE, handleRoomState);
      socket.off(EVENT_NAMES.GAME_OVER, handleGameOver);
      socket.off(EVENT_NAMES.OPPONENT_LEFT, handleOpponentLeft);
    };
  }, [initialGame.roomId]);

  // Pulse the turn indicator whenever whose-turn-it-is changes.
  // Pure CSS transition under the hood (see style block) — settles at
  // its resting state and can't "snap back" once the transition ends.
  useEffect(() => {
    setTurnPulse(true);
    const t = window.setTimeout(() => setTurnPulse(false), 350);
    return () => window.clearTimeout(t);
  }, [currentTurnSocketId]);

  // Show a brief "+1 pair" pop for whichever player's score just went up.
  useEffect(() => {
    const prev = prevScores.current;
    for (const [id, val] of Object.entries(scores)) {
      if ((prev[id] || 0) < val) {
        popCounter.current += 1;
        setScorePop({ key: popCounter.current, owner: id });
        window.setTimeout(() => setScorePop(null), 900);
        break;
      }
    }
    prevScores.current = scores;
  }, [scores]);

  const flipCard = (card: Card) => {
    if (!isMyTurn || card.faceUp || card.matched || gameOver || opponentLeft) {
      return;
    }

    socket.emit(EVENT_NAMES.FLIP_CARD, {
      roomId: initialGame.roomId,
      cardId: card.id,
    });
  };

  const leaveGame = () => {
    disconnectSocket();
    onExit();
  };

  const scoreEntries = Object.entries(scores);
  const myScore = mySocketId ? scores[mySocketId] || 0 : 0;
  const opponentScore =
    scoreEntries.find(([socketId]) => socketId !== mySocketId)?.[1] || 0;

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
        action={onPlayAgain}
        actionLabel="Play again"
        secondaryAction={leaveGame}
        secondaryActionLabel="Return to all activities"
      />
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <style>{`
        .mm-flip-outer {
          perspective: 800px;
        }
        .mm-flip-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.35s ease;
          transform-style: preserve-3d;
        }
        .mm-flip-inner.mm-revealed {
          transform: rotateY(180deg);
        }
        .mm-face {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.75rem;
          border-width: 1px;
          backface-visibility: hidden;
          font-weight: 800;
          font-size: 1.125rem;
        }
        .mm-face-back {
          color: #fff;
        }
        .mm-face-front {
          transform: rotateY(180deg);
        }
        .mm-turn-text {
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .mm-turn-text.mm-pulse {
          opacity: 0.55;
          transform: scale(1.04);
        }
        @keyframes mm-score-pop {
          0% { opacity: 0; transform: translateY(4px); }
          25% { opacity: 1; transform: translateY(0); }
          75% { opacity: 1; transform: translateY(-2px); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        .mm-score-pop {
          position: absolute;
          top: -0.75rem;
          font-size: 0.75rem;
          font-weight: 700;
          animation: mm-score-pop 0.9s ease forwards;
        }
      `}</style>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold" style={{ color: COLORS.fg }}>
            Memory Match
          </h2>
          <p
            className={`mm-turn-text text-sm ${turnPulse ? "mm-pulse" : ""}`}
            style={{ color: isMyTurn ? COLORS.fg : COLORS.fg2 }}
          >
            {isMyTurn ? "Your turn" : "Opponent's turn"}
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
        className="grid grid-cols-4 gap-3 rounded-2xl border p-4"
        style={{ background: COLORS.card, borderColor: COLORS.border }}
      >
        {board.map((card) => {
          const revealed = card.faceUp || card.matched;

          return (
            <button
              type="button"
              key={card.id}
              onClick={() => flipCard(card)}
              disabled={!isMyTurn || card.faceUp || card.matched}
              aria-label={
                revealed
                  ? `Card ${card.id}, pair ${card.pairId}`
                  : `Face-down card ${card.id}`
              }
              className="mm-flip-outer aspect-square disabled:cursor-default hover:cursor-pointer"
              style={{ opacity: card.matched ? 0.65 : 1 }}
            >
              <div className={`mm-flip-inner ${revealed ? "mm-revealed" : ""}`}>
                <span
                  className="mm-face mm-face-back"
                  style={{
                    background: COLORS.primary,
                    borderColor: COLORS.primary,
                  }}
                >
                  ?
                </span>
                <span
                  className="mm-face mm-face-front"
                  style={{
                    background:
                      cardColors[(card.pairId || 0) % cardColors.length],
                    color: COLORS.fg,
                    borderColor: COLORS.border,
                  }}
                >
                  {card.pairId}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div
        className="relative flex justify-between rounded-xl border px-4 py-3 text-sm"
        style={{ background: COLORS.card, borderColor: COLORS.border }}
      >
        <span style={{ color: COLORS.fg }}>
          You: <strong>{myScore}</strong>
          {scorePop !== null && scorePop.owner === mySocketId && (
            <span
              key={scorePop.key}
              className="mm-score-pop"
              style={{ color: COLORS.primary }}
            >
              +1
            </span>
          )}
        </span>
        <span style={{ color: COLORS.fg2, position: "relative" }}>
          Opponent: <strong>{opponentScore}</strong>
          {scorePop !== null && scorePop.owner !== mySocketId && (
            <span
              key={scorePop.key}
              className="mm-score-pop"
              style={{ color: COLORS.fg2 }}
            >
              +1
            </span>
          )}
        </span>
      </div>

      <p
        className="h-5 text-center text-sm font-bold transition-opacity duration-300"
        style={{ color: COLORS.fg2, opacity: result ? 1 : 0 }}
      >
        {result}
      </p>
    </div>
  );
}

function GameMessage({
  title,
  description,
  action,
  actionLabel = "Return to games",
  secondaryAction,
  secondaryActionLabel,
}: {
  title: string;
  description: string;
  action: () => void;
  actionLabel?: string;
  secondaryAction?: () => void;
  secondaryActionLabel?: string;
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
      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <button
          type="button"
          onClick={action}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:cursor-pointer"
          style={{ background: COLORS.primary }}
        >
          {actionLabel}
        </button>

        {secondaryAction && (
          <button
            type="button"
            onClick={secondaryAction}
            className="px-5 py-2.5 rounded-xl border text-sm font-bold hover:cursor-pointer"
            style={{
              borderColor: COLORS.border,
              color: COLORS.fg,
            }}
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
