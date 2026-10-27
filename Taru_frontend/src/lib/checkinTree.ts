// Decision tree for the daily check-in (steps 2–4).
// `category` is stored as the tree key; `rootCause` / `specificIssue` as the option label.
// When the student picks "Others", their own text is stored instead.

export interface RootCause {
  label: string
  question: string // Step 4 question
  issues: string[]
}

export interface CheckinTree {
  key: string
  emoji: string
  label: string
  question: string // Step 3 question
  rootCauses: RootCause[]
}

export const CATEGORY_TREES: CheckinTree[] = [
  {
    key: "placements",
    emoji: "💼",
    label: "Placements & Career",
    question: "What part of placements is troubling you most?",
    rootCauses: [
      {
        label: "Rejections / not getting shortlisted",
        question: "Where are you getting stuck?",
        issues: [
          "Resume not clearing ATS screening",
          "Failing Online Assessment (OA / coding round)",
          "Reaching Technical Interview but rejected",
          "Reaching final HR round but no offer",
          "Applying off-campus with zero responses",
        ],
      },
      {
        label: "Completely unprepared (DSA / skills)",
        question: "What is holding your preparation back?",
        issues: [
          "Syllabus too massive — don't know where to start",
          "Procrastinating out of fear of failure",
          "Classes and labs leave no time for prep",
          "Cannot solve problems without checking solutions",
        ],
      },
      {
        label: "Comparing myself to batchmates who got placed",
        question: "How is this comparison affecting you?",
        issues: [
          "Feeling like a failure while others move ahead",
          "Avoiding placed friends because it is awkward",
          "Pretending to be happy while anxious inside",
          "Dreading LinkedIn / placement group notifications",
        ],
      },
      {
        label: "Career confusion — don't know what path to take",
        question: "What is causing this confusion?",
        issues: [
          "Dislike my branch but don't know alternatives",
          "Torn between Job vs GATE/CAT vs Govt exams",
          "Parents want one path, my interest is different",
          "Scared of picking wrong job and being trapped",
        ],
      },
    ],
  },
  {
    key: "academics",
    emoji: "📚",
    label: "Academics & Attendance",
    question: "What is the main academic problem right now?",
    rootCauses: [
      {
        label: "Attendance shortage (75% rule / debarment risk)",
        question: "What caused this?",
        issues: [
          "Sickness, health, or family emergency",
          "Missing 8 AM classes due to exhaustion",
          "Bunked out of sheer boredom or burnout",
          "Busy preparing for placements or exams",
        ],
      },
      {
        label: "Too many assignments, labs, and projects piling up",
        question: "What is making submissions so hard?",
        issues: [
          "Multiple professors gave deadlines in same week",
          "Postponed till last minute — now impossible",
          "Group members not contributing, dumping on me",
          "Unclear guidelines and unhelpful faculty",
        ],
      },
      {
        label: "Low CGPA / fear of backlog",
        question: "What is your biggest concern?",
        issues: [
          "CGPA below placement cutoff (7.0 / 7.5)",
          "Fear of telling parents about a backlog",
          "Falling behind while classmates score easily",
          "Losing academic scholarship",
        ],
      },
      {
        label: "Completely lost interest in my degree / branch",
        question: "What does this feel like day to day?",
        issues: [
          "Sitting in lectures feels exhausting and pointless",
          "Zero motivation to study or take notes",
          "Regretting choosing this branch",
          "Doing bare minimum just to pass and leave",
        ],
      },
    ],
  },
  {
    key: "exams",
    emoji: "📝",
    label: "Exams & Results",
    question: "What is causing your exam stress?",
    rootCauses: [
      {
        label: "Huge syllabus and not enough time left",
        question: "How is this time crunch affecting you?",
        issues: [
          "Cramming one night, sleeping only 2–3 hours",
          "Panic sets in just looking at unread chapters",
          "Calculating minimum marks needed to pass",
          "Wasting hours searching for notes and PYQs",
        ],
      },
      {
        label: "Constant fear of failing the subject",
        question: "What is triggering this fear?",
        issues: [
          "Cannot understand professor or concepts at all",
          "Subject has strict grading and very low pass rate",
          "Blanking out in exam hall despite studying",
          "Fear of shame from parents and batchmates",
        ],
      },
      {
        label: "Very disappointed with recent test or mid-term marks",
        question: "What was the biggest fallout?",
        issues: [
          "Worked hard but marks did not show the effort",
          "Confidence dropped — feeling not smart enough",
          "Scared to tell parents my actual score",
          "Afraid this one result permanently ruins GPA",
        ],
      },
      {
        label: "Competitive exam prep slipping (GATE / CAT / UPSC)",
        question: "Where exactly is prep going wrong?",
        issues: [
          "College workload leaves zero time for test series",
          "Mock test scores consistently below target cutoff",
          "Started preparation too late compared to others",
          "Burning out studying for two separate syllabi",
        ],
      },
    ],
  },
  {
    key: "family",
    emoji: "🏠",
    label: "Family & Expectations",
    question: "What is creating tension with your family?",
    rootCauses: [
      {
        label: "Pressure to get a high-paying job or top rank",
        question: "How is this pressure being communicated?",
        issues: [
          "Every call ends with placement questions",
          "Constant reminder of sacrifices made for my college",
          "Expected to solve entire family's financial situation",
          "Dismissed as making excuses when I say I'm stressed",
        ],
      },
      {
        label: "Being compared to cousins, siblings, or neighbors",
        question: "What hurts most about these comparisons?",
        issues: [
          "Feeling I will never be good enough in their eyes",
          "Parents praising other kids while ignoring me",
          "Dreading family events where I will be judged",
          "Resenting relatives I used to actually like",
        ],
      },
      {
        label: "Heavy guilt about the money parents are spending",
        question: "How does this guilt show up?",
        issues: [
          "Guilt every time I spend money on basic things",
          "Terrified that failing wastes their money",
          "Feeling like an enormous financial burden",
          "Cannot relax because I feel I owe them success",
        ],
      },
      {
        label: "Problems or fights happening at home right now",
        question: "How does this affect you in college?",
        issues: [
          "Constant worry about parents' health or fights",
          "Guilt that I'm in hostel while family is struggling",
          "Getting draining phone calls right before exams",
          "Helpless because I'm too far away to fix anything",
        ],
      },
    ],
  },
  {
    key: "relationships",
    emoji: "🤝",
    label: "Relationships & Friends",
    question: "What is happening in your social circle?",
    rootCauses: [
      {
        label: "Breakup or complicated relationship drama",
        question: "What is the hardest part right now?",
        issues: [
          "Seeing them around campus or in class daily",
          "Obsessively checking their social media or status",
          "Replaying old memories instead of studying",
          "Mutual friends picking sides and making it awkward",
        ],
      },
      {
        label: "Feeling left out or ignored by my college group",
        question: "What is happening inside this group?",
        issues: [
          "Friends make plans and trips without inviting me",
          "Cold behavior, subtle jokes, or talking behind back",
          "Only contacted when someone needs notes or proxy",
          "Scared to leave the group because I'll be alone",
        ],
      },
      {
        label: "Daily friction or arguments with my roommate",
        question: "What is the core issue in your room?",
        issues: [
          "Zero personal space, constant noise, or late lights",
          "Untidiness or using my belongings without asking",
          "Constant visitors in room with no quiet time",
          "Passive-aggressive silence or hostile atmosphere",
        ],
      },
      {
        label: "Drifting apart from school friends with no one new here",
        question: "How is this affecting your daily life?",
        issues: [
          "School friends made new circles, calls have stopped",
          'No genuine "3 AM friend" on this campus',
          "Faking happiness on campus while feeling disconnected",
          "Eating in the mess and walking to hostel alone",
        ],
      },
    ],
  },
  {
    key: "loneliness",
    emoji: "🌧️",
    label: "Loneliness & Hostel Life",
    question: "What does this loneliness feel like?",
    rootCauses: [
      {
        label: "Surrounded by hundreds of people but feeling totally alone",
        question: "What creates this disconnection?",
        issues: [
          "Conversations around me feel fake and surface-level",
          "Everyone already belongs to a clique or regional group",
          "Imposter syndrome — I just don't fit this college culture",
          "Hiding my real self out of fear of being judged",
        ],
      },
      {
        label: "Severe homesickness — missing family and home",
        question: "What do you miss most?",
        issues: [
          "Mom's food and someone who genuinely cares how I feel",
          "Safety, quiet, and comfort of my home room",
          "Hometown friends, local language, familiar streets",
          "Crying alone at night after calls with parents",
        ],
      },
      {
        label: "Going through entire days without talking to anyone",
        question: "What is keeping you isolated?",
        issues: [
          "Social exhaustion — stepping out feels too draining",
          "Fear of awkward small talk or approaching groups",
          "Escaping into YouTube or Reels in bed all day",
          "Feeling like nobody would notice if I didn't show up",
        ],
      },
      {
        label: "Cannot find people on the same wavelength as me",
        question: "What kind of connection are you looking for?",
        issues: [
          "One genuine friend to talk about ambitions and fears",
          "People who take projects or passions seriously",
          "Someone to explore the city or grab tea with",
          "A group that is not about gossip or substance use",
        ],
      },
    ],
  },
  {
    key: "health",
    emoji: "😴",
    label: "Sleep & Health",
    question: "What is broken in your physical routine?",
    rootCauses: [
      {
        label: "Staying awake till 3 or 4 AM every night",
        question: "What is keeping you up so late?",
        issues: [
          "Mind races with career and life worries in the dark",
          "Doomscrolling Reels, Shorts, or Reddit in bed",
          "Hostel noise, wingmates shouting, or roommate games",
          "Night is the only quiet personal time I have",
        ],
      },
      {
        label: "Skipping mess meals or eating only junk food",
        question: "What is driving this?",
        issues: [
          "Mess food is unhygienic or tasteless, so I skip it",
          "Irregular sleep means missing breakfast and lunch",
          "Surviving on instant noodles and heavy caffeine",
          "Lost appetite completely due to stress or acidity",
        ],
      },
      {
        label: "Sleeping 8+ hours but waking up with zero energy",
        question: "How is this exhaustion showing up?",
        issues: [
          "Brain fog — cannot think clearly or remember things",
          "Frequent headaches, eye strain, neck and back pain",
          "Falling asleep or zoning out in morning lectures",
          "Feeling physically weak and sluggish all day",
        ],
      },
      {
        label: "Glued to phone or laptop screens for 8+ hours a day",
        question: "What consumes most of your screen time?",
        issues: [
          "Short-form video feeds (Reels / Shorts) for hours",
          "Mobile or PC games (BGMI, Valorant) to numb stress",
          "Binge-watching series to escape real-world problems",
          "Switching between tabs endlessly without finishing work",
        ],
      },
    ],
  },
  {
    key: "money",
    emoji: "💸",
    label: "Money & Expenses",
    question: "What is causing financial pressure right now?",
    rootCauses: [
      {
        label: "Monthly allowance ran out before the month ended",
        question: "What caused the shortage?",
        issues: [
          "Unexpected college expenses (exam fees, lab supplies)",
          "Food delivery cost because mess was inedible",
          "Medical or travel emergency",
          "Poor impulse spending earlier in the month",
        ],
      },
      {
        label: "Pressure to keep up with friends' spending (food, trips, cafes)",
        question: "How are you managing this?",
        issues: [
          "Making excuses to avoid paid group outings",
          "Spending money I can't afford to avoid embarrassment",
          "Feeling left out when friends order food or book cabs",
          "Severe anxiety whenever the group bill is split equally",
        ],
      },
      {
        label: "Constantly worrying about student loan repayment after college",
        question: "What is the biggest fear about the loan?",
        issues: [
          "Grace period ends soon and EMI payments will start",
          "Monthly EMI will crush me if I get a modest salary",
          "Interest keeps compounding into a scary total number",
          "Feeling like a debtor before my adult career even starts",
        ],
      },
      {
        label: "Hesitating or feeling guilty to ask parents for money",
        question: "What makes this so hard?",
        issues: [
          "Parents are already struggling with monthly bills",
          "They will interrogate and scold every single expense",
          "Ashamed to depend on parents at 20–22 years old",
          "Prefer skipping meals over calling home for extra cash",
        ],
      },
    ],
  },
  {
    key: "overthinking",
    emoji: "🌀",
    label: "Overthinking & Numbness",
    question: "How would you describe what is on your mind?",
    rootCauses: [
      {
        label: "Thoughts are racing and won't slow down",
        question: "What are they spinning around?",
        issues: [
          "Replaying awkward moments or old mistakes",
          "Imagining worst-case scenarios about career or life",
          "Endless mental to-do list without starting any task",
          "Pure mental noise — can't hold one thought for 5 seconds",
        ],
      },
      {
        label: "Emotionally numb — not sad, not happy, just blank",
        question: "What does this numbness feel like?",
        issues: [
          "Don't feel like talking, laughing, or even crying",
          "Going through daily tasks completely on autopilot",
          "Lost excitement for hobbies, gaming, or movies I loved",
          "Feeling like a ghost watching life pass by",
        ],
      },
      {
        label: "A heavy, uneasy feeling in my chest for no clear reason",
        question: "How is your body reacting?",
        issues: [
          "Shallow breathing and tightness in the chest",
          "Clenched jaw, tense shoulders, or restless legs",
          "Stomach flutter like something bad is about to happen",
          "Jittery, easily startled, or irritated by small noises",
        ],
      },
      {
        label: "Restless feeling that I am running out of time",
        question: "Where is this urgency coming from?",
        issues: [
          "Seeing younger people building things online",
          "Half of college is over with nothing to show for it",
          "Panic about stepping into the real world as an adult",
          "Feels like everyone has a life manual I somehow missed",
        ],
      },
    ],
  },
]

// Shown instead of the category step when mood is Very Happy / Happy.
export const POSITIVE_TREE: CheckinTree = {
  key: "positive",
  emoji: "☀️",
  label: "Positive Momentum",
  question: "What gave you this positive boost today?",
  rootCauses: [
    {
      label: "Finished study work or submitted a project",
      question: "What did you accomplish?",
      issues: [
        "Cleared a tough topic or solved a coding problem",
        "Studied 3+ hours without getting distracted",
        "Finished project before deadline for once",
        "Understood a lecture topic that used to confuse me",
      ],
    },
    {
      label: "Spent great time with friends",
      question: "What made it so good?",
      issues: [
        "Hearty laughs with no academic pressure on mind",
        "Deep talk where I felt truly listened to",
        "Campus walk, chai break, or meal together",
        "Made a new friend or felt genuinely welcomed",
      ],
    },
    {
      label: "Got some good news or a personal win",
      question: "What was the win?",
      issues: [
        "Scored better than expected in test or quiz",
        "Shortlisted for interview, hackathon, or club",
        "Encouragement or praise from teacher or senior",
        "Resolved a personal conflict or received a good message",
      ],
    },
    {
      label: "Good sleep and a peaceful, relaxed day",
      question: "How did you recharge?",
      issues: [
        "Woke up feeling genuinely rested for the first time in days",
        "Took a long nap without checking my phone",
        "Relaxed guilt-free without worrying about studies",
        "Enjoyed a warm meal and calm routine",
      ],
    },
  ],
}

export function findTree(categoryKey: string | null | undefined) {
  if (!categoryKey) return undefined
  if (categoryKey === POSITIVE_TREE.key) return POSITIVE_TREE
  return CATEGORY_TREES.find((t) => t.key === categoryKey)
}

// Label for a stored category: prebuilt key → its label, custom "Others" text → as-is.
export function categoryLabel(category: string | null | undefined) {
  if (!category) return null
  return findTree(category)?.label ?? category
}

// "Placements & Career → Rejections / not getting shortlisted → ..." for history views.
export function topicSummary(c: {
  category?: string | null
  rootCause?: string | null
  specificIssue?: string | null
}) {
  const parts = [categoryLabel(c.category), c.rootCause, c.specificIssue].filter(Boolean)
  return parts.length ? parts.join(" → ") : null
}
