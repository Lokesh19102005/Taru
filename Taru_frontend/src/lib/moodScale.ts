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
