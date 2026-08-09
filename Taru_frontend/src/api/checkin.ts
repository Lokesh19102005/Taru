import { useMutation, useQuery } from '@tanstack/react-query'
import { apiRequest } from './client'

export interface DailyCheckinData {
  mood: { label: string; score: number }
  energy: number
  stress: number
  sleep: number
  concentration: number
  support: number
  motivation: number
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
