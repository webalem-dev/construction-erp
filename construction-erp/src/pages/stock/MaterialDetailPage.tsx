import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Edit,
  Package,
  AlertTriangle,
  TrendingUp,
  Warehouse,
  Loader2,
  DollarSign,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PermissionGate } from '@/components/shared/PermissionGate'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { MaterialFormDialog } from './MaterialFormDialog'

interface Material {
  id: string
  code: string
  name: string
  description: string | null
  category: string
  unit: string
  unit_price: number
  min_stock_level: number
  reorder_point: number
  is_active: boolean
  created_at: string
}

interface StockItem {
  id: string
  quantity: number
  warehouse: { id: string; name: string }
}

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [material, setMaterial] = useState<Material | null>(null)
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    if (id) {
      fetchMaterial()
      fetchStock()
    }
  }, [id])

  const fetchMaterial = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      setMaterial(data as any)
    } catch (error: any) {
      toast.error('Failed to load material')
      navigate('/stock')
    } finally {
      setLoading(false)
    }
  }

  const fetchStock = async () => {
    const { data, error } = await supabase
      .from('stock_items')
      .select('id, quantity, warehouse:warehouses (id, name)')
      .eq('material_id', id!)
    if (!error) setStockItems((data as any) || [])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!material) return null

  const totalStock = stockItems.reduce((s, i) => s + Number(i.quantity), 0)
  const totalValue = totalStock * Number(material.unit_price)
  const isLow = totalStock <= material.reorder_point

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/stock')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Stock
      </Button>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="outline">{material.code}</Badge>
                <Badge variant="secondary">{material.category}</Badge>
                {material.is_active ? (
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
                {isLow && (
                  <Badge className="bg-red-100 text-red-800">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Low Stock
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{material.name}</h1>
              {material.description && (
                <p className="text-slate-600 mt-2">{material.description}</p>
              )}
            </div>
            <PermissionGate module="stock" action="edit">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </PermissionGate>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Stock</p>
                <p className="text-2xl font-bold">
                  {totalStock.toLocaleString()} <span className="text-sm text-slate-500">{material.unit}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Value</p>
                <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Unit Price</p>
                <p className="text-xl font-bold">{formatCurrency(Number(material.unit_price))}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Reorder Point</p>
                <p className="text-2xl font-bold">{material.reorder_point}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock by Warehouse */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="w-5 h-5" />
            Stock by Warehouse
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stockItems.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              No stock recorded in any warehouse
            </p>
          ) : (
            <div className="space-y-2">
              {stockItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Warehouse className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{item.warehouse.name}</span>
                  </div>
                  <p className="font-semibold">
                    {Number(item.quantity).toLocaleString()} {material.unit}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reorder Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reorder Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500">Minimum Stock Level</p>
              <p className="text-lg font-semibold">{material.min_stock_level} {material.unit}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Reorder Point</p>
              <p className="text-lg font-semibold">{material.reorder_point} {material.unit}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Added On</p>
              <p className="text-lg font-semibold">{formatDate(material.created_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <MaterialFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        materialId={material.id}
        onSuccess={fetchMaterial}
      />
    </div>
  )
}
