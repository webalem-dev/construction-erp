import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Shield,
  Users as UsersIcon,
  Key,
  Loader2,
  ChevronRight,
  Crown,
  UserCog,
  Briefcase,
  HardHat,
  Edit,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RoleDetailDialog } from './RoleDetailDialog'

interface Role {
  id: string
  name: string
  label: string
  description: string | null
  is_system: boolean | null
  hierarchy_level: number | null
  created_at: string | null
}

interface RoleStats {
  userCount: number
  permissionCount: number
}

const ROLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  super_admin: Crown,
  admin: Shield,
  manager: Briefcase,
  employee: HardHat,
}

const ROLE_GRADIENTS: Record<string, string> = {
  super_admin: 'from-red-500 to-red-700',
  admin: 'from-blue-500 to-blue-700',
  manager: 'from-purple-500 to-purple-700',
  employee: 'from-green-500 to-green-700',
}

export default function RolesPage() {
  const { isSuperAdmin } = useAuthStore()
  const [roles, setRoles] = useState<Role[]>([])
  const [stats, setStats] = useState<Record<string, RoleStats>>({})
  const [loading, setLoading] = useState(true)
  const [editingRole, setEditingRole] = useState<Role | null>(null)

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const { data: rolesData, error } = await supabase
        .from('roles')
        .select('*')
        .order('hierarchy_level', { ascending: false })

      if (error) throw error
      const roles = (rolesData as Role[]) || []
      setRoles(roles)

      // Compute stats for each role
      const statsMap: Record<string, RoleStats> = {}
      await Promise.all(
        roles.map(async (role) => {
          const [{ count: userCount }, { count: permissionCount }] = await Promise.all([
            supabase
              .from('user_profiles')
              .select('*', { count: 'exact', head: true })
              .eq('role_id', role.id),
            supabase
              .from('role_permissions')
              .select('*', { count: 'exact', head: true })
              .eq('role_id', role.id)
              .eq('is_granted', true),
          ])
          statsMap[role.id] = {
            userCount: userCount ?? 0,
            permissionCount: permissionCount ?? 0,
          }
        })
      )
      setStats(statsMap)
    } catch (error: any) {
      toast.error(error.message || 'Failed to load roles')
    } finally {
      setLoading(false)
    }
  }

  if (!isSuperAdmin()) {
    return (
      <div className="text-center py-20">
        <Shield className="w-16 h-16 text-red-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Access Denied</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Only Super Admins can manage roles.
        </p>
      </div>
    )
  }

  const sortedRoles = [...roles].sort(
    (a, b) => (b.hierarchy_level ?? 0) - (a.hierarchy_level ?? 0)
  )

  const totalUsers = Object.values(stats).reduce((acc, s) => acc + s.userCount, 0)
  const totalPermissions = Math.max(...Object.values(stats).map((s) => s.permissionCount), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            🛡️ Roles & Hierarchy
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage role definitions, default permissions, and user counts
          </p>
        </div>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Roles</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {roles.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center">
                <UsersIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Assigned Users</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {totalUsers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center">
                <Key className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Max Permissions</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {totalPermissions}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hierarchy banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Crown className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Hierarchy:
            </span>
            {sortedRoles.map((role, i) => {
              const Icon = ROLE_ICONS[role.name] ?? Shield
              return (
                <div key={role.id} className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-medium">
                    <Icon className="w-3 h-3 mr-1" />
                    {role.label}
                  </Badge>
                  {i < sortedRoles.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Roles grid */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">Loading roles…</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedRoles.map((role) => {
            const Icon = ROLE_ICONS[role.name] ?? Shield
            const gradient = ROLE_GRADIENTS[role.name] ?? 'from-slate-500 to-slate-700'
            const roleStats = stats[role.id] ?? { userCount: 0, permissionCount: 0 }
            return (
              <Card
                key={role.id}
                className="hover:shadow-lg transition-shadow dark:bg-slate-900 dark:border-slate-800"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
                          {role.label}
                          {role.is_system && (
                            <Badge variant="outline" className="text-[10px]">
                              SYSTEM
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs dark:text-slate-400">
                          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {role.name}
                          </code>
                          <span className="ml-2">Level {role.hierarchy_level ?? 0}</span>
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {role.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {role.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <UsersIcon className="w-3 h-3" />
                        Users
                      </div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                        {roleStats.userCount}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Key className="w-3 h-3" />
                        Permissions
                      </div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                        {roleStats.permissionCount}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setEditingRole(role)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    View / Edit Permissions
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit dialog */}
      {editingRole && (
        <RoleDetailDialog
          role={editingRole}
          open={!!editingRole}
          onOpenChange={(open) => !open && setEditingRole(null)}
          onUpdated={fetchRoles}
        />
      )}
    </div>
  )
}