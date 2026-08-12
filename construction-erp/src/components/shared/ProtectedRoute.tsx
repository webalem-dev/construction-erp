import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'

interface ProtectedRouteProps {
  requiredModule?: string
  requiredAction?: string
  requiredSubModule?: string
  requiredRole?: string | string[]
}

export function ProtectedRoute({
  requiredModule,
  requiredAction,
  requiredSubModule,
  requiredRole,
}: ProtectedRouteProps) {
  const location = useLocation()
  const { isAuthenticated, isLoading, hasPermission, isRole } = useAuthStore()

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-slate-600 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Not logged in → redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role requirement
  if (requiredRole && !isRole(requiredRole)) {
    return <Navigate to="/unauthorized" replace />
  }

  // Check permission requirement
  if (requiredModule && requiredAction) {
    if (!hasPermission(requiredModule, requiredAction, requiredSubModule)) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  return <Outlet />
}