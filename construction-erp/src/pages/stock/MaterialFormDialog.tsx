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

// ===== Schema =====
const materialSchema = z.object({
  code: z.string().min(2, 'Material code required'),
  name: z.string().min(2, 'Name required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category required'),
  unit: z.string().min(1, 'Unit required'),
  unit_price: z.coerce.number().min(0, 'Price must be positive'),
  min_stock_level: z.coerce.number().min(0),
  reorder_point: z.coerce.number().min(0),
  is_active: z.boolean(),
})

type MaterialFormData = z.infer<typeof materialSchema>

// ===== Props =====
interface MaterialFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materialId?: string
  onSuccess?: () => void
}

// ===== Constants =====
const COMMON_UNITS = ['pcs', 'kg', 'm', 'm²', 'm³', 'L', 'bag', 'ton', 'box']
const COMMON_CATEGORIES = [
  'Cement',
  'Steel',
  'Aggregates',
  'Bricks',
  'Wood',
  'Plumbing',
  'Electrical',
  'Paint',
  'Tools',
  'Safety',
  'Other',
]

// ===== Auto-generate unique material code =====
const generateMaterialCode = (): string =>
  `MAT-${Math.floor(100000 + Math.random() * 900000)}`

// ===== Component =====
export function MaterialFormDialog({
  open,
  onOpenChange,
  materialId,
  onSuccess,
}: MaterialFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      code: generateMaterialCode(),
      name: '',
      description: '',
      category: '',
      unit: 'pcs',
      unit_price: 0,
      min_stock_level: 0,
      reorder_point: 0,
      is_active: true,
    },
  })

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (materialId) {
        loadMaterial(materialId)
      } else {
        reset({
          code: generateMaterialCode(),
          name: '',
          description: '',
          category: '',
          unit: 'pcs',
          unit_price: 0,
          min_stock_level: 0,
          reorder_point: 0,
          is_active: true,
        })
      }
    }
  }, [open, materialId])

  // Load existing material for editing
  const loadMaterial = async (id: string) => {
    setLoadingData(true)
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      if (data) {
        reset({
          code: data.code,
          name: data.name,
          description: data.description || '',
          category: data.category,
          unit: data.unit,
          unit_price: Number(data.unit_price),
          min_stock_level: Number(data.min_stock_level),
          reorder_point: Number(data.reorder_point),
          is_active: data.is_active,
        })
      }
    } catch (error: any) {
      toast.error('Failed to load material data')
    } finally {
      setLoadingData(false)
    }
  }

  // Handle form submission
  const onSubmit = async (data: MaterialFormData) => {
    setLoading(true)
    try {
      const payload = {
        ...data,
        description: data.description || null,
      }

      if (materialId) {
        const { error } = await supabase
          .from('materials')
          .update(payload)
          .eq('id', materialId)

        if (error) throw error
        toast.success('Material updated successfully')
      } else {
        const { error } = await supabase.from('materials').insert(payload)

        if (error) throw error
        toast.success('Material created successfully')
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      if (
        error?.code === '23505' ||
        error?.message?.includes('materials_code_key')
      ) {
        toast.error('This Material Code already exists! Please use a unique code.')
      } else {
        toast.error(error.message || 'Failed to save material')
      }
    } finally {
      setLoading(false)
    }
  }

  // ===== Render =====
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {materialId ? 'Edit Material' : 'Add Material'}
          </DialogTitle>
          <DialogDescription>
            {materialId
              ? 'Update material details below'
              : 'Add a new material to your inventory catalog'}
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Material Code */}
              <div>
                <Label htmlFor="code">Material Code *</Label>
                <Input
                  id="code"
                  placeholder="MAT-001"
                  {...register('code')}
                  className={errors.code ? 'border-red-500' : ''}
                  disabled={!!materialId}
                />
                {errors.code && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.code.message}
                  </p>
                )}
              </div>

              {/* Name */}
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Portland Cement"
                  {...register('name')}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={watch('category')}
                  onValueChange={(value) => setValue('category', value)}
                >
                  <SelectTrigger
                    className={errors.category ? 'border-red-500' : ''}
                  >
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.category.message}
                  </p>
                )}
              </div>

              {/* Unit */}
              <div>
                <Label htmlFor="unit">Unit *</Label>
                <Select
                  value={watch('unit')}
                  onValueChange={(value) => setValue('unit', value)}
                >
                  <SelectTrigger
                    className={errors.unit ? 'border-red-500' : ''}
                  >
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.unit && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.unit.message}
                  </p>
                )}
              </div>

              {/* Unit Price */}
              <div>
                <Label htmlFor="unit_price">Unit Price *</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  {...register('unit_price')}
                  className={errors.unit_price ? 'border-red-500' : ''}
                />
                {errors.unit_price && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.unit_price.message}
                  </p>
                )}
              </div>

              {/* Min Stock Level */}
              <div>
                <Label htmlFor="min_stock_level">Minimum Stock Level</Label>
                <Input
                  id="min_stock_level"
                  type="number"
                  {...register('min_stock_level')}
                  className={errors.min_stock_level ? 'border-red-500' : ''}
                />
                {errors.min_stock_level && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.min_stock_level.message}
                  </p>
                )}
              </div>

              {/* Reorder Point */}
              <div>
                <Label htmlFor="reorder_point">Reorder Point</Label>
                <Input
                  id="reorder_point"
                  type="number"
                  {...register('reorder_point')}
                  className={errors.reorder_point ? 'border-red-500' : ''}
                />
                {errors.reorder_point && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.reorder_point.message}
                  </p>
                )}
              </div>

              {/* Is Active Checkbox */}
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="is_active"
                  {...register('is_active')}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Active
                </Label>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Material details..."
                {...register('description')}
                rows={3}
              />
            </div>

            {/* Footer Buttons */}
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
                ) : materialId ? (
                  'Update Material'
                ) : (
                  'Create Material'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}