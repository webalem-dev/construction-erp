import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Shield,
  User,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
  Sparkles,
  RotateCcw,
  Eye,
  Package,
  Briefcase,
  Calculator,
  HardHat,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { getInitials } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface UserOption {
  id: string
  first_name: string
  last_name: string
  role: { name: string; label: string }
}

interface Permission {
  id: string
  module: string
  sub_module: string | null
  action: string
  label: string
}

interface EffectivePermission {
  permission_id: string
  module: string
  sub_module: string | null
  action: string
  is_granted: boolean
}

const MODULE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  dashboard: { label: 'Dashboard', icon: '📊', color: 'bg-gray-100 dark:bg-gray-900' },
  projects: { label: 'Projects', icon: '🏗️', color: 'bg-blue-100 dark:bg-blue-950' },
  employees: { label: 'Employees', icon: '👷', color: 'bg-green-100 dark:bg-green-950' },
  stock: { label: 'Stock & Inventory', icon: '📦', color: 'bg-orange-100 dark:bg-orange-950' },
  hr: { label: 'HR', icon: '⏰', color: 'bg-purple-100 dark:bg-purple-950' },
  payroll: { label: 'Payroll', icon: '💰', color: 'bg-yellow-100 dark:bg-yellow-950' },
  reports: { label: 'Reports', icon: '📈', color: 'bg-indigo-100 dark:bg-indigo-950' },
  settings: { label: 'Settings', icon: '⚙️', color: 'bg-red-100 dark:bg-red-950' },
}

const ACTION_LABELS: Record<string, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
  export: 'Export',
}

const SUB_MODULE_LABELS: Record<string, string> = {
  tasks: '📝 Tasks',
  budget: '💵 Budget',
  contracts: '📄 Contracts',
  daily_reports: '📋 Daily Reports',
  purchase_orders: '🛒 Purchase Orders',
  material_requests: '📥 Material Requests',
  suppliers: '🚚 Suppliers',
  attendance: '📅 Attendance',
  leave: '🏖️ Leave',
  users: '👥 Users',
  roles: '🔐 Roles',
  permissions: '🔑 Permissions',
}

// ============================================
// PERMISSION TEMPLATES (code-defined presets)
// ============================================

interface TemplatePermission {
  module: string
  action: string
  subModule?: string
}

interface PermissionTemplate {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  permissions: TemplatePermission[]
  color: string
}

const PERMISSION_TEMPLATES: PermissionTemplate[] = [
  {
    id: 'read_only',
    name: 'Read-Only',
    description: 'View-only access across all modules',
    icon: Eye,
    color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    permissions: [
      { module: 'dashboard', action: 'view' },
      { module: 'projects', action: 'view' },
      { module: 'stock', action: 'view' },
      { module: 'employees', action: 'view' },
      { module: 'hr', action: 'view' },
      { module: 'payroll', action: 'view' },
      { module: 'reports', action: 'view' },
    ],
  },
  {
    id: 'project_manager',
    name: 'Project Manager',
    description: 'Full project + reporting access, view stock/HR',
    icon: Briefcase,
    color: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
    permissions: [
      { module: 'dashboard', action: 'view' },
      { module: 'projects', action: 'view' },
      { module: 'projects', action: 'create' },
      { module: 'projects', action: 'edit' },
      { module: 'projects', action: 'delete' },
      { module: 'projects', action: 'approve' },
      { module: 'projects', action: 'export' },
      { module: 'stock', action: 'view' },
      { module: 'employees', action: 'view' },
      { module: 'hr', action: 'view' },
      { module: 'reports', action: 'view' },
      { module: 'reports', action: 'export' },
    ],
  },
  {
    id: 'store_keeper',
    name: 'Store Keeper',
    description: 'Full stock module access',
    icon: Package,
    color: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300',
    permissions: [
      { module: 'dashboard', action: 'view' },
      { module: 'stock', action: 'view' },
      { module: 'stock', action: 'create' },
      { module: 'stock', action: 'edit' },
      { module: 'stock', action: 'delete' },
      { module: 'stock', action: 'approve' },
      { module: 'stock', action: 'export' },
      { module: 'projects', action: 'view' },
      { module: 'reports', action: 'view' },
    ],
  },
  {
    id: 'hr_officer',
    name: 'HR Officer',
    description: 'HR + employees + view payroll',
    icon: User,
    color: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300',
    permissions: [
      { module: 'dashboard', action: 'view' },
      { module: 'hr', action: 'view' },
      { module: 'hr', action: 'create' },
      { module: 'hr', action: 'edit' },
      { module: 'hr', action: 'approve' },
      { module: 'hr', action: 'export' },
      { module: 'employees', action: 'view' },
      { module: 'employees', action: 'create' },
      { module: 'employees', action: 'edit' },
      { module: 'payroll', action: 'view' },
      { module: 'reports', action: 'view' },
    ],
  },
  {
    id: 'accountant',
    name: 'Accountant',
    description: 'Full payroll + reports',
    icon: Calculator,
    color: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300',
    permissions: [
      { module: 'dashboard', action: 'view' },
      { module: 'payroll', action: 'view' },
      { module: 'payroll', action: 'create' },
      { module: 'payroll', action: 'edit' },
      { module: 'payroll', action: 'approve' },
      { module: 'payroll', action: 'export' },
      { module: 'reports', action: 'view' },
      { module: 'reports', action: 'export' },
      { module: 'projects', action: 'view' },
      { module: 'hr', action: 'view' },
      { module: 'employees', action: 'view' },
    ],
  },
  {
    id: 'site_supervisor',
    name: 'Site Supervisor',
    description: 'Edit projects, view stock & attendance',
    icon: HardHat,
    color: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300',
    permissions: [
      { module: 'dashboard', action: 'view' },
      { module: 'projects', action: 'view' },
      { module: 'projects', action: 'edit' },
      { module: 'stock', action: 'view' },
      { module: 'hr', action: 'view', subModule: 'attendance' },
      { module: 'employees', action: 'view' },
      { module: 'reports', action: 'view' },
    ],
  },
]

export default function PermissionsPage() {
  const [searchParams] = useSearchParams()
  const { isSuperAdmin, profile: currentUser } = useAuthStore()

  const [users, setUsers] = useState<UserOption[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [userPermissions, setUserPermissions] = useState<Map<string, boolean>>(new Map())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const [pendingTemplate, setPendingTemplate] = useState<PermissionTemplate | null>(null)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)

  // Preselect user from URL query param
  useEffect(() => {
    const userId = searchParams.get('userId')
    if (userId) setSelectedUserId(userId)
  }, [searchParams])

  // Load initial data
  useEffect(() => {
    fetchUsers()
    fetchPermissions()
  }, [])

  // Load user permissions when user changes
  useEffect(() => {
    if (selectedUserId) {
      fetchUserPermissions(selectedUserId)
    }
  }, [selectedUserId])

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        id, first_name, last_name, is_active,
        role:roles (name, label)
      `)
      .eq('is_active', true)
      .order('first_name')

    if (error) {
      toast.error('Failed to load users')
      return
    }
    setUsers((data as any) || [])
  }

  const fetchPermissions = async () => {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('module')

    if (error) {
      toast.error('Failed to load permissions')
      return
    }
    setPermissions(data || [])
  }

  const fetchUserPermissions = async (userId: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_effective_permissions')
        .select('*')
        .eq('user_id', userId)

      if (error) throw error

      const permMap = new Map<string, boolean>()
      ;(data as EffectivePermission[])?.forEach((p) => {
        permMap.set(p.permission_id, p.is_granted)
      })
      setUserPermissions(permMap)
    } catch (error: any) {
      toast.error('Failed to load user permissions')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (permission: Permission, newValue: boolean) => {
    if (!selectedUserId) return

    if (selectedUserId === currentUser?.id) {
      toast.error('You cannot modify your own permissions')
      return
    }

    const permKey = permission.id

    // Optimistic update
    const newMap = new Map(userPermissions)
    newMap.set(permKey, newValue)
    setUserPermissions(newMap)

    setSaving((prev) => new Set(prev).add(permKey))

    try {
      const { error } = await supabase.rpc('set_user_permission', {
        p_user_id: selectedUserId,
        p_module: permission.module,
        p_action: permission.action,
        p_sub_module: permission.sub_module,
        p_is_granted: newValue,
      })

      if (error) throw error

      toast.success(
        newValue
          ? `✓ ${permission.label} granted`
          : `✗ ${permission.label} revoked`
      )
    } catch (error: any) {
      const revertMap = new Map(userPermissions)
      revertMap.set(permKey, !newValue)
      setUserPermissions(revertMap)
      toast.error(error.message || 'Failed to update permission')
    } finally {
      setSaving((prev) => {
        const next = new Set(prev)
        next.delete(permKey)
        return next
      })
    }
  }

  // ============================================
  // Apply a permission template to the selected user
  // ============================================
  const applyTemplate = async (template: PermissionTemplate) => {
    if (!selectedUserId) return
    if (selectedUserId === currentUser?.id) {
      toast.error('You cannot modify your own permissions')
      return
    }

    // Compute target state: true for perms in template, false otherwise
    const target = new Map<string, boolean>()
    permissions.forEach((p) => target.set(p.id, false))
    permissions.forEach((p) => {
      const matches = template.permissions.some(
        (tp) =>
          tp.module === p.module &&
          tp.action === p.action &&
          (tp.subModule ?? null) === (p.sub_module ?? null)
      )
      if (matches) target.set(p.id, true)
    })

    setLoading(true)
    try {
      // Apply every diff
      for (const [permId, value] of target) {
        const current = userPermissions.get(permId) ?? false
        if (current === value) continue
        const perm = permissions.find((p) => p.id === permId)!
        const { error } = await supabase.rpc('set_user_permission', {
          p_user_id: selectedUserId,
          p_module: perm.module,
          p_action: perm.action,
          p_sub_module: perm.sub_module,
          p_is_granted: value,
        })
        if (error) throw error
      }
      setUserPermissions(target)
      toast.success(`Applied "${template.name}" template`)
      setPendingTemplate(null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to apply template')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // Reset to role defaults (delete all user overrides)
  // ============================================
  const resetToRoleDefaults = async () => {
    if (!selectedUserId) return
    if (selectedUserId === currentUser?.id) {
      toast.error('You cannot modify your own permissions')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', selectedUserId)

      if (error) throw error
      await fetchUserPermissions(selectedUserId)
      toast.success('Permissions reset to role defaults')
      setResetConfirmOpen(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset')
    } finally {
      setLoading(false)
    }
  }

  const selectedUser = users.find((u) => u.id === selectedUserId)

  // Group permissions by module
  const permissionsByModule = useMemo(() => {
    return permissions.reduce((acc, p) => {
      if (!acc[p.module]) acc[p.module] = { main: [], subModules: {} }
      if (p.sub_module) {
        if (!acc[p.module].subModules[p.sub_module]) {
          acc[p.module].subModules[p.sub_module] = []
        }
        acc[p.module].subModules[p.sub_module].push(p)
      } else {
        acc[p.module].main.push(p)
      }
      return acc
    }, {} as Record<string, { main: Permission[]; subModules: Record<string, Permission[]> }>)
  }, [permissions])

  const grantedCount = Array.from(userPermissions.values()).filter((v) => v).length
  const totalCount = permissions.length
  const overrideCount = useMemo(() => {
    // Approximation: we can't compare to role defaults without fetching them;
    // since user_effective_permissions already merges, this isn't trivial.
    return userPermissions.size
  }, [userPermissions])

  if (!isSuperAdmin()) {
    return (
      <div className="text-center py-20">
        <Shield className="w-16 h-16 text-red-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Access Denied</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Only Super Admins can manage user permissions.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          🔐 Permissions Manager
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Grant or revoke specific permissions, or apply a template for each user
        </p>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-200">How it works</p>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                Each toggle overrides the user's role default. Turn ON to grant, turn OFF to revoke.
                Changes take effect on the user's next login or page refresh.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select User</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-full sm:w-96">
              <SelectValue placeholder="Choose a user to manage..." />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem
                  key={user.id}
                  value={user.id}
                  disabled={user.role?.name === 'super_admin'}
                >
                  {user.first_name} {user.last_name} ({user.role?.label})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Selected User Info */}
      {selectedUser && (
        <Card className="border-blue-200 dark:border-blue-800 dark:bg-slate-900">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14">
                  <AvatarFallback className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-lg font-bold">
                    {getInitials(selectedUser.first_name, selectedUser.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{selectedUser.role?.label}</Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Active Permissions</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {grantedCount}
                    <span className="text-lg text-slate-400 dark:text-slate-500">
                      {' '}/ {totalCount}
                    </span>
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setResetConfirmOpen(true)}
                  disabled={selectedUserId === currentUser?.id}
                  title="Reset all user-level overrides back to role defaults"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset to Role Defaults
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permission Templates */}
      {selectedUserId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Permission Templates
            </CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              One-click preset bundles — applied as user-level overrides
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PERMISSION_TEMPLATES.map((template) => {
                const Icon = template.icon
                return (
                  <button
                    key={template.id}
                    onClick={() => setPendingTemplate(template)}
                    disabled={selectedUserId === currentUser?.id}
                    className={`text-left p-4 rounded-lg border-2 transition-all hover:scale-[1.02] ${template.color} border-transparent hover:border-current disabled:opacity-50 disabled:hover:scale-100`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span className="font-semibold">{template.name}</span>
                    </div>
                    <p className="text-xs opacity-80 mb-2">{template.description}</p>
                    <p className="text-xs opacity-60">
                      {template.permissions.length} permissions
                    </p>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permissions Grid */}
      {selectedUserId && !loading && (
        <div className="space-y-4">
          {Object.entries(permissionsByModule).map(([moduleKey, moduleData]) => {
            const moduleInfo = MODULE_LABELS[moduleKey] || {
              label: moduleKey,
              icon: '📁',
              color: 'bg-gray-100 dark:bg-gray-900',
            }

            return (
              <Card key={moduleKey}>
                <CardHeader className={`${moduleInfo.color} border-b border-slate-200 dark:border-slate-700`}>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="text-2xl">{moduleInfo.icon}</span>
                    {moduleInfo.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {moduleData.main.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                      {moduleData.main.map((permission) => {
                        const isGranted = userPermissions.get(permission.id) ?? false
                        const isSaving = saving.has(permission.id)

                        return (
                          <div
                            key={permission.id}
                            className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                              isGranted
                                ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isGranted ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              ) : (
                                <XCircle className="w-4 h-4 text-slate-400" />
                              )}
                              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {ACTION_LABELS[permission.action] || permission.action}
                              </span>
                            </div>
                            {isSaving ? (
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                            ) : (
                              <Switch
                                checked={isGranted}
                                onCheckedChange={(val) => handleToggle(permission, val)}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {Object.entries(moduleData.subModules).map(([subKey, subPerms]) => (
                    <div key={subKey} className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <span>└</span>
                        {SUB_MODULE_LABELS[subKey] || subKey}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-4">
                        {subPerms.map((permission) => {
                          const isGranted = userPermissions.get(permission.id) ?? false
                          const isSaving = saving.has(permission.id)

                          return (
                            <div
                              key={permission.id}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                isGranted
                                  ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isGranted ? (
                                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-slate-400" />
                                )}
                                <span className="text-sm text-slate-700 dark:text-slate-300">
                                  {ACTION_LABELS[permission.action] || permission.action}
                                </span>
                              </div>
                              {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                              ) : (
                                <Switch
                                  checked={isGranted}
                                  onCheckedChange={(val) => handleToggle(permission, val)}
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">Loading permissions...</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!selectedUserId && (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">
              Select a user above to manage their permissions
            </p>
          </CardContent>
        </Card>
      )}

      {/* Apply template confirmation */}
      <AlertDialog
        open={!!pendingTemplate}
        onOpenChange={(open) => !open && setPendingTemplate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply "{pendingTemplate?.name}" template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will <strong>replace all current user-level permission overrides</strong> for{' '}
              {selectedUser?.first_name} with the {pendingTemplate?.permissions.length} permissions from this template.
              Role-level defaults are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingTemplate && applyTemplate(pendingTemplate)}>
              Apply Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset confirmation */}
      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to role defaults?</AlertDialogTitle>
            <AlertDialogDescription>
              This will <strong>delete all user-level permission overrides</strong> for{' '}
              {selectedUser?.first_name} {selectedUser?.last_name}, reverting them to{' '}
              their {selectedUser?.role?.label} role defaults. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={resetToRoleDefaults}>
              Reset Permissions
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}