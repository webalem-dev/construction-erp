import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { formatDate, getStatusColor, getPriorityColor, formatEnum } from '@/lib/utils'
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

import { MaterialRequestFormDialog } from './MaterialRequestFormDialog'

interface MaterialRequest {
  id: string
  mr_number: string
  status: string
  priority: string
  required_date: string
  notes: string | null
  created_at: string
  project: {
    id: string
    name: string
  }
  requested_by: {
    first_name: string
    last_name: string
  } | null
  items_count?: number
}

export default function MaterialRequestsPage() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<MaterialRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('material_requests')
        .select(`
          *,
          project:projects (id, name),
          requested_by:user_profiles!requested_by_id (first_name, last_name),
          items:material_request_items (id)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const enriched = (data as any[])?.map(mr => ({
        ...mr,
        items_count: mr.items?.length || 0,
      })) || []

      setRequests(enriched)
    } catch (error: any) {
      toast.error(error.message || 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('material_requests')
        .update({
          status: 'APPROVED',
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error
      toast.success('Request approved')
      fetchRequests()
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve')
    }
  }

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('material_requests')
        .update({ status: 'REJECTED' })
        .eq('id', id)

      if (error) throw error
      toast.success('Request rejected')
      fetchRequests()
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject')
    }
  }

  const filteredRequests = requests.filter(r => {
    const search = searchTerm.toLowerCase()
    const matchesSearch =
      r.mr_number.toLowerCase().includes(search) ||
      r.project?.name.toLowerCase().includes(search)

    const matchesStatus = filterStatus === 'all' || r.status === filterStatus

    return matchesSearch && matchesStatus
  })

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'PENDING_APPROVAL').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    urgent: requests.filter(r => r.priority === 'HIGH' || r.priority === 'CRITICAL').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Material Requests</h1>
          <p className="text-slate-600 mt-1">
            Manage material requests from project sites
          </p>
        </div>
        <PermissionGate module="stock" action="create" subModule="material_requests">
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </PermissionGate>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total</p>
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
                <p className="text-sm text-slate-600">Pending</p>
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
              <div className="w-12 h-12 rounded-lg bg-red-500 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Urgent</p>
                <p className="text-2xl font-bold">{stats.urgent}</p>
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
                placeholder="Search by MR number or project..."
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
                <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PARTIALLY_ISSUED">Partially Issued</SelectItem>
                <SelectItem value="ISSUED">Issued</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-slate-600">Loading requests...</p>
          </CardContent>
        </Card>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map(request => (
            <Card
              key={request.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/stock/material-requests/${request.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-bold text-slate-900">{request.mr_number}</span>
                      <Badge className={getStatusColor(request.status)}>
                        {formatEnum(request.status)}
                      </Badge>
                      <Badge className={getPriorityColor(request.priority)}>
                        {request.priority}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Project</p>
                        <p className="font-medium truncate">{request.project?.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Requested By</p>
                        <p className="font-medium">
                          {request.requested_by
                            ? `${request.requested_by.first_name} ${request.requested_by.last_name}`
                            : 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Required By</p>
                        <p className="font-medium">{formatDate(request.required_date)}</p>
                      </div>
                    </div>
                    {request.notes && (
                      <p className="text-sm text-slate-600 mt-2 italic">
                        "{request.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Items</p>
                      <p className="text-xl font-bold">{request.items_count}</p>
                    </div>

                    {request.status === 'PENDING_APPROVAL' && (
                      <PermissionGate module="stock" action="approve" subModule="material_requests">
                        <div
                          className="flex gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button size="sm" variant="outline" onClick={handleReject.bind(null, request.id)}>
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                          <Button size="sm" onClick={handleApprove.bind(null, request.id)}>
                            <CheckCircle2 className="w-4 h-4 mr-1" />
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

      <MaterialRequestFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchRequests}
      />
    </div>
  )
}