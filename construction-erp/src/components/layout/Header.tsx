import { useNavigate } from 'react-router-dom'
import {
  Bell,
  LogOut,
  User,
  Settings,
  Menu,
  Sun,
  Moon,
  Keyboard,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/auth.store'
import { useThemeStore } from '@/store/theme.store'
import { useSidebarStore } from '@/store/sidebar.store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getInitials } from '@/lib/utils'

interface HeaderProps {
  onShowShortcuts?: () => void
}

export function Header({ onShowShortcuts }: HeaderProps) {
  const navigate = useNavigate()
  const { profile, logout } = useAuthStore()
  const { theme, toggle: toggleTheme } = useThemeStore()
  const { collapsed, toggleCollapsed, toggle: toggleDrawer } = useSidebarStore()

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Logged out successfully')
      navigate('/login', { replace: true })
    } catch {
      toast.error('Failed to logout')
    }
  }

  if (!profile) return null

  const fullName = `${profile.first_name} ${profile.last_name}`
  const initials = getInitials(profile.first_name, profile.last_name)

  // The hamburger means different things on different breakpoints:
  //  - mobile/tablet (<lg): open/close the slide-in drawer
  //  - desktop (>=lg) and expanded: collapse the sidebar
  //  - desktop (>=lg) and collapsed: re-open it
  const handleHamburger = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      toggleDrawer()
    } else {
      toggleCollapsed()
    }
  }

  // While the mobile drawer is closed AND the sidebar is collapsed on
  // desktop, give the user a way to open it again (the chevron button).
  const showOpenSidebarButton =
    typeof window !== 'undefined' &&
    window.innerWidth >= 1024 &&
    collapsed

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 fixed top-0 right-0 left-0 z-30 transition-colors">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-3">
        {/* Left side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Hamburger — visible on every breakpoint. Acts as drawer
              toggle on mobile/tablet and collapse toggle on desktop. */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleHamburger}
            aria-label="Toggle sidebar"
            title="Toggle sidebar ([)"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Desktop "open sidebar" affordance when collapsed */}
          {showOpenSidebarButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              aria-label="Open sidebar"
              title="Open sidebar"
              className="hidden lg:inline-flex"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </Button>
          )}

          <div className="hidden sm:block">
            <h2 className="text-sm text-slate-500 dark:text-slate-400">
              Welcome back,
            </h2>
            <p className="font-semibold text-slate-900 dark:text-white">
              {profile.first_name}!
            </p>
          </div>
          <div className="sm:hidden">
            <p className="font-semibold text-slate-900 dark:text-white">
              Hi, {profile.first_name}!
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Desktop "collapse sidebar" affordance when expanded */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="hidden lg:inline-flex"
            aria-label={collapsed ? 'Open sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Open sidebar' : 'Collapse sidebar ([)'}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </Button>

          {/* Keyboard shortcuts help */}
          {onShowShortcuts && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onShowShortcuts}
              className="hidden sm:inline-flex"
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="w-5 h-5" />
            </Button>
          )}

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 sm:gap-3 h-auto px-2 sm:px-3 py-2">
                <Avatar className="w-8 h-8">
                  {profile.avatar_url && (
                    <AvatarImage src={profile.avatar_url} alt={fullName} />
                  )}
                  <AvatarFallback className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {fullName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {profile.role?.label}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{fullName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                    {profile.role?.label}
                  </p>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="w-4 h-4 mr-2" />
                My Profile
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}