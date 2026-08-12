import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Warehouse,
  Loader2,
  MapPin,
  Edit,
  Package,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { PermissionGate } from '@/components/shared/PermissionGate'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { WarehouseFormDialog } from './WarehouseFormDialog'

interface Warehouse {
  id: string
  code: string
  name: string
  address: string | null
  city: string | null
  manager_id: string | null
  capacity: number | null
  is_active: boolean
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | undefined>(undefined)

  useEffect(() => {
    fetchWarehouses()
  }, [])

  const fetchWarehouses = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('name')
      if (error) throw error
      setWarehouses(data || [])
    } catch (error: any) {
      toast.error(error.message || 'Failed to load warehouses')
    } finally {
      setLoading(false)
    }
  }

  const filtered = warehouses.filter(w => {
    const s = searchTerm.toLowerCase()
    return (
      w.name.toLowerCase().includes(s) ||
      w.code.toLowerCase().includes(s) ||
      w.city?.toLowerCase().includes(s)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Warehouses</h1>
          <p className="text-slate-600 mt-1">
            Manage your warehouse locations and stock
          </p>
        </div>
        <PermissionGate module="stock" action="create" subModule="warehouses">
          <Button onClick={() => { setEditingId(undefined); setFormOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Warehouse
          </Button>
        </PermissionGate>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
                <Warehouse className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Warehouses</p>
                <p className="text-2xl font-bold">{warehouses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center">
                <Warehouse className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Active</p>
                <p className="text-2xl font-bold">
                  {warehouses.filter(w => w.is_active).length}
                </p>
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
                <p className="text-sm text-slate-600">Cities</p>
                <p className="text-2xl font-bold">
                  {new Set(warehouses.map(w => w.city).filter(Boolean)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search warehouses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-slate-600">Loading warehouses...</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Warehouse className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No warehouses found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(w => (
            <Card key={w.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{w.code}</Badge>
                      {w.is_active ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900">{w.name}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Warehouse className="w-6 h-6 text-blue-600" />
                  </div>
                </div>

                {w.address && (
                  <div className="flex items-start gap-2 text-xs text-slate-600 mb-2">
                    <MapPin className="w-3.5 h-3.5 mt-0.5" />
                    <div>
                      <p>{w.address}</p>
                      {w.city && <p className="text-slate-500">{w.city}</p>}
                    </div>
                  </div>
                )}

                {w.capacity != null && (
                  <p className="text-xs text-slate-500 mt-2">
                    Capacity: {w.capacity} units
                  </p>
                )}

                <PermissionGate module="stock" action="edit" subModule="warehouses">
                  <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setEditingId(w.id); setFormOpen(true) }}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                </PermissionGate>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <WarehouseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        warehouseId={editingId}
        onSuccess={fetchWarehouses}
      />
    </div>
  )
}