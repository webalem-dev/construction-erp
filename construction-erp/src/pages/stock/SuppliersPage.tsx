import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Truck,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Star,
  Edit,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { PermissionGate } from '@/components/shared/PermissionGate'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { SupplierFormDialog } from './SupplierFormDialog'

interface Supplier {
  id: string
  code: string
  name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  city: string | null
  payment_terms: string | null
  rating: number | null
  is_active: boolean
}

export default function SuppliersPage() {
  const navigate = useNavigate()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | undefined>(undefined)

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name')

      if (error) throw error
      setSuppliers(data || [])
    } catch (error: any) {
      toast.error(error.message || 'Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }

  const filteredSuppliers = suppliers.filter(s => {
    const search = searchTerm.toLowerCase()
    return (
      s.name.toLowerCase().includes(search) ||
      s.code.toLowerCase().includes(search) ||
      s.contact_person?.toLowerCase().includes(search) ||
      s.email?.toLowerCase().includes(search)
    )
  })

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-xs text-slate-400">No rating</span>
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${
              i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Suppliers</h1>
          <p className="text-slate-600 mt-1">
            Manage your material suppliers and vendors
          </p>
        </div>
        <PermissionGate module="stock" action="create" subModule="suppliers">
          <Button onClick={() => { setEditingId(undefined); setFormOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Supplier
          </Button>
        </PermissionGate>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Suppliers</p>
                <p className="text-2xl font-bold">{suppliers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Top Rated</p>
                <p className="text-2xl font-bold">
                  {suppliers.filter(s => (s.rating ?? 0) >= 4).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Active</p>
                <p className="text-2xl font-bold">
                  {suppliers.filter(s => s.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Grid */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-slate-600">Loading suppliers...</p>
          </CardContent>
        </Card>
      ) : filteredSuppliers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Truck className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No suppliers found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map(supplier => (
            <Card
              key={supplier.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/stock/suppliers/${supplier.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {supplier.code}
                      </Badge>
                      {supplier.is_active ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 truncate">{supplier.name}</h3>
                    {supplier.contact_person && (
                      <p className="text-sm text-slate-600 mt-1">
                        {supplier.contact_person}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Phone className="w-3.5 h-3.5" />
                      {supplier.phone}
                    </div>
                  )}
                  {supplier.city && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <MapPin className="w-3.5 h-3.5" />
                      {supplier.city}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Rating</p>
                    {renderStars(supplier.rating)}
                  </div>
                  {supplier.payment_terms && (
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Payment</p>
                      <p className="text-xs font-medium">{supplier.payment_terms}</p>
                    </div>
                  )}
                </div>

                <div
                  className="pt-3 mt-3 border-t border-slate-100 flex justify-end gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <PermissionGate module="stock" action="edit" subModule="suppliers">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setEditingId(supplier.id); setFormOpen(true) }}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </PermissionGate>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SupplierFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        supplierId={editingId}
        onSuccess={fetchSuppliers}
      />
    </div>
  )
}