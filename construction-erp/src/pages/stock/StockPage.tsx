import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Package,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Warehouse,
  DollarSign,
  Edit,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
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
  stock_items: {
    quantity: number
    warehouse: {
      name: string
    }
  }[]
}

export default function StockPage() {
  const navigate = useNavigate()
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showLowStock, setShowLowStock] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | undefined>(undefined)

  useEffect(() => {
    fetchMaterials()
  }, [])

  const fetchMaterials = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('materials')
        .select(`
          *,
          stock_items (
            quantity,
            warehouse:warehouses (name)
          )
        `)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setMaterials((data as any) || [])
    } catch (error: any) {
      toast.error(error.message || 'Failed to load materials')
    } finally {
      setLoading(false)
    }
  }

  const getTotalStock = (material: Material): number => {
    return material.stock_items?.reduce((sum, s) => sum + Number(s.quantity), 0) || 0
  }

  const isLowStock = (material: Material): boolean => {
    const total = getTotalStock(material)
    return total <= material.reorder_point
  }

  // Get unique categories
  const categories = Array.from(new Set(materials.map(m => m.category))).sort()

  const filteredMaterials = materials.filter(m => {
    const search = searchTerm.toLowerCase()
    const matchesSearch = 
      m.name.toLowerCase().includes(search) ||
      m.code.toLowerCase().includes(search) ||
      m.category.toLowerCase().includes(search)
    
    const matchesCategory = filterCategory === 'all' || m.category === filterCategory
    const matchesLowStock = !showLowStock || isLowStock(m)
    
    return matchesSearch && matchesCategory && matchesLowStock
  })

  const totalValue = materials.reduce((sum, m) => {
    return sum + (getTotalStock(m) * Number(m.unit_price))
  }, 0)

  const lowStockCount = materials.filter(isLowStock).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Stock Inventory</h1>
          <p className="text-slate-600 mt-1">
            Manage materials, quantities and stock levels
          </p>
        </div>
        <PermissionGate module="stock" action="create">
          <Button onClick={() => { setEditingId(undefined); setFormOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Material
          </Button>
        </PermissionGate>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Items</p>
                <p className="text-2xl font-bold">{materials.length}</p>
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
              <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Low Stock</p>
                <p className="text-2xl font-bold">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center">
                <Warehouse className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Categories</p>
                <p className="text-2xl font-bold">{categories.length}</p>
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
                placeholder="Search by name, code, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showLowStock ? 'default' : 'outline'}
              onClick={() => setShowLowStock(!showLowStock)}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Low Stock Only
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Materials Table */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-slate-600">Loading materials...</p>
          </CardContent>
        </Card>
      ) : filteredMaterials.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No materials found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Item</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase">Category</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase">Unit Price</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase">Current Stock</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase">Reorder Point</th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase">Total Value</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMaterials.map(material => {
                    const totalStock = getTotalStock(material)
                    const totalValue = totalStock * Number(material.unit_price)
                    const isLow = isLowStock(material)
                    
                    return (
                      <tr key={material.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-slate-900">{material.name}</p>
                            <p className="text-xs text-slate-500">{material.code}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary">{material.category}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                          {formatCurrency(Number(material.unit_price))}
                          <span className="text-xs text-slate-500 ml-1">/ {material.unit}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="font-semibold text-slate-900">
                            {totalStock.toLocaleString()} <span className="text-xs text-slate-500">{material.unit}</span>
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-slate-600">
                          {material.reorder_point.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isLow ? (
                            <Badge className="bg-red-100 text-red-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              In Stock
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold">
                          {formatCurrency(totalValue)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <PermissionGate module="stock" action="edit">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => navigate(`/stock/material/${material.id}`)}
                                title="View details"
                              >
                                <Package className="w-4 h-4 text-slate-500" />
                              </Button>
                            </PermissionGate>
                            <PermissionGate module="stock" action="edit">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => { setEditingId(material.id); setFormOpen(true) }}
                                title="Edit material"
                              >
                                <Edit className="w-4 h-4 text-slate-500" />
                              </Button>
                            </PermissionGate>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <MaterialFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        materialId={editingId}
        onSuccess={fetchMaterials}
      />
    </div>
  )
}