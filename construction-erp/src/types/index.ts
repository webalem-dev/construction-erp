// ============================================
// AUTH & USER TYPES
// ============================================

export interface Role {
  id: string
  name: string
  label: string
  description: string | null
  is_system: boolean
  hierarchy_level: number
  created_at: string
}

export interface UserPermission {
  permission_id: string
  is_granted: boolean
  module: string
  sub_module: string | null
  action: string
  label?: string
}

export interface UserProfile {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  role_id: string
  employee_id: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
  role?: Role
  permissions?: UserPermission[]
}