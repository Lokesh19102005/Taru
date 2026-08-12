import { apiRequest } from './client'
import { AuthResponse, UserResponse, User } from '../types/user'

export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export const registerUser = async (data: {
  email: string, password: string, college: string,
  batch?: string, age?: number, gender?: string
}): Promise<AuthResponse> => {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export const fetchCurrentUser = async (): Promise<UserResponse> => {
  return apiRequest('/api/user/me', {
    method: 'GET',
  })
}

export const updateUserProfile = async (data: Partial<Pick<User, 'college' | 'year' | 'degree' | 'batch' | 'age' | 'gender'>>): Promise<UserResponse> => {
  return apiRequest('/api/user/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}
