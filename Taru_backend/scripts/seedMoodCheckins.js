require("dotenv").config();

const crypto = require("crypto");
const mongoose = require("mongoose");
const DailyCheckIn = require("../src/models/DailyCheckIn");
const Institution = require("../src/models/Institution");
const User = require("../src/models/User");

const STUDENT_COUNT = 5;
const HISTORY_DAYS = 180;
const MOOD_LABELS = ["Very Happy", "Happy", "Neutral", "Stressed", "Sad"];

function demoEmail(index) {
  return `mood.demo.${String(index + 1).padStart(2, "0")}@example.test`;
}

function demoUsername(index) {
  return `demo_mood_${String(index + 1).padStart(2, "0")}`;
}

function dateKey(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

// Repeatable values make reruns produce consistent demo patterns.
function randomValue(seed) {
  const value = Math.sin(seed * 127.1) * 43758.5453;
  return value - Math.floor(value);
}

function scoreFor(studentIndex, daysBack) {
  const wave = Math.sin((daysBack + studentIndex * 19) / 17) * 1.25;
  const variation =
    (randomValue((studentIndex + 1) * 1000 + daysBack) - 0.5) * 1.5;
  return Math.max(0, Math.min(4, Math.round(2 + wave + variation)));
}

async function getOrCreateDemoStudent(institutionName, index) {
  const email = demoEmail(index);
  let student = await User.findOne({ email });

  if (student) {
    if (student.college !== institutionName) {
      throw new Error(`${email} already exists under a different college.`);
    }
    return student;
  }

  student = await User.create({
    username: demoUsername(index),
    email,
    password: crypto.randomBytes(24).toString("hex"),
    college: institutionName,
    year: "Demo",
    degree: "Synthetic data",
    batch: "DEMO",
  });

  return student;
}

async function removeDemoData(institutionName) {
  const emails = Array.from({ length: STUDENT_COUNT }, (_, index) =>
    demoEmail(index),
  );
  const students = await User.find({
    email: { $in: emails },
    college: institutionName,
  }).select("_id");

  const studentIds = students.map((student) => student._id);
  const checkins = await DailyCheckIn.deleteMany({
    userId: { $in: studentIds },
  });
  const users = await User.deleteMany({ _id: { $in: studentIds } });

  console.log(
    `Removed ${checkins.deletedCount} demo check-ins and ${users.deletedCount} demo students.`,
  );
}

async function seedStudent(student, studentIndex) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const oldestDate = new Date(today);
  oldestDate.setDate(oldestDate.getDate() - (HISTORY_DAYS - 1));

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existing = await DailyCheckIn.find({
    userId: student._id,
    date: { $gte: oldestDate, $lt: tomorrow },
  }).select("date");

  const existingDates = new Set(existing.map((entry) => dateKey(entry.date)));
  const entries = [];

  for (let daysBack = 0; daysBack < HISTORY_DAYS; daysBack += 1) {
    // Keep the first demo student without recent check-ins to test that state.
    if (studentIndex === 0 && daysBack < 14) continue;

    // Add natural-looking gaps for other demo students.
    if (
      studentIndex !== 0 &&
      randomValue((studentIndex + 10) * 1000 + daysBack) < 0.2
    ) {
      continue;
    }

    const date = new Date(today);
    date.setDate(date.getDate() - daysBack);

    if (existingDates.has(dateKey(date))) continue;

    const moodScore = scoreFor(studentIndex, daysBack);
    const energy = Math.floor(randomValue(daysBack + studentIndex * 200) * 5);
    const stress = Math.floor(randomValue(daysBack + studentIndex * 300) * 5);
    const sleep = Math.floor(randomValue(daysBack + studentIndex * 400) * 5);
    const concentration = Math.floor(
      randomValue(daysBack + studentIndex * 500) * 5,
    );
    const support = Math.floor(randomValue(daysBack + studentIndex * 600) * 5);
    const motivation = Math.floor(
      randomValue(daysBack + studentIndex * 700) * 5,
    );

    entries.push({
      userId: student._id,
      date,
      mood: { label: MOOD_LABELS[moodScore], score: moodScore },
      energy,
      stress,
      sleep,
      concentration,
      support,
      motivation,
      feedback: "Synthetic demo check-in",
      totalScore:
        moodScore +
        energy +
        stress +
        sleep +
        concentration +
        support +
        motivation,
    });
  }

  if (entries.length) {
    await DailyCheckIn.insertMany(entries);
  }

  console.log(`${student.username}: added ${entries.length} check-ins.`);
}

async function main() {
  const args = process.argv.slice(2);
  const cleanup = args[0] === "--cleanup";
  const institutionName = cleanup ? args[1] : args[0];

  if (!institutionName) {
    throw new Error(
      'Provide the exact institution college name. Example: node scripts/seedMoodCheckins.js "Example College"',
    );
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing. Check Taru_backend/.env.");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  try {
    const institution = await Institution.findOne({
      collegeName: institutionName,
    });
    if (!institution) {
      throw new Error(
        `No institution found with collegeName "${institutionName}".`,
      );
    }

    if (cleanup) {
      await removeDemoData(institutionName);
      return;
    }

    for (let index = 0; index < STUDENT_COUNT; index += 1) {
      const student = await getOrCreateDemoStudent(institutionName, index);
      await seedStudent(student, index);
    }

    console.log(
      "Demo mood history is ready. Refresh the institution dashboard.",
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
