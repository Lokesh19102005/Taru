// Institution-side theme. Cool, airy dashboard look: pale blue-grey page with
// soft teal glows, white cards, near-black ink, and a green -> orange -> red
// data gradient. Same keys as lib/theme.ts so the institution views can swap
// the import without touching their markup.

export const COLORS = {
  bg: '#EEF4F4', // page (glows are added in institution.css)
  card: '#FFFFFF',
  border: '#E1EAEA',
  border2: '#CBD9D9',
  primary: '#0E1111', // ink: active nav, primary buttons
  primaryDark: '#000000',
  primaryLight: '#2B3434',
  accent: '#F47B30', // orange: chart lines, highlights
  muted: '#E8EFEF', // pale blue-grey: tracks, hover tint, chips
  fg: '#0E1111',
  fg2: '#4A5757',
  fg3: '#8A9898',
  fg4: '#BFCBCB',
  // data fill (bars): green -> orange -> red
  gradient: 'linear-gradient(90deg, #8AE06A, #F7A13A 55%, #F0483A)',
  gradientLight: 'linear-gradient(135deg, #F4F9F9, #E3EEEE 55%, #D3E5E6)',
  gradientSubtle: 'linear-gradient(120deg, #F4F9F9 0%, #E3EEEE 55%, #D3E5E6 100%)',

  // semantic: lower score = better (kept distinct so state stays readable)
  good: '#3FC15A',
  warn: '#F59E2B',
  bad: '#EF4A3A',
} as const

// Gauge fill, left (best) to right (worst)
export const SCORE_GRADIENT_STOPS = ['#6BE04F', '#F59E2B', '#EF4A3A'] as const

export default COLORS
