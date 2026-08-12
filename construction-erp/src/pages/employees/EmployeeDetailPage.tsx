import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  User,
  Building2,
  Shield,
  Loader2,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { getInitials, formatDate, getStatusColor, formatEnum } from '@/lib/utils'
import { PermissionGate } from '@/components/shared/PermissionGate'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

import { EmployeeFormDialog } from './EmployeeFormDialog'

interface EmployeeDetail {
  id: string
  employee_code: string
  first_name: string
  last_name: string
  date_of_birth: string | null
  gender: string | null
  national_id: string | null
  email: string | null
  phone: string
  address: string | null
  city: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relation: string | null
  employment_type: string
  join_date: string
  end_date: string | null
  status: string
  photo_url: string | null
  created_at: string
  department: {
    id: string
    name: string
  }
  position: {
    id: string
    title: string
  }
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    if (id) fetchEmployee()
  }, [id])

  const fetchEmployee = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          department:departments (id, name),
          position:positions (id, title)
        `)
        .eq('id', id!)
        .single()

      if (error) throw error
      setEmployee(data as any)
    } catch (error: any) {
      toast.error('Failed to load employee')
      navigate('/employees')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id!)

      if (error) throw error
      toast.success('Employee deleted successfully')
      navigate('/employees')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete employee')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!employee) return null

  const fullName = `${employee.first_name} ${employee.last_name}`

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => navigate('/employees')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Employees
      </Button>

      {/* Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <Avatar className="w-20 h-20">
                {employee.photo_url && <AvatarImage src={employee.photo_url} />}
                <AvatarFallback className="bg-blue-100 text-blue-700 text-2xl font-bold">
                  {getInitials(employee.first_name, employee.last_name)}
                </AvatarFallback>
              </Avatar>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
                <p className="text-slate-600 mt-1">{employee.position?.title}</p>
                <p className="text-sm text-slate-500">{employee.department?.name}</p>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Badge variant="outline">{employee.employee_code}</Badge>
                  <Badge className={getStatusColor(employee.status)}>
                    {formatEnum(employee.status)}
                  </Badge>
                  <Badge variant="secondary">
                    {formatEnum(employee.employment_type)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <PermissionGate module="employees" action="edit">
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </PermissionGate>

              <PermissionGate module="employees" action="delete">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Employee?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete {fullName}'s record.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete Employee
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </PermissionGate>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Full Name" value={fullName} />
            <InfoRow label="Gender" value={employee.gender || 'Not specified'} />
            <InfoRow
              label="Date of Birth"
              value={employee.date_of_birth ? formatDate(employee.date_of_birth) : 'Not specified'}
            />
            <InfoRow label="National ID" value={employee.national_id || 'Not specified'} />
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Phone className="w-5 h-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              icon={<Mail className="w-4 h-4" />}
              label="Email"
              value={employee.email || 'Not specified'}
            />
            <InfoRow
              icon={<Phone className="w-4 h-4" />}
              label="Phone"
              value={employee.phone}
            />
            <InfoRow
              icon={<MapPin className="w-4 h-4" />}
              label="Address"
              value={employee.address || 'Not specified'}
            />
            <InfoRow label="City" value={employee.city || 'Not specified'} />
          </CardContent>
        </Card>

        {/* Employment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="w-5 h-5" />
              Employment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              icon={<Building2 className="w-4 h-4" />}
              label="Department"
              value={employee.department?.name}
            />
            <InfoRow
              icon={<Shield className="w-4 h-4" />}
              label="Position"
              value={employee.position?.title}
            />
            <InfoRow label="Employment Type" value={formatEnum(employee.employment_type)} />
            <InfoRow
              icon={<Calendar className="w-4 h-4" />}
              label="Join Date"
              value={formatDate(employee.join_date)}
            />
            {employee.end_date && (
              <InfoRow label="End Date" value={formatDate(employee.end_date)} />
            )}
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5" />
              Emergency Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              label="Contact Name"
              value={employee.emergency_contact_name || 'Not specified'}
            />
            <InfoRow
              label="Contact Phone"
              value={employee.emergency_contact_phone || 'Not specified'}
            />
            <InfoRow
              label="Relationship"
              value={employee.emergency_contact_relation || 'Not specified'}
            />
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <EmployeeFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        employeeId={employee.id}
        onSuccess={fetchEmployee}
      />
    </div>
  )
}

// Helper component for info rows
function InfoRow({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      {icon && <div className="text-slate-400 mt-0.5">{icon}</div>}
      <div className="flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  )
}