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

interface RequestItem {
  id: string
  material_id: string
  requested_quantity: number
  issued_quantity: number
  material: {
    name: string
    code: string
    unit: string
  }
}

interface IssueMaterialsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: string
  items: RequestItem[]
  onSuccess: () => void
}

export function IssueMaterialsDialog({
  open,
  onOpenChange,
  requestId,
  items,
  onSuccess,
}: IssueMaterialsDialogProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>(
    () => Object.fromEntries(items.map(i => [i.id, i.requested_quantity - i.issued_quantity]))
  )
  const [loading, setLoading] = useState(false)

  const updateQty = (itemId: string, value: number) => {
    setQuantities(prev => ({ ...prev, [itemId]: value }))
  }

  const handleIssue = async () => {
    setLoading(true)
    try {
      const updates = items
        .filter(item => quantities[item.id] > 0)
        .map(item => ({
          id: item.id,
          new_issued: item.issued_quantity + quantities[item.id],
        }))

      for (const update of updates) {
        const { error } = await supabase
          .from('material_request_items')
          .update({ issued_quantity: update.new_issued })
          .eq('id', update.id)
        if (error) throw error
      }

      // Determine new request status
      const totalRequested = items.reduce((s, i) => s + i.requested_quantity, 0)
      const totalIssued = items.reduce(
        (s, i) => s + (i.issued_quantity + (quantities[i.id] || 0)),
        0
      )
      const newStatus = totalIssued >= totalRequested ? 'ISSUED' : 'PARTIALLY_ISSUED'

      const { error: statusError } = await supabase
        .from('material_requests')
        .update({
          status: newStatus,
          issued_at: new Date().toISOString(),
        })
        .eq('id', requestId)
      if (statusError) throw statusError

      toast.success('Materials issued successfully')
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to issue materials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Issue Materials</DialogTitle>
          <DialogDescription>
            Enter the quantities being issued for each item
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {items.map(item => {
            const remaining = item.requested_quantity - item.issued_quantity
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.material.name}</p>
                  <p className="text-xs text-slate-500">
                    {item.material.code} · Requested: {item.requested_quantity} {item.material.unit}
                    {item.issued_quantity > 0 && ` · Already issued: ${item.issued_quantity}`}
                  </p>
                </div>
                <div className="w-28">
                  <Label className="text-xs">Issuing</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={remaining}
                    value={quantities[item.id] ?? 0}
                    onChange={(e) => updateQty(item.id, Number(e.target.value))}
                  />
                </div>
                <span className="text-sm text-slate-500 self-end pb-2">
                  / {remaining} {item.material.unit}
                </span>
              </div>
            )
          })}
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
          <Button onClick={handleIssue} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Issuing...
              </>
            ) : (
              'Issue Materials'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}