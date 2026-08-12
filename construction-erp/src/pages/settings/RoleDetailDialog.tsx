import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, Info, Save } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

interface Role {
  id: string
  name: string
  label: string
  description: string | null
  is_system: boolean | null
  hierarchy_level: number | null
}

interface Permission {
  id: string
  module: string
  sub_module: string | null
  action: string
  label: string
}

interface RoleDetailDialogProps {
  role: Role
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
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

export function RoleDetailDialog({
  role,
  open,
  onOpenChange,
  onUpdated,
}: RoleDetailDialogProps) {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [rolePerms, setRolePerms] = useState<Map<string, boolean>>(new Map())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, role.id])

  const loadData = async () => {
    setLoading(true)
    setDirty(false)
    try {
      // Load all permissions
      const { data: perms, error: permsErr } = await supabase
        .from('permissions')
        .select('*')
        .order('module')

      if (permsErr) throw permsErr
      setPermissions(perms || [])

      // Load current role permissions
      const { data: rps, error: rpErr } = await supabase
        .from('role_permissions')
        .select('permission_id, is_granted')
        .eq('role_id', role.id)

      if (rpErr) throw rpErr

      const map = new Map<string, boolean>()
      ;(rps as Array<{ permission_id: string; is_granted: boolean }>)?.forEach(
        (rp) => map.set(rp.permission_id, rp.is_granted)
      )
      setRolePerms(map)
    } catch (error: any) {
      toast.error('Failed to load role permissions')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (perm: Permission, value: boolean) => {
    if (role.name === 'super_admin') {
      toast.error('Super Admin permissions cannot be modified')
      return
    }
    const newMap = new Map(rolePerms)
    newMap.set(perm.id, value)
    setRolePerms(newMap)
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Build a list of all perms with their state
      const updates = permissions.map((p) => ({
        role_id: role.id,
        permission_id: p.id,
        is_granted: rolePerms.get(p.id) ?? false,
      }))

      // Upsert in batches via role_permissions (no direct upsert; use RPC pattern)
      // Simpler: delete then insert
      const { error: delErr } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', role.id)

      if (delErr) throw delErr

      const grantedRows = updates.filter((u) => u.is_granted)
      if (grantedRows.length > 0) {
        const { error: insErr } = await supabase
          .from('role_permissions')
          .insert(grantedRows)

        if (insErr) throw insErr
      }

      toast.success('Role permissions updated')
      setDirty(false)
      onUpdated?.()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Group by module
  const permissionsByModule = permissions.reduce((acc, p) => {
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

  const grantedCount = Array.from(rolePerms.values()).filter((v) => v).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 sticky top-0 bg-white dark:bg-slate-900 z-10 border-b border-slate-200 dark:border-slate-800">
          <DialogTitle className="flex items-center gap-2">
            <span>{role.label}</span>
            <Badge variant="secondary" className="text-xs">
              {grantedCount} / {permissions.length} perms
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {role.description || `Default permissions for users assigned the ${role.label} role`}
            {role.name === 'super_admin' && (
              <span className="block mt-1 text-yellow-600 dark:text-yellow-400">
                ⚠ Super Admin has unrestricted access and cannot be edited.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">Loading permissions…</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {role.name === 'super_admin' && (
              <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                <CardContent className="p-3 flex gap-2 items-start text-sm">
                  <Info className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-yellow-800 dark:text-yellow-200">
                    Super Admins implicitly have <strong>ALL</strong> permissions.
                    The checkboxes below are visual reference only and cannot be changed.
                  </p>
                </CardContent>
              </Card>
            )}

            {Object.entries(permissionsByModule).map(([moduleKey, moduleData]) => {
              const moduleInfo = MODULE_LABELS[moduleKey] || {
                label: moduleKey,
                icon: '📁',
                color: 'bg-slate-100 dark:bg-slate-800',
              }
              return (
                <Card key={moduleKey}>
                  <CardHeader className={`${moduleInfo.color} py-3`}>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span>{moduleInfo.icon}</span>
                      {moduleInfo.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {moduleData.main.map((perm) => {
                      const isGranted = rolePerms.get(perm.id) ?? false
                      const isSuper = role.name === 'super_admin'
                      return (
                        <div
                          key={perm.id}
                          className={`flex items-center justify-between p-2 rounded-md border ${
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
                              {ACTION_LABELS[perm.action] || perm.action}
                            </span>
                          </div>
                          <Switch
                            checked={isGranted || isSuper}
                            disabled={isSuper}
                            onCheckedChange={(v) => handleToggle(perm, v)}
                          />
                        </div>
                      )
                    })}

                    {Object.entries(moduleData.subModules).map(([subKey, subPerms]) => (
                      <div key={subKey} className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-2">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                          {subKey.replace(/_/g, ' ')}
                        </p>
                        {subPerms.map((perm) => {
                          const isGranted = rolePerms.get(perm.id) ?? false
                          const isSuper = role.name === 'super_admin'
                          return (
                            <div
                              key={perm.id}
                              className={`flex items-center justify-between p-2 rounded-md border text-sm ${
                                isGranted
                                  ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <span className="text-slate-700 dark:text-slate-300">
                                {ACTION_LABELS[perm.action] || perm.action}
                              </span>
                              <Switch
                                checked={isGranted || isSuper}
                                disabled={isSuper}
                                onCheckedChange={(v) => handleToggle(perm, v)}
                              />
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        <DialogFooter className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleSave} disabled={saving || !dirty || role.name === 'super_admin'}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}