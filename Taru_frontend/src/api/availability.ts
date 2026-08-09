import { apiRequest } from './client'
import { AvailabilityData } from '../types'

export const setAvailability = async (date: string, slots: { startTime: string; endTime: string }[]): Promise<{ success: boolean; data: AvailabilityData }> => {
  return apiRequest(`/api/availability/${date}`, {
    method: 'PUT',
    body: JSON.stringify({ slots }),
  })
}

export const getMyAvailability = async (date: string): Promise<{ success: boolean; data: AvailabilityData | null }> => {
  return apiRequest(`/api/availability/me/${date}`, { method: 'GET' })
}

export const getAvailabilityForPsychiatrist = async (psychiatristId: string, date: string): Promise<{ success: boolean; data: AvailabilityData | null }> => {
  return apiRequest(`/api/availability/${psychiatristId}/${date}`, { method: 'GET' })
}
