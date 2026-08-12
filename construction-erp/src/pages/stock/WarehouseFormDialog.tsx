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

const warehouseSchema = z.object({
  code: z.string().min(2, 'Code required'),
  name: z.string().min(2, 'Name required'),
  address: z.string().optional(),
  city: z.string().optional(),
  manager_id: z.string().optional(),
  capacity: z.coerce.number().min(0).optional(),
  is_active: z.boolean(),
})

type WarehouseFormData = z.infer<typeof warehouseSchema>

interface WarehouseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  warehouseId?: string
  onSuccess: () => void
}

export function WarehouseFormDialog({
  open,
  onOpenChange,
  warehouseId,
  onSuccess,
}: WarehouseFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      code: '',
      name: '',
      address: '',
      city: '',
      manager_id: '',
      capacity: 0,
      is_active: true,
    },
  })

  useEffect(() => {
    if (open) {
      if (warehouseId) {
        loadWarehouse(warehouseId)
      } else {
        reset({
          code: '',
          name: '',
          address: '',
          city: '',
          manager_id: '',
          capacity: 0,
          is_active: true,
        })
      }
    }
  }, [open, warehouseId])

  const loadWarehouse = async (id: string) => {
    setLoadingData(true)
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      if (data) {
        reset({
          code: data.code,
          name: data.name,
          address: data.address || '',
          city: data.city || '',
          manager_id: data.manager_id || '',
          capacity: data.capacity ?? 0,
          is_active: data.is_active,
        })
      }
    } catch (error: any) {
      toast.error('Failed to load warehouse')
    } finally {
      setLoadingData(false)
    }
  }

  const onSubmit = async (data: WarehouseFormData) => {
    setLoading(true)
    try {
      const payload = {
        ...data,
        address: data.address || null,
        city: data.city || null,
        manager_id: data.manager_id || null,
      }

      if (warehouseId) {
        const { error } = await supabase
          .from('warehouses')
          .update(payload)
          .eq('id', warehouseId)
        if (error) throw error
        toast.success('Warehouse updated')
      } else {
        const { error } = await supabase.from('warehouses').insert(payload)
        if (error) throw error
        toast.success('Warehouse created')
      }
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to save warehouse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{warehouseId ? 'Edit Warehouse' : 'Add Warehouse'}</DialogTitle>
          <DialogDescription>
            {warehouseId
              ? 'Update warehouse details below'
              : 'Add a new warehouse location'}
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  placeholder="WH-001"
                  {...register('code')}
                  disabled={!!warehouseId}
                  className={errors.code ? 'border-red-500' : ''}
                />
                {errors.code && (
                  <p className="text-xs text-red-500 mt-1">{errors.code.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
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
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  step="0.01"
                  {...register('capacity')}
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={watch('is_active')}
                    onChange={(e) => setValue('is_active', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span className="text-sm font-medium">Active</span>
                </label>
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
                ) : warehouseId ? (
                  'Update'
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
