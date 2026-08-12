import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useThemeStore } from '@/store/theme.store'
import { useSidebarStore } from '@/store/sidebar.store'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { CommandPalette } from '@/components/shared/CommandPalette'
import { ShortcutsHelp } from '@/components/shared/ShortcutsHelp'

export function AppLayout() {
  // Initialize theme on mount (Zustand persist rehydration handles first paint,
  // but this guards against HMR / direct re-renders)
  const theme = useThemeStore((s) => s.theme)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [theme])

  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const toggleSidebarCollapsed = useSidebarStore((s) => s.toggleCollapsed)
  const openSidebar = useSidebarStore((s) => s.open)
  const closeSidebar = useSidebarStore((s) => s.close)

  useKeyboardShortcuts({
    openCommandPalette: () => setPaletteOpen(true),
    closeCommandPalette: () => setPaletteOpen(false),
    showShortcutsHelp: () => setShortcutsOpen(true),
    closeShortcutsHelp: () => setShortcutsOpen(false),
    toggleSidebarCollapsed,
    openSidebar,
    closeSidebar,
  })

  const collapsed = useSidebarStore((s) => s.collapsed)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Sidebar />

      {/* Header is fixed; it overlaps the sidebar on desktop until the
          sidebar is collapsed, then it slides back to the left edge. */}
      <div
        className={
          'transition-[padding] duration-200 ' +
          (collapsed ? 'lg:pl-0' : 'lg:pl-64')
        }
      >
        <Header onShowShortcuts={() => setShortcutsOpen(true)} />
      </div>

      {/* Main content area — full width on mobile, offset on desktop by
          the sidebar width (0 when collapsed, 16rem when expanded). */}
      <main
        className={
          'pt-16 min-h-screen transition-[padding] duration-200 ' +
          (collapsed ? 'lg:pl-0' : 'lg:pl-64')
        }
      >
        <div className="p-4 sm:p-6 animate-fade-in">
          <Outlet />
        </div>
      </main>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <ShortcutsHelp open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  )
}