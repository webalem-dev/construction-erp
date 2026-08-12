import { useState } from 'react'
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

interface POItem {
  id: string
  material_id: string
  quantity: number
  received_quantity: number
  unit_price: number
  material: { name: string; code: string; unit: string }
}

interface Warehouse {
  id: string
  name: string
}

interface ReceivePODialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  poId: string
  items: POItem[]
  onSuccess: () => void
}

export function ReceivePODialog({
  open,
  onOpenChange,
  poId,
  items,
  onSuccess,
}: ReceivePODialogProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>(
    () => Object.fromEntries(items.map(i => [i.id, i.quantity - i.received_quantity]))
  )
  const [warehouseId, setWarehouseId] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useState(() => {
    if (open) {
      loadWarehouses()
      setWarehouseId('')
      setQuantities(
        Object.fromEntries(items.map(i => [i.id, i.quantity - i.received_quantity]))
      )
    }
  })

  const loadWarehouses = async () => {
    const { data } = await supabase
      .from('warehouses')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
    setWarehouses(data || [])
    if (data && data.length > 0 && !warehouseId) setWarehouseId(data[0].id)
  }

  const updateQty = (itemId: string, value: number) => {
    setQuantities(prev => ({ ...prev, [itemId]: value }))
  }

  const handleReceive = async () => {
    if (!warehouseId) {
      toast.error('Please select a warehouse')
      return
    }
    setLoading(true)
    try {
      const toReceive = items.filter(i => (quantities[i.id] ?? 0) > 0)

      for (const item of toReceive) {
        const newReceived = item.received_quantity + quantities[item.id]

        // Update PO item
        const { error: itemError } = await supabase
          .from('purchase_order_items')
          .update({ received_quantity: newReceived })
          .eq('id', item.id)
        if (itemError) throw itemError

        // Upsert stock_items
        const { data: existing } = await supabase
          .from('stock_items')
          .select('id, quantity')
          .eq('material_id', item.material_id)
          .eq('warehouse_id', warehouseId)
          .maybeSingle()

        if (existing) {
          const { error: stockError } = await supabase
            .from('stock_items')
            .update({
              quantity: Number(existing.quantity) + quantities[item.id],
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
          if (stockError) throw stockError
        } else {
          const { error: stockError } = await supabase
            .from('stock_items')
            .insert({
              material_id: item.material_id,
              warehouse_id: warehouseId,
              quantity: quantities[item.id],
            })
          if (stockError) throw stockError
        }
      }

      // Determine new PO status
      const totalOrdered = items.reduce((s, i) => s + i.quantity, 0)
      const totalReceived = items.reduce(
        (s, i) => s + i.received_quantity + (quantities[i.id] || 0),
        0
      )
      const newStatus = totalReceived >= totalOrdered ? 'RECEIVED' : 'PARTIALLY_RECEIVED'

      const { error: statusError } = await supabase
        .from('purchase_orders')
        .update({
          status: newStatus,
          received_at: newStatus === 'RECEIVED' ? new Date().toISOString() : null,
        })
        .eq('id', poId)
      if (statusError) throw statusError

      toast.success('Stock received')
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to receive stock')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Receive Purchase Order</DialogTitle>
          <DialogDescription>
            Confirm the quantities received and select a warehouse
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Warehouse *</Label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm"
            >
              <option value="">Select warehouse</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {items.map(item => {
              const remaining = item.quantity - item.received_quantity
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.material.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.material.code} · Ordered: {item.quantity} {item.material.unit}
                      {item.received_quantity > 0 && ` · Already received: ${item.received_quantity}`}
                    </p>
                  </div>
                  <div className="w-28">
                    <Label className="text-xs">Receiving</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      max={remaining}
                      value={quantities[item.id] ?? 0}
                      onChange={(e) => updateQty(item.id, Number(e.target.value))}
                    />
                  </div>
                </div>
              )
            })}
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
          <Button onClick={handleReceive} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Receiving...
              </>
            ) : (
              'Confirm Receipt'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
