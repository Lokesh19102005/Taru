import { useMutation, useQuery } from '@tanstack/react-query'
import { apiRequest } from './client'

// Scores are 0 (best) – 4 (worst); null means the student skipped that question.
export interface DailyCheckinData {
  mood: { label: string; score: number }
  // Prebuilt category key / option label, or the student's own "Others" text
  category: string | null
  rootCause: string | null
  specificIssue: string | null
  energy: number | null
  stress: number | null
  motivation: number | null
  feedback: string
}

export interface DailyCheckin extends DailyCheckinData {
  _id: string
  userId: string | null
  date: string
  totalScore: number
  createdAt: string
}

export const useSubmitCheckin = () => {
  return useMutation({
    mutationFn: async (data: DailyCheckinData) => {
      return apiRequest('/api/checkin', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
  })
}

export const useCheckinHistory = () => {
  return useQuery<{ success: boolean; count: number; data: DailyCheckin[] }>({
    queryKey: ['checkin-history'],
    queryFn: () => apiRequest('/api/checkin/history'),
  })
}

export const useTodayCheckin = () => {
  return useQuery<{ success: boolean; checkedIn: boolean; checkin: DailyCheckin | null }>({
    queryKey: ['checkin-today'],
    queryFn: () => apiRequest('/api/checkin/today'),
  })
}
