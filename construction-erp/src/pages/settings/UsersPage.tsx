import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  MoreVertical,
  UserCog,
  Shield,
  Users as UsersIcon,
  Loader2,
  Eye,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { getInitials, formatDate } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { UserFormDialog } from './UserFormDialog'
import { EffectivePermissionsDialog } from './EffectivePermissionsDialog'

interface User {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
  role: {
    id: string
    name: string
    label: string
  }
}

interface Role {
  id: string
  name: string
  label: string
}

export default function UsersPage() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((state) => state.profile)
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [permsUser, setPermsUser] = useState<User | null>(null)

  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          first_name,
          last_name,
          phone,
          is_active,
          last_login_at,
          created_at,
          role:roles (
            id,
            name,
            label
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers((data as any) || [])
    } catch (error: any) {
      toast.error(error.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, label')
        .order('hierarchy_level', { ascending: false })

      if (error) throw error
      setRoles(data || [])
    } catch (error: any) {
      toast.error('Failed to load roles')
    }
  }

  // Toggle user active/inactive
  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    if (userId === currentUser?.id) {
      toast.error('You cannot deactivate your own account')
      return
    }

    try {
      const { error } = await supabase.rpc('toggle_user_status', {
        p_user_id: userId,
        p_is_active: !currentStatus,
      })

      if (error) throw error

      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, is_active: !currentStatus } : u
        )
      )

      toast.success(
        !currentStatus ? 'User activated successfully' : 'User deactivated successfully'
      )
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user status')
    }
  }

  // Change user role
  const handleChangeRole = async (userId: string, newRoleName: string) => {
    if (userId === currentUser?.id) {
      toast.error('You cannot change your own role')
      return
    }

    try {
      const { error } = await supabase.rpc('change_user_role', {
        p_user_id: userId,
        p_role_name: newRoleName,
      })

      if (error) throw error

      const newRole = roles.find((r) => r.name === newRoleName)
      if (newRole) {
        setUsers(
          users.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        )
      }

      toast.success('Role updated successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to change role')
    }
  }

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = filterRole === 'all' || user.role?.name === filterRole

    return matchesSearch && matchesRole
  })

  const getRoleBadgeVariant = (roleName: string) => {
    if (roleName === 'super_admin') return 'destructive'
    if (roleName === 'admin') return 'default'
    return 'secondary'
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            User Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage user accounts, roles, and access
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
                <UsersIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Users</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {users.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center">
                <UserCog className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Active Users</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {users.filter((u) => u.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Admins</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {
                    users.filter(
                      (u) =>
                        u.role?.name === 'admin' || u.role?.name === 'super_admin'
                    ).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search users by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.name}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <UsersIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      User
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      Role
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      Status
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      Last Login
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      Created
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9">
                            <AvatarFallback className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm font-semibold">
                              {getInitials(user.first_name, user.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {user.first_name} {user.last_name}
                              {user.id === currentUser?.id && (
                                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                                  (You)
                                </span>
                              )}
                            </p>
                            {user.phone && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {user.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={getRoleBadgeVariant(user.role?.name)}>
                          {user.role?.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.is_active}
                            onCheckedChange={() =>
                              handleToggleStatus(user.id, user.is_active)
                            }
                            disabled={user.id === currentUser?.id}
                          />
                          <span
                            className={`text-sm ${
                              user.is_active
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {user.last_login_at ? formatDate(user.last_login_at) : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setPermsUser(user)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Effective Permissions
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                navigate(`/settings/permissions?userId=${user.id}`)
                              }
                              disabled={user.role?.name === 'super_admin'}
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              Manage Permissions
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                            {roles.map((role) => (
                              <DropdownMenuItem
                                key={role.id}
                                onClick={() => handleChangeRole(user.id, role.name)}
                                disabled={
                                  user.id === currentUser?.id ||
                                  user.role?.name === role.name
                                }
                              >
                                {user.role?.name === role.name && '✓ '}
                                {role.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-200">
                User Creation Note
              </p>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                Newly created users receive a confirmation email to activate their account.
                They can sign in once their email is verified.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <UserFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={fetchUsers}
      />

      {permsUser && (
        <EffectivePermissionsDialog
          user={permsUser}
          role={permsUser.role}
          open={!!permsUser}
          onOpenChange={(open) => !open && setPermsUser(null)}
        />
      )}
    </div>
  )
}