import { apiRequest } from './client'
import { Psychiatrist, PsychiatristAuthResponse, PsychiatristResponse } from '../types'

export const loginPsychiatrist = async (email: string, password: string): Promise<PsychiatristAuthResponse> => {
  return apiRequest('/api/psychiatrist/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export const registerPsychiatrist = async (data: {
  name: string
  email: string
  password: string
  qualification: string
  specialization?: string[]
  experience?: number
  bio?: string
  languages?: string[]
}): Promise<PsychiatristAuthResponse> => {
  return apiRequest('/api/psychiatrist/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export const fetchPsychiatristProfile = async (): Promise<PsychiatristResponse> => {
  return apiRequest('/api/psychiatrist/me', { method: 'GET' })
}

export const fetchAllPsychiatrists = async (): Promise<{ success: boolean; data: Psychiatrist[] }> => {
  return apiRequest('/api/view_psychiatrist', { method: 'GET' })
}
