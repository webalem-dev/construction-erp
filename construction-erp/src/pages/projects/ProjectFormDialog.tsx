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
import { Textarea } from '@/components/ui/textarea'
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

const projectSchema = z.object({
  code: z.string().min(2, 'Project code required'),
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  description: z.string().optional(),
  client_name: z.string().min(2, 'Client name required'),
  client_contact: z.string().optional(),
  client_email: z.string().email('Invalid email').optional().or(z.literal('')),
  status: z.string().min(1, 'Status required'),
  priority: z.string().min(1, 'Priority required'),
  category: z.string().optional(),
  start_date: z.string().min(1, 'Start date required'),
  expected_end_date: z.string().min(1, 'Expected end date required'),
  address: z.string().optional(),
  city: z.string().optional(),
  estimated_budget: z.coerce.number().min(0, 'Budget must be positive'),
  manager_id: z.string().optional(),
})

type ProjectFormData = z.infer<typeof projectSchema>

interface Employee {
  id: string
  first_name: string
  last_name: string
}

interface ProjectFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId?: string // If provided, edit mode
  onSuccess: () => void
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: ProjectFormDialogProps) {
  const [managers, setManagers] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      client_name: '',
      client_contact: '',
      client_email: '',
      status: 'PLANNING',
      priority: 'MEDIUM',
      category: '',
      start_date: new Date().toISOString().split('T')[0],
      expected_end_date: '',
      address: '',
      city: '',
      estimated_budget: 0,
      manager_id: '',
    },
  })

  // Load managers and project data on open
  useEffect(() => {
    if (open) {
      loadManagers()
      if (projectId) {
        loadProject(projectId)
      } else {
        reset({
          code: '',
          name: '',
          description: '',
          client_name: '',
          client_contact: '',
          client_email: '',
          status: 'PLANNING',
          priority: 'MEDIUM',
          category: '',
          start_date: new Date().toISOString().split('T')[0],
          expected_end_date: '',
          address: '',
          city: '',
          estimated_budget: 0,
          manager_id: '',
        })
      }
    }
  }, [open, projectId])

  const loadManagers = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('is_active', true)
      .order('first_name')
    setManagers(data || [])
  }

  const loadProject = async (id: string) => {
    setLoadingData(true)
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      if (data) {
        reset({
          code: data.code,
          name: data.name,
          description: data.description || '',
          client_name: data.client_name,
          client_contact: data.client_contact || '',
          client_email: data.client_email || '',
          status: data.status,
          priority: data.priority,
          category: data.category || '',
          start_date: data.start_date,
          expected_end_date: data.expected_end_date,
          address: data.address || '',
          city: data.city || '',
          estimated_budget: Number(data.estimated_budget),
          manager_id: data.manager_id || '',
        })
      }
    } catch (error: any) {
      toast.error('Failed to load project data')
    } finally {
      setLoadingData(false)
    }
  }

  const onSubmit = async (data: ProjectFormData) => {
    setLoading(true)
    try {
      const payload = {
        ...data,
        client_email: data.client_email || null,
        description: data.description || null,
        client_contact: data.client_contact || null,
        category: data.category || null,
        address: data.address || null,
        city: data.city || null,
        manager_id: data.manager_id || null,
        actual_cost: 0,
      }

      if (projectId) {
        // Update
        const { error } = await supabase
          .from('projects')
          .update(payload)
          .eq('id', projectId)

        if (error) throw error
        toast.success('Project updated successfully')
      } else {
        // Create
        const { error } = await supabase
          .from('projects')
          .insert(payload)

        if (error) throw error
        toast.success('Project created successfully')
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to save project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {projectId ? 'Edit Project' : 'Create New Project'}
          </DialogTitle>
          <DialogDescription>
            {projectId
              ? 'Update the project details below'
              : 'Fill in the project details to start tracking it'}
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Project Code *</Label>
                  <Input
                    id="code"
                    placeholder="PRJ-001"
                    {...register('code')}
                    className={errors.code ? 'border-red-500' : ''}
                    disabled={!!projectId}
                  />
                  {errors.code && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.code.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={watch('category') || '_none'}
                    onValueChange={(val) =>
                      setValue('category', val === '_none' ? '' : val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">None</SelectItem>
                      <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                      <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                      <SelectItem value="INDUSTRIAL">Industrial</SelectItem>
                      <SelectItem value="INFRASTRUCTURE">Infrastructure</SelectItem>
                      <SelectItem value="RENOVATION">Renovation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="manager_id">Project Manager</Label>
                  <Select
                    value={watch('manager_id') || '_none'}
                    onValueChange={(val) =>
                      setValue('manager_id', val === '_none' ? '' : val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Unassigned</SelectItem>
                      {managers.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.first_name} {m.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    placeholder="Brief project overview..."
                    {...register('description')}
                  />
                </div>
              </div>
            </div>

            {/* Status & Priority */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">
                Status & Priority
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={watch('status')}
                    onValueChange={(val) => setValue('status', val)}
                  >
                    <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLANNING">Planning</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="ON_HOLD">On Hold</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority *</Label>
                  <Select
                    value={watch('priority')}
                    onValueChange={(val) => setValue('priority', val)}
                  >
                    <SelectTrigger className={errors.priority ? 'border-red-500' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">
                Client Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_name">Client Name *</Label>
                  <Input
                    id="client_name"
                    {...register('client_name')}
                    className={errors.client_name ? 'border-red-500' : ''}
                  />
                  {errors.client_name && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.client_name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="client_contact">Client Phone</Label>
                  <Input
                    id="client_contact"
                    {...register('client_contact')}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="client_email">Client Email</Label>
                  <Input
                    id="client_email"
                    type="email"
                    {...register('client_email')}
                    className={errors.client_email ? 'border-red-500' : ''}
                  />
                  {errors.client_email && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.client_email.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Schedule</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    {...register('start_date')}
                    className={errors.start_date ? 'border-red-500' : ''}
                  />
                  {errors.start_date && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.start_date.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="expected_end_date">Expected End Date *</Label>
                  <Input
                    id="expected_end_date"
                    type="date"
                    {...register('expected_end_date')}
                    className={errors.expected_end_date ? 'border-red-500' : ''}
                  />
                  {errors.expected_end_date && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.expected_end_date.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Budget */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Budget</h3>
              <div>
                <Label htmlFor="estimated_budget">Estimated Budget *</Label>
                <Input
                  id="estimated_budget"
                  type="number"
                  step="0.01"
                  {...register('estimated_budget')}
                  className={errors.estimated_budget ? 'border-red-500' : ''}
                />
                {errors.estimated_budget && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.estimated_budget.message}
                  </p>
                )}
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
                ) : projectId ? (
                  'Update Project'
                ) : (
                  'Create Project'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
