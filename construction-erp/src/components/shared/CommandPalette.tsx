import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/store/auth.store'
import {
  LayoutDashboard,
  FolderKanban,
  Package,
  ShoppingCart,
  Truck,
  FileText,
  Building2,
  Users,
  CalendarDays,
  DollarSign,
  BarChart3,
  Settings,
  UserCog,
  Shield,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CommandItem {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string }>
  group: string
  module?: string
  action?: string
  subModule?: string
  roles?: string[]
}

const COMMANDS: CommandItem[] = [
  { label: 'Go to Dashboard', path: '/', icon: LayoutDashboard, group: 'Navigate' },

  { label: 'Projects', path: '/projects', icon: FolderKanban, group: 'Navigate', module: 'projects', action: 'view' },
  { label: 'Inventory', path: '/stock', icon: Package, group: 'Stock', module: 'stock', action: 'view' },
  { label: 'Purchase Orders', path: '/stock/purchase-orders', icon: ShoppingCart, group: 'Stock', module: 'stock', action: 'view', subModule: 'purchase_orders' },
  { label: 'Material Requests', path: '/stock/material-requests', icon: FileText, group: 'Stock', module: 'stock', action: 'view', subModule: 'material_requests' },
  { label: 'Suppliers', path: '/stock/suppliers', icon: Truck, group: 'Stock', module: 'stock', action: 'view', subModule: 'suppliers' },
  { label: 'Warehouses', path: '/stock/warehouses', icon: Building2, group: 'Stock', module: 'stock', action: 'view', subModule: 'warehouses' },

  { label: 'Employees', path: '/employees', icon: Users, group: 'People', module: 'employees', action: 'view' },
  { label: 'Attendance', path: '/hr/attendance', icon: CalendarDays, group: 'HR', module: 'hr', action: 'view', subModule: 'attendance' },
  { label: 'Leave', path: '/hr/leave', icon: FileText, group: 'HR', module: 'hr', action: 'view', subModule: 'leave' },
  { label: 'Payroll', path: '/hr/payroll', icon: DollarSign, group: 'HR', module: 'payroll', action: 'view' },

  { label: 'Reports', path: '/reports', icon: BarChart3, group: 'Navigate', module: 'reports', action: 'view' },

  { label: 'Settings', path: '/settings', icon: Settings, group: 'Settings', roles: ['super_admin', 'admin'] },
  { label: 'Users', path: '/settings/users', icon: UserCog, group: 'Settings', roles: ['super_admin', 'admin'] },
  { label: 'Roles', path: '/settings/roles', icon: Shield, group: 'Settings', roles: ['super_admin', 'admin'] },
  { label: 'Permissions', path: '/settings/permissions', icon: Shield, group: 'Settings', roles: ['super_admin'] },
  { label: 'Company', path: '/settings/company', icon: Building2, group: 'Settings', roles: ['super_admin', 'admin'] },
]

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { hasPermission, isRole } = useAuthStore()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const visibleCommands = useMemo(() => {
    return COMMANDS.filter((c) => {
      if (c.roles && !isRole(c.roles)) return false
      if (c.module && c.action) {
        if (!hasPermission(c.module, c.action, c.subModule)) return false
      }
      return true
    })
  }, [hasPermission, isRole])

  const filtered = useMemo(() => {
    if (!query.trim()) return visibleCommands
    const q = query.toLowerCase()
    return visibleCommands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.path.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q)
    )
  }, [query, visibleCommands])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setSelected(0)
  }, [query])

  const handleSelect = (path: string) => {
    onOpenChange(false)
    navigate(path)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => Math.min(s + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selected]) {
        handleSelect(filtered[selected].path)
      }
    }
  }

  // Group items
  const grouped = filtered.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {} as Record<string, CommandItem[]>)

  let runningIndex = -1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 top-[20%] translate-y-0 animate-scale-in">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No results found
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-2">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {group}
                </div>
                {items.map((item) => {
                  runningIndex++
                  const isActive = runningIndex === selected
                  const Icon = item.icon
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleSelect(item.path)}
                      onMouseEnter={() => setSelected(runningIndex)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left transition-colors',
                        isActive
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {item.path}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">↵</kbd>
              select
            </span>
          </div>
          <span>{filtered.length} results</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}