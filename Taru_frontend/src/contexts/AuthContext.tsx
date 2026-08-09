import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '../types/user'
import { fetchCurrentUser, loginUser, registerUser, updateUserProfile } from '../api/auth'

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (data: any) => Promise<User>
  logout: () => void
  updateProfile: (data: any) => Promise<User>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('taru_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('taru_token')
      if (storedToken) {
        try {
          const res = await fetchCurrentUser()
          setUser(res.user)
        } catch (error) {
          localStorage.removeItem('taru_token')
          setToken(null)
          setUser(null)
        }
      }
      setLoading(false)
    }
    initAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const res = await loginUser(email, password)
    localStorage.setItem('taru_token', res.token)
    setToken(res.token)
    setUser(res.user)
    return res.user
  }

  const register = async (data: any) => {
    const res = await registerUser(data)
    localStorage.setItem('taru_token', res.token)
    setToken(res.token)
    setUser(res.user)
    return res.user
  }

  const logout = () => {
    localStorage.removeItem('taru_token')
    setToken(null)
    setUser(null)
  }

  const updateProfile = async (data: any) => {
    const res = await updateUserProfile(data)
    setUser(res.user)
    return res.user
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
