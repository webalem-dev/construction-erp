import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Package,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  User,
  FileText,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { formatDate, formatEnum, getStatusColor, getPriorityColor } from '@/lib/utils'
import { PermissionGate } from '@/components/shared/PermissionGate'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { IssueMaterialsDialog } from './IssueMaterialsDialog'

interface RequestItem {
  id: string
  material_id: string
  requested_quantity: number
  issued_quantity: number
  notes: string | null
  material: {
    name: string
    code: string
    unit: string
  }
}

interface MaterialRequest {
  id: string
  mr_number: string
  status: string
  priority: string
  required_date: string
  notes: string | null
  created_at: string
  approved_at: string | null
  issued_at: string | null
  project: { id: string; name: string; code: string }
  requested_by: { first_name: string; last_name: string } | null
}

export default function MaterialRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [request, setRequest] = useState<MaterialRequest | null>(null)
  const [items, setItems] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [issueOpen, setIssueOpen] = useState(false)

  useEffect(() => {
    if (id) {
      fetchRequest()
      fetchItems()
    }
  }, [id])

  const fetchRequest = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('material_requests')
        .select(`
          *,
          project:projects (id, name, code),
          requested_by:user_profiles!requested_by_id (first_name, last_name)
        `)
        .eq('id', id!)
        .single()
      if (error) throw error
      setRequest(data as any)
    } catch (error: any) {
      toast.error('Failed to load request')
      navigate('/stock/material-requests')
    } finally {
      setLoading(false)
    }
  }

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('material_request_items')
      .select(`
        id, material_id, requested_quantity, issued_quantity, notes,
        material:materials (name, code, unit)
      `)
      .eq('material_request_id', id!)
    if (!error) setItems((data as any) || [])
  }

  const handleApprove = async () => {
    try {
      const { error } = await supabase
        .from('material_requests')
        .update({
          status: 'APPROVED',
          approved_at: new Date().toISOString(),
        })
        .eq('id', id!)
      if (error) throw error
      toast.success('Request approved')
      fetchRequest()
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve')
    }
  }

  const handleReject = async () => {
    try {
      const { error } = await supabase
        .from('material_requests')
        .update({ status: 'REJECTED' })
        .eq('id', id!)
      if (error) throw error
      toast.success('Request rejected')
      fetchRequest()
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!request) return null

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/stock/material-requests')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Requests
      </Button>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xl font-bold">{request.mr_number}</span>
                <Badge className={getStatusColor(request.status)}>
                  {formatEnum(request.status)}
                </Badge>
                <Badge className={getPriorityColor(request.priority)}>
                  {request.priority}
                </Badge>
              </div>
              <p className="text-slate-600">
                Project: <span className="font-medium">{request.project?.name}</span>
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Created {formatDate(request.created_at)}
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              {request.status === 'PENDING_APPROVAL' && (
                <PermissionGate module="stock" action="approve" subModule="material_requests">
                  <Button variant="outline" onClick={handleReject}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button onClick={handleApprove}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </PermissionGate>
              )}

              {(request.status === 'APPROVED' || request.status === 'PARTIALLY_ISSUED') && (
                <PermissionGate module="stock" action="edit" subModule="material_requests">
                  <Button onClick={() => setIssueOpen(true)}>
                    <Package className="w-4 h-4 mr-2" />
                    Issue Materials
                  </Button>
                </PermissionGate>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Required By</p>
                <p className="font-semibold">{formatDate(request.required_date)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Requested By</p>
                <p className="font-semibold">
                  {request.requested_by
                    ? `${request.requested_by.first_name} ${request.requested_by.last_name}`
                    : 'Unknown'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Items</p>
                <p className="font-semibold">{items.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Requested Items</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No items</p>
          ) : (
            <div className="space-y-2">
              {items.map(item => {
                const pct = item.requested_quantity > 0
                  ? (item.issued_quantity / item.requested_quantity) * 100
                  : 0
                return (
                  <div key={item.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{item.material.name}</p>
                        <p className="text-xs text-slate-500">{item.material.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {item.issued_quantity} / {item.requested_quantity} {item.material.unit}
                        </p>
                        <p className="text-xs text-slate-500">{pct.toFixed(0)}% issued</p>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                      <div
                        className={`h-1.5 rounded-full ${
                          pct >= 100 ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {request.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{request.notes}</p>
          </CardContent>
        </Card>
      )}

      <IssueMaterialsDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        requestId={request.id}
        items={items}
        onSuccess={() => {
          fetchRequest()
          fetchItems()
        }}
      />
    </div>
  )
}