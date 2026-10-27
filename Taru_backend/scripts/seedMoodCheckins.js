require("dotenv").config();

const crypto = require("crypto");
const mongoose = require("mongoose");
const DailyCheckIn = require("../src/models/DailyCheckIn");
const Institution = require("../src/models/Institution");
const User = require("../src/models/User");

const STUDENT_COUNT = 198;
const HISTORY_DAYS = 15;

const USERNAME_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
// 0 = Best, 4 = Worst
const MOOD_LABELS = ["Very Happy", "Happy", "Neutral", "Stressed", "Sad"];

function getRealisticGender(studentIndex) {
  const distribution = studentIndex % 100;

  if (distribution < 35) return "Female"; // 35%
  if (distribution < 94) return "Male"; // 59%
  if (distribution < 97) return "Non-binary"; // 3%
  return "Prefer not to say"; // 3%
}

const BATCHES = ["2022", "2023", "2024", "2025", "2026"];
const DEGREES = [
  "B.A. Psychology",
  "B.Sc. Computer Science",
  "B.Com",
  "B.Tech",
];

function institutionSlug(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "institution"
  );
}

function demoEmail(institutionName, index) {
  const localPart = `taru-demo-${String(index + 1).padStart(2, "0")}`;
  return `${localPart}@${institutionSlug(institutionName)}.ac.in`;
}

function legacyDemoEmail(index) {
  return `mood.demo.${String(index + 1).padStart(2, "0")}@example.test`;
}

function dateKey(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

// Repeatable pseudo-random generator
function randomValue(seed) {
  const value = Math.sin(seed * 127.1) * 43758.5453;
  return value - Math.floor(value);
}

// Box-Muller transform to get Gaussian (bell-curve) distribution
function gaussianRandom(seed) {
  const u = randomValue(seed) || 0.001;
  const v = randomValue(seed + 1) || 0.001;
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function clampScore(value) {
  return Math.max(0, Math.min(4, Math.round(value)));
}

function generateTaruUsername() {
  const bytes = crypto.randomBytes(8);
  let suffix = "";

  for (let index = 0; index < 8; index += 1) {
    suffix += USERNAME_CHARS[bytes[index] % USERNAME_CHARS.length];
  }

  return `taru_${suffix}`;
}

async function uniqueTaruUsername() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const username = generateTaruUsername();
    const exists = await User.exists({ username });
    if (!exists) return username;
  }

  throw new Error("Could not generate a unique demo username.");
}

function studentDetails(index) {
  const batchIndex = index % BATCHES.length;
  const batch = BATCHES[batchIndex];

  // Base age of 18 + years in college. 1 in 4 students gets a +1 or +2 age bump.
  const baseAge = 18 + batchIndex;
  // Use modulo 100 to predictably distribute age variances
  const distribution = index % 100;
  let ageVariance = 0;

  if (distribution < 4) {
    // 4% Early starters: -1 year (e.g., 17-year-old first-years)
    ageVariance = -1;
  } else if (distribution < 80) {
    // 76% Standard track: 0 to +1 year delay
    ageVariance = index % 2 === 0 ? 0 : 1;
  } else if (distribution < 92) {
    // 12% Slightly delayed/gap years: +2 to +3 years
    ageVariance = 2 + (index % 2);
  } else {
    // 8% Mature/returning students: +4 to +8 years (Pushing ages to 25-30)
    ageVariance = 4 + (index % 5);
  }

  return {
    age: baseAge + ageVariance,
    gender: getRealisticGender(index),
    batch,
    year: batch,
    degree: DEGREES[index % DEGREES.length],
  };
}

// Define archetypes for realistic baseline behaviors
function getStudentProfile(studentIndex) {
  const profiles = [
    { baselineMood: 1, volatility: 0.5, type: "Stable Happy" },
    { baselineMood: 3, volatility: 0.8, type: "Chronically Stressed" },
    { baselineMood: 2, volatility: 1.5, type: "Highly Volatile" },
    { baselineMood: 1.5, volatility: 0.6, type: "Average" },
  ];
  return profiles[studentIndex % profiles.length];
}

async function getOrCreateDemoStudent(institutionName, index) {
  const email = demoEmail(institutionName, index);
  let student = await User.findOne({ email });

  if (student) {
    if (student.college !== institutionName) {
      throw new Error(`${email} already exists under a different college.`);
    }
    return student;
  }

  student = await User.create({
    username: await uniqueTaruUsername(),
    email,
    password: crypto.randomBytes(24).toString("hex"),
    college: institutionName,
    ...studentDetails(index),
  });

  return student;
}

async function removeDemoData(institutionName) {
  const currentEmails = Array.from({ length: STUDENT_COUNT }, (_, index) =>
    demoEmail(institutionName, index),
  );
  const legacyEmails = Array.from({ length: 5 }, (_, index) =>
    legacyDemoEmail(index),
  );

  const students = await User.find({
    email: { $in: [...currentEmails, ...legacyEmails] },
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

  const profile = getStudentProfile(studentIndex);
  let previousMood = profile.baselineMood;

  // 15% of students are "late adopters" who joined within the last 7 days
  const isLateAdopter = randomValue(studentIndex * 991) > 0.85;
  const maxDaysBack = isLateAdopter
    ? Math.floor(randomValue(studentIndex) * 7) + 1
    : HISTORY_DAYS - 1;

  // Loop FORWARD in time to create momentum (yesterday affects today)
  for (let daysBack = maxDaysBack; daysBack >= 0; daysBack -= 1) {
    // Inside your seedStudent loop, after setting the daysBack:
    const date = new Date(today);
    date.setDate(date.getDate() - daysBack);

    // Generate a time between 7:00 AM and 11:59 PM based on the student's seed
    const hourSeed = randomValue((studentIndex + 1) * daysBack * 883);
    let hour = 7 + Math.floor(hourSeed * 17); // 7 to 23

    // Introduce a "Morning/Evening Bias" (college students rarely check in at 2 PM)
    if (hour > 11 && hour < 18 && hourSeed > 0.4) {
      hour = hourSeed > 0.7 ? hour - 4 : hour + 5;
    }

    const minutes = Math.floor(randomValue(hourSeed * 2) * 60);
    date.setHours(hour, minutes, 0, 0);

    // Engagement realism: Determine if user skips check-in today
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const skipProb = profile.baselineMood > 2 ? 0.4 : 0.2; // Stressed students miss more days
    const randomCheck = randomValue(
      (studentIndex + 1) * 100000 + daysBack * 313,
    );

    if (randomCheck < (isWeekend ? skipProb + 0.2 : skipProb)) {
      continue; // User skipped check-in today
    }

    if (existingDates.has(dateKey(date))) continue;

    // --- Calculate Mood (Mean-Reverting Random Walk) ---
    // Pull 30% toward baseline, 70% anchored to yesterday, plus Gaussian noise
    const noise =
      gaussianRandom(studentIndex * 1000 + daysBack) * profile.volatility;
    let rawMood = previousMood * 0.7 + profile.baselineMood * 0.3 + noise;

    // Weekend effect: Reduce stress/sadness on Fri/Sat
    if (date.getDay() === 5 || date.getDay() === 6) {
      rawMood -= 0.8;
    }

    const moodScore = clampScore(rawMood);
    previousMood = rawMood; // Save for tomorrow's calculation

    // --- Calculate Correlated Metrics ---
    // Note: Assuming 0=Best, 4=Worst for Mood/Stress
    // Assuming 0=Worst, 4=Best for Energy/Sleep/Concentration/Motivation/Support

    const metricNoise = (offset) =>
      gaussianRandom(studentIndex * daysBack * offset * 997) * 0.6;

    // Stress follows bad mood
    const stress = clampScore(moodScore + metricNoise(2));

    // Energy and Sleep are INVERSE to bad mood/stress
    const energy = clampScore(4 - moodScore + metricNoise(3));
    const sleep = clampScore(4 - stress + metricNoise(4));

    // Concentration takes a hit if sleep is bad OR stress is high
    const concentrationBase = 4 - (stress + (4 - sleep)) / 2;
    const concentration = clampScore(concentrationBase + metricNoise(5));

    const motivation = clampScore(energy + metricNoise(6));

    // Stressed archetypes often report lower support baselines
    const supportBase = profile.baselineMood >= 2 ? 2 : 3;
    const support = clampScore(supportBase + metricNoise(7));

    entries.push({
      userId: student._id,
      date,
      mood: {
        label: MOOD_LABELS[moodScore],
        score: moodScore,
      },
      energy,
      stress,
      motivation,
      feedback: "",
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

    console.log(
      "Generating authentic demographic demo records. Use a demo database, not production.",
    );

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
