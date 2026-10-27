export const MOOD_SCALE = [
  { label: "Very Happy", score: 0, emoji: "😄" },
  { label: "Happy", score: 1, emoji: "🙂" },
  { label: "Neutral", score: 2, emoji: "😐" },
  { label: "Stressed", score: 3, emoji: "😕" },
  { label: "Sad", score: 4, emoji: "😢" },
] as const;

export function moodForScore(score: number) {
  return MOOD_SCALE[score] ?? MOOD_SCALE[2];
}

export function moodColor(score: number) {
  const roundedScore = Math.max(0, Math.min(4, Math.round(score)));

  if (roundedScore <= 1) return "#059669";
  if (roundedScore === 2) return "#D97706";
  return "#DC2626";
}

// Check-in totalScore = mood + energy + stress + motivation, each 0 (best) – 4 (worst).
export const TOTAL_SCORE_MAX = 16;

export function getScoreColor(score: number) {
  if (score <= 3) return "#15803d";
  if (score <= 6) return "#4ade80";
  if (score <= 9) return "#facc15";
  if (score <= 12) return "#f97316";
  return "#ef4444";
}

export function getScoreLabel(score: number) {
  if (score <= 3) return "Very Well";
  if (score <= 6) return "Well";
  if (score <= 9) return "Moderate";
  if (score <= 12) return "Stressed";
  return "High Strain";
}
