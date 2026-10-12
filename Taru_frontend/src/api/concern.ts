import { apiRequest } from './client'

export const getConcerns = async () =>
  apiRequest('/api/concern', { method: 'GET' })

export const createConcern = async (data: { type: string; description: string }) =>
  apiRequest('/api/concern', { method: 'POST', body: JSON.stringify(data) })

export const voteConcern = async (id: string, vote: 'up' | 'down') =>
  apiRequest(`/api/concern/${id}/vote`, { method: 'POST', body: JSON.stringify({ vote }) })

export const getComments = async (concernId: string) =>
  apiRequest(`/api/concern/${concernId}/comments`, { method: 'GET' })

export const addComment = async (concernId: string, text: string) =>
  apiRequest(`/api/concern/${concernId}/comment`, { method: 'POST', body: JSON.stringify({ text }) })
