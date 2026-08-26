export interface Card {
  id: number;
  faceUp: boolean;
  matched: boolean;
  pairId?: number;
}

export interface GameStartedPayload {
  roomId: string;
  board: Card[];
  currentTurnSocketId: string;
  scores: Record<string, number>;
}

export interface CardFlippedPayload {
  roomId: string;
  cardId: number;
  pairId: number;
}

export interface TurnResultPayload {
  roomId: string;
  matched: boolean;
  scores: Record<string, number>;
  currentTurnSocketId: string;
  flipBackAfterMs?: number;
}

export interface RoomStatePayload {
  roomId: string;
  board: Card[];
  currentTurnSocketId: string;
  scores: Record<string, number>;
}

export interface GameOverPayload {
  roomId: string;
  scores: Record<string, number>;
  winnerSocketId: string | null;
}

export interface OpponentLeftPayload {
  roomId: string;
}

export const EVENT_NAMES = {
  JOIN_QUEUE: "join_queue",
  LEAVE_QUEUE: "leave_queue",
  MATCH_FOUND: "match_found",
  GAME_STARTED: "game_started",
  FLIP_CARD: "flip_card",
  CARD_FLIPPED: "card_flipped",
  TURN_RESULT: "turn_result",
  ROOM_STATE: "room_state",
  GAME_OVER: "game_over",
  OPPONENT_LEFT: "opponent_left",
  ERROR: "error",
} as const;
