# Taru — Complete Technical Architecture
### Mental Health Platform for College Students
**Company:** Cogniease Techno Labs Pvt. Ltd.
**Live at:** [tarubharat.com](https://www.tarubharat.com)

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Deployment Architecture](#4-deployment-architecture)
5. [User Roles](#5-user-roles)
6. [Database Design (MongoDB Models)](#6-database-design-mongodb-models)
7. [Backend Architecture](#7-backend-architecture)
8. [Authentication & Security](#8-authentication--security)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Feature-wise Data Flow](#10-feature-wise-data-flow)
11. [API Endpoint Reference](#11-api-endpoint-reference)
12. [Real-time Communication](#12-real-time-communication)

---

## 1. Project Overview

**Taru** is a college-focused mental health platform with three types of users:

| User Type | Purpose |
|-----------|---------|
| **Student** | Track mood, book psychiatrist sessions, play wellness games, raise campus concerns, chat with AI |
| **Psychiatrist** | Manage availability, accept/reject appointments, conduct video sessions |
| **Institution (College)** | Monitor overall student wellness trends, view campus concerns (read-only) |

---

## 2. Technology Stack

### Frontend
| Technology | Role |
|------------|------|
| **React 19** | UI framework |
| **TypeScript** | Type-safe JavaScript |
| **Vite 6** | Build tool and dev server |
| **Tailwind CSS v4** | Utility-first styling |
| **React Router v7** | Client-side routing |
| **Socket.io-client** | Real-time peer chat and games |

### Backend
| Technology | Role |
|------------|------|
| **Node.js + Express** | HTTP server & REST API |
| **MongoDB + Mongoose** | Database & ORM |
| **JSON Web Tokens (JWT)** | Authentication |
| **bcryptjs** | Password hashing |
| **Socket.io** | Real-time WebSocket server |
| **cookie-parser** | Cookie middleware |
| **CORS** | Cross-origin request control |

---

## 3. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER (User)                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              React Frontend (Vite SPA)                   │   │
│  │                                                          │   │
│  │  ┌─────────────┐  ┌───────────────┐  ┌───────────────┐  │   │
│  │  │ React Router│  │ React Context │  │ API Layer     │  │   │
│  │  │  (Routing)  │  │ (Global State)│  │ (src/api/*.ts)│  │   │
│  │  └─────────────┘  └───────────────┘  └───────┬───────┘  │   │
│  └─────────────────────────────────────────────-│──────────┘   │
└────────────────────────────────────────────────-│───────────────┘
                                                  │
                          ┌───────────────────────┤
                          │  REST API (HTTPS)      │  WebSocket
                          │  JSON over HTTP        │  (Socket.io)
                          ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Express.js on Render)               │
│                                                                 │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────┐              │
│  │   CORS   │  │   Auth      │  │  Socket.io   │              │
│  │Middleware│  │  Middleware │  │   Server     │              │
│  └──────────┘  └──────┬──────┘  └──────┬───────┘              │
│                       │                │                        │
│  ┌────────────────────▼────────────────▼──────────────────┐   │
│  │                   Controllers                           │   │
│  │  auth | user | checkin | psychiatrist | appointment    │   │
│  │  availability | institution | meeting | chatbot        │   │
│  │  concern                                               │   │
│  └────────────────────────┬───────────────────────────────┘   │
└───────────────────────────│─────────────────────────────────────┘
                            │  Mongoose ODM
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MongoDB Atlas (Database)                      │
│                                                                 │
│   Users | Psychiatrists | Institutions | DailyCheckIns         │
│   Appointments | Availability | Meetings | Concerns            │
│   ConcernComments                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Deployment Architecture

```
Internet
    │
    ├──▶  www.tarubharat.com  ──▶  Vercel (Frontend Hosting)
    │         (React SPA)
    │
    └──▶  taru-aw05.onrender.com  ──▶  Render (Backend Hosting)
                (Express API)
                     │
                     └──▶  MongoDB Atlas (Cloud Database)
```

- **Frontend** is deployed on **Vercel** — automatic deployment on every push to `main` branch on GitHub.
- **Backend** is deployed on **Render** — a Node.js web service that auto-restarts on crash.
- **CORS** on the backend is configured to only accept requests from `https://tarubharat.com` and `https://www.tarubharat.com`.

---

## 5. User Roles

There are **3 completely separate user types**, each with their own login, JWT, and dashboard:

```
┌────────────────┐     ┌─────────────────────┐     ┌───────────────────┐
│    Student     │     │    Psychiatrist      │     │   Institution     │
│                │     │                     │     │                   │
│ /auth          │     │ /psychiatrist/signin│     │ /institution/login│
│ /dashboard     │     │ /psychiatrist/      │     │ /institution/     │
│                │     │   dashboard         │     │   dashboard       │
│ Role: 'user'   │     │ Role:'psychiatrist' │     │ Role:'institution'│
└────────────────┘     └─────────────────────┘     └───────────────────┘
```

Each role gets its own JWT with the role encoded inside it, preventing one role from accessing another's data.

---

## 6. Database Design (MongoDB Models)

### 6.1 User (Student)

```
User {
  _id         : ObjectId (auto)
  username    : String  → Auto-generated as "taru_xxxxxxxx" (random, unique)
  email       : String  → Required, unique, lowercase
  password    : String  → Bcrypt hashed (salt rounds: 12), never returned in queries
  college     : String  → Required. KEY FIELD — used to scope all college-level data
  year        : String  → e.g., "2nd Year"
  degree      : String  → e.g., "B.Tech"
  batch       : String  → e.g., "2022-2026"
  age         : Number
  gender      : String
  checkinStreak: Number → Tracks consecutive daily check-in streak
  createdAt   : Date    (auto)
  updatedAt   : Date    (auto)
}
```

### 6.2 Psychiatrist

```
Psychiatrist {
  _id            : ObjectId (auto)
  name           : String
  email          : String (unique)
  password       : String (bcrypt hashed)
  role           : String = 'psychiatrist'
  profileImage   : String (URL)
  qualification  : String
  specialization : [String]
  experience     : Number (years)
  bio            : String
  languages      : [String]
}
```

### 6.3 Institution (College)

```
Institution {
  _id          : ObjectId (auto)
  collegeName  : String (unique) → KEY FIELD — must match User.college exactly
  password     : String (bcrypt hashed)
  contactEmail : String
  role         : String = 'institution'
}
```

> **Important:** `User.college` and `Institution.collegeName` must be the same string. This is how the backend knows which students belong to which institution.

### 6.4 DailyCheckIn (Mood Tracking)

```
DailyCheckIn {
  _id           : ObjectId (auto)
  userId        : ObjectId → ref: User (null for guest check-ins)
  date          : Date
  mood          : { label: String, score: Number }  → 0 Very Happy … 4 Sad (required)
  category      : String | null → tree key (e.g. "placements", "positive") or student's "Others" text
  rootCause     : String | null → prebuilt option label or "Others" text
  specificIssue : String | null → prebuilt option label or "Others" text
  energy        : Number | null (0 best – 4 worst, null = skipped)
  stress        : Number | null (0 best – 4 worst, null = skipped)
  motivation    : Number | null (0 best – 4 worst, null = skipped)
  feedback      : String (optional free text)
  totalScore    : Number → mood + energy + stress + motivation (skipped = 0), 0–16, lower is better
  createdAt     : Date (auto)
}
```

### 6.5 Appointment

```
Appointment {
  _id            : ObjectId (auto)
  studentId      : ObjectId → ref: User
  psychiatristId : ObjectId → ref: Psychiatrist
  availabilityId : ObjectId → ref: Availability
  date           : Date
  startTime      : String (e.g., "10:00 AM")
  endTime        : String (e.g., "11:00 AM")
  status         : Enum ["requested", "confirmed", "completed", "cancelled", "no_show"]
  reason         : String (student's reason for booking)
  notes          : String (psychiatrist's notes)
  aiSummary      : {
    consentGiven : Boolean    → Student must consent before AI processes chat
    status       : Enum ["not_requested", "pending", "available", "failed"]
    feelings     : String     → AI-extracted summary of student's feelings
    mainConcern  : String     → AI-extracted main concern
    context      : String     → AI-extracted context
    disclaimer   : String     → "AI-generated conversation summary - not a clinical diagnosis."
  }
}
```

### 6.6 Meeting (Video Session)

```
Meeting {
  _id           : ObjectId (auto)
  appointmentId : ObjectId → ref: Appointment (unique, 1-to-1 with appointment)
  meetingId     : String   → Unique room ID, format "m_<32hex chars>"
  status        : Enum ["scheduled", "active", "ended"]
  startedAt     : Date
  endedAt       : Date
  duration      : Number (minutes)
}
```

### 6.7 Concern (Campus Concerns Board)

```
Concern {
  _id          : ObjectId (auto)
  user         : ObjectId → ref: User
  username     : String   → Copied from User at creation time (for display)
  college      : String   → Copied from User.college (used to scope to one college)
  type         : Enum ["college_admin", "faculty", "student_peer", "hostel", "safety", "financial", "other"]
                           → Display tag only, not a filter in DB
  description  : String   → Max 2000 chars
  upvotes      : [ObjectId] → Array of User IDs who upvoted
  downvotes    : [ObjectId] → Array of User IDs who downvoted
  upvoteCount  : Number   → Denormalized count (for fast read without counting array)
  downvoteCount: Number   → Denormalized count
  commentCount : Number   → Denormalized count
  createdAt    : Date (auto)
}
```

### 6.8 ConcernComment (Separate collection for scalability)

```
ConcernComment {
  _id      : ObjectId (auto)
  concern  : ObjectId → ref: Concern (indexed for fast lookup)
  user     : ObjectId → ref: User
  username : String   → Copied from User at creation time
  text     : String   → Max 1000 chars
  createdAt: Date (auto)
}
```

### Entity Relationship Summary

```
User ──────────────────── DailyCheckIn (one-to-many)
User ──────────────────── Appointment  (one-to-many)
User ──────────────────── Concern      (one-to-many)
User ──────────────────── ConcernComment (one-to-many)

Psychiatrist ──────────── Appointment  (one-to-many)
Psychiatrist ──────────── Availability (one-to-many)

Appointment ───────────── Meeting      (one-to-one)

Concern ───────────────── ConcernComment (one-to-many)

Institution ──────────── [Scoped via collegeName = User.college]
```

---

## 7. Backend Architecture

### Folder Structure

```
Taru_backend/
└── src/
    ├── app.js              ← Express app setup, CORS, route registration
    ├── server.js           ← HTTP server start, DB connection, Socket.io init
    ├── middleware/
    │   └── auth.js         ← JWT protect() middleware
    ├── models/             ← Mongoose schemas (9 models)
    ├── controllers/        ← Business logic (10 controllers)
    ├── routes/             ← Express routers (10 route files)
    └── realtime/
        └── index.js        ← Socket.io server for games and chat
```

### Request Lifecycle

Every API request follows the exact same path:

```
Client Request
      │
      ▼
 Express App (app.js)
      │
      ├── CORS check (is this origin allowed?)
      ├── express.json() (parse request body)
      ├── cookie-parser
      │
      ▼
 Route Match (e.g., POST /api/concern)
      │
      ▼
 Auth Middleware: protect('user')
      ├── Extract Bearer token from Authorization header
      ├── Verify JWT signature using JWT_SECRET
      ├── Decode payload to get { id, role }
      ├── Fetch the actual user/psychiatrist/institution from DB
      └── Attach as req.user → pass to controller
      │
      ▼
 Controller Function
      ├── Read req.user (already verified, no extra DB call needed)
      ├── Read req.body / req.params
      ├── Apply business logic
      ├── Query MongoDB via Mongoose
      └── Send JSON response { success: true/false, data: ... }
```

---

## 8. Authentication & Security

### Login Flow

```
User types email + password
         │
         ▼
POST /api/auth/login (or /psychiatrist/login or /institution/login)
         │
         ▼
Backend:
  1. Find user by email
  2. bcrypt.compare(inputPassword, hashedPassword)
  3. If match → create JWT:
       jwt.sign({ id: user._id, role: 'user' }, JWT_SECRET, { expiresIn: '30d' })
  4. Return token + user data
         │
         ▼
Frontend:
  1. Store token in localStorage as 'taru_token'
  2. Store user data in React Context (global state)
  3. Redirect to dashboard
```

### Every Subsequent Request

```
Frontend API call (e.g., getConcerns())
         │
         ▼
apiRequest() in src/api/client.ts:
  → Reads token from localStorage
  → Adds header: Authorization: Bearer <token>
  → Makes fetch() request
         │
         ▼
Backend: protect('user') middleware
  → Verifies token, extracts user from DB
  → Attaches to req.user
  → Controller runs safely
```

### Role Isolation

The `protect()` middleware takes the role as an argument. This means:
- `protect('user')` → Only students can call this
- `protect('institution')` → Only colleges can call this
- `protect('psychiatrist')` → Only psychiatrists can call this
- If the wrong role tries to access an endpoint → `403 Forbidden`

---

## 9. Frontend Architecture

### Folder Structure

```
Taru_frontend/src/
├── App.tsx                 ← Route definitions for entire app
├── main.tsx                ← React root, wraps app in all Context Providers
├── lib/
│   └── theme.ts            ← Centralized color palette (teal/emerald theme)
├── contexts/
│   ├── AuthContext.tsx     ← Student global state (user profile, login/logout)
│   ├── InstitutionAuthContext.tsx
│   └── PsychiatristAuthContext.tsx
├── api/                    ← All API call functions (one file per domain)
│   ├── client.ts           ← Base fetch wrapper (handles token + errors)
│   ├── auth.ts
│   ├── checkin.ts
│   ├── concern.ts
│   ├── psychiatrist.ts
│   ├── appointment.ts
│   └── ...
├── pages/                  ← Top-level page shells (layout + sidebar)
│   ├── LandingPage.tsx
│   ├── AuthPage.tsx
│   ├── DashboardPage.tsx           ← Student shell
│   ├── PsychiatristDashboardPage.tsx
│   └── InstitutionDashboardPage.tsx
└── components/
    ├── dashboard/          ← Student dashboard views
    │   ├── HomeView.tsx
    │   ├── MoodView.tsx
    │   ├── ConcernsView.tsx
    │   ├── PsychiatristView.tsx
    │   ├── TalkView.tsx
    │   ├── ChatbotView.tsx
    │   └── GamesView.tsx
    ├── institution/        ← Institution dashboard views
    │   ├── InstitutionOverviewView.tsx
    │   ├── InstitutionStudentsView.tsx
    │   ├── InstitutionMoodAnalyticsView.tsx
    │   └── InstitutionConcernsView.tsx
    ├── psychiatrist/       ← Psychiatrist dashboard views
    │   ├── PsychiatristProfileView.tsx
    │   ├── PsychiatristAppointmentsView.tsx
    │   └── ManageAvailabilityView.tsx
    └── games/              ← Multiplayer mini-games
        ├── connect-four/
        ├── memory/
        ├── sea-battle/
        ├── color-wars/
        └── beach-balls/
```

### Routing Structure

```
/                          → LandingPage
/auth                      → AuthPage (Student login/register)
/check                     → CheckinFlow (Guest mood check — no login needed)

/dashboard                 → ProtectedRoute (Student only)
  /dashboard/home          → HomeView
  /dashboard/check         → CheckinFlow (logged-in)
  /dashboard/mood          → MoodView
  /dashboard/psychiatrist  → PsychiatristView (browse & book)
  /dashboard/talk          → TalkView (peer chat)
  /dashboard/chatbot       → ChatbotView
  /dashboard/games         → GamesView
  /dashboard/profile       → ProfileView
  /dashboard/concerns      → ConcernsView

/psychiatrist/signin       → PsychiatristAuthPage
/psychiatrist/dashboard    → PsychiatristProtectedRoute → PsychiatristDashboardPage

/institution/login         → InstitutionAuthPage
/institution/dashboard     → InstitutionProtectedRoute
  /institution/dashboard/overview        → InstitutionOverviewView
  /institution/dashboard/students        → InstitutionStudentsView
  /institution/dashboard/mood-analytics  → InstitutionMoodAnalyticsView
  /institution/dashboard/concerns        → InstitutionConcernsView

/meeting/:meetingId        → MeetingPage (Video session room)
```

---

## 10. Feature-wise Data Flow

### 10.1 Student Login & App Startup

```
Student opens tarubharat.com
       │
       ▼
App.tsx mounts → AuthContext initializes
       │
       ├─ Check localStorage for 'taru_token'
       │
       ├─ Token found? → GET /api/user/me (with token)
       │                   └─ Backend returns { username, email, college, streak, ...}
       │                   └─ Context stores user object globally
       │
       └─ No token? → Redirect to /auth (login page)
```

### 10.2 Daily Mood Check-In

```
Student clicks "Check In"
       │
       ▼
CheckinFlow component loads (8-step questionnaire:
  mood → category → root cause → specific issue → energy → stress → motivation → review)
  Happy / Very Happy moods skip the category step and use the Positive Momentum tree.
  "Others" or Skip at a tree step jumps straight to energy. Tree data: src/lib/checkinTree.ts
       │
       ▼
Student fills each step (stored in local React state)
       │
       ▼
Final step: Submit
       │
       ▼
POST /api/checkin
  Body: { mood, category, rootCause, specificIssue, energy, stress, motivation, feedback }
       │
       ▼
Backend: checkinController
  1. Save DailyCheckIn to MongoDB (with req.user._id)
  2. Validate input, calculate totalScore = mood + energy + stress + motivation
  3. Check if yesterday also had a check-in → update User.checkinStreak
  4. Return saved check-in + new streak
       │
       ▼
Frontend: Show completion + updated streak badge
```

### 10.3 Book a Psychiatrist Appointment

```
Student → /dashboard/psychiatrist
       │
       ▼
GET /api/view_psychiatrist (public, no auth needed)
  → List of all psychiatrists displayed
       │
       ▼
Student selects a psychiatrist → clicks "Book"
       │
       ▼
GET /api/availability?psychiatristId=<id>
  → Fetches available time slots for that psychiatrist
       │
       ▼
Student picks a slot & enters reason
       │
       ▼
POST /api/appointment
  Body: { psychiatristId, availabilityId, date, startTime, endTime, reason }
       │
       ▼
Backend: Creates Appointment with status: "requested"
  → Marks the Availability slot as booked
       │
       ▼
Psychiatrist Dashboard → sees new appointment as "requested"
  → Can "Confirm" or "Cancel" it
       │
       ▼
On confirmation → POST /api/meeting/create
  → Creates Meeting record with unique meetingId
  → Both student and psychiatrist get the link /meeting/<meetingId>
```

### 10.4 Video Meeting (Real-time)

```
Student/Psychiatrist clicks "Join Session"
       │
       ▼
Navigate to /meeting/:meetingId
       │
       ▼
GET /api/meeting/:meetingId (validates access — only the booked student & psychiatrist)
       │
       ▼
Socket.io WebSocket connection established
       │
       ▼
WebRTC signaling via Socket.io:
  ├── User A sends "offer" → Socket.io relays to User B
  ├── User B sends "answer" → Socket.io relays to User A
  └── ICE candidates exchanged → Direct peer-to-peer video/audio established
       │
       ▼
Chat Panel: Text messages sent via Socket.io events (not stored in DB)
       │
       ▼
Session ends → PUT /api/meeting/:meetingId/end
  → Meeting.status = "ended", duration recorded
  → Appointment.status = "completed"
```

### 10.5 Campus Concerns Feature — Complete Deep Dive

The Campus Concerns feature is a college-scoped community board that allows students to raise, discuss, and vote on issues relevant to their campus. The institution can monitor and read all concerns and discussions in a separate read-only view.

---

#### 10.5.1 Overview & Design Philosophy

| Aspect | Decision | Reason |
|--------|----------|--------|
| **Data scope** | College-scoped (students only see their own college's concerns) | Privacy and relevance |
| **Identity** | Backed by username (not anonymous) | Accountability |
| **Comments** | Separate MongoDB collection (`ConcernComment`) | Scalability — avoids bloating the Concern document |
| **Vote counts** | Denormalized (stored as `upvoteCount`, `downvoteCount`) | Fast reads without counting arrays every time |
| **Institution access** | Read-only, no voting/commenting | Oversight without interference |
| **Filtering** | Done on frontend (not DB queries) | Fast UX, no extra API round trips |
| **Concern type** | Display tag only (emoji badge), not a DB filter | Readability, not categorization |

---

#### 10.5.2 Database Models Used

**Concern document** (stored in `concerns` collection):
```
{
  _id          : ObjectId
  user         : ObjectId  → Student who posted (ref: User)
  username     : "taru_xyz123"  → Copied at creation, shown on all cards
  college      : "IIT Allahabad"  → THE KEY SCOPING FIELD
  type         : "safety"  → One of 7 tags (college_admin, faculty, student_peer,
                              hostel, safety, financial, other)
  description  : "There are stray dogs on campus..."
  upvotes      : [ObjectId, ObjectId, ...]  → Array of user IDs who upvoted
  downvotes    : [ObjectId, ObjectId, ...]  → Array of user IDs who downvoted
  upvoteCount  : 12   → Kept in sync with upvotes.length
  downvoteCount: 3    → Kept in sync with downvotes.length
  commentCount : 9    → Kept in sync with ConcernComment count
  createdAt    : ISODate
}
```

**ConcernComment document** (stored in `concerncomments` collection):
```
{
  _id      : ObjectId
  concern  : ObjectId  → ref: Concern (indexed — fast lookup by concern ID)
  user     : ObjectId  → ref: User
  username : "taru_xyz123"
  text     : "I also got bitten last week, this is urgent!"
  createdAt: ISODate
}
```

> **Why a separate collection for comments?** If comments were embedded inside the Concern document as a sub-array, a single document would grow without limit as students comment. MongoDB has a 16MB document limit and reads the entire document each time. A separate collection means only the comments you actually request are fetched — much more scalable.

---

#### 10.5.3 How College Scoping Works (The Core Security Mechanism)

This is the most important concept. The platform uses a **shared string key** to link students to their institution:

```
Student Registration:
  Student types their college name → stored as User.college = "IIT Allahabad"

Institution Registration:
  Institution types their college name → stored as Institution.collegeName = "IIT Allahabad"

At Runtime (Concerns):
  Student calls GET /api/concern
    → Backend reads req.user.college = "IIT Allahabad"
    → DB Query: Concern.find({ college: "IIT Allahabad" })
    → Only that college's concerns are returned ✅

  Institution calls GET /api/concern/institution
    → Backend reads req.user.collegeName = "IIT Allahabad"
    → DB Query: Concern.find({ college: "IIT Allahabad" })
    → Same data, but via institution JWT → different auth, different endpoint ✅
```

```
┌──────────────────────────────────────────────────────────────────┐
│                        MongoDB Database                          │
│                                                                  │
│  concerns collection:                                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ { college: "IIT Allahabad", description: "Stray dogs..." } │  │
│  │ { college: "IIT Allahabad", description: "Library hrs..." }│  │
│  │ { college: "IIT Bombay",    description: "Hostel wifi..." }│  │
│  │ { college: "IIT Bombay",    description: "Fees issue..."  }│  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  IIT Allahabad students → see only their 2 concerns             │
│  IIT Bombay students   → see only their 2 concerns              │
│  IIT Allahabad admin   → sees only their 2 concerns (read-only) │
└──────────────────────────────────────────────────────────────────┘
```

---

#### 10.5.4 Student Side — Step-by-Step Data Flow

**A. Loading the Concerns Page**

```
Student opens /dashboard/concerns
        │
        ▼
ConcernsView.tsx mounts
  → useEffect() runs → calls getConcerns() from src/api/concern.ts
  → GET /api/concern  (Authorization: Bearer <student_jwt>)
        │
        ▼
Backend: protect('user') middleware
  → Verifies JWT → loads student from DB → attaches as req.user
        │
        ▼
Backend: getConcerns controller
  → college = req.user.college  ("IIT Allahabad")
  → Concern.find({ college }).sort({ createdAt: -1 })  ← newest first
  → For each concern, checks if req.user._id is in upvotes[] or downvotes[]
  → Adds userVote: "up" | "down" | null  (so the UI can colour the buttons correctly)
  → Strips raw upvotes[] and downvotes[] arrays (only counts returned for bandwidth)
        │
        ▼
Frontend: setConcerns(res.data)  → renders the concern cards list
```

**B. Raising a New Concern**

```
Student clicks "Raise a Concern" button
  → Inline form expands (no page change, no modal)
  → Student picks a type tag (e.g., 🛡️ Safety)
  → Student types description in textarea
  → Clicks "Submit Concern"
        │
        ▼
POST /api/concern
  Body: { type: "safety", description: "There are stray dogs..." }
        │
        ▼
Backend: createConcern controller
  → college  = req.user.college  = "IIT Allahabad"  (auto-filled, NOT from body)
  → username = req.user.username = "taru_xyz123"    (auto-filled, NOT from body)
  → Concern.create({ user, username, college, type, description })
  → Returns the new concern with userVote: null
        │
        ▼
Frontend:
  → setConcerns(prev => [newConcern, ...prev])
  → New concern appears at the TOP instantly (no page reload)
  → Form closes automatically
```

**C. Voting (Upvote / Downvote)**

```
Student clicks ▲ Upvote
        │
        ▼
STEP 1 — Optimistic UI (instant visual feedback, no waiting):
  Frontend calculates expected new state immediately:
  → If not previously voted:   upvoteCount + 1, userVote = "up",  button turns TEAL
  → If previously upvoted:     upvoteCount - 1, userVote = null   (toggle off)
  → If previously downvoted:   upvoteCount + 1, downvoteCount - 1, userVote = "up"
        │
        ▼  (API call runs in background simultaneously)
STEP 2 — API Call:
  POST /api/concern/:id/vote  {  vote: "up"  }
        │
        ▼
Backend: voteConcern controller
  → Loads concern from DB
  → Applies toggle logic on upvotes[] and downvotes[] arrays
  → Saves new upvoteCount and downvoteCount
  → Returns: { upvoteCount, downvoteCount, userVote }
        │
        ├── API SUCCESS → frontend replaces optimistic values with server values ✅
        └── API FAILURE → frontend calls loadConcerns() to revert to real DB state ❌
```

**D. Adding a Comment**

```
Student clicks "💬 5 comments" button
  → CommentSection component renders below the card
  → useEffect() fires immediately
  → GET /api/concern/:id/comments
        │
        ▼
Backend: getComments controller
  → ConcernComment.find({ concern: id }).sort({ createdAt: 1 })  ← oldest first
  → Returns flat array of comment objects
        │
        ▼
Frontend: renders comment list (avatar + username + time + text)


Student types a comment → presses Enter or Send button
        │
        ▼
POST /api/concern/:id/comment   { text: "I also saw this last week" }
        │
        ▼
Backend: addComment controller
  → username = req.user.username  (auto-filled from JWT)
  → ConcernComment.create({ concern, user, username, text })
  → Concern.commentCount += 1  (keeps count in sync with collection)
  → Returns the new comment object
        │
        ▼
Frontend (real-time update, no sockets needed):
  → setComments(prev => [...prev, newComment])  → appended to bottom of list
  → onCommentAdded() callback fires in CommentSection
  → Parent ConcernCard: setLocalCommentCount(prev => prev + 1)
  → Button now shows "6 comments" immediately
```

---

#### 10.5.5 Institution Side — Step-by-Step Data Flow

**A. Loading the Institution Concerns Dashboard**

```
Institution admin logs in → opens /institution/dashboard/concerns
        │
        ▼
InstitutionConcernsView.tsx mounts
  → useEffect() triggers → getConcernsForInstitution() from src/api/concern.ts
  → GET /api/concern/institution  (Authorization: Bearer <institution_jwt>)
        │
        ▼
Backend: protect('institution') middleware
  → Verifies JWT → loads institution from DB
  → req.user.collegeName = "IIT Allahabad"
        │
        ▼
Backend: getConcernsForInstitution controller
  → Concern.find({ college: "IIT Allahabad" }).sort({ createdAt: -1 })
  → Strips upvotes[] and downvotes[] arrays entirely from response
    (institution only sees counts — NOT which individual students voted)
  → Returns array of concern objects with counts only
        │
        ▼
Frontend: setConcerns(res.data)  → full list stored in component state
```

**B. Applying Filters — All in the Browser, Zero Extra API Calls**

```
Admin selects dropdowns:
  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │  Concern Type    │  │     Period       │  │    Sort by       │
  │  [ Safety ▼ ]   │  │ [ Last 7 days ▼] │  │[Most Upvotes ▼ ] │
  └──────────────────┘  └──────────────────┘  └──────────────────┘
        │
        ▼
useMemo() hook recalculates instantly (no API call):

  Step 1 — Filter by Type:
    result = concerns.filter(c => c.type === "safety")

  Step 2 — Filter by Period:
    cutoffDate = today minus 7 days
    result = result.filter(c => new Date(c.createdAt) >= cutoffDate)

  Step 3 — Sort:
    result.sort((a, b) => b.upvoteCount - a.upvoteCount)
        │
        ▼
React re-renders instantly with the filtered + sorted list
"Showing 3 concerns" counter updates automatically
```

**C. Reading Comments (Read-Only)**

```
Admin sees a concern showing "9 comments"
Admin clicks the 💬 button
        │
        ▼
ReadOnlyCommentSection component renders
  → useEffect() fires → getInstitutionComments(concernId)
  → GET /api/concern/institution/:id/comments  (institution JWT)
        │
        ▼
Backend: protect('institution') on this route
  → Reuses the same getComments controller function
  → ConcernComment.find({ concern: id }).sort({ createdAt: 1 })
  → Returns all comments for that concern
        │
        ▼
Frontend renders:
  → Comment list: avatar + username + timestamp + text
  → NO text input box — institution cannot reply or interact
```

---

#### 10.5.6 End-to-End Sequence Diagram

```
  Student               Backend API            MongoDB         Institution Admin
     │                       │                    │                    │
     │── POST /concern ──────▶│                    │                    │
     │  { type, description } │── Insert Concern ─▶│                    │
     │                       │   college:"IIT Alld"│                    │
     │◀── 201 { concern } ───│◀─ Saved ────────────│                    │
     │                       │                    │                    │
     │── POST /concern/:id ─▶│                    │                    │
     │     /vote { "up" }    │── Toggle upvotes[] ▶│                    │
     │◀─ { upvoteCount:13 } ─│◀─ Updated ──────────│                    │
     │                       │                    │                    │
     │── POST /concern/:id ─▶│                    │                    │
     │     /comment { text } │── Insert Comment ──▶│                    │
     │                       │── commentCount++ ──▶│                    │
     │◀── { comment } ───────│◀─ Saved ────────────│                    │
     │                       │                    │                    │
     │                       │                    │◀─ GET /concern/ ───│
     │                       │                    │    /institution    │
     │                       │── find({ college: ─▶│                    │
     │                       │   "IIT Allahabad"})│                    │
     │                       │◀─ [concerns] ───────│                    │
     │                       │── Strip vote arrays │                    │
     │                       │────────────────────────────────────────▶│
     │                       │  [{ upvoteCount:13, │                    │
     │                       │    commentCount:10 }]│                   │
     │                       │                    │                    │
     │                       │                    │◀─ GET /institution─│
     │                       │                    │    /:id/comments   │
     │                       │── find({ concern })▶│                    │
     │                       │◀─ [comments] ───────│                    │
     │                       │────────────────────────────────────────▶│
     │                       │  [{ username, text }]│                   │
```

---

#### 10.5.7 Security Boundaries

| Action | Student | Institution |
|--------|:-------:|:-----------:|
| Create a concern | ✅ | ❌ |
| View concerns (own college only) | ✅ | ✅ Read-only |
| Upvote / Downvote | ✅ | ❌ |
| Add a comment | ✅ | ❌ |
| Read comments | ✅ | ✅ Read-only |
| See which specific user voted | Own vote only | ❌ Counts only |
| Filter / Sort concerns | ✅ | ✅ |
| Delete or edit a concern | ❌ | ❌ |
| View another college's concerns | ❌ | ❌ |

---

#### 10.5.8 Frontend Component Breakdown

```
/dashboard/concerns → ConcernsView.tsx  (Student)
│
├── State: concerns[], showForm, formType, formDesc
├── On mount: GET /api/concern → setConcerns()
│
├── [+ Raise a Concern Button]
│     └── Inline form expands:
│           ├── 7 type tag buttons in a 2x4 responsive grid
│           ├── Textarea (placeholder: "Tell us what happened", max 2000 chars)
│           └── Submit → POST /api/concern → prepend new concern to list
│
└── [Concern Cards List]
      └── ConcernCard  (one per concern)
            ├── Type badge (emoji + label, teal pill)
            ├── Username + relative time ("2h ago")
            ├── Description text
            ├── [▲ count] → voteConcern(id, "up") + optimistic update
            ├── [▼ count] → voteConcern(id, "down") + optimistic update
            └── [💬 N comments] → toggles CommentSection open/closed
                  └── CommentSection
                        ├── On open: GET /api/concern/:id/comments
                        ├── Scrollable flat comment list
                        └── Input + Send → POST /api/concern/:id/comment
                              └── onCommentAdded() → count +1 in parent card


/institution/dashboard/concerns → InstitutionConcernsView.tsx  (Institution)
│
├── State: concerns[], filterType, filterPeriod, sortBy
├── On mount: GET /api/concern/institution → setConcerns()
│
├── [Filter Bar — 3 styled dropdowns]
│     ├── Concern Type: All | College/Admin | Faculty | Student/Peer | ...
│     ├── Period:       All | Today | Last 7 days | Last 30 days | Last 1 year
│     └── Sort by:      Newest | Most Upvotes | Most Downvotes | Most Comments
│           → useMemo() recalculates filtered+sorted list instantly on change
│
└── [Read-Only Concern Cards]
      └── InstitutionConcernCard  (one per concern)
            ├── Type badge
            ├── Username + relative time
            ├── Description text
            ├── [▲ count] — static display, NOT clickable
            ├── [▼ count] — static display, NOT clickable
            └── [💬 N comments] — CLICKABLE → expands ReadOnlyCommentSection
                  └── ReadOnlyCommentSection
                        ├── On open: GET /api/concern/institution/:id/comments
                        ├── Scrollable flat comment list
                        └── NO input — read-only, cannot reply
```

### 10.6 AI Chatbot

```
Student opens Chatbot
       │
       ▼
Student types a message
       │
       ▼
POST /api/chatbot
  Body: { message, conversationHistory }
       │
       ▼
Backend: chatbotController
  → Sends message to Google Gemini API
  → Returns AI response
       │
       ▼
Frontend: Displays AI response in chat UI
(Conversation history kept in React state, not stored in DB)
```

---

## 11. API Endpoint Reference

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | None | Student registration |
| POST | `/api/auth/login` | None | Student login |
| POST | `/api/psychiatrist/register` | None | Psychiatrist registration |
| POST | `/api/psychiatrist/login` | None | Psychiatrist login |
| POST | `/api/institution/register` | None | Institution registration |
| POST | `/api/institution/login` | None | Institution login |

### Student APIs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/user/me` | User | Get logged-in student profile |
| PUT | `/api/user/me` | User | Update student profile |
| POST | `/api/checkin` | User | Submit daily mood check-in |
| GET | `/api/checkin/history` | User | Get past check-ins |

### Concern APIs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/concern` | User | Create a new concern |
| GET | `/api/concern` | User | Get all concerns for user's college |
| POST | `/api/concern/:id/vote` | User | Upvote or downvote a concern |
| GET | `/api/concern/:id/comments` | User | Get comments for a concern |
| POST | `/api/concern/:id/comment` | User | Add a comment |
| GET | `/api/concern/institution` | Institution | Get all concerns for the institution's college |
| GET | `/api/concern/institution/:id/comments` | Institution | Read comments (read-only) |

### Psychiatrist & Appointment APIs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/view_psychiatrist` | None | List all psychiatrists (public) |
| GET | `/api/availability` | User | Get a psychiatrist's available slots |
| POST | `/api/appointment` | User | Book an appointment |
| GET | `/api/appointment/my` | User | Get student's appointments |
| PUT | `/api/appointment/:id` | Psychiatrist | Confirm/cancel an appointment |

### Institution Analytics APIs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/institution/me` | Institution | Get institution profile |
| GET | `/api/institution/analytics` | Institution | Aggregated wellness data for the college |
| GET | `/api/institution/students` | Institution | List of students in the college |

---

## 12. Real-time Communication

The platform uses **Socket.io** for two real-time features:

### Peer-to-Peer Talk (TalkView)
```
Student A clicks "Start Talking"
  → Socket.io event: "find_match"
  → Server queues student, waits for another student from same/any college
  → Match found → both students receive "match_found" with room ID
  → WebRTC video/audio established
  → Text chat via Socket.io "message" events (ephemeral, not stored)
```

### Multiplayer Wellness Games (GamesView)
5 games available: **Connect Four**, **Memory**, **Sea Battle**, **Color Wars**, **Beach Balls**
```
Student clicks a game → enters Lobby
  → Socket.io: "join_game_lobby" with game type
  → Matched with another player
  → Game state synchronized via Socket.io events
  → Moves/actions sent as events, server validates and broadcasts to both players
```

> **Note:** All Socket.io connections require the same JWT authentication as REST APIs. The server validates the token on connection setup.

---

*Document prepared by Cogniease Techno Labs Pvt. Ltd.*
*Last updated: October 2026*
