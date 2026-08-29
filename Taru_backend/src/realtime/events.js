module.exports = {
  // Client -> Server
  JOIN_QUEUE: "join_queue",
  LEAVE_QUEUE: "leave_queue",
  FLIP_CARD: "flip_card",
  DROP_PIECE: "drop_piece",

  // Server -> Client
  MATCH_FOUND: "match_found",
  ROOM_STATE: "room_state",
  OPPONENT_LEFT: "opponent_left",

  // Game-specific
  GAME_STARTED: "game_started",
  CARD_FLIPPED: "card_flipped",
  TURN_RESULT: "turn_result",
  GAME_OVER: "game_over",

  FOUR_GAME_STARTED: "four_game_started",
  PIECE_DROPPED: "piece_dropped",
  FOUR_GAME_OVER: "four_game_over",

  // Error
  ERROR: "error",
};
