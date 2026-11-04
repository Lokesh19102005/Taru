import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, Sparkle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { COLORS } from "../lib/studentTheme";
import { useSubmitCheckin } from "../api/checkin";
import { MOOD_SCALE } from "../lib/moodScale";
import CheckinIntroArt from "./CheckinIntroArt";
import {
  CATEGORY_TREES,
  POSITIVE_TREE,
  findTree,
  topicSummary,
} from "../lib/checkinTree";

interface CheckFlowProps {
  isGuest?: boolean;
}

type StepId =
  | "intro"
  | "mood"
  | "category"
  | "rootCause"
  | "specificIssue"
  | "energy"
  | "stress"
  | "motivation"
  | "review";

// Steps shown in the progress bar as "1 of 8" … "8 of 8"
const PROGRESS_STEPS: StepId[] = [
  "mood",
  "category",
  "rootCause",
  "specificIssue",
  "energy",
  "stress",
  "motivation",
  "review",
];

// A tree answer: a prebuilt option, or the student's own words for "Others".
interface TreeChoice {
  value: string;
  other: boolean;
}

interface ChoiceOption {
  value: string;
  label: string;
  emoji?: string;
}

interface RatingOption {
  emoji: string;
  label: string;
  hint: string;
  score: number; // 0 = best, 4 = worst
}

const MOOD_OPTIONS = MOOD_SCALE;

// A touch lighter than the app background
const PAGE_BG = "#FFFEFC";

const ENERGY_OPTIONS: RatingOption[] = [
  { emoji: "🪫", label: "Completely Drained", hint: "exhausted, can barely get out of bed", score: 4 },
  { emoji: "🥱", label: "Low Energy", hint: "feeling sluggish, hard to focus", score: 3 },
  { emoji: "⚡", label: "Moderate / Okay", hint: "getting through the day normally", score: 2 },
  { emoji: "🔋", label: "Good Energy", hint: "feeling active, alert, refreshed", score: 1 },
  { emoji: "🚀", label: "High Energy", hint: "full stamina, ready to tackle tasks", score: 0 },
];

const STRESS_OPTIONS: RatingOption[] = [
  { emoji: "😌", label: "Calm & Relaxed", hint: "no noticeable tension or worry", score: 0 },
  { emoji: "🌿", label: "Mild Stress", hint: "manageable, normal everyday pressure", score: 1 },
  { emoji: "⚖️", label: "Moderate Stress", hint: "feeling tense or anxious at times", score: 2 },
  { emoji: "😣", label: "High Stress", hint: "feeling overwhelmed and struggling", score: 3 },
  { emoji: "🚨", label: "Severe / Overloaded", hint: "panicked, burnt out, cannot cope", score: 4 },
];

const MOTIVATION_OPTIONS: RatingOption[] = [
  { emoji: "🛑", label: "Zero Motivation", hint: "struggling to start anything, stuck", score: 4 },
  { emoji: "📉", label: "Low Motivation", hint: "doing only the bare minimum required", score: 3 },
  { emoji: "📈", label: "Moderate / Neutral", hint: "pushing through tasks steadily", score: 2 },
  { emoji: "💪", label: "Motivated", hint: "feeling productive and focused", score: 1 },
  { emoji: "🔥", label: "Highly Driven", hint: "inspired, ambitious, proactive today", score: 0 },
];

const CATEGORY_OPTIONS: ChoiceOption[] = CATEGORY_TREES.map((t) => ({
  value: t.key,
  label: t.label,
  emoji: t.emoji,
}));

const sameChoice = (a: TreeChoice | null, b: TreeChoice | null) =>
  a?.value === b?.value && a?.other === b?.other;

// Value sent to the API: option key/label or trimmed free text, null if skipped.
const treeValue = (c: TreeChoice | null) => c?.value.trim() || null;

const ratingLabel = (options: RatingOption[], score: number | null) =>
  options.find((o) => o.score === score)?.label ?? "Skipped";

export default function CheckinFlow({ isGuest }: CheckFlowProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useSubmitCheckin();

  const [step, setStep] = useState<StepId>("intro");
  const [history, setHistory] = useState<StepId[]>([]);
  const [mood, setMood] = useState<{ label: string; score: number } | null>(
    null,
  );
  const [category, setCategory] = useState<TreeChoice | null>(null);
  const [rootCause, setRootCause] = useState<TreeChoice | null>(null);
  const [specificIssue, setSpecificIssue] = useState<TreeChoice | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [motivation, setMotivation] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [done, setDone] = useState(false);

  // The prebuilt branch the student is in (undefined after "Others" or Skip)
  const tree = category && !category.other ? findTree(category.value) : undefined;
  const activeRoot =
    tree && rootCause && !rootCause.other
      ? tree.rootCauses.find((r) => r.label === rootCause.value)
      : undefined;

  const total = PROGRESS_STEPS.length;
  const current = PROGRESS_STEPS.indexOf(step) + 1; // intro → 0
  const pct = Math.round((current / total) * 100);

  const goTo = (next: StepId) => {
    setHistory((h) => [...h, step]);
    setStep(next);
  };

  const goBack = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory(history.slice(0, -1));
    setStep(prev);
  };

  // Changing an answer clears the deeper levels that depended on it.
  const chooseCategory = (choice: TreeChoice | null) => {
    if (!sameChoice(choice, category)) {
      setRootCause(null);
      setSpecificIssue(null);
    }
    setCategory(choice);
  };

  const chooseRootCause = (choice: TreeChoice | null) => {
    if (!sameChoice(choice, rootCause)) setSpecificIssue(null);
    setRootCause(choice);
  };

  const continueFromMood = () => {
    // Very Happy / Happy go straight to the Positive Momentum tree
    if (mood !== null && mood.score <= 1) {
      chooseCategory({ value: POSITIVE_TREE.key, other: false });
      goTo("rootCause");
      return;
    }
    if (category?.value === POSITIVE_TREE.key && !category.other) {
      chooseCategory(null);
    }
    goTo("category");
  };

  const handleBack = () => {
    if (isGuest) {
      navigate("/");
    } else {
      navigate("/dashboard");
    }
  };

  const handleDone = () => {
    if (isGuest) {
      navigate("/auth");
    } else {
      navigate("/dashboard");
    }
  };

  const handleSubmit = () => {
    if (mood === null) {
      return;
    }

    mutation.mutate(
      {
        mood,
        category: treeValue(category),
        rootCause: treeValue(rootCause),
        specificIssue: treeValue(specificIssue),
        energy,
        stress,
        motivation,
        feedback,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["checkin-history"] });
          queryClient.invalidateQueries({ queryKey: ["checkin-today"] });
          setDone(true);
        },
        onError: () => {
          setDone(true);
        },
      },
    );
  };

  const shell = isGuest
    ? "min-h-screen"
    : "min-h-[calc(100vh-10rem)] rounded-3xl border";

  if (done) {
    return (
      <div
        className={`${shell} @container relative overflow-hidden flex flex-col items-center justify-center px-6 animate-fade-in`}
        style={{ background: PAGE_BG, borderColor: COLORS.border }}
      >
        <CheckinIntroArt />
        <div className="relative z-10 max-w-md w-full text-center py-16">
          <div className="text-5xl mb-5 animate-float">🌿</div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: COLORS.fg }}>
            Shukriya, sharing ke liye
          </h2>
          <p
            className="text-sm leading-relaxed mb-8"
            style={{ color: COLORS.fg2 }}
          >
            Aaj aapne apne liye time nikala — yeh chhoti si cheez bahut matter
            karti hai.
            {isGuest
              ? " Create an account to track your wellbeing over time."
              : " Your check-in has been recorded."}
          </p>
          {isGuest && (
            <button
              onClick={handleDone}
              className="w-full py-3 rounded-xl font-semibold text-sm mb-3 transition-all card-hover hover:opacity-90"
              style={{ background: COLORS.gradient, color: "#fff" }}
            >
              Create a free account
            </button>
          )}
          <button
            onClick={handleBack}
            className="text-sm font-medium transition-colors hover:text-[#3A2F28]"
            style={{ color: COLORS.fg3 }}
          >
            ← {isGuest ? "Back to home" : "Back to dashboard"}
          </button>
          <p
            className="mt-10 text-[10px] tracking-widest uppercase"
            style={{ fontFamily: "var(--font-mono)", color: COLORS.fg4 }}
          >
            taru · cogniease techno labs pvt. ltd. · prayagraj
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${shell} @container relative overflow-hidden flex flex-col animate-fade-in`}
      style={{ background: PAGE_BG, borderColor: COLORS.border }}
    >
      <CheckinIntroArt />

      {/* Thin progress line (not shown on the welcome page) */}
      {step !== "intro" && (
        <div
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: COLORS.muted }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={current}
          aria-label="Check-in progress"
        >
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${pct}%`, background: COLORS.accent }}
          />
        </div>
      )}

      <button
        onClick={handleBack}
        aria-label="Close check-in"
        className={`absolute right-4 top-4 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:text-[#3A2F28] ${step === "intro" ? "bg-white shadow-md" : "hover:bg-[#F8EFE3]"}`}
        style={{ color: COLORS.fg3 }}
      >
        <X size={17} />
      </button>

      <div
        className={`relative z-10 flex-1 mx-auto w-full px-6 pt-14 pb-10 ${step === "category" ? "max-w-2xl" : "max-w-lg"}`}
      >
        {/* Intro */}
        {step === "intro" && (
          <div className="min-h-[62vh] flex flex-col items-center justify-center text-center animate-slide-up">
            {/* leaf badge with a few sparkles */}
            <div className="relative w-44 h-24 mb-4 flex items-center justify-center">
              <Sparkle
                size={14}
                className="absolute left-4 top-2"
                style={{ color: COLORS.accent }}
              />
              <Sparkle
                size={9}
                className="absolute left-0 top-12"
                style={{ color: "#EBB89A" }}
              />
              <Sparkle
                size={16}
                className="absolute right-3 top-5"
                style={{ color: COLORS.accent }}
              />
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(145deg, #FFFFFF, #FCE9DC)",
                  boxShadow:
                    "0 18px 36px -18px rgba(217,142,104,0.7), inset 0 -4px 10px rgba(217,142,104,0.12)",
                }}
              >
                <svg
                  viewBox="0 0 32 32"
                  className="w-9 h-9"
                  fill="none"
                  stroke="#8A5A44"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 28 V12" />
                  <path d="M16 14 C10 14 7 10 7 6 C12 6 16 9 16 14 Z" />
                  <path d="M16 18 C22 18 25 14 25 10 C20 10 16 13 16 18 Z" />
                  <path d="M16 23 C11 23 8 20 8 16 C12 16 16 18 16 23 Z" />
                </svg>
              </div>
            </div>

            <span
              className="inline-flex rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em]"
              style={{ background: "#FBE3D1", color: "#6B5B4E" }}
            >
              Welcome
            </span>

            <h1
              className="mt-5 mb-4 text-4xl sm:text-5xl leading-[1.15]"
              style={{
                fontFamily: '"Lora", Georgia, serif',
                color: COLORS.fg,
                letterSpacing: "-0.01em",
              }}
            >
              Take a moment
              <br />
              for{" "}
              <em className="italic" style={{ color: "#C4623A" }}>
                yourself.
              </em>
            </h1>

            <p
              className="text-[15px] leading-relaxed mb-5 max-w-xs"
              style={{ color: COLORS.fg2 }}
            >
              A quick check-in on how you're doing today. You can skip any
              question you'd rather not answer.
            </p>

            <span
              className="inline-flex items-center gap-2 rounded-full border bg-white/80 px-4 py-2 text-xs mb-8"
              style={{ borderColor: "#F1DFD0", color: COLORS.fg2 }}
            >
              <Clock size={14} style={{ color: COLORS.fg3 }} />
              About 1 minute · 8 short steps
            </span>

            <button
              className="w-full max-w-xs py-3.5 rounded-full font-semibold text-sm transition-all hover:opacity-90 card-hover"
              style={{
                background: COLORS.gradient,
                color: "#fff",
                boxShadow: "0 18px 30px -16px rgba(31,26,23,0.7)",
              }}
              onClick={() => goTo("mood")}
            >
              let's begin →
            </button>
            <button
              onClick={handleBack}
              className="mt-4 text-sm font-medium transition-colors hover:text-[#3A2F28]"
              style={{ color: COLORS.fg3 }}
            >
              not now
            </button>
          </div>
        )}

        {/* Step 1 — Mood (required: powers streaks and mood charts) */}
        {step === "mood" && (
          <div className="animate-fade-in">
            <StepHeader
              eyebrow="mood"
              title="How are you feeling today?"
              subtitle="No right answer. Just what is true right now."
            />
            <div className="flex flex-col gap-2.5 mb-8">
              {MOOD_OPTIONS.map((m) => (
                <OptionCard
                  key={m.score}
                  emoji={m.emoji}
                  label={m.label}
                  selected={mood?.score === m.score}
                  onClick={() => setMood({ label: m.label, score: m.score })}
                />
              ))}
            </div>
            <NavRow
              onBack={goBack}
              onContinue={continueFromMood}
              continueDisabled={mood === null}
            />
          </div>
        )}

        {/* Step 2 — Category */}
        {step === "category" && (
          <TreeStep
            eyebrow="what's on your mind"
            title="What is weighing on your mind most?"
            subtitle="Pick the one that feels closest."
            options={CATEGORY_OPTIONS}
            columns={2}
            choice={category}
            onChoose={chooseCategory}
            onBack={goBack}
            onContinue={() =>
              goTo(category && !category.other ? "rootCause" : "energy")
            }
            onSkip={() => {
              chooseCategory(null);
              goTo("energy");
            }}
          />
        )}

        {/* Step 3 — Root cause */}
        {step === "rootCause" && tree && (
          <TreeStep
            eyebrow={tree.label.toLowerCase()}
            title={tree.question}
            subtitle="Pick what fits best."
            options={tree.rootCauses.map((r) => ({
              value: r.label,
              label: r.label,
            }))}
            choice={rootCause}
            onChoose={chooseRootCause}
            onBack={goBack}
            onContinue={() =>
              goTo(rootCause && !rootCause.other ? "specificIssue" : "energy")
            }
            onSkip={() => {
              chooseRootCause(null);
              goTo("energy");
            }}
          />
        )}

        {/* Step 4 — Specific issue */}
        {step === "specificIssue" && activeRoot && (
          <TreeStep
            eyebrow={activeRoot.label.toLowerCase()}
            title={activeRoot.question}
            subtitle="Pick what fits best."
            options={activeRoot.issues.map((issue) => ({
              value: issue,
              label: issue,
            }))}
            choice={specificIssue}
            onChoose={setSpecificIssue}
            onBack={goBack}
            onContinue={() => goTo("energy")}
            onSkip={() => {
              setSpecificIssue(null);
              goTo("energy");
            }}
          />
        )}

        {/* Step 5 — Energy */}
        {step === "energy" && (
          <RatingStep
            eyebrow="energy"
            title="How is your energy level today?"
            subtitle="Reflect on your overall energy levels."
            options={ENERGY_OPTIONS}
            value={energy}
            onChange={setEnergy}
            onBack={goBack}
            onContinue={() => goTo("stress")}
            onSkip={() => {
              setEnergy(null);
              goTo("stress");
            }}
          />
        )}

        {/* Step 6 — Stress */}
        {step === "stress" && (
          <RatingStep
            eyebrow="stress"
            title="How stressed are you feeling today?"
            subtitle="Think about the pressure you've felt through the day."
            options={STRESS_OPTIONS}
            value={stress}
            onChange={setStress}
            onBack={goBack}
            onContinue={() => goTo("motivation")}
            onSkip={() => {
              setStress(null);
              goTo("motivation");
            }}
          />
        )}

        {/* Step 7 — Motivation */}
        {step === "motivation" && (
          <RatingStep
            eyebrow="motivation"
            title="How motivated do you feel to get things done?"
            subtitle="Drive and willingness to get things done."
            options={MOTIVATION_OPTIONS}
            value={motivation}
            onChange={setMotivation}
            onBack={goBack}
            onContinue={() => goTo("review")}
            onSkip={() => {
              setMotivation(null);
              goTo("review");
            }}
          />
        )}

        {/* Step 8 — Review, feedback + submit */}
        {step === "review" && (
          <div className="animate-fade-in">
            <StepHeader
              eyebrow="review"
              title="Anything else you'd like to share today?"
              subtitle="Optional notes about your day."
            />

            <textarea
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Write your thoughts here..."
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none mb-5 transition-all hover:border-[#E3B393] focus:border-[#E3B393] bg-white focus:ring-1 focus:ring-[#E3B393]"
              style={{
                borderColor: COLORS.border,
                color: COLORS.fg,
                lineHeight: 1.7,
              }}
            />

            <div
              className="rounded-xl border bg-white p-4 mb-8 text-sm space-y-1.5"
              style={{ borderColor: COLORS.border, color: COLORS.fg2 }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ fontFamily: "var(--font-mono)", color: COLORS.fg3 }}
              >
                today's check-in
              </p>
              <SummaryRow label="Mood" value={mood?.label ?? "—"} />
              <SummaryRow
                label="Topic"
                value={
                  topicSummary({
                    category: treeValue(category),
                    rootCause: treeValue(rootCause),
                    specificIssue: treeValue(specificIssue),
                  }) ?? "Skipped"
                }
              />
              <SummaryRow label="Energy" value={ratingLabel(ENERGY_OPTIONS, energy)} />
              <SummaryRow label="Stress" value={ratingLabel(STRESS_OPTIONS, stress)} />
              <SummaryRow
                label="Motivation"
                value={ratingLabel(MOTIVATION_OPTIONS, motivation)}
              />
            </div>

            <NavRow
              onBack={goBack}
              onContinue={handleSubmit}
              continueDisabled={mutation.isPending}
              continueLabel={
                mutation.isPending ? "submitting..." : "submit check-in →"
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StepHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <>
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-2"
        style={{ fontFamily: "var(--font-mono)", color: COLORS.fg3 }}
      >
        {eyebrow}
      </p>
      <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.fg }}>
        {title}
      </h2>
      <p className="text-sm mb-6" style={{ color: COLORS.fg2 }}>
        {subtitle}
      </p>
    </>
  );
}

function OptionCard({
  emoji,
  label,
  hint,
  selected,
  onClick,
}: {
  emoji?: string;
  label: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border-2 flex items-center gap-3 text-left transition-all hover:bg-[#F8EFE3] hover:border-[#E3B393] card-hover ${selected ? "" : "bg-white"}`}
      style={{
        borderColor: selected ? COLORS.primary : COLORS.border,
        background: selected ? COLORS.muted : undefined,
      }}
    >
      {emoji && <span className="text-2xl shrink-0">{emoji}</span>}
      <div>
        <div className="text-sm font-bold" style={{ color: COLORS.fg }}>
          {label}
        </div>
        {hint && (
          <div className="text-xs mt-0.5" style={{ color: COLORS.fg3 }}>
            {hint}
          </div>
        )}
      </div>
    </button>
  );
}

// "Others" card: expands into a free-text box; the typed text is the answer.
function OthersCard({
  choice,
  onChange,
}: {
  choice: TreeChoice | null;
  onChange: (choice: TreeChoice) => void;
}) {
  const selected = !!choice?.other;
  return (
    <div
      className={`rounded-xl border-2 transition-all ${selected ? "" : "bg-white hover:bg-[#F8EFE3] hover:border-[#E3B393]"}`}
      style={{
        borderColor: selected ? COLORS.primary : COLORS.border,
        background: selected ? COLORS.muted : undefined,
      }}
    >
      <button
        onClick={() => !selected && onChange({ value: "", other: true })}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        <span className="text-2xl shrink-0">✏️</span>
        <span className="text-sm font-bold" style={{ color: COLORS.fg }}>
          Others — tell us in your own words
        </span>
      </button>
      {selected && (
        <div className="px-4 pb-4">
          <textarea
            autoFocus
            rows={3}
            maxLength={300}
            value={choice.value}
            onChange={(e) => onChange({ value: e.target.value, other: true })}
            placeholder="What is on your mind? (type freely)..."
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none bg-white focus:border-[#E3B393] focus:ring-1 focus:ring-[#E3B393]"
            style={{
              borderColor: COLORS.border,
              color: COLORS.fg,
              lineHeight: 1.6,
            }}
          />
        </div>
      )}
    </div>
  );
}

function NavRow({
  onBack,
  onContinue,
  continueDisabled,
  continueLabel = "continue →",
  onSkip,
}: {
  onBack: () => void;
  onContinue: () => void;
  continueDisabled: boolean;
  continueLabel?: string;
  onSkip?: () => void;
}) {
  return (
    <>
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-5 py-3 rounded-xl border text-sm font-semibold bg-white hover:bg-[#F8EFE3] hover:border-[#E3B393] transition-all"
          style={{ borderColor: COLORS.border, color: COLORS.fg2 }}
        >
          ←
        </button>
        <button
          disabled={continueDisabled}
          onClick={onContinue}
          className="flex-1 py-3 rounded-xl font-semibold text-sm disabled:opacity-30 hover:opacity-90 transition-all card-hover"
          style={{ background: COLORS.primary, color: "#fff" }}
        >
          {continueLabel}
        </button>
      </div>
      {onSkip && (
        <button
          onClick={onSkip}
          className="w-full mt-3 py-2 text-xs font-medium transition-colors hover:text-[#3A2F28]"
          style={{ color: COLORS.fg3 }}
        >
          skip this question ⏭
        </button>
      )}
    </>
  );
}

function TreeStep({
  eyebrow,
  title,
  subtitle,
  options,
  columns = 1,
  choice,
  onChoose,
  onBack,
  onContinue,
  onSkip,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  options: ChoiceOption[];
  columns?: 1 | 2;
  choice: TreeChoice | null;
  onChoose: (choice: TreeChoice) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const canContinue = !!choice && (!choice.other || !!choice.value.trim());
  return (
    <div className="animate-fade-in">
      <StepHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div
        className={
          columns === 2
            ? "grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-8"
            : "flex flex-col gap-2.5 mb-8"
        }
      >
        {options.map((o) => (
          <OptionCard
            key={o.value}
            emoji={o.emoji}
            label={o.label}
            selected={!!choice && !choice.other && choice.value === o.value}
            onClick={() => onChoose({ value: o.value, other: false })}
          />
        ))}
        <div className={columns === 2 ? "sm:col-span-2" : ""}>
          <OthersCard choice={choice} onChange={onChoose} />
        </div>
      </div>
      <NavRow
        onBack={onBack}
        onContinue={onContinue}
        continueDisabled={!canContinue}
        onSkip={onSkip}
      />
    </div>
  );
}

function RatingStep({
  eyebrow,
  title,
  subtitle,
  options,
  value,
  onChange,
  onBack,
  onContinue,
  onSkip,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  options: RatingOption[];
  value: number | null;
  onChange: (score: number) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="animate-fade-in">
      <StepHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className="flex flex-col gap-2.5 mb-8">
        {options.map((o) => (
          <OptionCard
            key={o.score}
            emoji={o.emoji}
            label={o.label}
            hint={o.hint}
            selected={value === o.score}
            onClick={() => onChange(o.score)}
          />
        ))}
      </div>
      <NavRow
        onBack={onBack}
        onContinue={onContinue}
        continueDisabled={value === null}
        onSkip={onSkip}
      />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-24 shrink-0" style={{ color: COLORS.fg3 }}>
        {label}
      </span>
      <span className="font-semibold" style={{ color: COLORS.fg }}>
        {value}
      </span>
    </div>
  );
}
