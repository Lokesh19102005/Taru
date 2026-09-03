import { useEffect, useMemo, useRef, useState } from "react";
import COLORS from "../../../lib/theme";
import { disconnectSocket, socket } from "../../../lib/socket";
import {
  EVENT_NAMES,
  GRID_WIDTH,
  GRID_HEIGHT,
  SHIP_SIZES,
  Ship,
} from "../../../types/sea-battle";

interface SeaBattlePlacementProps {
  roomId: string;
  onPlaced: (fleet: Ship[], currentTurnSocketId: string) => void;
  onCancel: () => void;
}

interface PlacedShip {
  id: string;
  size: number;
  cells: { row: number; col: number }[];
}

type Direction = "horizontal" | "vertical";

function buildShipCells(
  startRow: number,
  startCol: number,
  length: number,
  direction: Direction,
) {
  const cells = [];
  for (let i = 0; i < length; i++) {
    const row = direction === "horizontal" ? startRow : startRow + i;
    const col = direction === "horizontal" ? startCol + i : startCol;
    cells.push({ row, col });
  }
  return cells;
}

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

let shipIdCounter = 0;

export default function SeaBattlePlacement({
  roomId,
  onPlaced,
  onCancel,
}: SeaBattlePlacementProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gridWrapperRef = useRef<HTMLDivElement | null>(null);
  const [availableHeight, setAvailableHeight] = useState<number | null>(null);
  const gridSize = useGridPixelSize(gridWrapperRef);

  // Ships fully placed on the board, each keeping its own id so it can be
  // picked back up individually later.
  const [placedShips, setPlacedShips] = useState<PlacedShip[]>([]);
  // Sizes still waiting to be placed, in order. When a placed ship is
  // picked back up, its size is unshifted to the front of this queue.
  const [remainingSizes, setRemainingSizes] = useState<number[]>(SHIP_SIZES);

  const [direction, setDirection] = useState<Direction>("horizontal");
  const [hoverCell, setHoverCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [status, setStatus] = useState<"placing" | "waiting" | "error">(
    "placing",
  );
  const [opponentIsReady, setOpponentIsReady] = useState(false);
  const [error, setError] = useState("");
  const [opponentLeft, setOpponentLeft] = useState(false);

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

  const occupiedCells = useMemo(() => {
    const map = new Map<string, string>(); // cellKey -> ship id
    placedShips.forEach((ship) => {
      ship.cells.forEach((cell) => {
        map.set(cellKey(cell.row, cell.col), ship.id);
      });
    });
    return map;
  }, [placedShips]);

  const currentShipLength = remainingSizes[0];
  const allPlaced = remainingSizes.length === 0;

  const canPlaceAt = (cells: { row: number; col: number }[]) => {
    for (const cell of cells) {
      if (
        cell.row < 0 ||
        cell.row >= GRID_HEIGHT ||
        cell.col < 0 ||
        cell.col >= GRID_WIDTH
      ) {
        return false;
      }
      if (occupiedCells.has(cellKey(cell.row, cell.col))) {
        return false;
      }
    }
    return true;
  };

  const previewCells = useMemo(() => {
    if (!hoverCell || allPlaced) return [];
    return buildShipCells(
      hoverCell.row,
      hoverCell.col,
      currentShipLength,
      direction,
    );
  }, [hoverCell, currentShipLength, direction, allPlaced]);

  const previewValid = previewCells.length > 0 && canPlaceAt(previewCells);

  const previewSet = useMemo(() => {
    const set = new Set<string>();
    previewCells.forEach((cell) => set.add(cellKey(cell.row, cell.col)));
    return set;
  }, [previewCells]);

  useEffect(() => {
    const handleFleetPlaced = () => setStatus("waiting");
    const handleOpponentReady = () => setOpponentIsReady(true);
    const handleOpponentLeft = () => setOpponentLeft(true);

    const handleBattleStarted = (payload: {
      roomId: string;
      currentTurnSocketId: string;
    }) => {
      if (payload.roomId !== roomId) return;
      const fleet: Ship[] = placedShips.map((ship) => ({
        cells: ship.cells.map((cell) => ({ row: cell.row, col: cell.col })),
      }));
      onPlaced(fleet, payload.currentTurnSocketId);
    };

    const handleError = (payload: { message?: string }) => {
      setError(payload.message || "Placement rejected by the server.");
      setStatus("error");
    };

    socket.on(EVENT_NAMES.FLEET_PLACED, handleFleetPlaced);
    socket.on(EVENT_NAMES.OPPONENT_READY, handleOpponentReady);
    socket.on(EVENT_NAMES.BATTLE_STARTED, handleBattleStarted);
    socket.on(EVENT_NAMES.ERROR, handleError);
    socket.on(EVENT_NAMES.OPPONENT_LEFT, handleOpponentLeft);

    return () => {
      socket.off(EVENT_NAMES.FLEET_PLACED, handleFleetPlaced);
      socket.off(EVENT_NAMES.OPPONENT_READY, handleOpponentReady);
      socket.off(EVENT_NAMES.BATTLE_STARTED, handleBattleStarted);
      socket.off(EVENT_NAMES.ERROR, handleError);
      socket.off(EVENT_NAMES.OPPONENT_LEFT, handleOpponentLeft);
    };
  }, [placedShips, onPlaced, roomId]);

  const placeShipAt = (row: number, col: number) => {
    if (status !== "placing" || allPlaced) return;

    const cells = buildShipCells(row, col, currentShipLength, direction);
    if (!canPlaceAt(cells)) {
      setError("That ship would overlap or go out of bounds.");
      return;
    }

    shipIdCounter += 1;
    const newShip: PlacedShip = {
      id: `ship-${shipIdCounter}`,
      size: currentShipLength,
      cells,
    };

    setPlacedShips((prev) => [...prev, newShip]);
    setRemainingSizes((prev) => prev.slice(1));
    setError("");
  };

  const pickUpShip = (shipId: string) => {
    if (status !== "placing") return;

    const ship = placedShips.find((s) => s.id === shipId);
    if (!ship) return;

    setPlacedShips((prev) => prev.filter((s) => s.id !== shipId));
    setRemainingSizes((prev) => [ship.size, ...prev]);
    setError("");
  };

  const handleCellClick = (row: number, col: number) => {
    const key = cellKey(row, col);
    const occupyingShipId = occupiedCells.get(key);

    if (occupyingShipId) {
      pickUpShip(occupyingShipId);
      return;
    }

    placeShipAt(row, col);
  };

  const toggleDirection = () => {
    setDirection((prev) => (prev === "horizontal" ? "vertical" : "horizontal"));
  };

  const resetPlacement = () => {
    setPlacedShips([]);
    setRemainingSizes(SHIP_SIZES);
    setError("");
    setStatus("placing");
  };

  const submitFleet = () => {
    if (!allPlaced) {
      setError("Place all ships before you are ready.");
      return;
    }

    const fleet: Ship[] = placedShips.map((ship) => ({
      cells: ship.cells.map((cell) => ({ row: cell.row, col: cell.col })),
    }));

    socket.emit(EVENT_NAMES.PLACE_FLEET, { roomId, ships: fleet });
  };

  const leaveGame = () => {
    disconnectSocket();
    onCancel();
  };

  // Add this block right above the final 'return ('
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
            Place your fleet
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

      {opponentIsReady && status === "placing" && (
        <div
          className="shrink-0 px-2 pb-2 text-xs text-center"
          style={{ color: COLORS.fg2 }}
        >
          Your opponent has finished placing their fleet.
        </div>
      )}

      <div className="shrink-0 px-2 mb-2 flex flex-wrap gap-2">
        {SHIP_SIZES.map((size, index) => {
          const placedCountOfThisSize = placedShips.filter(
            (s) => s.size === size,
          ).length;
          const totalOfThisSize = SHIP_SIZES.filter((s) => s === size).length;
          // Roughly track "done" per unique size tier for the summary chips.
          const doneSoFar =
            SHIP_SIZES.slice(0, index + 1).filter((s) => s === size).length <=
            placedCountOfThisSize;

          return (
            <div
              key={`${size}-${index}`}
              className="px-2 py-1 rounded-lg text-xs font-bold border"
              style={{
                borderColor: doneSoFar ? COLORS.primary : COLORS.border,
                background: doneSoFar
                  ? "rgba(95, 116, 255, 0.08)"
                  : "transparent",
                color: doneSoFar ? COLORS.primary : COLORS.fg2,
              }}
            >
              {size}-cell {doneSoFar ? "\u2713" : ""}
            </div>
          );
        })}
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

      <div className="flex-1 min-h-0 flex items-center justify-center px-2 py-2">
        <div
          ref={gridWrapperRef}
          className="flex-1 min-h-0 flex items-center justify-center w-full h-full"
        >
          <div
            className="grid gap-1 p-2 rounded-2xl"
            style={{
              width: gridSize.width || undefined,
              height: gridSize.height || undefined,
              gridTemplateColumns: `repeat(${GRID_WIDTH}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${GRID_HEIGHT}, minmax(0, 1fr))`,
              background: "#EAF5FF",
              border: `1px solid ${COLORS.border}`,
            }}
          >
            {Array.from({ length: GRID_WIDTH * GRID_HEIGHT }).map(
              (_, index) => {
                const row = Math.floor(index / GRID_WIDTH);
                const col = index % GRID_WIDTH;
                const key = cellKey(row, col);

                const isPlaced = occupiedCells.has(key);
                const isPreview = previewSet.has(key);

                let background = "#F7FBFF";
                let borderColor = "#D7E8F7";

                if (isPlaced) {
                  background = "#BFCFFF";
                  borderColor = "#2563EB";
                } else if (isPreview) {
                  background = previewValid ? "#D9F7F0" : "#FCE4E4";
                  borderColor = previewValid ? "#4CC9B0" : "#F0A0A0";
                }

                return (
                  <button
                    key={key}
                    type="button"
                    onMouseEnter={() => setHoverCell({ row, col })}
                    onClick={() => handleCellClick(row, col)}
                    disabled={status !== "placing"}
                    className="rounded-md border"
                    style={{
                      borderColor,
                      background,
                      minWidth: 0,
                      minHeight: 0,
                      cursor: status === "placing" ? "pointer" : "default",
                    }}
                    aria-label={`Cell ${row}, ${col}`}
                  />
                );
              },
            )}
          </div>
        </div>
      </div>

      <div
        className="shrink-0 px-2 py-3 border-t flex flex-wrap items-center justify-between gap-2"
        style={{ borderColor: COLORS.border }}
      >
        <div className="text-xs" style={{ color: COLORS.fg2 }}>
          {allPlaced
            ? "All ships placed — click a placed ship to move it, or Ready to continue."
            : `Placing: ${currentShipLength}-cell ship (${direction}). Click a highlighted spot to place it.`}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleDirection}
            disabled={status !== "placing" || allPlaced}
            className="px-3 py-2 rounded-xl border text-xs font-bold disabled:opacity-40"
            style={{ borderColor: COLORS.border, color: COLORS.fg }}
          >
            Rotate ({direction === "horizontal" ? "\u2192" : "\u2193"})
          </button>

          <button
            type="button"
            onClick={resetPlacement}
            disabled={status !== "placing"}
            className="px-3 py-2 rounded-xl border text-xs font-bold disabled:opacity-40"
            style={{ borderColor: COLORS.border, color: COLORS.fg2 }}
          >
            Reset
          </button>

          <button
            type="button"
            onClick={submitFleet}
            disabled={!allPlaced || status !== "placing"}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: COLORS.primary }}
          >
            Ready
          </button>
        </div>
      </div>

      {status === "waiting" && (
        <div
          className="shrink-0 px-2 py-2 text-xs text-center"
          style={{ color: COLORS.fg2 }}
        >
          Waiting for opponent to finish placing...
        </div>
      )}
    </div>
  );
}
