export type Grid = (string | null)[][];

export interface FourGameStartedPayload {
  roomId: string;
  grid: Grid;
  currentTurnSocketId: string;
}

export interface PieceDroppedPayload {
  roomId: string;
  column: number;
  row: number;
  playerSocketId: string;
}

export interface FourRoomStatePayload {
  roomId: string;
  grid: Grid;
  currentTurnSocketId: string;
}

export interface WinningCell {
  row: number;
  col: number;
}

export interface FourGameOverPayload {
  roomId: string;
  winnerSocketId: string | null;
  winningCells: WinningCell[];
}

export interface OpponentLeftPayload {
  roomId: string;
}

export const EVENT_NAMES = {
  JOIN_QUEUE: "join_queue",
  LEAVE_QUEUE: "leave_queue",
  FOUR_GAME_STARTED: "four_game_started",
  DROP_PIECE: "drop_piece",
  PIECE_DROPPED: "piece_dropped",
  ROOM_STATE: "room_state",
  FOUR_GAME_OVER: "four_game_over",
  OPPONENT_LEFT: "opponent_left",
  ERROR: "error",
} as const;
