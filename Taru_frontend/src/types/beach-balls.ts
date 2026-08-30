export const POOL_WIDTH = 300;
export const POOL_HEIGHT = 450;
export const DUCK_LOAD_TOLERANCE_DEGREES = 45;

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface Duck {
  angle: number;
}

export interface Projectile {
  id: string;
  ownerSocketId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface BeachBallsGameStartedPayload {
  roomId: string;
  topPlayerSocketId: string;
  bottomPlayerSocketId: string;
  ball: Ball;
  ducks: {
    top: Duck;
    bottom: Duck;
  };
  projectiles: Projectile[];
  scores: Record<string, number>;
  pausedUntil: number;
}

export interface BeachBallsStatePayload {
  roomId: string;
  ball: Ball;
  ducks: {
    top: Duck;
    bottom: Duck;
  };
  projectiles: Projectile[];
  scores: Record<string, number>;
  pausedUntil: number;
  topPlayerSocketId: string;
  bottomPlayerSocketId: string;
}

export interface BeachBallsGoalPayload {
  roomId: string;
  scoringSocketId: string;
  scores: Record<string, number>;
}

export interface BeachBallsGameOverPayload {
  roomId: string;
  winnerSocketId: string | null;
  scores: Record<string, number>;
}

export interface OpponentLeftPayload {
  roomId: string;
}

export const EVENT_NAMES = {
  JOIN_QUEUE: "join_queue",
  LEAVE_QUEUE: "leave_queue",
  MATCH_FOUND: "match_found",
  ROOM_STATE: "room_state",
  FIRE_PROJECTILE: "fire_projectile",
  BEACH_BALLS_GAME_STARTED: "beach_balls_game_started",
  BEACH_BALLS_STATE: "beach_balls_state",
  BEACH_BALLS_HIT: "beach_balls_hit",
  BEACH_BALLS_GOAL: "beach_balls_goal",
  BEACH_BALLS_GAME_OVER: "beach_balls_game_over",
  OPPONENT_LEFT: "opponent_left",
  ERROR: "error",
} as const;
