// Institution-side theme. Mirrors the student app's editorial look (warm
// off-white with peach glows, brown-black ink, terracotta accent) so both
// sides of Taru feel like one product. Same keys as lib/theme.ts so the
// institution views can swap the import without touching their markup.

export const COLORS = {
  bg: '#FFFDFA', // page (peach glows are added in institution.css)
  card: '#FFFFFF',
  border: '#EEE4D7',
  border2: '#DECDB9',
  primary: '#1F1A17', // ink: active nav, primary buttons
  primaryDark: '#000000',
  primaryLight: '#3A2F28',
  accent: '#D98E68', // terracotta: chart lines, highlights
  muted: '#F8EFE3', // cream: tracks, hover tint, chips
  fg: '#1F1A17',
  fg2: '#5E5249',
  fg3: '#8F8479',
  fg4: '#C9BBAA',
  // data fill (bars): light peach → terracotta
  gradient: 'linear-gradient(90deg, #F4C3A1, #D98E68 60%, #B8704F)',
  gradientLight: 'linear-gradient(135deg, #FCE3D2, #F7E8D6 55%, #EEDFC9)',
  gradientSubtle: 'linear-gradient(120deg, #FCE3D2 0%, #F7E8D6 55%, #EEDFC9 100%)',

  // semantic: lower score = better (kept distinct so state stays readable)
  good: '#4F9D6A',
  warn: '#E0A03A',
  bad: '#D6553F',
} as const

// Gauge fill, left (best) to right (worst)
export const SCORE_GRADIENT_STOPS = ['#8DBF7A', '#E8B04A', '#D9573F'] as const

export default COLORS
