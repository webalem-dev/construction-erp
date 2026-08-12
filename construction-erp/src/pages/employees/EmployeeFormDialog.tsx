import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { supabase } from '@/lib/supabase'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const employeeSchema = z.object({
  first_name: z.string().min(2, 'First name required'),
  last_name: z.string().min(2, 'Last name required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().min(6, 'Phone required'),
  national_id: z.string().optional(),
  gender: z.string().optional(),
  date_of_birth: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  department_id: z.string().min(1, 'Department required'),
  position_id: z.string().min(1, 'Position required'),
  employment_type: z.string().min(1, 'Employment type required'),
  join_date: z.string().min(1, 'Join date required'),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
})

type EmployeeFormData = z.infer<typeof employeeSchema>

interface Department {
  id: string
  name: string
}

interface Position {
  id: string
  title: string
  department_id: string
}

interface EmployeeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId?: string  // If provided, edit mode
  onSuccess: () => void
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employeeId,
  onSuccess,
}: EmployeeFormDialogProps) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      employment_type: 'FULL_TIME',
      join_date: new Date().toISOString().split('T')[0],
    },
  })

  const selectedDept = watch('department_id')

  // Load departments and positions
  useEffect(() => {
    if (open) {
      loadDepartments()
      loadPositions()
      if (employeeId) {
        loadEmployee(employeeId)
      } else {
        reset({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          employment_type: 'FULL_TIME',
          join_date: new Date().toISOString().split('T')[0],
        })
      }
    }
  }, [open, employeeId])

  const loadDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('id, name')
      .order('name')
    setDepartments(data || [])
  }

  const loadPositions = async () => {
    const { data } = await supabase
      .from('positions')
      .select('id, title, department_id')
      .order('title')
    setPositions(data || [])
  }

  const loadEmployee = async (id: string) => {
    setLoadingData(true)
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      if (data) {
        reset({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email || '',
          phone: data.phone,
          national_id: data.national_id || '',
          gender: data.gender || '',
          date_of_birth: data.date_of_birth || '',
          address: data.address || '',
          city: data.city || '',
          department_id: data.department_id,
          position_id: data.position_id,
          employment_type: data.employment_type,
          join_date: data.join_date,
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || '',
        })
      }
    } catch (error: any) {
      toast.error('Failed to load employee data')
    } finally {
      setLoadingData(false)
    }
  }

  const onSubmit = async (data: EmployeeFormData) => {
    setLoading(true)
    try {
      const payload = {
        ...data,
        email: data.email || null,
        date_of_birth: data.date_of_birth || null,
      }

      if (employeeId) {
        // Update
        const { error } = await supabase
          .from('employees')
          .update(payload)
          .eq('id', employeeId)

        if (error) throw error
        toast.success('Employee updated successfully')
      } else {
        // Create
        const { error } = await supabase
          .from('employees')
          .insert(payload)

        if (error) throw error
        toast.success('Employee created successfully')
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to save employee')
    } finally {
      setLoading(false)
    }
  }

  // Filter positions by selected department
  const filteredPositions = positions.filter(
    p => !selectedDept || p.department_id === selectedDept
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {employeeId ? 'Edit Employee' : 'Add New Employee'}
          </DialogTitle>
          <DialogDescription>
            {employeeId 
              ? 'Update employee information below'
              : 'Fill in the employee details to add them to the system'
            }
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    {...register('first_name')}
                    className={errors.first_name ? 'border-red-500' : ''}
                  />
                  {errors.first_name && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.first_name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    {...register('last_name')}
                    className={errors.last_name ? 'border-red-500' : ''}
                  />
                  {errors.last_name && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.last_name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    {...register('date_of_birth')}
                  />
                </div>

                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={watch('gender')}
                    onValueChange={(val) => setValue('gender', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="national_id">National ID</Label>
                  <Input id="national_id" {...register('national_id')} />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    {...register('phone')}
                    className={errors.phone ? 'border-red-500' : ''}
                  />
                  {errors.phone && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" {...register('address')} />
                </div>

                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" {...register('city')} />
                </div>
              </div>
            </div>

            {/* Employment */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">
                Employment Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department_id">Department *</Label>
                  <Select
                    value={watch('department_id')}
                    onValueChange={(val) => {
                      setValue('department_id', val)
                      setValue('position_id', '')
                    }}
                  >
                    <SelectTrigger className={errors.department_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.department_id && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.department_id.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="position_id">Position *</Label>
                  <Select
                    value={watch('position_id')}
                    onValueChange={(val) => setValue('position_id', val)}
                    disabled={!selectedDept}
                  >
                    <SelectTrigger className={errors.position_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPositions.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.position_id && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.position_id.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="employment_type">Employment Type *</Label>
                  <Select
                    value={watch('employment_type')}
                    onValueChange={(val) => setValue('employment_type', val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_TIME">Full Time</SelectItem>
                      <SelectItem value="PART_TIME">Part Time</SelectItem>
                      <SelectItem value="CONTRACT">Contract</SelectItem>
                      <SelectItem value="DAILY_WAGE">Daily Wage</SelectItem>
                      <SelectItem value="INTERN">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="join_date">Join Date *</Label>
                  <Input
                    id="join_date"
                    type="date"
                    {...register('join_date')}
                    className={errors.join_date ? 'border-red-500' : ''}
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">
                Emergency Contact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergency_contact_name">Contact Name</Label>
                  <Input
                    id="emergency_contact_name"
                    {...register('emergency_contact_name')}
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                  <Input
                    id="emergency_contact_phone"
                    {...register('emergency_contact_phone')}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  employeeId ? 'Update Employee' : 'Create Employee'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}