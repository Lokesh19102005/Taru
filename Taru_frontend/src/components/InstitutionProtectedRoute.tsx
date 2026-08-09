import { Navigate, Outlet } from 'react-router-dom'
import { useInstitutionAuth } from '../contexts/InstitutionAuthContext'

export const InstitutionProtectedRoute = () => {
  const { institution, loading } = useInstitutionAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!institution) {
    return <Navigate to="/institution/login" replace />
  }

  return <Outlet />
}
