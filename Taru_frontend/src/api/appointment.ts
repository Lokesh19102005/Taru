import { apiRequest } from './client'
import { Appointment } from '../types'

export const bookAppointment = async (data: {
  psychiatristId: string
  availabilityId: string
  date: string
  startTime: string
  endTime: string
  reason?: string
}): Promise<{ success: boolean; data: Appointment }> => {
  return apiRequest('/api/appointment/book', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export const getMyAppointments = async (): Promise<{ success: boolean; data: Appointment[] }> => {
  return apiRequest('/api/appointment/my', { method: 'GET' })
}

export const getPsychiatristAppointments = async (date?: string): Promise<{ success: boolean; data: Appointment[] }> => {
  const query = date ? `?date=${date}` : ''
  return apiRequest(`/api/appointment/psychiatrist${query}`, { method: 'GET' })
}

export const updateAppointmentStatus = async (id: string, status: string): Promise<{ success: boolean; data: Appointment }> => {
  return apiRequest(`/api/appointment/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}
