const express = require("express");
const { protect } = require("../middleware/auth");
const { chat } = require("../controllers/chatbotController");

const router = express.Router();

router.post("/chat", protect("user"), chat);

module.exports = router;
