export interface User {
  _id: string
  username: string
  email: string
  college: string
  year: string
  degree: string
  checkinStreak: number
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  success: boolean
  token: string
  user: User
}

export interface UserResponse {
  success: boolean
  user: User
}
