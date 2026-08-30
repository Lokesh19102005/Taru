import { apiRequest } from './client'

export const joinAppointment = async (appointmentId: string) => {
  return apiRequest(`/api/appointments/${appointmentId}/join`, { method: 'POST' })
}

export const verifyMeeting = async (meetingId: string) => {
  return apiRequest(`/api/meetings/${meetingId}/verify`, { method: 'GET' })
}

export const updateMeetingLifecycle = async (meetingId: string, action: 'start' | 'end') => {
  return apiRequest(`/api/meetings/${meetingId}/lifecycle`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  })
}

export const getTurnCredentials = async () => {
  return apiRequest('/api/turn-credentials', { method: 'GET' })
}
