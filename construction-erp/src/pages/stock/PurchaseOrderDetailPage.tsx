import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Package,
  CheckCircle2,
  Loader2,
  Calendar,
  Building2,
  DollarSign,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { formatDate, formatCurrency, formatEnum, getStatusColor } from '@/lib/utils'
import { PermissionGate } from '@/components/shared/PermissionGate'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { ReceivePODialog } from './ReceivePODialog'

interface POItem {
  id: string
  material_id: string
  quantity: number
  received_quantity: number
  unit_price: number
  material: { name: string; code: string; unit: string }
}

interface PurchaseOrder {
  id: string
  po_number: string
  status: string
  order_date: string
  expected_delivery_date: string | null
  received_at: string | null
  total_amount: number
  notes: string | null
  supplier: { id: string; name: string; code: string }
  project: { id: string; name: string; code: string } | null
}

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<PurchaseOrder | null>(null)
  const [items, setItems] = useState<POItem[]>([])
  const [loading, setLoading] = useState(true)
  const [receiveOpen, setReceiveOpen] = useState(false)

  useEffect(() => {
    if (id) {
      fetchOrder()
      fetchItems()
    }
  }, [id])

  const fetchOrder = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers (id, name, code),
          project:projects (id, name, code)
        `)
        .eq('id', id!)
        .single()
      if (error) throw error
      setOrder(data as any)
    } catch (error: any) {
      toast.error('Failed to load purchase order')
      navigate('/stock/purchase-orders')
    } finally {
      setLoading(false)
    }
  }

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('purchase_order_items')
      .select(`
        id, material_id, quantity, received_quantity, unit_price,
        material:materials (name, code, unit)
      `)
      .eq('purchase_order_id', id!)
    if (!error) setItems((data as any) || [])
  }

  const handleApprove = async () => {
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'APPROVED',
          approved_at: new Date().toISOString(),
        })
        .eq('id', id!)
      if (error) throw error
      toast.success('PO approved')
      fetchOrder()
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!order) return null

  const totalReceived = items.reduce((s, i) => s + i.received_quantity, 0)
  const totalOrdered = items.reduce((s, i) => s + i.quantity, 0)
  const isComplete = totalReceived >= totalOrdered

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/stock/purchase-orders')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Purchase Orders
      </Button>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xl font-bold">{order.po_number}</span>
                <Badge className={getStatusColor(order.status)}>
                  {formatEnum(order.status)}
                </Badge>
              </div>
              <p className="text-slate-600 flex items-center gap-2 mt-1">
                <Building2 className="w-4 h-4" />
                {order.supplier?.name}
              </p>
              {order.project && (
                <p className="text-sm text-slate-500 mt-1">
                  For project: {order.project.name}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {order.status === 'PENDING_APPROVAL' && (
                <PermissionGate module="stock" action="approve" subModule="purchase_orders">
                  <Button onClick={handleApprove}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </PermissionGate>
              )}
              {(order.status === 'APPROVED' || order.status === 'ORDERED' || order.status === 'PARTIALLY_RECEIVED') && (
                <PermissionGate module="stock" action="edit" subModule="purchase_orders">
                  <Button onClick={() => setReceiveOpen(true)}>
                    <Package className="w-4 h-4 mr-2" />
                    Receive Stock
                  </Button>
                </PermissionGate>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Order Date</p>
                <p className="font-semibold">{formatDate(order.order_date)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Expected Delivery</p>
                <p className="font-semibold">
                  {order.expected_delivery_date ? formatDate(order.expected_delivery_date) : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Total Amount</p>
                <p className="font-semibold">{formatCurrency(Number(order.total_amount))}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Received</p>
                <p className="font-semibold">
                  {totalReceived} / {totalOrdered} {isComplete ? '✓' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-slate-500 uppercase">Material</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-slate-500 uppercase">Qty</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-slate-500 uppercase">Received</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-slate-500 uppercase">Unit Price</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-slate-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map(item => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{item.material.name}</p>
                      <p className="text-xs text-slate-500">{item.material.code}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {item.quantity} {item.material.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <span className={item.received_quantity === item.quantity ? 'text-green-600 font-semibold' : ''}>
                        {item.received_quantity} {item.material.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {formatCurrency(Number(item.unit_price))}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(Number(item.quantity) * Number(item.unit_price))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {order.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      <ReceivePODialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        poId={order.id}
        items={items}
        onSuccess={() => {
          fetchOrder()
          fetchItems()
        }}
      />
    </div>
  )
}
