import { useEffect, useState } from "react";
import COLORS from "../../../lib/theme";
import { connectSocket, disconnectSocket, socket } from "../../../lib/socket";
import {
  EVENT_NAMES,
  FourGameStartedPayload,
} from "../../../types/connect-four";

interface ConnectFourLobbyProps {
  onStarted: (game: FourGameStartedPayload) => void;
  onCancel: () => void;
}

export default function ConnectFourLobby({
  onStarted,
  onCancel,
}: ConnectFourLobbyProps) {
  const [status, setStatus] = useState<
    "connecting" | "waiting" | "found" | "error"
  >("connecting");
  const [error, setError] = useState("");

  useEffect(() => {
    let startTimer: number | undefined;

    const handleRoomState = (payload: { status?: string }) => {
      if (payload.status === "waiting") {
        setStatus("waiting");
      }
    };

    const handleMatchFound = () => {
      setStatus("found");
    };

    const handleGameStarted = (payload: FourGameStartedPayload) => {
      startTimer = window.setTimeout(() => {
        onStarted(payload);
      }, 900);
    };

    const handleError = (payload: { message?: string }) => {
      setError(payload.message || "Unable to find a match.");
      setStatus("error");
    };

    socket.on(EVENT_NAMES.ROOM_STATE, handleRoomState);
    socket.on("match_found", handleMatchFound);
    socket.on(EVENT_NAMES.FOUR_GAME_STARTED, handleGameStarted);
    socket.on(EVENT_NAMES.ERROR, handleError);

    const activeSocket = connectSocket();

    const joinQueue = () => {
      setStatus("waiting");
      activeSocket.emit(EVENT_NAMES.JOIN_QUEUE, {
        gameType: "four_in_a_row",
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
      socket.off("match_found", handleMatchFound);
      socket.off(EVENT_NAMES.FOUR_GAME_STARTED, handleGameStarted);
      socket.off(EVENT_NAMES.ERROR, handleError);

      if (startTimer !== undefined) {
        window.clearTimeout(startTimer);
      }
    };
  }, [onStarted]);

  const cancel = () => {
    socket.emit(EVENT_NAMES.LEAVE_QUEUE, {
      gameType: "four_in_a_row",
    });
    disconnectSocket();
    onCancel();
  };

  return (
    <div
      className="max-w-xl mx-auto rounded-2xl border p-8 text-center"
      style={{ background: COLORS.card, borderColor: COLORS.border }}
    >
      <div className="text-4xl mb-4">🔴</div>

      {status === "found" ? (
        <>
          <h2
            className="text-xl font-extrabold mb-2"
            style={{ color: COLORS.fg }}
          >
            Player found
          </h2>
          <p className="text-sm" style={{ color: COLORS.fg2 }}>
            Your 4 in a Row game is ready.
          </p>
        </>
      ) : (
        <>
          <h2
            className="text-xl font-extrabold mb-2"
            style={{ color: COLORS.fg }}
          >
            4 in a Row
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
            style={{ borderColor: COLORS.border2, color: COLORS.fg }}
          >
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
