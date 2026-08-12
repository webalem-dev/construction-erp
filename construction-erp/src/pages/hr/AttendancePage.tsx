import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Loader2,
  Search,
  CheckCircle2,
  Save,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import {
  formatDate,
  getInitials,
  getStatusDotColor,
  formatEnum,
} from '@/lib/utils'
import { PermissionGate } from '@/components/shared/PermissionGate'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface Employee {
  id: string
  employee_code: string
  first_name: string
  last_name: string
  status: string
}

interface AttendanceRecord {
  id?: string
  employee_id: string
  date: string
  status: string
  work_hours?: number
  notes?: string
}

export default function AttendancePage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [attendance, setAttendance] = useState<Map<string, AttendanceRecord>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  const fetchData = async () => {
    try {
      setLoading(true)

      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id, employee_code, first_name, last_name, status')
        .eq('status', 'ACTIVE')
        .order('first_name')

      if (empError) throw empError
      setEmployees(empData || [])

      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', selectedDate)

      if (attError) throw attError

      const attMap = new Map<string, AttendanceRecord>()
      attData?.forEach(record => {
        attMap.set(record.employee_id, record)
      })
      setAttendance(attMap)
    } catch (error: any) {
      toast.error(error.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const setEmployeeStatus = (employeeId: string, status: string) => {
    const newMap = new Map(attendance)
    const existing = newMap.get(employeeId) || {
      employee_id: employeeId,
      date: selectedDate,
      status: 'PRESENT',
    }
    newMap.set(employeeId, {
      ...existing,
      status,
      work_hours: status === 'PRESENT' ? 8 : status === 'HALF_DAY' ? 4 : 0,
    })
    setAttendance(newMap)
  }

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      const records = Array.from(attendance.values())

      const { error } = await supabase
        .from('attendance')
        .upsert(
          records.map(r => ({
            employee_id: r.employee_id,
            date: r.date,
            status: r.status,
            work_hours: r.work_hours,
            check_in: r.status === 'PRESENT'
              ? `${selectedDate}T08:00:00Z`
              : null,
            check_out: r.status === 'PRESENT'
              ? `${selectedDate}T17:00:00Z`
              : null,
          })),
          { onConflict: 'employee_id,date' }
        )

      if (error) throw error
      toast.success(`Saved attendance for ${records.length} employees`)
      await fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const markAllPresent = () => {
    const newMap = new Map<string, AttendanceRecord>()
    employees.forEach(emp => {
      newMap.set(emp.id, {
        employee_id: emp.id,
        date: selectedDate,
        status: 'PRESENT',
        work_hours: 8,
      })
    })
    setAttendance(newMap)
    toast.info('All employees marked present. Click Save to confirm.')
  }

  const filteredEmployees = employees.filter(emp => {
    const search = searchTerm.toLowerCase()
    return (
      emp.first_name.toLowerCase().includes(search) ||
      emp.last_name.toLowerCase().includes(search) ||
      emp.employee_code.toLowerCase().includes(search)
    )
  })

  const stats = {
    total: employees.length,
    marked: attendance.size,
    present: Array.from(attendance.values()).filter(a => a.status === 'PRESENT').length,
    absent: Array.from(attendance.values()).filter(a => a.status === 'ABSENT').length,
    onLeave: Array.from(attendance.values()).filter(a => a.status === 'ON_LEAVE').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Attendance</h1>
          <p className="text-slate-600 mt-1">
            Track and manage employee attendance
          </p>
        </div>
        <PermissionGate module="hr" action="create" subModule="attendance">
          <Button onClick={handleSaveAll} disabled={saving || attendance.size === 0}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save All ({attendance.size})
              </>
            )}
          </Button>
        </PermissionGate>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-600">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-600">Marked</p>
            <p className="text-2xl font-bold text-blue-600">{stats.marked}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-600">Present</p>
            <p className="text-2xl font-bold text-green-600">{stats.present}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-600">Absent</p>
            <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-600">On Leave</p>
            <p className="text-2xl font-bold text-purple-600">{stats.onLeave}</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full sm:w-44"
                />
              </div>
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <PermissionGate module="hr" action="create" subModule="attendance">
              <Button variant="outline" onClick={markAllPresent}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark All Present
              </Button>
            </PermissionGate>
          </div>
        </CardContent>
      </Card>

      {/* Attendance List */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b bg-slate-50">
              <p className="text-sm font-medium text-slate-700">
                📅 {formatDate(selectedDate)}
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredEmployees.map(employee => {
                const record = attendance.get(employee.id)
                const currentStatus = record?.status || null

                return (
                  <div
                    key={employee.id}
                    className="flex flex-col md:flex-row md:items-center gap-4 p-4 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar>
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                          {getInitials(employee.first_name, employee.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-slate-900">
                          {employee.first_name} {employee.last_name}
                        </p>
                        <p className="text-xs text-slate-500">{employee.employee_code}</p>
                      </div>
                    </div>

                    <PermissionGate
                      module="hr"
                      action="create"
                      subModule="attendance"
                      fallback={
                        currentStatus ? (
                          <Badge className={`${getStatusDotColor(currentStatus)} text-white`}>
                            {formatEnum(currentStatus)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">Not marked</span>
                        )
                      }
                    >
                      <div className="flex flex-wrap gap-2">
                        {['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'ON_LEAVE'].map(status => (
                          <Button
                            key={status}
                            size="sm"
                            variant={currentStatus === status ? 'default' : 'outline'}
                            onClick={() => setEmployeeStatus(employee.id, status)}
                            className={
                              currentStatus === status
                                ? `${getStatusDotColor(status)} hover:opacity-90`
                                : ''
                            }
                          >
                            {formatEnum(status)}
                          </Button>
                        ))}
                      </div>
                    </PermissionGate>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}