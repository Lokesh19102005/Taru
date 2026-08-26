import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Sun, ChevronRight, ArrowLeft, Wind } from "lucide-react";
import COLORS from "../../lib/theme";
import MemoryLobby from "../games/memory/MemoryLobby";
import MemoryBoard from "../games/memory/MemoryBoard";
import { disconnectSocket } from "../../lib/socket";
import { GameStartedPayload } from "../../types/game";

type Phase = "inhale" | "hold" | "exhale";
const PHASE_DURATIONS: Record<Phase, number> = {
  inhale: 4000,
  hold: 4000,
  exhale: 6000,
};
const CYCLE_DURATION = 14000; // 4+4+6

const PHASE_CONFIG: Record<
  Phase,
  { emoji: string; label: string; sub: string }
> = {
  inhale: { emoji: "🫧", label: "Breathe In", sub: "Slowly breathe in..." },
  hold: { emoji: "🫧", label: "Hold", sub: "Hold gently..." },
  exhale: { emoji: "🫧", label: "Breathe Out", sub: "Slowly breathe out..." },
};

const SESSION_OPTIONS = [
  { label: "1 min", seconds: 60 },
  { label: "2 min", seconds: 120 },
  { label: "5 min", seconds: 300 },
];

// Lerp between two hex colors
function lerpColor(a: string, b: string, t: number) {
  const parse = (c: string) => [
    parseInt(c.slice(1, 3), 16),
    parseInt(c.slice(3, 5), 16),
    parseInt(c.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function BreathingBubble({ onBack }: { onBack: () => void }) {
  const [sessionLen, setSessionLen] = useState(60);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [phase, setPhase] = useState<Phase>("inhale");
  const [elapsed, setElapsed] = useState(0);
  const [bubbleScale, setBubbleScale] = useState(0.6);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);

  const progress = Math.min(elapsed / (sessionLen * 1000), 1);
  const bgColor = lerpColor("#FDE8E8", "#DBEAFE", progress); // light red → light blue

  const animate = useCallback(
    (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const totalElapsed = timestamp - startTimeRef.current;
      setElapsed(totalElapsed);

      if (totalElapsed >= sessionLen * 1000) {
        setCompleted(true);
        setStarted(false);
        return;
      }

      // Determine current phase
      const cyclePos = totalElapsed % CYCLE_DURATION;
      let currentPhase: Phase;
      if (cyclePos < PHASE_DURATIONS.inhale) {
        currentPhase = "inhale";
        const phaseProgress = cyclePos / PHASE_DURATIONS.inhale;
        setBubbleScale(0.6 + phaseProgress * 0.5); // 0.6 → 1.1
      } else if (cyclePos < PHASE_DURATIONS.inhale + PHASE_DURATIONS.hold) {
        currentPhase = "hold";
        setBubbleScale(1.1);
      } else {
        currentPhase = "exhale";
        const exhaleStart = PHASE_DURATIONS.inhale + PHASE_DURATIONS.hold;
        const phaseProgress = (cyclePos - exhaleStart) / PHASE_DURATIONS.exhale;
        setBubbleScale(1.1 - phaseProgress * 0.5); // 1.1 → 0.6
      }
      setPhase(currentPhase);

      animRef.current = requestAnimationFrame(animate);
    },
    [sessionLen],
  );

  const start = () => {
    setStarted(true);
    setCompleted(false);
    setElapsed(0);
    setPhase("inhale");
    setBubbleScale(0.6);
    startTimeRef.current = 0;
    animRef.current = requestAnimationFrame(animate);
  };

  const stop = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = null;
    setStarted(false);
    setElapsed(0);
    setBubbleScale(0.6);
    startTimeRef.current = 0;
  };

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const remainingSec = Math.max(
    0,
    Math.ceil((sessionLen * 1000 - elapsed) / 1000),
  );
  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;

  // Progress ring
  const ringRadius = 90;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - progress);

  if (completed) {
    return (
      <div
        className="min-h-[70vh] flex items-center justify-center rounded-3xl p-8 transition-colors duration-1000"
        style={{ background: "#DBEAFE" }}
      >
        <div className="text-center">
          <div className="text-5xl mb-4">🌿</div>
          <h2
            className="text-2xl font-extrabold mb-2"
            style={{ color: "#1E3A5F" }}
          >
            Nice work!
          </h2>
          <p className="text-sm mb-6" style={{ color: "#3B6B9A" }}>
            You completed{" "}
            {sessionLen >= 60
              ? `${sessionLen / 60} minute${sessionLen > 60 ? "s" : ""}`
              : `${sessionLen} seconds`}{" "}
            of mindful breathing.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setCompleted(false);
                start();
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: "#1E3A5F" }}
            >
              Again
            </button>
            <button
              onClick={() => {
                setCompleted(false);
                setElapsed(0);
                onBack();
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-bold border transition-all hover:bg-white/50"
              style={{ borderColor: "#1E3A5F", color: "#1E3A5F" }}
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (started) {
    const cfg = PHASE_CONFIG[phase];
    return (
      <div
        className="min-h-[70vh] flex flex-col items-center justify-center rounded-3xl p-8 transition-colors duration-[2000ms]"
        style={{ background: bgColor }}
      >
        {/* Timer */}
        <div
          className="text-xs font-bold mb-6 tracking-widest"
          style={{ color: "rgba(0,0,0,0.35)" }}
        >
          {mins}:{String(secs).padStart(2, "0")}
        </div>

        {/* Bubble with progress ring */}
        <div className="relative w-52 h-52 flex items-center justify-center mb-8">
          {/* Progress ring */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 200 200"
          >
            <circle
              cx="100"
              cy="100"
              r={ringRadius}
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="3"
            />
            <circle
              cx="100"
              cy="100"
              r={ringRadius}
              fill="none"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="3"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.5s linear" }}
            />
          </svg>

          {/* Bubble */}
          <div
            className="absolute rounded-full flex items-center justify-center"
            style={{
              width: "160px",
              height: "160px",
              transform: `scale(${bubbleScale})`,
              background:
                "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9), rgba(147,197,253,0.5))",
              boxShadow:
                "0 0 60px rgba(147,197,253,0.4), inset 0 0 30px rgba(255,255,255,0.5)",
              transition: "transform 0.1s linear",
            }}
          >
            <div className="text-center">
              <div className="text-3xl mb-1">{cfg.emoji}</div>
              <div
                className="text-sm font-extrabold"
                style={{ color: "#1E3A5F" }}
              >
                {cfg.label}
              </div>
            </div>
          </div>
        </div>

        <p
          className="text-sm font-medium mb-8"
          style={{ color: "rgba(0,0,0,0.4)" }}
        >
          {cfg.sub}
        </p>

        <button
          onClick={stop}
          className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl border transition-all hover:bg-white/40"
          style={{ borderColor: "rgba(0,0,0,0.15)", color: "rgba(0,0,0,0.4)" }}
        >
          <ArrowLeft size={14} /> Stop
        </button>
      </div>
    );
  }

  // Start screen
  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-sm hover:underline flex items-center gap-1"
        style={{ color: COLORS.fg3 }}
      >
        <ArrowLeft size={14} /> Back to activities
      </button>

      <div
        className="rounded-2xl p-8 border text-center"
        style={{ background: COLORS.card, borderColor: COLORS.border }}
      >
        <div className="text-4xl mb-3">🫧</div>
        <h2
          className="text-xl font-extrabold mb-1"
          style={{ color: COLORS.fg }}
        >
          Breathing Bubble
        </h2>
        <p className="text-xs mb-6" style={{ color: COLORS.fg3 }}>
          Follow the bubble. Breathe in as it expands, hold, then breathe out as
          it shrinks.
        </p>

        <div className="flex justify-center gap-2 mb-6">
          {SESSION_OPTIONS.map((opt) => (
            <button
              key={opt.seconds}
              onClick={() => setSessionLen(opt.seconds)}
              className="px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all"
              style={{
                borderColor:
                  sessionLen === opt.seconds ? COLORS.primary : COLORS.border,
                background:
                  sessionLen === opt.seconds ? COLORS.primary : "transparent",
                color: sessionLen === opt.seconds ? "#fff" : COLORS.fg,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={start}
          className="px-8 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
          style={{ background: COLORS.primary }}
        >
          Start Session
        </button>
      </div>
    </div>
  );
}

export default function GamesView() {
  const [active, setActive] = useState<string | null>(null);
  const [memoryGame, setMemoryGame] = useState<GameStartedPayload | null>(null);

  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  const games = [
    {
      id: "breath",
      icon: <Wind size={20} />,
      title: "Breathing Bubble",
      desc: "Follow the bubble as it expands and shrinks. A calming breath exercise to reduce anxiety.",
      tag: "Anxiety relief",
    },
    {
      id: "grounding",
      icon: <Sparkles size={20} />,
      title: "5-4-3-2-1 Grounding",
      desc: "Notice 5 things you can see, 4 you can touch, 3 you can hear — anchors you to the present.",
      tag: "Mindfulness",
    },
    {
      id: "journal",
      icon: <Sun size={20} />,
      title: "Gratitude Journal",
      desc: "Write three things you're grateful for. Small or large — studies show it shifts your mood.",
      tag: "Mood boost",
    },
    {
      id: "memory",
      icon: <Sparkles size={20} />,
      title: "Memory Match",
      desc: "Find matching pairs together in a calm, turn-based game.",
      tag: "Play together",
    },
  ];

  if (active === "memory") {
    if (memoryGame) {
      return (
        <MemoryBoard
          initialGame={memoryGame}
          onPlayAgain={() => {
            disconnectSocket();
            setMemoryGame(null);
          }}
          onExit={() => {
            disconnectSocket();
            setMemoryGame(null);
            setActive(null);
          }}
        />
      );
    }

    return (
      <MemoryLobby
        onStarted={(game) => {
          setMemoryGame(game);
        }}
        onCancel={() => {
          setActive(null);
          setMemoryGame(null);
        }}
      />
    );
  }

  if (active === "breath") {
    return (
      <div className="max-w-xl mx-auto">
        <BreathingBubble onBack={() => setActive(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h2 className="text-xl font-extrabold" style={{ color: COLORS.fg }}>
        Stress Relief Activities
      </h2>
      {games.map((g) => (
        <div
          key={g.id}
          className="rounded-2xl p-5 border flex items-center gap-4 cursor-pointer hover:border-black hover:shadow-sm transition-all group"
          style={{ background: COLORS.card, borderColor: COLORS.border }}
          onClick={() => setActive(g.id)}
        >
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors group-hover:bg-black group-hover:text-white"
            style={{ background: COLORS.muted, color: COLORS.fg }}
          >
            {g.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-bold" style={{ color: COLORS.fg }}>
                {g.title}
              </span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                style={{ borderColor: COLORS.border, color: COLORS.fg2 }}
              >
                {g.tag}
              </span>
            </div>
            <p
              className="text-xs leading-relaxed"
              style={{ color: COLORS.fg2 }}
            >
              {g.desc}
            </p>
          </div>
          <ChevronRight
            size={15}
            className="shrink-0 transition-colors group-hover:text-black"
            style={{ color: COLORS.fg4 }}
          />
        </div>
      ))}
    </div>
  );
}
