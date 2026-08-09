import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { COLORS } from '../lib/theme'

export const ProtectedRoute = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: COLORS.fg3 }}>
        Loading...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return <Outlet />
}
