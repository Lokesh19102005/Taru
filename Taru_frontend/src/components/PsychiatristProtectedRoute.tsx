import { Navigate, Outlet } from 'react-router-dom'
import { usePsychiatristAuth } from '../contexts/PsychiatristAuthContext'
import { COLORS } from '../lib/theme'

export const PsychiatristProtectedRoute = () => {
  const { psychiatrist, loading } = usePsychiatristAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: COLORS.fg3 }}>
        Loading...
      </div>
    )
  }

  if (!psychiatrist) {
    return <Navigate to="/psychiatrist/signin" replace />
  }

  return <Outlet />
}
