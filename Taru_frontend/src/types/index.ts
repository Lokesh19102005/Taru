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

export interface Psychiatrist {
  _id: string
  name: string
  email: string
  profileImage?: string
  qualification: string
  specialization: string[]
  experience?: number
  bio?: string
  languages: string[]
  role: string
  createdAt: string
}

export interface PsychiatristAuthResponse {
  success: boolean
  token: string
  user: Psychiatrist
}

export interface PsychiatristResponse {
  success: boolean
  user: Psychiatrist
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

export interface Slot {
  startTime: string
  endTime: string
  isBooked: boolean
}

export interface AvailabilityData {
  _id: string
  psychiatristId: string
  date: string
  slots: Slot[]
}

export interface Appointment {
  _id: string
  studentId: string | { _id: string; username: string; email?: string }
  psychiatristId: string | { _id: string; name: string; qualification?: string }
  availabilityId: string
  date: string
  startTime: string
  endTime: string
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  reason?: string
  notes?: string
  createdAt: string
}

export interface Meeting {
  _id: string
  appointmentId: string
  meetingId: string
  status: 'scheduled' | 'active' | 'ended'
  startedAt?: string
  endedAt?: string
  duration?: number
  createdAt: string
}

export interface Institution {
  _id: string
  collegeName: string
  contactEmail: string
  role: string
  createdAt: string
}

export interface InstitutionAuthResponse {
  success: boolean
  token: string
  user: Institution
}

export interface InstitutionResponse {
  success: boolean
  user: Institution
}
