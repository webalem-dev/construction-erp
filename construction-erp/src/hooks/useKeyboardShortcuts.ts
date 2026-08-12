import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

interface ShortcutActions {
  openCommandPalette: () => void
  closeCommandPalette: () => void
  showShortcutsHelp: () => void
  closeShortcutsHelp: () => void
  toggleSidebarCollapsed: () => void
  openSidebar: () => void
  closeSidebar: () => void
}

/**
 * Global keyboard shortcuts:
 *  - Ctrl/Cmd + K → open command palette
 *  - ?           → open shortcuts help
 *  - Esc         → close palette / help / drawer
 *  - [           → toggle sidebar (collapsed on desktop, drawer on mobile)
 *  - g then {key} → go to nav (d/p/s/e/h/l/y/r/u/o/c/m)
 *     d = dashboard, p = projects, s = stock, e = employees,
 *     h = hr/attendance, l = hr/leave, y = payroll, r = reports,
 *     u = users, c = company, o = roles, m = permissions
 */
export function useKeyboardShortcuts(actions: ShortcutActions) {
  const navigate = useNavigate()
  const lastG = useRef<number>(0)
  const actionsRef = useRef(actions)

  useEffect(() => {
    actionsRef.current = actions
  }, [actions])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)

      // Ctrl/Cmd + K → command palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        actionsRef.current.openCommandPalette()
        return
      }

      // Escape → close (palette / shortcuts help / sidebar drawer)
      if (e.key === 'Escape') {
        actionsRef.current.closeCommandPalette()
        actionsRef.current.closeShortcutsHelp()
        actionsRef.current.closeSidebar()
        return
      }

      // Skip other shortcuts when typing
      if (isInput) return

      // ? → shortcuts help
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        actionsRef.current.showShortcutsHelp()
        return
      }

      // [ → toggle sidebar (collapsed on desktop, drawer on mobile)
      if (e.key === '[' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        actionsRef.current.toggleSidebarCollapsed()
        return
      }

      // g-then-key navigation
      if (e.key.toLowerCase() === 'g') {
        lastG.current = Date.now()
        return
      }

      const sinceG = Date.now() - lastG.current
      if (sinceG < 1500) {
        const key = e.key.toLowerCase()
        const routes: Record<string, string> = {
          d: '/',
          p: '/projects',
          s: '/stock',
          e: '/employees',
          h: '/hr/attendance',
          l: '/hr/leave',
          y: '/hr/payroll',
          r: '/reports',
          u: '/settings/users',
          o: '/settings/roles',
          c: '/settings/company',
          m: '/settings/permissions',
        }
        const route = routes[key]
        if (route) {
          e.preventDefault()
          lastG.current = 0
          navigate(route)
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])
}