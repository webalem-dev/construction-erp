import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ShortcutsHelpProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], description: 'Open command palette' },
  { keys: ['?'], description: 'Show this shortcuts help' },
  { keys: ['Esc'], description: 'Close any open dialog or drawer' },
  { keys: ['['], description: 'Toggle sidebar (collapse on desktop)' },
  { keys: ['G', 'D'], description: 'Go to Dashboard' },
  { keys: ['G', 'P'], description: 'Go to Projects' },
  { keys: ['G', 'S'], description: 'Go to Stock' },
  { keys: ['G', 'E'], description: 'Go to Employees' },
  { keys: ['G', 'H'], description: 'Go to HR Attendance' },
  { keys: ['G', 'L'], description: 'Go to HR Leave' },
  { keys: ['G', 'Y'], description: 'Go to Payroll' },
  { keys: ['G', 'R'], description: 'Go to Reports' },
  { keys: ['G', 'U'], description: 'Go to Users' },
  { keys: ['G', 'O'], description: 'Go to Roles' },
  { keys: ['G', 'M'], description: 'Go to Permissions' },
  { keys: ['G', 'C'], description: 'Go to Company' },
]

export function ShortcutsHelp({ open, onOpenChange }: ShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Navigate faster with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 max-h-96 overflow-y-auto">
          {SHORTCUTS.map((shortcut, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, j) => (
                  <span key={j} className="flex items-center">
                    <kbd className="px-2 py-0.5 text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                      {key}
                    </kbd>
                    {j < shortcut.keys.length - 1 && (
                      <span className="mx-1 text-slate-400">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}