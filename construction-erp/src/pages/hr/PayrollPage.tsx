import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  DollarSign,
  Plus,
  Loader2,
  Play,
  CheckCircle2,
  Users,
  TrendingUp,
  Calendar,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, getInitials, getStatusColor } from '@/lib/utils'
import { PermissionGate } from '@/components/shared/PermissionGate'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface PayrollPeriod {
  id: string
  month: number
  year: number
  start_date: string
  end_date: string
  status: string
  total_gross: number
  total_deductions: number
  total_net: number
  processed_at: string | null
  approved_at: string | null
}

interface PayrollRecord {
  id: string
  present_days: number
  absent_days: number
  leave_days: number
  overtime_hours: number
  basic_salary: number
  gross_salary: number
  total_deductions: number
  net_salary: number
  status: string
  employee: {
    id: string
    employee_code: string
    first_name: string
    last_name: string
    position: { title: string }
  }
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function PayrollPage() {
  const navigate = useNavigate()
  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [createDialog, setCreateDialog] = useState(false)
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1)
  const [newYear, setNewYear] = useState(new Date().getFullYear())

  useEffect(() => {
    fetchPeriods()
  }, [])

  useEffect(() => {
    if (selectedPeriodId) fetchRecords(selectedPeriodId)
  }, [selectedPeriodId])

  const fetchPeriods = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false })

      if (error) throw error
      setPeriods(data || [])
      if (data && data.length > 0 && !selectedPeriodId) {
        setSelectedPeriodId(data[0].id)
      }
    } catch (error: any) {
      toast.error('Failed to load payroll periods')
    } finally {
      setLoading(false)
    }
  }

  const fetchRecords = async (periodId: string) => {
    try {
      const { data, error } = await supabase
        .from('payroll_records')
        .select(`
          *,
          employee:employees (
            id, employee_code, first_name, last_name,
            position:positions (title)
          )
        `)
        .eq('payroll_period_id', periodId)
        .order('employee(first_name)')

      if (error) throw error
      setRecords((data as any) || [])
    } catch (error: any) {
      toast.error('Failed to load records')
    }
  }

  const handleCreatePeriod = async () => {
    try {
      const startDate = new Date(newYear, newMonth - 1, 1)
      const endDate = new Date(newYear, newMonth, 0)

      const { error } = await supabase
        .from('payroll_periods')
        .insert({
          month: newMonth,
          year: newYear,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          status: 'DRAFT',
        })

      if (error) throw error
      toast.success('Payroll period created')
      setCreateDialog(false)
      fetchPeriods()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create period')
    }
  }

  const handleProcessPayroll = async () => {
    if (!selectedPeriodId) return

    setProcessing(true)
    try {
      const { data, error } = await supabase.rpc('process_payroll', {
        p_period_id: selectedPeriodId,
      })

      if (error) throw error
      toast.success(`Processed payroll for ${data} employees`)
      fetchPeriods()
      fetchRecords(selectedPeriodId)
    } catch (error: any) {
      toast.error(error.message || 'Failed to process payroll')
    } finally {
      setProcessing(false)
    }
  }

  const handleApprovePeriod = async () => {
    try {
      const { error } = await supabase
        .from('payroll_periods')
        .update({
          status: 'APPROVED',
          approved_at: new Date().toISOString(),
        })
        .eq('id', selectedPeriodId)

      if (error) throw error
      toast.success('Payroll approved')
      fetchPeriods()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const selectedPeriod = periods.find(p => p.id === selectedPeriodId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Payroll</h1>
          <p className="text-slate-600 mt-1">
            Process and manage employee payroll
          </p>
        </div>
        <PermissionGate module="payroll" action="create">
          <Button onClick={() => setCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Period
          </Button>
        </PermissionGate>
      </div>

      {/* Period Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Label className="text-sm font-medium">Period:</Label>
              <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {MONTH_NAMES[p.month - 1]} {p.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPeriod && (
                <Badge className={getStatusColor(selectedPeriod.status)}>
                  {selectedPeriod.status}
                </Badge>
              )}
            </div>

            {selectedPeriod && (
              <div className="flex gap-2">
                {selectedPeriod.status === 'DRAFT' && (
                  <PermissionGate module="payroll" action="create">
                    <Button onClick={handleProcessPayroll} disabled={processing}>
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Process Payroll
                        </>
                      )}
                    </Button>
                  </PermissionGate>
                )}
                {selectedPeriod.status === 'PROCESSED' && (
                  <PermissionGate module="payroll" action="approve">
                    <Button onClick={handleApprovePeriod}>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </PermissionGate>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {selectedPeriod && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Employees</p>
                  <p className="text-2xl font-bold">{records.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Gross</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(Number(selectedPeriod.total_gross))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-red-500 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Deductions</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(Number(selectedPeriod.total_deductions))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Net</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(Number(selectedPeriod.total_net))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Period Info */}
      {selectedPeriod && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {MONTH_NAMES[selectedPeriod.month - 1]} {selectedPeriod.year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-600">
              Period: {formatDate(selectedPeriod.start_date)} → {formatDate(selectedPeriod.end_date)}
            </div>
            {selectedPeriod.processed_at && (
              <div className="text-sm text-slate-500 mt-1">
                Processed: {formatDate(selectedPeriod.processed_at)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payroll Records */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          </CardContent>
        </Card>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">
              {selectedPeriod?.status === 'DRAFT'
                ? 'Click "Process Payroll" to calculate salaries for this period'
                : 'No payroll records found'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Employee</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-slate-500 uppercase">Present</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-slate-500 uppercase">Absent</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-slate-500 uppercase">Leave</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase">Basic</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase">Gross</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase">Deductions</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase">Net Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map(record => (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => navigate(`/hr/payslip/${record.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                              {getInitials(record.employee.first_name, record.employee.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {record.employee.first_name} {record.employee.last_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {record.employee.employee_code}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-green-600 font-semibold">
                        {record.present_days}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-red-600 font-semibold">
                        {record.absent_days}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-blue-600 font-semibold">
                        {record.leave_days}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        {formatCurrency(Number(record.basic_salary))}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        {formatCurrency(Number(record.gross_salary))}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-red-600">
                        -{formatCurrency(Number(record.total_deductions))}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-green-700">
                        {formatCurrency(Number(record.net_salary))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Period Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Payroll Period</DialogTitle>
            <DialogDescription>
              Create a new payroll period for a specific month
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Month</Label>
              <Select value={String(newMonth)} onValueChange={(v) => setNewMonth(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Year</Label>
              <Select value={String(newYear)} onValueChange={(v) => setNewYear(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePeriod}>
              Create Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}