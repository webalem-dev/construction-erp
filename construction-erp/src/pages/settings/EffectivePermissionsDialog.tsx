import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, CheckCircle2, XCircle, Shield } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface User {
  id: string
  first_name: string
  last_name: string
}

interface EffectivePermission {
  permission_id: string
  module: string
  sub_module: string | null
  action: string
  is_granted: boolean
  label?: string
}

interface RoleInfo {
  id: string
  name: string
  label: string
}

interface UserOverrides {
  permission_id: string
  is_granted: boolean
}

const MODULE_LABELS: Record<string, { label: string; icon: string }> = {
  dashboard: { label: 'Dashboard', icon: '📊' },
  projects: { label: 'Projects', icon: '🏗️' },
  employees: { label: 'Employees', icon: '👷' },
  stock: { label: 'Stock & Inventory', icon: '📦' },
  hr: { label: 'HR', icon: '⏰' },
  payroll: { label: 'Payroll', icon: '💰' },
  reports: { label: 'Reports', icon: '📈' },
  settings: { label: 'Settings', icon: '⚙️' },
}

const ACTION_LABELS: Record<string, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
  export: 'Export',
}

interface EffectivePermissionsDialogProps {
  user: User
  role: RoleInfo | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EffectivePermissionsDialog({
  user,
  role,
  open,
  onOpenChange,
}: EffectivePermissionsDialogProps) {
  const [loading, setLoading] = useState(true)
  const [effective, setEffective] = useState<EffectivePermission[]>([])
  const [overrides, setOverrides] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) load()
  }, [open, user.id])

  const load = async () => {
    setLoading(true)
    try {
      const [{ data: eff }, { data: ov }] = await Promise.all([
        supabase
          .from('user_effective_permissions')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('user_permissions')
          .select('permission_id')
          .eq('user_id', user.id),
      ])
      setEffective((eff as EffectivePermission[]) || [])
      setOverrides(new Set(((ov as { permission_id: string }[]) || []).map((o) => o.permission_id)))
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  const grouped = useMemo(() => {
    return effective.reduce((acc, p) => {
      if (!acc[p.module]) acc[p.module] = []
      acc[p.module].push(p)
      return acc
    }, {} as Record<string, EffectivePermission[]>)
  }, [effective])

  const grantedCount = effective.filter((e) => e.is_granted).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 sticky top-0 bg-white dark:bg-slate-900 z-10 border-b border-slate-200 dark:border-slate-800">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            {user.first_name} {user.last_name}
          </DialogTitle>
          <DialogDescription>
            {role?.label && (
              <span>
                Role: <strong>{role.label}</strong>
              </span>
            )}
            <span className="ml-3">
              {grantedCount} of {effective.length} permissions active
            </span>
            {overrides.size > 0 && (
              <span className="ml-3 text-purple-600 dark:text-purple-400">
                {overrides.size} user override{overrides.size !== 1 ? 's' : ''}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">Loading effective permissions…</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {Object.entries(grouped).map(([moduleKey, perms]) => {
              const info = MODULE_LABELS[moduleKey] || { label: moduleKey, icon: '📁' }
              const grantedInModule = perms.filter((p) => p.is_granted).length
              return (
                <Card key={moduleKey}>
                  <CardHeader className="py-3 bg-slate-50 dark:bg-slate-800">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span>{info.icon}</span>
                        {info.label}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {grantedInModule} / {perms.length}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {perms.map((p) => {
                        const isOverride = overrides.has(p.permission_id)
                        return (
                          <div
                            key={p.permission_id}
                            className={`flex items-center justify-between p-2 rounded-md text-sm border ${
                              p.is_granted
                                ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-900 dark:text-green-200'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              {p.is_granted ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <XCircle className="w-3 h-3" />
                              )}
                              <span>
                                {p.sub_module ? `${p.sub_module}.` : ''}
                                {ACTION_LABELS[p.action] || p.action}
                              </span>
                            </span>
                            {isOverride && (
                              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                                override
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}