import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Users as UsersIcon,
  Loader2,
  Mail,
  Phone,
  Briefcase,
  Filter,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import {
  getInitials,
  formatDate,
  getStatusColor,
  getEmploymentTypeLabel,
} from '@/lib/utils'
import { PermissionGate } from '@/components/shared/PermissionGate'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { EmployeeFormDialog } from './EmployeeFormDialog'

interface Employee {
  id: string
  employee_code: string
  first_name: string
  last_name: string
  email: string | null
  phone: string
  employment_type: string
  status: string
  join_date: string
  photo_url: string | null
  department: {
    id: string
    name: string
  }
  position: {
    id: string
    title: string
  }
}

interface Department {
  id: string
  name: string
}

export default function EmployeesPage() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDept, setFilterDept] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    fetchEmployees()
    fetchDepartments()
  }, [])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          department:departments (id, name),
          position:positions (id, title)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setEmployees((data as any) || [])
    } catch (error: any) {
      toast.error(error.message || 'Failed to load employees')
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('id, name')
      .order('name')
    setDepartments(data || [])
  }

  const filteredEmployees = employees.filter(emp => {
    const search = searchTerm.toLowerCase()
    const matchesSearch =
      emp.first_name.toLowerCase().includes(search) ||
      emp.last_name.toLowerCase().includes(search) ||
      emp.employee_code.toLowerCase().includes(search) ||
      emp.email?.toLowerCase().includes(search)

    const matchesDept = filterDept === 'all' || emp.department?.id === filterDept
    const matchesStatus = filterStatus === 'all' || emp.status === filterStatus

    return matchesSearch && matchesDept && matchesStatus
  })

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.status === 'ACTIVE').length,
    onLeave: employees.filter(e => e.status === 'ON_LEAVE').length,
    departments: new Set(employees.map(e => e.department?.id)).size,
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Employees</h1>
          <p className="text-slate-600 mt-1">
            Manage your workforce and employee information
          </p>
        </div>
        <PermissionGate module="employees" action="create">
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </PermissionGate>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
                <UsersIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Employees</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-yellow-500 flex items-center justify-center">
                <Filter className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">On Leave</p>
                <p className="text-2xl font-bold">{stats.onLeave}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Departments</p>
                <p className="text-2xl font-bold">{stats.departments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name, code, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="TERMINATED">Terminated</SelectItem>
                <SelectItem value="RESIGNED">Resigned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employees Grid */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-slate-600">Loading employees...</p>
          </CardContent>
        </Card>
      ) : filteredEmployees.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <UsersIcon className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No employees found</p>
            <p className="text-sm text-slate-500 mt-1">
              {employees.length === 0
                ? 'Add your first employee to get started'
                : 'Try adjusting your filters'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map(employee => (
            <Card
              key={employee.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/employees/${employee.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-14 h-14">
                    {employee.photo_url && <AvatarImage src={employee.photo_url} />}
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                      {getInitials(employee.first_name, employee.last_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {employee.first_name} {employee.last_name}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {employee.employee_code}
                        </p>
                      </div>
                      <Badge className={getStatusColor(employee.status)}>
                        {employee.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-1.5 text-sm">
                      <p className="text-slate-700 font-medium">
                        {employee.position?.title}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {employee.department?.name}
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                      {employee.email && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{employee.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Phone className="w-3 h-3" />
                        {employee.phone}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Briefcase className="w-3 h-3" />
                        {getEmploymentTypeLabel(employee.employment_type)}
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-500">
                      Joined {formatDate(employee.join_date)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Employee Form Dialog */}
      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchEmployees}
      />
    </div>
  )
}