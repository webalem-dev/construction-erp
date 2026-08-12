import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  Package,
  Users,
  Clock,
  DollarSign,
  BarChart3,
  Settings,
  Building2,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  Truck,
  FileText,
  CalendarDays,
  Shield,
  UserCog,
  X,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useSidebarStore } from '@/store/sidebar.store'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string }>
  module?: string
  action?: string
  subModule?: string
  roles?: string[]
  children?: NavItem[]
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
    module: 'dashboard',
    action: 'view',
  },
  {
    label: 'Projects',
    path: '/projects',
    icon: FolderKanban,
    module: 'projects',
    action: 'view',
  },
  {
    label: 'Stock',
    path: '/stock',
    icon: Package,
    module: 'stock',
    action: 'view',
    children: [
      {
        label: 'Inventory',
        path: '/stock',
        icon: Package,
        module: 'stock',
        action: 'view',
      },
      {
        label: 'Purchase Orders',
        path: '/stock/purchase-orders',
        icon: ShoppingCart,
        module: 'stock',
        action: 'view',
        subModule: 'purchase_orders',
      },
      {
        label: 'Material Requests',
        path: '/stock/material-requests',
        icon: FileText,
        module: 'stock',
        action: 'view',
        subModule: 'material_requests',
      },
      {
        label: 'Suppliers',
        path: '/stock/suppliers',
        icon: Truck,
        module: 'stock',
        action: 'view',
        subModule: 'suppliers',
      },
      {
        label: 'Warehouses',
        path: '/stock/warehouses',
        icon: Building2,
        module: 'stock',
        action: 'view',
        subModule: 'warehouses',
      },
    ],
  },
  {
    label: 'Employees',
    path: '/employees',
    icon: Users,
    module: 'employees',
    action: 'view',
  },
  {
    label: 'HR',
    path: '/hr',
    icon: Clock,
    module: 'hr',
    action: 'view',
    children: [
      {
        label: 'Attendance',
        path: '/hr/attendance',
        icon: CalendarDays,
        module: 'hr',
        action: 'view',
        subModule: 'attendance',
      },
      {
        label: 'Leave',
        path: '/hr/leave',
        icon: FileText,
        module: 'hr',
        action: 'view',
        subModule: 'leave',
      },
      {
        label: 'Payroll',
        path: '/hr/payroll',
        icon: DollarSign,
        module: 'payroll',
        action: 'view',
      },
    ],
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: BarChart3,
    module: 'reports',
    action: 'view',
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: Settings,
    roles: ['super_admin', 'admin'],
    children: [
      {
        label: 'Users',
        path: '/settings/users',
        icon: UserCog,
        roles: ['super_admin', 'admin'],
      },
      {
        label: 'Roles',
        path: '/settings/roles',
        icon: Shield,
        roles: ['super_admin', 'admin'],
      },
      {
        label: 'Permissions',
        path: '/settings/permissions',
        icon: Shield,
        roles: ['super_admin'],
      },
      {
        label: 'Company',
        path: '/settings/company',
        icon: Building2,
        roles: ['super_admin', 'admin'],
      },
    ],
  },
]

// Desktop sidebar width (matches the `ml-64` / `left-64` in layout)
const SIDEBAR_WIDTH = 64 // in tailwind units = 16rem = 256px

export function Sidebar() {
  const location = useLocation()
  const { hasPermission, isRole } = useAuthStore()
  const { isOpen, collapsed, close } = useSidebarStore()
  const [expandedItems, setExpandedItems] = useState<string[]>([
    '/stock',
    '/hr',
    '/settings',
  ])

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    close()
  }, [location.pathname, close])

  // Close the mobile drawer when the viewport grows past the lg breakpoint
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) close()
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [close])

  // ESC closes the mobile drawer
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, close])

  // Don't render children inside the sidebar when collapsed (desktop)
  // — but we still render the row icons so users can pop it open again.
  const isCompact = collapsed

  const canSeeItem = (item: NavItem): boolean => {
    if (item.roles) {
      return isRole(item.roles)
    }
    if (item.module && item.action) {
      return hasPermission(item.module, item.action, item.subModule)
    }
    return true
  }

  const toggleExpanded = (path: string) => {
    setExpandedItems((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    )
  }

  const isActive = (path: string): boolean => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const handleNavClick = () => {
    // Close drawer on mobile after navigation (desktop collapsed persists)
    close()
  }

  const renderNavItem = (item: NavItem) => {
    if (!canSeeItem(item)) return null

    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.path)
    const active = isActive(item.path)
    const Icon = item.icon

    const visibleChildren = item.children?.filter(canSeeItem) || []

    if (hasChildren && visibleChildren.length > 0) {
      return (
        <div key={item.path}>
          <button
            onClick={() => toggleExpanded(item.path)}
            title={isCompact ? item.label : undefined}
            className={cn(
              'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isCompact && 'justify-center px-2',
              active
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
            )}
          >
            <div className={cn('flex items-center gap-3', isCompact && 'gap-0')}>
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCompact && item.label}
            </div>
            {!isCompact &&
              (isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              ))}
          </button>

          {isExpanded && !isCompact && (
            <div className="ml-4 mt-1 space-y-1 border-l border-slate-200 dark:border-slate-700 pl-3">
              {visibleChildren.map((child) => (
                <NavLink
                  key={child.path}
                  to={child.path}
                  end={child.path === '/stock'}
                  onClick={handleNavClick}
                  className={({ isActive: linkActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                      linkActive
                        ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-950 dark:text-blue-300'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                    )
                  }
                >
                  <child.icon className="w-4 h-4" />
                  {child.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.path === '/'}
        onClick={handleNavClick}
        title={isCompact ? item.label : undefined}
        className={({ isActive: linkActive }) =>
          cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isCompact && 'justify-center px-2',
            linkActive
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
          )
        }
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!isCompact && item.label}
      </NavLink>
    )
  }

  return (
    <>
      {/* Backdrop overlay for mobile drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col',
          'fixed inset-y-0 left-0 z-50',
          'transition-[transform,width] duration-200 ease-in-out',
          // Width: full (256px) on mobile+desktop-expanded, 0 on collapsed desktop
          isCompact ? 'w-0' : 'w-64',
          // Translate for the mobile drawer
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          // On desktop, no animation on first mount
          'animate-slide-in-left lg:animate-none'
        )}
        aria-hidden={isCompact}
      >
        {/* Inner wrapper keeps the content full-width while the aside
            animates to w-0; this prevents the "squashed" jank. */}
        <div
          className={cn(
            'w-64 h-full flex flex-col',
            'transition-opacity duration-150',
            isCompact ? 'opacity-0 pointer-events-none' : 'opacity-100'
          )}
        >
          {/* Logo */}
          <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-slate-900 dark:text-white leading-tight">
                ConstructERP
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">v1.0</p>
            </div>
            {/* Close button (mobile only) */}
            <button
              onClick={close}
              className="lg:hidden p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map(renderNavItem)}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              © 2025 Construction ERP
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}

export { SIDEBAR_WIDTH }