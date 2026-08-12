import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'

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

const itemSchema = z.object({
  material_id: z.string().min(1, 'Material required'),
  requested_quantity: z.coerce.number().min(0.01, 'Quantity required'),
  notes: z.string().optional(),
})

const requestSchema = z.object({
  project_id: z.string().min(1, 'Project required'),
  priority: z.string().min(1),
  required_date: z.string().min(1, 'Required date required'),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
})

type RequestFormData = z.infer<typeof requestSchema>

interface Material {
  id: string
  name: string
  code: string
  unit: string
}

interface Project {
  id: string
  name: string
  code: string
}

interface MaterialRequestFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  defaultProjectId?: string
}

export function MaterialRequestFormDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultProjectId,
}: MaterialRequestFormDialogProps) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      project_id: defaultProjectId || '',
      priority: 'MEDIUM',
      required_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      notes: '',
      items: [{ material_id: '', requested_quantity: 1, notes: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  useEffect(() => {
    if (open) {
      loadMaterials()
      loadProjects()
      reset({
        project_id: defaultProjectId || '',
        priority: 'MEDIUM',
        required_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        notes: '',
        items: [{ material_id: '', requested_quantity: 1, notes: '' }],
      })
    }
  }, [open, defaultProjectId])

  const loadMaterials = async () => {
    const { data } = await supabase
      .from('materials')
      .select('id, name, code, unit')
      .eq('is_active', true)
      .order('name')
    setMaterials(data || [])
  }

  const loadProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, name, code')
      .in('status', ['PLANNING', 'IN_PROGRESS'])
      .order('name')
    setProjects(data || [])
  }

  const onSubmit = async (data: RequestFormData) => {
    setLoading(true)
    try {
      const { data: user } = await supabase.auth.getUser()

      // Create the material request header
      const { data: mr, error: mrError } = await supabase
        .from('material_requests')
        .insert({
          project_id: data.project_id,
          priority: data.priority,
          required_date: data.required_date,
          notes: data.notes || null,
          requested_by_id: user.user?.id,
          status: 'PENDING_APPROVAL',
        })
        .select()
        .single()

      if (mrError) throw mrError

      // Insert line items
      const items = data.items.map(item => ({
        material_request_id: mr.id,
        material_id: item.material_id,
        requested_quantity: item.requested_quantity,
        notes: item.notes || null,
      }))

      const { error: itemsError } = await supabase
        .from('material_request_items')
        .insert(items)

      if (itemsError) throw itemsError

      toast.success('Material request created successfully')
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Material Request</DialogTitle>
          <DialogDescription>
            Request materials from your warehouse for a project
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="project_id">Project *</Label>
              <Select
                value={watch('project_id') || '_none'}
                onValueChange={(val) =>
                  setValue('project_id', val === '_none' ? '' : val)
                }
              >
                <SelectTrigger className={errors.project_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none" disabled>Select project</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.project_id && (
                <p className="text-xs text-red-500 mt-1">{errors.project_id.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
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

            <div className="md:col-span-2">
              <Label htmlFor="required_date">Required By *</Label>
              <Input
                id="required_date"
                type="date"
                {...register('required_date')}
                className={errors.required_date ? 'border-red-500' : ''}
              />
              {errors.required_date && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.required_date.message}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={2} {...register('notes')} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Items *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ material_id: '', requested_quantity: 1, notes: '' })}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-2">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex items-start gap-2 p-3 border border-slate-200 rounded-lg"
                >
                  <div className="flex-1">
                    <Select
                      value={watch(`items.${index}.material_id`) || '_none'}
                      onValueChange={(val) =>
                        setValue(`items.${index}.material_id`, val === '_none' ? '' : val)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select material" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none" disabled>Select material</SelectItem>
                        {materials.map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.code} - {m.name} ({m.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Qty"
                      {...register(`items.${index}.requested_quantity`)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
            {errors.items && (
              <p className="text-xs text-red-500 mt-1">{errors.items.message as string}</p>
            )}
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
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}