import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Combine Tailwind classes safely
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

// Format date
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

// Format date time
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

// Get initials from name
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

// Truncate text
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return `${text.substring(0, length)}...`
}

// ============================================
// STATUS / BADGE COLOR HELPERS
// ============================================

/**
 * Get Tailwind classes for status badges (covers ALL app enums)
 */
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    // Projects
    PLANNING: 'bg-gray-100 text-gray-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    ON_HOLD: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',

    // Employees
    ACTIVE: 'bg-green-100 text-green-800',
    ON_LEAVE: 'bg-yellow-100 text-yellow-800',
    SUSPENDED: 'bg-orange-100 text-orange-800',
    TERMINATED: 'bg-red-100 text-red-800',
    RESIGNED: 'bg-gray-100 text-gray-800',

    // Attendance
    PRESENT: 'bg-green-100 text-green-800',
    ABSENT: 'bg-red-100 text-red-800',
    HALF_DAY: 'bg-yellow-100 text-yellow-800',
    LATE: 'bg-orange-100 text-orange-800',
    HOLIDAY: 'bg-purple-100 text-purple-800',
    WEEKEND: 'bg-slate-100 text-slate-800',

    // Leave & Approvals
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',

    // Tasks
    TODO: 'bg-slate-100 text-slate-700',
    IN_REVIEW: 'bg-purple-100 text-purple-700',

    // Material Requests
    PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
    PARTIALLY_ISSUED: 'bg-orange-100 text-orange-800',
    ISSUED: 'bg-green-100 text-green-800',

    // Purchase Orders
    ORDERED: 'bg-purple-100 text-purple-800',
    PARTIALLY_RECEIVED: 'bg-orange-100 text-orange-800',
    RECEIVED: 'bg-green-100 text-green-800',

    // Payroll Periods
    DRAFT: 'bg-gray-100 text-gray-800',
    PROCESSING: 'bg-blue-100 text-blue-800',
    PROCESSED: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-emerald-100 text-emerald-800',

    // Payslip
    CONFIRMED: 'bg-blue-100 text-blue-800',
  }
  return statusColors[status] || 'bg-gray-100 text-gray-800'
}

/**
 * Get Tailwind classes for priority badges
 */
export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    LOW: 'bg-slate-100 text-slate-700',
    MEDIUM: 'bg-blue-100 text-blue-700',
    HIGH: 'bg-orange-100 text-orange-700',
    CRITICAL: 'bg-red-100 text-red-700',
  }
  return colors[priority] || 'bg-gray-100 text-gray-800'
}

/**
 * Get solid background color for attendance/status dot (single color)
 */
export function getStatusDotColor(status: string): string {
  const colors: Record<string, string> = {
    PRESENT: 'bg-green-500',
    ABSENT: 'bg-red-500',
    HALF_DAY: 'bg-yellow-500',
    LATE: 'bg-orange-500',
    ON_LEAVE: 'bg-blue-500',
    HOLIDAY: 'bg-purple-500',
    WEEKEND: 'bg-slate-400',
  }
  return colors[status] || 'bg-slate-300'
}

// ============================================
// LABEL FORMATTERS
// ============================================

/**
 * Convert ENUM_LIKE_THIS → "Enum Like This"
 */
export function formatEnum(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Convert employment type enum to readable label
 */
export function getEmploymentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    FULL_TIME: 'Full Time',
    PART_TIME: 'Part Time',
    CONTRACT: 'Contract',
    DAILY_WAGE: 'Daily Wage',
    INTERN: 'Intern',
  }
  return labels[type] || type
}