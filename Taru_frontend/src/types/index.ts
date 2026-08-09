export type Page = 'landing' | 'check-guest' | 'auth' | 'dashboard'
export type AuthTab = 'login' | 'register'
export type DashView = 'home' | 'check' | 'talk' | 'games' | 'psychiatrist' | 'mood'


export interface Doctor {
  id: string
  name: string
  title: string
  rating: number
  reviews: number
  avail: string
  tags: string[]
}

export interface MoodEntry {
  val: number
  emoji: string
  label: string
}

export interface MoodHistory {
  date: string
  mood: number
  note: string
}
