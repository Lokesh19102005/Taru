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
  if (score <= 1) return "#059669";
  if (score === 2) return "#D97706";
  return "#DC2626";
}
