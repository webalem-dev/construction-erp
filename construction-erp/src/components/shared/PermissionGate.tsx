import type { ReactNode } from 'react'
import { useAuthStore } from '@/store/auth.store'

interface PermissionGateProps {
  module: string
  action: string
  subModule?: string
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Show/hide UI elements based on user permissions
 *
 * Example:
 * <PermissionGate module="projects" action="create">
 *   <Button>Create Project</Button>
 * </PermissionGate>
 */
export function PermissionGate({
  module,
  action,
  subModule,
  children,
  fallback = null,
}: PermissionGateProps) {
  const hasPermission = useAuthStore((state) => state.hasPermission)

  if (!hasPermission(module, action, subModule)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

interface RoleGateProps {
  roles: string | string[]
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Show/hide UI elements based on user role
 *
 * Example:
 * <RoleGate roles={['super_admin', 'admin']}>
 *   <SettingsButton />
 * </RoleGate>
 */
export function RoleGate({
  roles,
  children,
  fallback = null,
}: RoleGateProps) {
  const isRole = useAuthStore((state) => state.isRole)

  if (!isRole(roles)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}