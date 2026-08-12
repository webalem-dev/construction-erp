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

const supplierSchema = z.object({
  code: z.string().min(2, 'Supplier code required'),
  name: z.string().min(2, 'Name required'),
  contact_person: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  payment_terms: z.string().optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  is_active: z.boolean(),
  notes: z.string().optional(),
})

type SupplierFormData = z.infer<typeof supplierSchema>

interface SupplierFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplierId?: string
  onSuccess: () => void
}

export function SupplierFormDialog({
  open,
  onOpenChange,
  supplierId,
  onSuccess,
}: SupplierFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      code: '',
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      payment_terms: 'Net 30',
      rating: 0,
      is_active: true,
      notes: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (supplierId) {
        loadSupplier(supplierId)
      } else {
        reset({
          code: '',
          name: '',
          contact_person: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          payment_terms: 'Net 30',
          rating: 0,
          is_active: true,
          notes: '',
        })
      }
    }
  }, [open, supplierId])

  const loadSupplier = async (id: string) => {
    setLoadingData(true)
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      if (data) {
        reset({
          code: data.code,
          name: data.name,
          contact_person: data.contact_person || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          payment_terms: data.payment_terms || '',
          rating: data.rating ?? 0,
          is_active: data.is_active,
          notes: data.notes || '',
        })
      }
    } catch (error: any) {
      toast.error('Failed to load supplier data')
    } finally {
      setLoadingData(false)
    }
  }

  const onSubmit = async (data: SupplierFormData) => {
    setLoading(true)
    try {
      const payload = {
        ...data,
        email: data.email || null,
        contact_person: data.contact_person || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        payment_terms: data.payment_terms || null,
        notes: data.notes || null,
        rating: data.rating ?? null,
      }

      if (supplierId) {
        const { error } = await supabase
          .from('suppliers')
          .update(payload)
          .eq('id', supplierId)
        if (error) throw error
        toast.success('Supplier updated successfully')
      } else {
        const { error } = await supabase.from('suppliers').insert(payload)
        if (error) throw error
        toast.success('Supplier created successfully')
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to save supplier')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{supplierId ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          <DialogDescription>
            {supplierId
              ? 'Update supplier information below'
              : 'Add a new supplier to your vendor list'}
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
                <Label htmlFor="code">Supplier Code *</Label>
                <Input
                  id="code"
                  placeholder="SUP-001"
                  {...register('code')}
                  className={errors.code ? 'border-red-500' : ''}
                  disabled={!!supplierId}
                />
                {errors.code && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.code.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="name">Company Name *</Label>
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
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  {...register('contact_person')}
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register('phone')} />
              </div>

              <div className="md:col-span-2">
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

              <div className="md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register('address')} />
              </div>

              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('city')} />
              </div>

              <div>
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <Input
                  id="payment_terms"
                  placeholder="e.g. Net 30"
                  {...register('payment_terms')}
                />
              </div>

              <div>
                <Label htmlFor="rating">Rating (0-5)</Label>
                <Input
                  id="rating"
                  type="number"
                  min={0}
                  max={5}
                  step={0.5}
                  {...register('rating')}
                />
              </div>

              <div className="flex items-end">
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

              <div className="md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" rows={3} {...register('notes')} />
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
                ) : supplierId ? (
                  'Update Supplier'
                ) : (
                  'Create Supplier'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
