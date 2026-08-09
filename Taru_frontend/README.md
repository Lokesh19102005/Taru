# Taru - Emotional Wellbeing 🧠💚

A modern emotional health dashboard that helps users track, understand, and improve their mental wellbeing through daily check-ins, mood tracking, guided conversations, and therapeutic games.

## ✨ Features

- **Landing Page** — A welcoming introduction to the platform
- **Daily Check-in Flow** — Guided emotional check-ins to reflect on your feelings (also available as a guest)
- **Mood Tracker** — Visualize and track your emotional patterns over time
- **Talk Space** — A safe space for guided conversations and support
- **Therapeutic Games** — Fun, interactive games designed to boost mental wellness
- **Psychiatrist Connect** — Find and connect with mental health professionals
- **Authentication** — Secure sign-up and login

## 🛠️ Tech Stack

- **Framework:** [React 19](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite 6](https://vitejs.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Routing:** [React Router v7](https://reactrouter.com/)
- **Data Fetching:** [TanStack React Query](https://tanstack.com/query)
- **Icons:** [Lucide React](https://lucide.dev/)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (recommended package manager)

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/taru-emotional-wellbeing.git
cd taru-emotional-wellbeing

# Install dependencies
pnpm install

# Start the development server
pnpm run dev
```

The app will be available at `http://localhost:5173`.

### Build for Production

```bash
pnpm run build
```

The optimized output will be generated in the `dist/` directory.

### Preview Production Build

```bash
pnpm run preview
```

## 📁 Project Structure

```
├── public/                 # Static assets
├── src/
│   ├── api/                # API layer and service functions
│   ├── components/         # Reusable UI components
│   │   └── dashboard/      # Dashboard-specific views
│   ├── data/               # Static data and constants
│   ├── lib/                # Utility functions and helpers
│   ├── pages/              # Top-level page components
│   ├── types/              # TypeScript type definitions
│   ├── App.tsx             # Root application component with routing
│   ├── main.tsx            # React entry point
│   └── index.css           # Global styles and Tailwind imports
├── index.html              # HTML entry point
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Project metadata and dependencies
```

## 📄 License

This project is private and not licensed for public distribution.

---

Made with 💚 for better mental health
