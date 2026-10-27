require("dotenv").config();

const mongoose = require("mongoose");
const DailyCheckIn = require("../src/models/DailyCheckIn");
const User = require("../src/models/User");

// One-off reset for the check-in schema change (sleep / concentration / support
// removed, decision tree added). Deletes EVERY check-in and resets streaks.
async function main() {
  if (process.argv[2] !== "--yes") {
    throw new Error(
      "This deletes ALL daily check-ins and resets every student's streak.\n" +
        "Run again with --yes to confirm: node scripts/resetCheckins.js --yes",
    );
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing. Check Taru_backend/.env.");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  try {
    const checkins = await DailyCheckIn.deleteMany({});
    const users = await User.updateMany(
      { checkinStreak: { $ne: 0 } },
      { $set: { checkinStreak: 0 } },
    );

    console.log(
      `Deleted ${checkins.deletedCount} check-ins and reset streaks for ${users.modifiedCount} students.`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
