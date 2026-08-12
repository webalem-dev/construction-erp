import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  ShoppingCart,
  Loader2,
  Package,
  Clock,
  CheckCircle2,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { formatDate, formatCurrency, getStatusColor, formatEnum } from '@/lib/utils'
import { PermissionGate } from '@/components/shared/PermissionGate'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { PurchaseOrderFormDialog } from './PurchaseOrderFormDialog'

interface PurchaseOrder {
  id: string
  po_number: string
  status: string
  order_date: string
  expected_delivery_date: string | null
  total_amount: number
  notes: string | null
  supplier: {
    id: string
    name: string
    code: string
  }
  project: {
    id: string
    name: string
  } | null
  items_count?: number
}

export default function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers (id, name, code),
          project:projects (id, name),
          items:purchase_order_items (id)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const enriched = (data as any[])?.map(po => ({
        ...po,
        items_count: po.items?.length || 0,
      })) || []

      setOrders(enriched)
    } catch (error: any) {
      toast.error(error.message || 'Failed to load purchase orders')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'APPROVED',
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error
      toast.success('Purchase order approved')
      fetchOrders()
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve')
    }
  }

  const filteredOrders = orders.filter(o => {
    const search = searchTerm.toLowerCase()
    const matchesSearch =
      o.po_number.toLowerCase().includes(search) ||
      o.supplier?.name.toLowerCase().includes(search) ||
      o.project?.name.toLowerCase().includes(search)

    const matchesStatus = filterStatus === 'all' || o.status === filterStatus

    return matchesSearch && matchesStatus
  })

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'PENDING_APPROVAL').length,
    approved: orders.filter(o => ['APPROVED', 'ORDERED'].includes(o.status)).length,
    totalValue: orders.reduce((sum, o) => sum + Number(o.total_amount), 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="text-slate-600 mt-1">
            Manage purchase orders and supplier deliveries
          </p>
        </div>
        <PermissionGate module="stock" action="create" subModule="purchase_orders">
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create PO
          </Button>
        </PermissionGate>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Orders</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-yellow-500 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Pending Approval</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Value</p>
                <p className="text-xl font-bold">{formatCurrency(stats.totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by PO number, supplier, or project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="ORDERED">Ordered</SelectItem>
                <SelectItem value="PARTIALLY_RECEIVED">Partially Received</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-slate-600">Loading orders...</p>
          </CardContent>
        </Card>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No purchase orders found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map(order => (
            <Card
              key={order.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/stock/purchase-orders/${order.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-slate-900">{order.po_number}</span>
                      <Badge className={getStatusColor(order.status)}>
                        {formatEnum(order.status)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Supplier</p>
                        <p className="font-medium">{order.supplier?.name}</p>
                      </div>
                      {order.project && (
                        <div>
                          <p className="text-xs text-slate-500">Project</p>
                          <p className="font-medium truncate">{order.project.name}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-slate-500">Order Date</p>
                        <p className="font-medium">{formatDate(order.order_date)}</p>
                      </div>
                      {order.expected_delivery_date && (
                        <div>
                          <p className="text-xs text-slate-500">Expected</p>
                          <p className="font-medium">{formatDate(order.expected_delivery_date)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Total Amount</p>
                      <p className="text-xl font-bold">{formatCurrency(Number(order.total_amount))}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {order.items_count} {order.items_count === 1 ? 'item' : 'items'}
                      </p>
                    </div>

                    {order.status === 'PENDING_APPROVAL' && (
                      <PermissionGate module="stock" action="approve" subModule="purchase_orders">
                        <div onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" onClick={() => handleApprove(order.id)}>
                            Approve
                          </Button>
                        </div>
                      </PermissionGate>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PurchaseOrderFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchOrders}
      />
    </div>
  )
}