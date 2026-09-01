module.exports = {
  // Client -> Server
  JOIN_QUEUE: "join_queue",
  LEAVE_QUEUE: "leave_queue",
  FLIP_CARD: "flip_card",
  DROP_PIECE: "drop_piece",
  PLACE_FLEET: "place_fleet",
  FIRE_SHOT: "fire_shot",

  // Server -> Client
  MATCH_FOUND: "match_found",
  ROOM_STATE: "room_state",
  OPPONENT_LEFT: "opponent_left",

  // Game-specific
  GAME_STARTED: "game_started",
  CARD_FLIPPED: "card_flipped",
  TURN_RESULT: "turn_result",
  GAME_OVER: "game_over",

  // 4 in a Row
  FOUR_GAME_STARTED: "four_game_started",
  PIECE_DROPPED: "piece_dropped",
  FOUR_GAME_OVER: "four_game_over",

  // Beach Balls
  FIRE_PROJECTILE: "fire_projectile",
  BEACH_BALLS_GAME_STARTED: "beach_balls_game_started",
  BEACH_BALLS_STATE: "beach_balls_state",
  BEACH_BALLS_GOAL: "beach_balls_goal",
  BEACH_BALLS_GAME_OVER: "beach_balls_game_over",
  BEACH_BALLS_HIT: "beach_balls_hit",

  // Sea Battle
  SEA_BATTLE_GAME_STARTED: "sea_battle_game_started",
  FLEET_PLACED: "fleet_placed",
  OPPONENT_READY: "opponent_ready",
  BATTLE_STARTED: "battle_started",
  SHOT_RESULT: "shot_result",
  SEA_BATTLE_GAME_OVER: "sea_battle_game_over",

  // Error
  ERROR: "error",
};
