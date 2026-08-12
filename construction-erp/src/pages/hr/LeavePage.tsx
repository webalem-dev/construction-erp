import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  FileText,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { formatDate, getInitials, getStatusColor } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { PermissionGate } from '@/components/shared/PermissionGate'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

interface LeaveRequest {
  id: string
  start_date: string
  end_date: string
  total_days: number
  reason: string | null
  status: string
  rejection_reason: string | null
  created_at: string
  employee: {
    id: string
    employee_code: string
    first_name: string
    last_name: string
  }
  leave_type: {
    id: string
    name: string
    code: string
    is_paid: boolean
  }
}

interface LeaveType {
  id: string
  name: string
  code: string
  default_days: number
}

interface Employee {
  id: string
  first_name: string
  last_name: string
}

export default function LeavePage() {
  const { profile } = useAuthStore()
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [tab, setTab] = useState('all')

  const [formEmployee, setFormEmployee] = useState('')
  const [formLeaveType, setFormLeaveType] = useState('')
  const [formStartDate, setFormStartDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formReason, setFormReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      const { data: reqData } = await supabase
        .from('leave_requests')
        .select(`
          *,
          employee:employees (id, employee_code, first_name, last_name),
          leave_type:leave_types (id, name, code, is_paid)
        `)
        .order('created_at', { ascending: false })

      setRequests((reqData as any) || [])

      const { data: typesData } = await supabase
        .from('leave_types')
        .select('*')
        .eq('is_active', true)
        .order('name')

      setLeaveTypes(typesData || [])

      const { data: empData } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .eq('status', 'ACTIVE')
        .order('first_name')

      setEmployees(empData || [])
    } catch (error: any) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const calculateDays = () => {
    if (!formStartDate || !formEndDate) return 0
    const start = new Date(formStartDate)
    const end = new Date(formEndDate)
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return diff > 0 ? diff : 0
  }

  const handleSubmit = async () => {
    if (!formEmployee || !formLeaveType || !formStartDate || !formEndDate) {
      toast.error('Please fill all required fields')
      return
    }

    setSubmitting(true)
    try {
      const days = calculateDays()
      if (days <= 0) {
        toast.error('End date must be after start date')
        return
      }

      const { error } = await supabase
        .from('leave_requests')
        .insert({
          employee_id: formEmployee,
          leave_type_id: formLeaveType,
          start_date: formStartDate,
          end_date: formEndDate,
          total_days: days,
          reason: formReason || null,
          status: 'PENDING',
        })

      if (error) throw error
      toast.success('Leave request submitted')
      setDialogOpen(false)
      resetForm()
      fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormEmployee('')
    setFormLeaveType('')
    setFormStartDate('')
    setFormEndDate('')
    setFormReason('')
  }

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'APPROVED',
          approved_by_id: profile?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error
      toast.success('Leave approved')
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'REJECTED',
          approved_by_id: profile?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: 'Rejected by manager',
        })
        .eq('id', id)

      if (error) throw error
      toast.success('Leave rejected')
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const filteredRequests = requests.filter(r => {
    if (tab === 'all') return true
    if (tab === 'pending') return r.status === 'PENDING'
    if (tab === 'approved') return r.status === 'APPROVED'
    if (tab === 'rejected') return r.status === 'REJECTED'
    return true
  })

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'PENDING').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    rejected: requests.filter(r => r.status === 'REJECTED').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Leave Management</h1>
          <p className="text-slate-600 mt-1">
            Manage employee leave requests and approvals
          </p>
        </div>
        <PermissionGate module="hr" action="create" subModule="leave">
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </PermissionGate>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-yellow-500 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-500 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Requests */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({stats.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({stats.rejected})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-3 mt-4">
          {loading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              </CardContent>
            </Card>
          ) : filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">No leave requests found</p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map(request => (
              <Card key={request.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar>
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                          {getInitials(request.employee.first_name, request.employee.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">
                          {request.employee.first_name} {request.employee.last_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {request.employee.employee_code}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{request.leave_type.name}</Badge>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                        {request.leave_type.is_paid && (
                          <Badge className="bg-purple-100 text-purple-800">Paid</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {formatDate(request.start_date)} → {formatDate(request.end_date)}
                        <span className="ml-2 font-semibold text-slate-900">
                          ({request.total_days} days)
                        </span>
                      </p>
                      {request.reason && (
                        <p className="text-xs text-slate-500 italic mt-1">
                          "{request.reason}"
                        </p>
                      )}
                    </div>

                    {request.status === 'PENDING' && (
                      <PermissionGate module="hr" action="approve" subModule="leave">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(request.id)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(request.id)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                        </div>
                      </PermissionGate>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* New Leave Request Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Leave Request</DialogTitle>
            <DialogDescription>
              Fill in the details to submit a leave request
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Employee *</Label>
              <Select value={formEmployee} onValueChange={setFormEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.first_name} {e.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Leave Type *</Label>
              <Select value={formLeaveType} onValueChange={setFormLeaveType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.default_days} days/year)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                />
              </div>
            </div>

            {formStartDate && formEndDate && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  Total Days: {calculateDays()}
                </p>
              </div>
            )}

            <div>
              <Label>Reason</Label>
              <Input
                placeholder="Optional reason for leave..."
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}