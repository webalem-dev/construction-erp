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

const taskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  status: z.string().min(1, 'Status required'),
  priority: z.string().min(1, 'Priority required'),
  progress: z.coerce.number().min(0).max(100),
  due_date: z.string().optional(),
  assignee_id: z.string().optional(),
})

type TaskFormData = z.infer<typeof taskSchema>

interface Employee {
  id: string
  first_name: string
  last_name: string
}

interface TaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  taskId?: string
  onSuccess: () => void
}

export function TaskFormDialog({
  open,
  onOpenChange,
  projectId,
  taskId,
  onSuccess,
}: TaskFormDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'TODO',
      priority: 'MEDIUM',
      progress: 0,
      due_date: '',
      assignee_id: '',
    },
  })

  useEffect(() => {
    if (open) {
      loadEmployees()
      if (taskId) {
        loadTask(taskId)
      } else {
        reset({
          title: '',
          description: '',
          status: 'TODO',
          priority: 'MEDIUM',
          progress: 0,
          due_date: '',
          assignee_id: '',
        })
      }
    }
  }, [open, taskId])

  const loadEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('is_active', true)
      .order('first_name')
    setEmployees(data || [])
  }

  const loadTask = async (id: string) => {
    setLoadingData(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      if (data) {
        reset({
          title: data.title,
          description: data.description || '',
          status: data.status,
          priority: data.priority,
          progress: Number(data.progress),
          due_date: data.due_date || '',
          assignee_id: data.assignee_id || '',
        })
      }
    } catch (error: any) {
      toast.error('Failed to load task data')
    } finally {
      setLoadingData(false)
    }
  }

  const onSubmit = async (data: TaskFormData) => {
    setLoading(true)
    try {
      const payload = {
        ...data,
        project_id: projectId,
        description: data.description || null,
        due_date: data.due_date || null,
        assignee_id: data.assignee_id || null,
      }

      if (taskId) {
        const { error } = await supabase
          .from('tasks')
          .update(payload)
          .eq('id', taskId)
        if (error) throw error
        toast.success('Task updated successfully')
      } else {
        const { error } = await supabase.from('tasks').insert(payload)
        if (error) throw error
        toast.success('Task created successfully')
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to save task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{taskId ? 'Edit Task' : 'Add Task'}</DialogTitle>
          <DialogDescription>
            {taskId
              ? 'Update the task details below'
              : 'Create a new task and assign it to a team member'}
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                {...register('title')}
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="What needs to be done?"
                {...register('description')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={watch('status')}
                  onValueChange={(val) => setValue('status', val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="IN_REVIEW">In Review</SelectItem>
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
                  <SelectTrigger>
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

              <div>
                <Label htmlFor="assignee_id">Assignee</Label>
                <Select
                  value={watch('assignee_id') || '_none'}
                  onValueChange={(val) =>
                    setValue('assignee_id', val === '_none' ? '' : val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Unassigned</SelectItem>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.first_name} {e.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input id="due_date" type="date" {...register('due_date')} />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="progress">Progress (%)</Label>
                <Input
                  id="progress"
                  type="number"
                  min={0}
                  max={100}
                  {...register('progress')}
                  className={errors.progress ? 'border-red-500' : ''}
                />
                {errors.progress && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.progress.message}
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
                ) : taskId ? (
                  'Update Task'
                ) : (
                  'Create Task'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}