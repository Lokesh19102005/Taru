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

// ─────────────────────────────────────────────────────────────
// NEW: Decision tree data (Steps 2–4), copied from the approved
// architecture. category = key, rootCause / specificIssue = label.
// ─────────────────────────────────────────────────────────────
const TREES = {
  placements: [
    {
      rootCause: "Rejections / not getting shortlisted",
      issues: [
        "Resume not clearing ATS screening",
        "Failing Online Assessment (OA / coding round)",
        "Reaching Technical Interview but rejected",
        "Reaching final HR round but no offer",
        "Applying off-campus with zero responses",
      ],
    },
    {
      rootCause: "Completely unprepared (DSA / skills)",
      issues: [
        "Syllabus too massive — don't know where to start",
        "Procrastinating out of fear of failure",
        "Classes and labs leave no time for prep",
        "Cannot solve problems without checking solutions",
      ],
    },
    {
      rootCause: "Comparing myself to batchmates who got placed",
      issues: [
        "Feeling like a failure while others move ahead",
        "Avoiding placed friends because it is awkward",
        "Pretending to be happy while anxious inside",
        "Dreading LinkedIn / placement group notifications",
      ],
    },
    {
      rootCause: "Career confusion — don't know what path to take",
      issues: [
        "Dislike my branch but don't know alternatives",
        "Torn between Job vs GATE/CAT vs Govt exams",
        "Parents want one path, my interest is different",
        "Scared of picking wrong job and being trapped",
      ],
    },
  ],
  academics: [
    {
      rootCause: "Attendance shortage (75% rule / debarment risk)",
      issues: [
        "Sickness, health, or family emergency",
        "Missing 8 AM classes due to exhaustion",
        "Bunked out of sheer boredom or burnout",
        "Busy preparing for placements or exams",
      ],
    },
    {
      rootCause: "Too many assignments, labs, and projects piling up",
      issues: [
        "Multiple professors gave deadlines in same week",
        "Postponed till last minute — now impossible",
        "Group members not contributing, dumping on me",
        "Unclear guidelines and unhelpful faculty",
      ],
    },
    {
      rootCause: "Low CGPA / fear of backlog",
      issues: [
        "CGPA below placement cutoff (7.0 / 7.5)",
        "Fear of telling parents about a backlog",
        "Falling behind while classmates score easily",
        "Losing academic scholarship",
      ],
    },
    {
      rootCause: "Completely lost interest in my degree / branch",
      issues: [
        "Sitting in lectures feels exhausting and pointless",
        "Zero motivation to study or take notes",
        "Regretting choosing this branch",
        "Doing bare minimum just to pass and leave",
      ],
    },
  ],
  exams: [
    {
      rootCause: "Huge syllabus and not enough time left",
      issues: [
        "Cramming one night, sleeping only 2–3 hours",
        "Panic sets in just looking at unread chapters",
        "Calculating minimum marks needed to pass",
        "Wasting hours searching for notes and PYQs",
      ],
    },
    {
      rootCause: "Constant fear of failing the subject",
      issues: [
        "Cannot understand professor or concepts at all",
        "Subject has strict grading and very low pass rate",
        "Blanking out in exam hall despite studying",
        "Fear of shame from parents and batchmates",
      ],
    },
    {
      rootCause: "Very disappointed with recent test or mid-term marks",
      issues: [
        "Worked hard but marks did not show the effort",
        "Confidence dropped — feeling not smart enough",
        "Scared to tell parents my actual score",
        "Afraid this one result permanently ruins GPA",
      ],
    },
    {
      rootCause: "Competitive exam prep slipping (GATE / CAT / UPSC)",
      issues: [
        "College workload leaves zero time for test series",
        "Mock test scores consistently below target cutoff",
        "Started preparation too late compared to others",
        "Burning out studying for two separate syllabi",
      ],
    },
  ],
  family: [
    {
      rootCause: "Pressure to get a high-paying job or top rank",
      issues: [
        "Every call ends with placement questions",
        "Constant reminder of sacrifices made for my college",
        "Expected to solve entire family's financial situation",
        "Dismissed as making excuses when I say I'm stressed",
      ],
    },
    {
      rootCause: "Being compared to cousins, siblings, or neighbors",
      issues: [
        "Feeling I will never be good enough in their eyes",
        "Parents praising other kids while ignoring me",
        "Dreading family events where I will be judged",
        "Resenting relatives I used to actually like",
      ],
    },
    {
      rootCause: "Heavy guilt about the money parents are spending",
      issues: [
        "Guilt every time I spend money on basic things",
        "Terrified that failing wastes their money",
        "Feeling like an enormous financial burden",
        "Cannot relax because I feel I owe them success",
      ],
    },
    {
      rootCause: "Problems or fights happening at home right now",
      issues: [
        "Constant worry about parents' health or fights",
        "Guilt that I'm in hostel while family is struggling",
        "Getting draining phone calls right before exams",
        "Helpless because I'm too far away to fix anything",
      ],
    },
  ],
  relationships: [
    {
      rootCause: "Breakup or complicated relationship drama",
      issues: [
        "Seeing them around campus or in class daily",
        "Obsessively checking their social media or status",
        "Replaying old memories instead of studying",
        "Mutual friends picking sides and making it awkward",
      ],
    },
    {
      rootCause: "Feeling left out or ignored by my college group",
      issues: [
        "Friends make plans and trips without inviting me",
        "Cold behavior, subtle jokes, or talking behind back",
        "Only contacted when someone needs notes or proxy",
        "Scared to leave the group because I'll be alone",
      ],
    },
    {
      rootCause: "Daily friction or arguments with my roommate",
      issues: [
        "Zero personal space, constant noise, or late lights",
        "Untidiness or using my belongings without asking",
        "Constant visitors in room with no quiet time",
        "Passive-aggressive silence or hostile atmosphere",
      ],
    },
    {
      rootCause: "Drifting apart from school friends with no one new here",
      issues: [
        "School friends made new circles, calls have stopped",
        'No genuine "3 AM friend" on this campus',
        "Faking happiness on campus while feeling disconnected",
        "Eating in the mess and walking to hostel alone",
      ],
    },
  ],
  loneliness: [
    {
      rootCause: "Surrounded by hundreds of people but feeling totally alone",
      issues: [
        "Conversations around me feel fake and surface-level",
        "Everyone already belongs to a clique or regional group",
        "Imposter syndrome — I just don't fit this college culture",
        "Hiding my real self out of fear of being judged",
      ],
    },
    {
      rootCause: "Severe homesickness — missing family and home",
      issues: [
        "Mom's food and someone who genuinely cares how I feel",
        "Safety, quiet, and comfort of my home room",
        "Hometown friends, local language, familiar streets",
        "Crying alone at night after calls with parents",
      ],
    },
    {
      rootCause: "Going through entire days without talking to anyone",
      issues: [
        "Social exhaustion — stepping out feels too draining",
        "Fear of awkward small talk or approaching groups",
        "Escaping into YouTube or Reels in bed all day",
        "Feeling like nobody would notice if I didn't show up",
      ],
    },
    {
      rootCause: "Cannot find people on the same wavelength as me",
      issues: [
        "One genuine friend to talk about ambitions and fears",
        "People who take projects or passions seriously",
        "Someone to explore the city or grab tea with",
        "A group that is not about gossip or substance use",
      ],
    },
  ],
  sleep: [
    {
      rootCause: "Staying awake till 3 or 4 AM every night",
      issues: [
        "Mind races with career and life worries in the dark",
        "Doomscrolling Reels, Shorts, or Reddit in bed",
        "Hostel noise, wingmates shouting, or roommate games",
        "Night is the only quiet personal time I have",
      ],
    },
    {
      rootCause: "Skipping mess meals or eating only junk food",
      issues: [
        "Mess food is unhygienic or tasteless, so I skip it",
        "Irregular sleep means missing breakfast and lunch",
        "Surviving on instant noodles and heavy caffeine",
        "Lost appetite completely due to stress or acidity",
      ],
    },
    {
      rootCause: "Sleeping 8+ hours but waking up with zero energy",
      issues: [
        "Brain fog — cannot think clearly or remember things",
        "Frequent headaches, eye strain, neck and back pain",
        "Falling asleep or zoning out in morning lectures",
        "Feeling physically weak and sluggish all day",
      ],
    },
    {
      rootCause: "Glued to phone or laptop screens for 8+ hours a day",
      issues: [
        "Short-form video feeds (Reels / Shorts) for hours",
        "Mobile or PC games (BGMI, Valorant) to numb stress",
        "Binge-watching series to escape real-world problems",
        "Switching between tabs endlessly without finishing work",
      ],
    },
  ],
  money: [
    {
      rootCause: "Monthly allowance ran out before the month ended",
      issues: [
        "Unexpected college expenses (exam fees, lab supplies)",
        "Food delivery cost because mess was unedible",
        "Medical or travel emergency",
        "Poor impulse spending earlier in the month",
      ],
    },
    {
      rootCause: "Pressure to keep up with friends' spending (food, trips, cafes)",
      issues: [
        "Making excuses to avoid paid group outings",
        "Spending money I can't afford to avoid embarrassment",
        "Feeling left out when friends order food or book cabs",
        "Severe anxiety whenever the group bill is split equally",
      ],
    },
    {
      rootCause: "Constantly worrying about student loan repayment after college",
      issues: [
        "Grace period ends soon and EMI payments will start",
        "Monthly EMI will crush me if I get a modest salary",
        "Interest keeps compounding into a scary total number",
        "Feeling like a debtor before my adult career even starts",
      ],
    },
    {
      rootCause: "Hesitating or feeling guilty to ask parents for money",
      issues: [
        "Parents are already struggling with monthly bills",
        "They will interrogate and scold every single expense",
        "Ashamed to depend on parents at 20–22 years old",
        "Prefer skipping meals over calling home for extra cash",
      ],
    },
  ],
  overthinking: [
    {
      rootCause: "Thoughts are racing and won't slow down",
      issues: [
        "Replaying awkward moments or old mistakes",
        "Imagining worst-case scenarios about career or life",
        "Endless mental to-do list without starting any task",
        "Pure mental noise — can't hold one thought for 5 seconds",
      ],
    },
    {
      rootCause: "Emotionally numb — not sad, not happy, just blank",
      issues: [
        "Don't feel like talking, laughing, or even crying",
        "Going through daily tasks completely on autopilot",
        "Lost excitement for hobbies, gaming, or movies I loved",
        "Feeling like a ghost watching life pass by",
      ],
    },
    {
      rootCause: "A heavy, uneasy feeling in my chest for no clear reason",
      issues: [
        "Shallow breathing and tightness in the chest",
        "Clenched jaw, tense shoulders, or restless legs",
        "Stomach flutter like something bad is about to happen",
        "Jittery, easily startled, or irritated by small noises",
      ],
    },
    {
      rootCause: "Restless feeling that I am running out of time",
      issues: [
        "Seeing younger people building things online",
        "Half of college is over with nothing to show for it",
        "Panic about stepping into the real world as an adult",
        "Feels like everyone has a life manual I somehow missed",
      ],
    },
  ],
  // Tree 10 — only used when mood is Happy / Very Happy
  positive: [
    {
      rootCause: "Finished study work or submitted a project",
      issues: [
        "Cleared a tough topic or solved a coding problem",
        "Studied 3+ hours without getting distracted",
        "Finished project before deadline for once",
        "Understood a lecture topic that used to confuse me",
      ],
    },
    {
      rootCause: "Spent great time with friends",
      issues: [
        "Hearty laughs with no academic pressure on mind",
        "Deep talk where I felt truly listened to",
        "Campus walk, chai break, or meal together",
        "Made a new friend or felt genuinely welcomed",
      ],
    },
    {
      rootCause: "Got some good news or a personal win",
      issues: [
        "Scored better than expected in test or quiz",
        "Shortlisted for interview, hackathon, or club",
        "Encouragement or praise from teacher or senior",
        "Resolved a personal conflict or received a good message",
      ],
    },
    {
      rootCause: "Good sleep and a peaceful, relaxed day",
      issues: [
        "Woke up feeling genuinely rested for the first time in days",
        "Took a long nap without checking my phone",
        "Relaxed guilt-free without worrying about studies",
        "Enjoyed a warm meal and calm routine",
      ],
    },
  ],
};

// Weights for Step 2 (how common each problem category is campus-wide)
const CATEGORY_WEIGHTS = {
  placements: 25,
  academics: 15,
  exams: 15,
  family: 8,
  relationships: 8,
  loneliness: 8,
  sleep: 8,
  money: 6,
  overthinking: 7,
};

// Some categories push stress up / energy down a little
const CATEGORY_STRESS_BUMP = {
  placements: 0.5,
  exams: 0.5,
  overthinking: 0.5,
  academics: 0.3,
  family: 0.3,
  money: 0.3,
};
const CATEGORY_ENERGY_DROP = { sleep: 0.7, loneliness: 0.3, overthinking: 0.3 };

// ─────────────────────────────────────────────────────────────
// NEW: "Others" free-text pools (stored as plain strings)
// ─────────────────────────────────────────────────────────────
const CUSTOM_CATEGORY_TEXT = [
  "Struggling with identity and self-confidence lately",
  "My internship is stressing me out",
  "Health issue that I don't want to talk about",
  "Too many club and fest responsibilities",
  "Thinking about dropping out",
  "Long distance relationship is draining me",
];
const CUSTOM_ROOT_CAUSE_TEXT = [
  "Professor has personal bias against me and gives low marks unfairly",
  "My project team is not cooperating",
  "Roommate plays loud games until 4 AM",
  "Hostel warden keeps changing the rules",
  "Not able to adjust to the city and its weather",
  "Seniors are making life difficult",
];
const CUSTOM_ISSUE_TEXT = [
  "Can't focus after 10 PM",
  "Wi-Fi in hostel is too slow to study or apply",
  "No quiet place to study in the library",
  "Feeling anxious before every viva",
  "Skipped lunch again and now have a headache",
  "Mentor is not replying to my emails",
];
const CUSTOM_POSITIVE_TEXT = [
  "Got a call back from a startup I liked",
  "Mom visited the campus today",
  "Finally fixed a bug that was bothering me for days",
  "Won a small match with the hostel team",
];

const FEEDBACK_NEGATIVE = [
  "Anxious about tomorrow",
  "Just need a few quiet days",
  "Hard to talk to anyone about this",
  "Feeling better than yesterday, slightly",
  "Everything feels too much this week",
  "Not sure what to do next",
];
const FEEDBACK_POSITIVE = [
  "Good day today",
  "Feeling hopeful for once",
  "Small wins add up",
  "Grateful for my friends",
];

// ── Skip / "Others" probabilities (every question is skippable) ──
const P = {
  categorySkip: 0.1,
  categoryOthers: 0.05,
  rootCauseSkip: 0.08,
  rootCauseOthers: 0.07,
  issueSkip: 0.1,
  issueOthers: 0.08,
  ratingSkip: 0.05,
  feedbackWritten: 0.12,
  primaryCategoryStickiness: 0.55, // chance a student returns to their usual topic
  stickyPick: 0.5, // same for root cause / issue
};

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

// NEW: unique seed per (student, day, purpose). The old
// `studentIndex * daysBack * x` became 0 for student 0 / today.
function seedFor(studentIndex, daysBack, salt) {
  return (studentIndex + 1) * 10007 + (daysBack + 1) * 131 + salt * 7919;
}

function clampScore(value) {
  return Math.max(0, Math.min(4, Math.round(value)));
}

// NEW: ratings are 1–5
function clampRating(value) {
  return Math.max(1, Math.min(5, Math.round(value)));
}

function pickIndex(length, seed) {
  return Math.min(length - 1, Math.floor(randomValue(seed) * length));
}

function pickFrom(list, seed) {
  return list[pickIndex(list.length, seed)];
}

function pickWeightedKey(weights, seed) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let target = randomValue(seed) * total;

  for (const [key, weight] of entries) {
    target -= weight;
    if (target <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

// With some probability return the student's "usual" index, else random
function pickSticky(length, preferredIndex, seed) {
  return randomValue(seed) < P.stickyPick
    ? preferredIndex
    : pickIndex(length, seed + 3);
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

// ─────────────────────────────────────────────────────────────
// NEW: Steps 2–4 — generate category / rootCause / specificIssue
// Follows the approved routing:
//   Happy / Very Happy (score 0–1) → Tree 10 ("positive")
//   Others or Skip at Step 2       → Steps 3 & 4 stay null
//   Others or Skip at Step 3       → Step 4 stays null
// ─────────────────────────────────────────────────────────────
function generateProblemTree(studentIndex, daysBack, moodScore) {
  const result = { category: null, rootCause: null, specificIssue: null };
  const s = (salt) => seedFor(studentIndex, daysBack, salt);
  const isPositive = moodScore <= 1;

  // ── Step 2: Category ──
  let categoryKey;

  if (isPositive) {
    // Tree 10 is entered directly from the mood step
    categoryKey = "positive";
    result.category = "positive";
  } else {
    const roll = randomValue(s(11));

    if (roll < P.categorySkip) return result; // skipped → everything null

    if (roll < P.categorySkip + P.categoryOthers) {
      result.category = pickFrom(CUSTOM_CATEGORY_TEXT, s(12));
      return result; // custom category → no Steps 3 & 4
    }

    // Each student has a "usual" worry; they return to it often
    const primaryCategory = pickWeightedKey(
      CATEGORY_WEIGHTS,
      studentIndex * 313 + 17,
    );
    categoryKey =
      randomValue(s(13)) < P.primaryCategoryStickiness
        ? primaryCategory
        : pickWeightedKey(CATEGORY_WEIGHTS, s(14));
    result.category = categoryKey;
  }

  const causes = TREES[categoryKey];

  // ── Step 3: Root cause ──
  const causeRoll = randomValue(s(21));
  if (causeRoll < P.rootCauseSkip) return result;

  if (causeRoll < P.rootCauseSkip + P.rootCauseOthers) {
    result.rootCause = pickFrom(
      isPositive ? CUSTOM_POSITIVE_TEXT : CUSTOM_ROOT_CAUSE_TEXT,
      s(22),
    );
    return result; // custom root cause → no Step 4
  }

  const preferredCause = pickIndex(causes.length, studentIndex * 71 + 5);
  const cause = causes[pickSticky(causes.length, preferredCause, s(23))];
  result.rootCause = cause.rootCause;

  // ── Step 4: Specific issue ──
  const issueRoll = randomValue(s(31));
  if (issueRoll < P.issueSkip) return result;

  if (issueRoll < P.issueSkip + P.issueOthers) {
    result.specificIssue = pickFrom(
      isPositive ? CUSTOM_POSITIVE_TEXT : CUSTOM_ISSUE_TEXT,
      s(32),
    );
    return result;
  }

  const preferredIssue = pickIndex(cause.issues.length, studentIndex * 37 + 9);
  result.specificIssue =
    cause.issues[pickSticky(cause.issues.length, preferredIssue, s(33))];

  return result;
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
    const s = (salt) => seedFor(studentIndex, daysBack, salt);

    const date = new Date(today);
    date.setDate(date.getDate() - daysBack);

    // Generate a time between 7:00 AM and 11:59 PM based on the student's seed
    const hourSeed = randomValue(s(1));
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
    const randomCheck = randomValue(s(2));

    if (randomCheck < (isWeekend ? skipProb + 0.2 : skipProb)) {
      continue; // User skipped check-in today
    }

    if (existingDates.has(dateKey(date))) continue;

    // --- Step 1: Mood (Mean-Reverting Random Walk) ---
    // Pull 30% toward baseline, 70% anchored to yesterday, plus Gaussian noise
    const noise = gaussianRandom(s(3)) * profile.volatility;
    let rawMood = previousMood * 0.7 + profile.baselineMood * 0.3 + noise;

    // Weekend effect: Reduce stress/sadness on Fri/Sat
    if (date.getDay() === 5 || date.getDay() === 6) {
      rawMood -= 0.8;
    }

    const moodScore = clampScore(rawMood);
    previousMood = rawMood; // Save for tomorrow's calculation

    // --- Steps 2–4: Problem tree (category → rootCause → specificIssue) ---
    const tree = generateProblemTree(studentIndex, daysBack, moodScore);

    // --- Steps 5–7: Ratings on a 1–5 scale ---
    // Mood: 0 = best, 4 = worst
    // Energy / Motivation: 1 = low, 5 = high  |  Stress: 1 = calm, 5 = severe
    const metricNoise = (salt) => gaussianRandom(s(40 + salt)) * 0.6;

    const stressBump = CATEGORY_STRESS_BUMP[tree.category] || 0;
    const energyDrop = CATEGORY_ENERGY_DROP[tree.category] || 0;

    const stressRaw = 1 + moodScore + stressBump + metricNoise(1);
    const energyRaw = 5 - moodScore - energyDrop + metricNoise(2);
    // Motivation follows energy, and drops when stress is high
    const motivationRaw =
      energyRaw * 0.6 + (6 - stressRaw) * 0.4 + metricNoise(3);

    // Every rating question has a Skip option → null
    const rate = (raw, salt) =>
      randomValue(s(50 + salt)) < P.ratingSkip ? null : clampRating(raw);

    const energy = rate(energyRaw, 1);
    const stress = rate(stressRaw, 2);
    const motivation = rate(motivationRaw, 3);

    // --- Step 8: Optional feedback ---
    let feedback = "";
    if (randomValue(s(60)) < P.feedbackWritten) {
      feedback = pickFrom(
        moodScore <= 1 ? FEEDBACK_POSITIVE : FEEDBACK_NEGATIVE,
        s(61),
      );
    }

    // null ratings count as 0 (same as the model's pre-validate hook)
    const totalScore = moodScore + (energy ?? 0) + (stress ?? 0) + (motivation ?? 0);

    entries.push({
      userId: student._id,
      date,
      mood: {
        label: MOOD_LABELS[moodScore],
        score: moodScore,
      },
      category: tree.category,
      rootCause: tree.rootCause,
      specificIssue: tree.specificIssue,
      energy,
      stress,
      motivation,
      feedback,
      totalScore,
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
