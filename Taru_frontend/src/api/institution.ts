import { apiRequest } from './client'
import { InstitutionAuthResponse, InstitutionResponse } from '../types'

export const loginInstitution = async (collegeName: string, password: string): Promise<InstitutionAuthResponse> => {
  return apiRequest('/api/institution/login', {
    method: 'POST',
    body: JSON.stringify({ collegeName, password }),
  })
}

export const registerInstitution = async (data: {
  collegeName: string
  contactEmail: string
  password: string
}): Promise<InstitutionAuthResponse> => {
  return apiRequest('/api/institution/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export const fetchInstitutionProfile = async (): Promise<InstitutionResponse> => {
  return apiRequest('/api/institution/me', { method: 'GET' })
}

export const fetchAnalytics = async () => {
  return apiRequest('/api/institution/analytics', { method: 'GET' })
}

export const fetchStudents = async () => {
  return apiRequest('/api/institution/students', { method: 'GET' })
}
