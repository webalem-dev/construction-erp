import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarState {
  /**
   * Mobile drawer state (true = open, false = closed).
   * Mobile: open shows the drawer with a backdrop.
   * Desktop: collapsed slides the sidebar off-canvas; main content
   *          expands to fill the freed space. A hamburger in the
   *          header toggles this on both screen sizes.
   */
  isOpen: boolean

  /**
   * User preference for desktop collapsed state (persisted).
   * Independent of `isOpen` so a mobile drawer can close without
   * overwriting the desktop collapsed preference on hydration.
   */
  collapsed: boolean

  toggle: () => void
  open: () => void
  close: () => void
  setOpen: (open: boolean) => void

  setCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isOpen: false,
      collapsed: false,

      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      setOpen: (open) => set({ isOpen: open }),

      setCollapsed: (collapsed) => set({ collapsed }),
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
    }),
    {
      name: 'sidebar-store',
      partialize: (state) => ({ collapsed: state.collapsed }),
    }
  )
)