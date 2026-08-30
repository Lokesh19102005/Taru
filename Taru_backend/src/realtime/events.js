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

  // Meeting (Video Consultation)
  MEETING_JOIN: "meeting:join",
  MEETING_LEAVE: "meeting:leave",
  MEETING_OFFER: "meeting:offer",
  MEETING_ANSWER: "meeting:answer",
  MEETING_ICE_CANDIDATE: "meeting:ice-candidate",
  MEETING_PARTICIPANT_JOINED: "meeting:participant-joined",
  MEETING_PARTICIPANT_LEFT: "meeting:participant-left",
  MEETING_ERROR: "meeting:error",

  // Chat (Talk to Someone)
  CHAT_JOIN_QUEUE: "chat_join_queue",
  CHAT_LEAVE_QUEUE: "chat_leave_queue",
  CHAT_MATCHED: "chat_matched",
  CHAT_MESSAGE: "chat_message",
  CHAT_RECEIVE_MESSAGE: "chat_receive_message",
  CHAT_PARTNER_LEFT: "chat_partner_left",
  CHAT_STOPPED: "chat_stopped",

  // Error
  ERROR: "error",
};
