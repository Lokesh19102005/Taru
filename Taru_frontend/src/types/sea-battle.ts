export const GRID_WIDTH = 9;
export const GRID_HEIGHT = 7;
export const SHIP_SIZES = [5, 4, 3, 3, 2];

export interface Cell {
  row: number;
  col: number;
  hit?: boolean;
}

export interface Ship {
  cells: Cell[];
}

export interface SeaBattleGameStartedPayload {
  roomId: string;
  phase: "placing";
}

export interface FleetPlacedPayload {
  roomId: string;
  status: "placed";
}

export interface OpponentReadyPayload {
  roomId: string;
}

export interface BattleStartedPayload {
  roomId: string;
  currentTurnSocketId: string;
}

export interface ShotResultPayload {
  roomId: string;
  row: number;
  col: number;
  result: "hit" | "miss";
  shooterSocketId: string;
  currentTurnSocketId: string;
  sunkShipCells: Cell[] | null;
}

export interface SeaBattleGameOverPayload {
  roomId: string;
  winnerSocketId: string | null;
  fleets: Record<string, Ship[]>;
}

export const EVENT_NAMES = {
  JOIN_QUEUE: "join_queue",
  LEAVE_QUEUE: "leave_queue",
  MATCH_FOUND: "match_found",
  ROOM_STATE: "room_state",

  PLACE_FLEET: "place_fleet",
  FLEET_PLACED: "fleet_placed",
  OPPONENT_READY: "opponent_ready",
  BATTLE_STARTED: "battle_started",
  FIRE_SHOT: "fire_shot",
  SHOT_RESULT: "shot_result",
  SEA_BATTLE_GAME_STARTED: "sea_battle_game_started",
  SEA_BATTLE_GAME_OVER: "sea_battle_game_over",

  OPPONENT_LEFT: "opponent_left",
  ERROR: "error",
} as const;
