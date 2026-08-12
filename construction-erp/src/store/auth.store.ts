import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { UserProfile, UserPermission } from '@/types'

interface AuthState {
  user: any | null
  profile: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean

  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  fetchProfile: (userId: string) => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => void  // ⭐ NEW

  hasPermission: (module: string, action: string, subModule?: string) => boolean
  isRole: (roleName: string | string[]) => boolean
  isSuperAdmin: () => boolean
  isAdminOrAbove: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isLoading: true,
      isAuthenticated: false,

      initialize: async () => {
        try {
          set({ isLoading: true })

          // Get current session
          const { data: { session } } = await supabase.auth.getSession()

          if (session?.user) {
            set({ user: session.user, isAuthenticated: true })
            await get().fetchProfile(session.user.id)
          } else {
            set({ isLoading: false })
          }

          // ⭐ Listen for auth state changes (token refresh, sign-out, user updates)
          supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth event:', event)

            if (event === 'SIGNED_OUT' || !session) {
              set({
                user: null,
                profile: null,
                isAuthenticated: false,
                isLoading: false,
              })
              return
            }

            if (event === 'TOKEN_REFRESHED' && session.user) {
              // Just update user reference, keep profile
              set({ user: session.user, isAuthenticated: true })
              return
            }

            if (event === 'USER_UPDATED' && session.user) {
              // User data was updated (e.g., password change, email change)
              set({ user: session.user, isAuthenticated: true })
              await get().fetchProfile(session.user.id)
              return
            }

            // SIGNED_IN event
            if (event === 'SIGNED_IN' && session.user) {
              set({ user: session.user, isAuthenticated: true })
              if (!get().profile || get().profile.id !== session.user.id) {
                await get().fetchProfile(session.user.id)
              }
            }
          })
        } catch (error) {
          console.error('Init error:', error)
          set({ isLoading: false })
        }
      },

      login: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error
        if (!data.user) throw new Error('Login failed')

        set({ user: data.user, isAuthenticated: true })
        await get().fetchProfile(data.user.id)
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({
          user: null,
          profile: null,
          isAuthenticated: false,
        })
      },

      fetchProfile: async (userId: string) => {
        try {
          const { data: profile, error } = await supabase
            .from('user_profiles')
            .select(`
              *,
              role:roles (
                id,
                name,
                label,
                hierarchy_level
              )
            `)
            .eq('id', userId)
            .single()

          if (error) throw error
          if (!profile) throw new Error('Profile not found')

          if (!profile.is_active) {
            await supabase.auth.signOut()
            throw new Error('Your account has been deactivated')
          }

          const { data: permissions } = await supabase
            .from('user_effective_permissions')
            .select('*')
            .eq('user_id', userId)

          await supabase
            .from('user_profiles')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', userId)

          set({
            profile: {
              ...profile,
              permissions: permissions || [],
            },
            isLoading: false,
          })
        } catch (error) {
          console.error('Profile fetch error:', error)
          set({ isLoading: false })
          throw error
        }
      },

      // ⭐ NEW: Update profile in local state (after DB update)
      updateProfile: (updates) => {
        set((state) => ({
          profile: state.profile
            ? { ...state.profile, ...updates }
            : null,
        }))
      },

      hasPermission: (module: string, action: string, subModule?: string) => {
        const { profile } = get()
        if (!profile) return false
        if (profile.role?.name === 'super_admin') return true

        const permission = profile.permissions?.find((p: UserPermission) =>
          p.module === module &&
          p.action === action &&
          p.sub_module === (subModule ?? null)
        )

        return permission?.is_granted ?? false
      },

      isRole: (roleName: string | string[]) => {
        const { profile } = get()
        if (!profile?.role) return false
        const roles = Array.isArray(roleName) ? roleName : [roleName]
        return roles.includes(profile.role.name)
      },

      isSuperAdmin: () => get().isRole('super_admin'),
      isAdminOrAbove: () => get().isRole(['super_admin', 'admin']),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)