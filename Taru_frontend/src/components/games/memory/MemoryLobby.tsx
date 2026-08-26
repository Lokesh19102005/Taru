import { useEffect, useState } from "react";
import COLORS from "../../../lib/theme";
import { connectSocket, disconnectSocket, socket } from "../../../lib/socket";
import { EVENT_NAMES, GameStartedPayload } from "../../../types/game";

interface MemoryLobbyProps {
  onStarted: (game: GameStartedPayload) => void;
  onCancel: () => void;
}

export default function MemoryLobby({ onStarted, onCancel }: MemoryLobbyProps) {
  const [status, setStatus] = useState<
    "connecting" | "waiting" | "found" | "error"
  >("connecting");
  const [error, setError] = useState("");
  const [playerFound, setPlayerFound] = useState(false);

  useEffect(() => {
    let transitionTimer: number | undefined;

    const handleRoomState = (payload: { status?: string }) => {
      if (payload.status === "waiting") {
        setStatus("waiting");
      }
    };

    const handleMatchFound = () => {
      setPlayerFound(true);
      setStatus("found");
    };

    const handleGameStarted = (payload: GameStartedPayload) => {
      // Keep the confirmation visible briefly before showing the board.
      transitionTimer = window.setTimeout(() => {
        onStarted(payload);
      }, 1200);
    };

    const handleError = (payload: { message?: string }) => {
      setError(payload.message || "Unable to find a match.");
      setStatus("error");
    };

    socket.on(EVENT_NAMES.ROOM_STATE, handleRoomState);
    socket.on(EVENT_NAMES.MATCH_FOUND, handleMatchFound);
    socket.on(EVENT_NAMES.GAME_STARTED, handleGameStarted);
    socket.on(EVENT_NAMES.ERROR, handleError);

    const activeSocket = connectSocket();

    const joinQueue = () => {
      setStatus("waiting");
      activeSocket.emit(EVENT_NAMES.JOIN_QUEUE, { gameType: "memory" });
    };

    if (activeSocket.connected) {
      joinQueue();
    } else {
      activeSocket.once("connect", joinQueue);
    }

    return () => {
      activeSocket.off("connect", joinQueue);
      activeSocket.off(EVENT_NAMES.ROOM_STATE, handleRoomState);
      activeSocket.off(EVENT_NAMES.MATCH_FOUND, handleMatchFound);
      activeSocket.off(EVENT_NAMES.GAME_STARTED, handleGameStarted);
      activeSocket.off(EVENT_NAMES.ERROR, handleError);

      if (transitionTimer !== undefined) {
        window.clearTimeout(transitionTimer);
      }
    };
  }, [onStarted]);

  const cancel = () => {
    socket.emit(EVENT_NAMES.LEAVE_QUEUE, { gameType: "memory" });
    disconnectSocket();
    onCancel();
  };

  return (
    <div
      className="max-w-xl mx-auto rounded-2xl border p-8 text-center"
      style={{ background: COLORS.card, borderColor: COLORS.border }}
    >
      {playerFound ? (
        <>
          <div className="text-4xl mb-4">✨</div>

          <h2
            className="text-xl font-extrabold mb-2"
            style={{ color: COLORS.fg }}
          >
            Player found
          </h2>

          <p className="text-sm" style={{ color: COLORS.fg2 }}>
            Your Memory Match is ready.
          </p>
        </>
      ) : (
        <>
          <div className="text-4xl mb-4">🃏</div>

          <h2
            className="text-xl font-extrabold mb-2"
            style={{ color: COLORS.fg }}
          >
            Memory Match
          </h2>

          {status === "error" ? (
            <p className="text-sm mb-6" style={{ color: "#B42318" }}>
              {error}
            </p>
          ) : (
            <p className="text-sm mb-6" style={{ color: COLORS.fg2 }}>
              {status === "connecting"
                ? "Connecting…"
                : "Looking for another player…"}
            </p>
          )}

          <button
            type="button"
            onClick={cancel}
            className="px-5 py-2.5 rounded-xl border text-sm font-bold hover:cursor-pointer"
            style={{ borderColor: COLORS.border2, color: COLORS.fg }}
          >
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
