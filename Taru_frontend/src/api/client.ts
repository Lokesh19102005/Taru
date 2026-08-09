const BASE_URL = ''

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('taru_token')
  const headers = new Headers(options.headers || {})
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  const data = await response.json()

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('taru_token')
    }
    throw new Error(data.message || data.error || 'Something went wrong')
  }

  return data
}
