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
  quantity: z.coerce.number().min(0.01, 'Quantity required'),
  unit_price: z.coerce.number().min(0, 'Price must be positive'),
})

const poSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier required'),
  project_id: z.string().optional(),
  order_date: z.string().min(1, 'Order date required'),
  expected_delivery_date: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
})

type POFormData = z.infer<typeof poSchema>

interface Material {
  id: string
  name: string
  code: string
  unit: string
  unit_price: number
}

interface Supplier {
  id: string
  name: string
  code: string
}

interface Project {
  id: string
  name: string
  code: string
}

interface PurchaseOrderFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function PurchaseOrderFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: PurchaseOrderFormDialogProps) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
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
  } = useForm<POFormData>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      supplier_id: '',
      project_id: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: '',
      notes: '',
      items: [{ material_id: '', quantity: 1, unit_price: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = watch('items')

  useEffect(() => {
    if (open) {
      loadOptions()
      reset({
        supplier_id: '',
        project_id: '',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: '',
        notes: '',
        items: [{ material_id: '', quantity: 1, unit_price: 0 }],
      })
    }
  }, [open])

  const loadOptions = async () => {
    const [{ data: sups }, { data: mats }, { data: projs }] = await Promise.all([
      supabase.from('suppliers').select('id, name, code').eq('is_active', true).order('name'),
      supabase.from('materials').select('id, name, code, unit, unit_price').eq('is_active', true).order('name'),
      supabase.from('projects').select('id, name, code').in('status', ['PLANNING', 'IN_PROGRESS']).order('name'),
    ])
    setSuppliers(sups || [])
    setMaterials(mats || [])
    setProjects(projs || [])
  }

  const handleMaterialChange = (index: number, materialId: string) => {
    setValue(`items.${index}.material_id`, materialId)
    const mat = materials.find(m => m.id === materialId)
    if (mat) {
      setValue(`items.${index}.unit_price`, Number(mat.unit_price))
    }
  }

  const total = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    0
  )

  const onSubmit = async (data: POFormData) => {
    setLoading(true)
    try {
      const { data: user } = await supabase.auth.getUser()
      const totalAmount = data.items.reduce(
        (s, i) => s + Number(i.quantity) * Number(i.unit_price),
        0
      )

      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          supplier_id: data.supplier_id,
          project_id: data.project_id || null,
          order_date: data.order_date,
          expected_delivery_date: data.expected_delivery_date || null,
          notes: data.notes || null,
          total_amount: totalAmount,
          status: 'PENDING_APPROVAL',
          ordered_by_id: user.user?.id,
        })
        .select()
        .single()

      if (poError) throw poError

      const poItems = data.items.map(item => ({
        po_id: po.id,
        material_id: item.material_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: Number(item.quantity) * Number(item.unit_price),
      }))

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(poItems)

      if (itemsError) throw itemsError

      toast.success('Purchase order created')
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create PO')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
          <DialogDescription>
            Order materials from your supplier
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="supplier_id">Supplier *</Label>
              <Select
                value={watch('supplier_id') || '_none'}
                onValueChange={(val) =>
                  setValue('supplier_id', val === '_none' ? '' : val)
                }
              >
                <SelectTrigger className={errors.supplier_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none" disabled>Select supplier</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.supplier_id && (
                <p className="text-xs text-red-500 mt-1">{errors.supplier_id.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="project_id">Project</Label>
              <Select
                value={watch('project_id') || '_none'}
                onValueChange={(val) =>
                  setValue('project_id', val === '_none' ? '' : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="order_date">Order Date *</Label>
              <Input
                id="order_date"
                type="date"
                {...register('order_date')}
                className={errors.order_date ? 'border-red-500' : ''}
              />
            </div>

            <div>
              <Label htmlFor="expected_delivery_date">Expected Delivery</Label>
              <Input
                id="expected_delivery_date"
                type="date"
                {...register('expected_delivery_date')}
              />
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
                onClick={() => append({ material_id: '', quantity: 1, unit_price: 0 })}
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
                      onValueChange={(val) => handleMaterialChange(index, val === '_none' ? '' : val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Material" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none" disabled>Select material</SelectItem>
                        {materials.map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.code} - {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Qty"
                      {...register(`items.${index}.quantity`)}
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Unit Price"
                      {...register(`items.${index}.unit_price`)}
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
            <div className="flex justify-end mt-3 pt-3 border-t">
              <div className="text-right">
                <p className="text-xs text-slate-500">Total Amount</p>
                <p className="text-xl font-bold">${total.toFixed(2)}</p>
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
                  Creating...
                </>
              ) : (
                'Create PO'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}