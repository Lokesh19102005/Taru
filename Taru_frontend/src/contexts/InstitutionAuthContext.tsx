import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Institution } from '../types'
import { fetchInstitutionProfile, loginInstitution, registerInstitution } from '../api/institution'

interface InstitutionAuthContextType {
  institution: Institution | null
  token: string | null
  loading: boolean
  login: (collegeName: string, password: string) => Promise<Institution>
  register: (data: { collegeName: string; contactEmail: string; password: string }) => Promise<Institution>
  logout: () => void
}

const InstitutionAuthContext = createContext<InstitutionAuthContextType | undefined>(undefined)

export const InstitutionAuthProvider = ({ children }: { children: ReactNode }) => {
  const [institution, setInstitution] = useState<Institution | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('taru_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('taru_token')
      if (storedToken) {
        try {
          const res = await fetchInstitutionProfile()
          setInstitution(res.user)
        } catch (error) {
          // Token might be for another role — that's OK
          setInstitution(null)
        }
      }
      setLoading(false)
    }
    initAuth()
  }, [])

  const login = async (collegeName: string, password: string) => {
    const res = await loginInstitution(collegeName, password)
    localStorage.setItem('taru_token', res.token)
    setToken(res.token)
    setInstitution(res.user)
    return res.user
  }

  const register = async (data: { collegeName: string; contactEmail: string; password: string }) => {
    const res = await registerInstitution(data)
    localStorage.setItem('taru_token', res.token)
    setToken(res.token)
    setInstitution(res.user)
    return res.user
  }

  const logout = () => {
    localStorage.removeItem('taru_token')
    setToken(null)
    setInstitution(null)
  }

  return (
    <InstitutionAuthContext.Provider value={{ institution, token, loading, login, register, logout }}>
      {children}
    </InstitutionAuthContext.Provider>
  )
}

export const useInstitutionAuth = () => {
  const context = useContext(InstitutionAuthContext)
  if (context === undefined) {
    throw new Error('useInstitutionAuth must be used within an InstitutionAuthProvider')
  }
  return context
}
