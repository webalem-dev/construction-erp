import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Truck,
  Loader2,
  Star,
  ShoppingCart,
  FileText,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, getStatusColor, formatEnum } from '@/lib/utils'
import { PermissionGate } from '@/components/shared/PermissionGate'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { SupplierFormDialog } from './SupplierFormDialog'

interface Supplier {
  id: string
  code: string
  name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  payment_terms: string | null
  rating: number | null
  is_active: boolean
  notes: string | null
  created_at: string
}

interface PurchaseOrder {
  id: string
  po_number: string
  status: string
  order_date: string
  total_amount: number
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    if (id) {
      fetchSupplier()
      fetchOrders()
    }
  }, [id])

  const fetchSupplier = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      setSupplier(data as any)
    } catch (error: any) {
      toast.error('Failed to load supplier')
      navigate('/stock/suppliers')
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('id, po_number, status, order_date, total_amount')
      .eq('supplier_id', id!)
      .order('created_at', { ascending: false })
      .limit(20)
    if (!error) setOrders((data as any) || [])
  }

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-xs text-slate-400">No rating</span>
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'
            }`}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!supplier) return null

  const totalSpend = orders.reduce((sum, o) => sum + Number(o.total_amount), 0)

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/stock/suppliers')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Suppliers
      </Button>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{supplier.code}</Badge>
                {supplier.is_active ? (
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{supplier.name}</h1>
              {supplier.contact_person && (
                <p className="text-slate-600 mt-1">{supplier.contact_person}</p>
              )}
              <div className="mt-3">{renderStars(supplier.rating)}</div>
            </div>

            <PermissionGate module="stock" action="edit" subModule="suppliers">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </PermissionGate>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Orders</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Spend</p>
                <p className="text-xl font-bold">{formatCurrency(totalSpend)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Payment Terms</p>
                <p className="text-lg font-bold">{supplier.payment_terms || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {supplier.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{supplier.email}</span>
              </div>
            )}
            {supplier.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{supplier.phone}</span>
              </div>
            )}
            {supplier.address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                <span>{supplier.address}</span>
              </div>
            )}
            {supplier.city && (
              <p className="text-sm text-slate-600 pl-6">{supplier.city}</p>
            )}
            {!supplier.email && !supplier.phone && !supplier.address && (
              <p className="text-sm text-slate-400">No contact information</p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">
              {supplier.notes || 'No notes'}
            </p>
            <p className="text-xs text-slate-400 mt-4">
              Added on {formatDate(supplier.created_at)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              No purchase orders yet
            </p>
          ) : (
            <div className="space-y-2">
              {orders.map(o => (
                <div
                  key={o.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-sm">{o.po_number}</p>
                    <p className="text-xs text-slate-500">{formatDate(o.order_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(o.status)}>
                      {formatEnum(o.status)}
                    </Badge>
                    <p className="font-semibold text-sm">
                      {formatCurrency(Number(o.total_amount))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SupplierFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        supplierId={supplier.id}
        onSuccess={fetchSupplier}
      />
    </div>
  )
}
