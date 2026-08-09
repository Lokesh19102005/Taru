import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Psychiatrist } from '../types'
import { fetchPsychiatristProfile, loginPsychiatrist, registerPsychiatrist } from '../api/psychiatrist'

interface PsychiatristAuthContextType {
  psychiatrist: Psychiatrist | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<Psychiatrist>
  register: (data: any) => Promise<Psychiatrist>
  logout: () => void
}

const PsychiatristAuthContext = createContext<PsychiatristAuthContextType | undefined>(undefined)

export const PsychiatristAuthProvider = ({ children }: { children: ReactNode }) => {
  const [psychiatrist, setPsychiatrist] = useState<Psychiatrist | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('taru_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('taru_token')
      if (storedToken) {
        try {
          const res = await fetchPsychiatristProfile()
          setPsychiatrist(res.user)
        } catch (error) {
          // Token might be for a regular user, not a psychiatrist — that's OK
          setPsychiatrist(null)
        }
      }
      setLoading(false)
    }
    initAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const res = await loginPsychiatrist(email, password)
    localStorage.setItem('taru_token', res.token)
    setToken(res.token)
    setPsychiatrist(res.user)
    return res.user
  }

  const register = async (data: any) => {
    const res = await registerPsychiatrist(data)
    localStorage.setItem('taru_token', res.token)
    setToken(res.token)
    setPsychiatrist(res.user)
    return res.user
  }

  const logout = () => {
    localStorage.removeItem('taru_token')
    setToken(null)
    setPsychiatrist(null)
  }

  return (
    <PsychiatristAuthContext.Provider value={{ psychiatrist, token, loading, login, register, logout }}>
      {children}
    </PsychiatristAuthContext.Provider>
  )
}

export const usePsychiatristAuth = () => {
  const context = useContext(PsychiatristAuthContext)
  if (context === undefined) {
    throw new Error('usePsychiatristAuth must be used within a PsychiatristAuthProvider')
  }
  return context
}
