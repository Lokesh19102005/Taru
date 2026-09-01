import { useEffect, useState } from "react";
import COLORS from "../../../lib/theme";
import { connectSocket, disconnectSocket, socket } from "../../../lib/socket";
import {
  EVENT_NAMES,
  SeaBattleGameStartedPayload,
} from "../../../types/sea-battle";

interface SeaBattleLobbyProps {
  onStarted: (game: SeaBattleGameStartedPayload) => void;
  onCancel: () => void;
}

export default function SeaBattleLobby({
  onStarted,
  onCancel,
}: SeaBattleLobbyProps) {
  const [status, setStatus] = useState<
    "connecting" | "waiting" | "found" | "error"
  >("connecting");
  const [error, setError] = useState("");

  useEffect(() => {
    const handleRoomState = (payload: { status?: string }) => {
      if (payload.status === "waiting") {
        setStatus("waiting");
      }
    };

    const handleMatchFound = () => {
      setStatus("found");
    };

    const handleGameStarted = (payload: SeaBattleGameStartedPayload) => {
      setStatus("found");
      window.setTimeout(() => onStarted(payload), 900);
    };

    const handleError = (payload: { message?: string }) => {
      setError(payload.message || "Unable to find a match.");
      setStatus("error");
    };

    socket.on(EVENT_NAMES.ROOM_STATE, handleRoomState);
    socket.on(EVENT_NAMES.MATCH_FOUND, handleMatchFound);
    socket.on(EVENT_NAMES.SEA_BATTLE_GAME_STARTED, handleGameStarted);
    socket.on(EVENT_NAMES.ERROR, handleError);

    const activeSocket = connectSocket();

    const joinQueue = () => {
      setStatus("waiting");
      activeSocket.emit(EVENT_NAMES.JOIN_QUEUE, {
        gameType: "sea_battle",
      });
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
      socket.off(EVENT_NAMES.SEA_BATTLE_GAME_STARTED, handleGameStarted);
      socket.off(EVENT_NAMES.ERROR, handleError);
    };
  }, [onStarted]);

  const cancel = () => {
    socket.emit(EVENT_NAMES.LEAVE_QUEUE, {
      gameType: "sea_battle",
    });
    disconnectSocket();
    onCancel();
  };

  return (
    <div
      className="max-w-xl mx-auto rounded-2xl border p-8 text-center"
      style={{ background: COLORS.card, borderColor: COLORS.border }}
    >
      {status === "found" ? (
        <>
          <div className="text-4xl mb-4">🚢</div>
          <h2
            className="text-xl font-extrabold mb-2"
            style={{ color: COLORS.fg }}
          >
            Match found
          </h2>
          <p className="text-sm" style={{ color: COLORS.fg2 }}>
            Setting up your Sea Battle board...
          </p>
        </>
      ) : (
        <>
          <div className="text-4xl mb-4">🚢</div>
          <h2
            className="text-xl font-extrabold mb-2"
            style={{ color: COLORS.fg }}
          >
            Sea Battle
          </h2>

          <p className="text-sm mb-6" style={{ color: COLORS.fg2 }}>
            {status === "connecting"
              ? "Connecting..."
              : status === "error"
                ? error
                : "Looking for another player..."}
          </p>

          <button
            type="button"
            onClick={cancel}
            className="px-5 py-2.5 rounded-xl border text-sm font-bold"
            style={{ borderColor: COLORS.border, color: COLORS.fg }}
          >
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
