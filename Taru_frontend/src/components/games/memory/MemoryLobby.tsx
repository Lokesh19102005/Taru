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
      socket.off(EVENT_NAMES.ROOM_STATE, handleRoomState);
      socket.off(EVENT_NAMES.MATCH_FOUND, handleMatchFound);
      socket.off(EVENT_NAMES.GAME_STARTED, handleGameStarted);
      socket.off(EVENT_NAMES.ERROR, handleError);

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
      className="max-w-md w-full mx-auto rounded-3xl border p-8 sm:p-10 text-center shadow-xl transition-all duration-300"
      style={{ background: COLORS.card, borderColor: COLORS.border }}
    >
      {playerFound ? (
        <div className="animate-fade-in py-4">
          <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-indigo-50 text-4xl shadow-inner">
            <span className="animate-bounce">✨</span>
          </div>
          <h2
            className="text-2xl font-black tracking-tight mb-2"
            style={{ color: COLORS.fg }}
          >
            Player found!
          </h2>
          <p className="text-sm font-medium mb-6" style={{ color: COLORS.fg2 }}>
            Your Memory Match is ready.
          </p>
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full animate-pulse w-full" />
          </div>
        </div>
      ) : (
        <div className="py-4">
          {/* Pulsing Radar Animation Container */}
          <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
            <div className="absolute inset-0 rounded-full bg-indigo-500/10 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-indigo-500/20 animate-pulse" />
            <div className="relative z-10 w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center text-3xl">
              🃏
            </div>
          </div>

          <h2
            className="text-2xl font-black tracking-tight mb-2"
            style={{ color: COLORS.fg }}
          >
            Memory Match
          </h2>

          <p
            className="text-sm font-medium mb-8 min-h-6"
            style={{ color: status === "error" ? "#B42318" : COLORS.fg2 }}
          >
            {status === "error"
              ? error
              : status === "connecting"
                ? "Establishing connection..."
                : "Searching for another player..."}
          </p>

          <button
            type="button"
            onClick={cancel}
            className="w-full py-3 px-6 rounded-2xl border text-sm font-bold transition-all duration-200 hover:bg-black/5 hover:cursor-pointer active:scale-95"
            style={{ borderColor: COLORS.border2, color: COLORS.fg }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
