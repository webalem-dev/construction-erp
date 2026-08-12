import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  DollarSign,
  Loader2,
  Calendar,
  User,
  Building2,
  Briefcase,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, getStatusColor, formatEnum } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface PayslipDetail {
  id: string
  present_days: number
  absent_days: number
  leave_days: number
  overtime_hours: number
  basic_salary: number
  overtime_pay: number
  allowances: number
  bonuses: number
  gross_salary: number
  tax_deduction: number
  insurance_deduction: number
  loan_deduction: number
  other_deductions: number
  total_deductions: number
  net_salary: number
  status: string
  payroll_period: {
    month: number
    year: number
    start_date: string
    end_date: string
    status: string
    approved_at: string | null
  }
  employee: {
    id: string
    employee_code: string
    first_name: string
    last_name: string
    email: string | null
    department: { name: string }
    position: { title: string }
  }
}

export default function PayslipDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [payslip, setPayslip] = useState<PayslipDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) fetchPayslip()
  }, [id])

  const fetchPayslip = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('payroll_records')
        .select(`
          *,
          payroll_period:payroll_periods (month, year, start_date, end_date, status, approved_at),
          employee:employees (
            id, employee_code, first_name, last_name, email,
            department:departments (name),
            position:positions (title)
          )
        `)
        .eq('id', id!)
        .single()
      if (error) throw error
      setPayslip(data as any)
    } catch (error: any) {
      toast.error('Failed to load payslip')
      navigate('/hr/payroll')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!payslip) return null

  const period = payslip.payroll_period
  const emp = payslip.employee
  const fullName = `${emp.first_name} ${emp.last_name}`

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => navigate('/hr/payroll')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Payroll
      </Button>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-slate-500">Payslip for</p>
              <h1 className="text-3xl font-bold text-slate-900">
                {MONTH_NAMES[period.month - 1]} {period.year}
              </h1>
              <p className="text-slate-600 mt-1">
                Period: {formatDate(period.start_date)} → {formatDate(period.end_date)}
              </p>
              <div className="mt-3">
                <Badge className={getStatusColor(payslip.status)}>
                  {formatEnum(payslip.status)}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Net Pay</p>
              <p className="text-4xl font-bold text-green-700">
                {formatCurrency(Number(payslip.net_salary))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Info */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold text-lg mb-4">Employee</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Name</p>
                <p className="font-medium">{fullName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Briefcase className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Position</p>
                <p className="font-medium">{emp.position?.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Department</p>
                <p className="font-medium">{emp.department?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 flex items-center justify-center text-slate-400 font-bold text-xs">#</span>
              <div>
                <p className="text-xs text-slate-500">Employee Code</p>
                <p className="font-medium">{emp.employee_code}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Attendance
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-slate-600">Present Days</p>
              <p className="text-2xl font-bold text-green-700">{payslip.present_days}</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-slate-600">Absent Days</p>
              <p className="text-2xl font-bold text-red-700">{payslip.absent_days}</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-slate-600">Leave Days</p>
              <p className="text-2xl font-bold text-blue-700">{payslip.leave_days}</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-xs text-slate-600">Overtime Hours</p>
              <p className="text-2xl font-bold text-orange-700">
                {payslip.overtime_hours ?? 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earnings */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Earnings
          </h2>
          <div className="space-y-2">
            <Row label="Basic Salary" value={Number(payslip.basic_salary)} />
            <Row label="Overtime Pay" value={Number(payslip.overtime_pay ?? 0)} />
            <Row label="Allowances" value={Number(payslip.allowances ?? 0)} />
            <Row label="Bonuses" value={Number(payslip.bonuses ?? 0)} />
            <div className="pt-3 mt-3 border-t">
              <Row
                label="Gross Salary"
                value={Number(payslip.gross_salary)}
                bold
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deductions */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Deductions
          </h2>
          <div className="space-y-2">
            <Row label="Tax" value={-Number(payslip.tax_deduction ?? 0)} />
            <Row label="Insurance" value={-Number(payslip.insurance_deduction ?? 0)} />
            <Row label="Loans" value={-Number(payslip.loan_deduction ?? 0)} />
            <Row label="Other" value={-Number(payslip.other_deductions ?? 0)} />
            <div className="pt-3 mt-3 border-t">
              <Row
                label="Total Deductions"
                value={-Number(payslip.total_deductions)}
                bold
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Net Pay */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Net Pay</p>
                <p className="text-xs text-slate-500">Take-home amount</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-green-700">
              {formatCurrency(Number(payslip.net_salary))}
            </p>
          </div>
        </CardContent>
      </Card>

      {period.approved_at && (
        <p className="text-xs text-slate-500 text-center">
          Approved on {formatDate(period.approved_at)}
        </p>
      )}
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className={bold ? 'font-semibold' : 'text-sm text-slate-600'}>{label}</span>
      <span className={bold ? 'font-bold text-lg' : 'font-medium'}>
        {value < 0 ? '-' : ''}
        {formatCurrency(Math.abs(value))}
      </span>
    </div>
  )
}