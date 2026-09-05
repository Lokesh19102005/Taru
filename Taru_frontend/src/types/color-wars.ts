export const FLOOR_COLS = 30;
export const FLOOR_ROWS = 20;

export interface PlayerState {
  socketId: string;
  x: number;
  y: number;
  speedMultiplier?: number;
  rollerRadius?: number;
}

export interface Powerup {
  id: string;
  x: number;
  y: number;
  row: number;
  col: number;
  type: "speed_boost" | "size_boost" | "paint_bomb";
}

export interface ChangedCell {
  row: number;
  col: number;
  owner?: string | null;
}

export interface ColorWarsGameStartedPayload {
  roomId: string;
  floorCols: number;
  floorRows: number;
  players: Record<string, PlayerState>;
  grid: Array<Array<string | null>>;
  remainingMs: number;
}

export interface ColorWarsStatePayload {
  roomId: string;
  players: Record<string, PlayerState>;
  powerups: Powerup[];
  changedCells: ChangedCell[];
  remainingMs: number;
  floorCols: number;
  floorRows: number;
}

export interface ColorWarsGameOverPayload {
  roomId: string;
  winnerSocketId: string | null;
  counts: Record<string, number>;
  grid: Array<Array<string | null>>;
}

export const EVENT_NAMES = {
  JOIN_QUEUE: "join_queue",
  LEAVE_QUEUE: "leave_queue",
  MATCH_FOUND: "match_found",
  ROOM_STATE: "room_state",
  SET_DIRECTION: "set_direction",
  COLOR_WARS_GAME_STARTED: "color_wars_game_started",
  COLOR_WARS_STATE: "color_wars_state",
  COLOR_WARS_GAME_OVER: "color_wars_game_over",
  OPPONENT_LEFT: "opponent_left",
  ERROR: "error",
} as const;
