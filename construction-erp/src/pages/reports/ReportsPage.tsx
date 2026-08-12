import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Building2,
  Package,
  Download,
  Calendar,
  Loader2,
  Activity,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'

import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PermissionGate } from '@/components/shared/PermissionGate'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

interface ReportStats {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  totalEmployees: number
  activeEmployees: number
  totalMaterials: number
  totalStockValue: number
  totalSuppliers: number
  totalPayroll: number
  pendingLeaves: number
  pendingPOs: number
  lowStockCount: number
}

interface ChartData {
  name: string
  value: number
  color?: string
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [projectStatus, setProjectStatus] = useState<ChartData[]>([])
  const [employeesByDept, setEmployeesByDept] = useState<ChartData[]>([])
  const [stockByCategory, setStockByCategory] = useState<ChartData[]>([])
  const [monthlyPayroll, setMonthlyPayroll] = useState<any[]>([])
  const [projectBudgets, setProjectBudgets] = useState<any[]>([])
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([])

  useEffect(() => {
    fetchAllReports()
  }, [])

  const fetchAllReports = async () => {
    try {
      setLoading(true)
      
      await Promise.all([
        fetchStats(),
        fetchProjectStatus(),
        fetchEmployeesByDepartment(),
        fetchStockByCategory(),
        fetchMonthlyPayroll(),
        fetchProjectBudgets(),
        fetchAttendanceTrend(),
      ])
    } catch (error: any) {
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    // Projects stats
    const { data: projects } = await supabase
      .from('projects')
      .select('status')
    
    // Employees stats  
    const { data: employees } = await supabase
      .from('employees')
      .select('status')
    
    // Materials stats
    const { data: materials } = await supabase
      .from('materials')
      .select('unit_price, reorder_point, stock_items(quantity)')
    
    // Suppliers count
    const { count: suppliersCount } = await supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true })
    
    // Payroll total
    const { data: payrolls } = await supabase
      .from('payroll_periods')
      .select('total_net')
      .eq('status', 'APPROVED')
    
    // Pending leaves
    const { count: leavesCount } = await supabase
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING')
    
    // Pending POs
    const { count: posCount } = await supabase
      .from('purchase_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING_APPROVAL')

    // Calculate stock value
    let totalStockValue = 0
    let lowStockCount = 0
    materials?.forEach((m: any) => {
      const totalStock = m.stock_items?.reduce((sum: number, s: any) => sum + Number(s.quantity), 0) || 0
      totalStockValue += totalStock * Number(m.unit_price)
      if (totalStock <= m.reorder_point) lowStockCount++
    })

    setStats({
      totalProjects: projects?.length || 0,
      activeProjects: projects?.filter(p => p.status === 'IN_PROGRESS').length || 0,
      completedProjects: projects?.filter(p => p.status === 'COMPLETED').length || 0,
      totalEmployees: employees?.length || 0,
      activeEmployees: employees?.filter(e => e.status === 'ACTIVE').length || 0,
      totalMaterials: materials?.length || 0,
      totalStockValue,
      totalSuppliers: suppliersCount || 0,
      totalPayroll: payrolls?.reduce((sum, p) => sum + Number(p.total_net), 0) || 0,
      pendingLeaves: leavesCount || 0,
      pendingPOs: posCount || 0,
      lowStockCount,
    })
  }

  const fetchProjectStatus = async () => {
    const { data } = await supabase
      .from('projects')
      .select('status')
    
    const grouped: Record<string, number> = {}
    data?.forEach(p => {
      grouped[p.status] = (grouped[p.status] || 0) + 1
    })
    
    setProjectStatus(
      Object.entries(grouped).map(([status, count], i) => ({
        name: status.replace('_', ' '),
        value: count,
        color: COLORS[i % COLORS.length],
      }))
    )
  }

  const fetchEmployeesByDepartment = async () => {
    const { data } = await supabase
      .from('employees')
      .select('department:departments(name)')
      .eq('status', 'ACTIVE')
    
    const grouped: Record<string, number> = {}
    data?.forEach((e: any) => {
      const dept = e.department?.name || 'Unassigned'
      grouped[dept] = (grouped[dept] || 0) + 1
    })
    
    setEmployeesByDept(
      Object.entries(grouped).map(([name, value], i) => ({
        name,
        value,
        color: COLORS[i % COLORS.length],
      }))
    )
  }

  const fetchStockByCategory = async () => {
    const { data } = await supabase
      .from('materials')
      .select('category, unit_price, stock_items(quantity)')
    
    const grouped: Record<string, number> = {}
    data?.forEach((m: any) => {
      const totalQty = m.stock_items?.reduce((sum: number, s: any) => sum + Number(s.quantity), 0) || 0
      const value = totalQty * Number(m.unit_price)
      grouped[m.category] = (grouped[m.category] || 0) + value
    })
    
    setStockByCategory(
      Object.entries(grouped)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([name, value], i) => ({
          name,
          value: Math.round(value),
          color: COLORS[i % COLORS.length],
        }))
    )
  }

  const fetchMonthlyPayroll = async () => {
    const { data } = await supabase
      .from('payroll_periods')
      .select('month, year, total_gross, total_net, total_deductions')
      .order('year')
      .order('month')
      .limit(6)
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    setMonthlyPayroll(
      (data || []).map(p => ({
        month: `${monthNames[p.month - 1]} ${p.year}`,
        Gross: Number(p.total_gross),
        Net: Number(p.total_net),
        Deductions: Number(p.total_deductions),
      }))
    )
  }

  const fetchProjectBudgets = async () => {
    const { data } = await supabase
      .from('projects')
      .select('name, estimated_budget, actual_cost')
      .order('estimated_budget', { ascending: false })
      .limit(5)
    
    setProjectBudgets(
      (data || []).map(p => ({
        name: p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name,
        Estimated: Number(p.estimated_budget),
        Actual: Number(p.actual_cost),
      }))
    )
  }

  const fetchAttendanceTrend = async () => {
    // Last 7 days attendance summary
    const dates: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dates.push(d.toISOString().split('T')[0])
    }
    
    const results = await Promise.all(
      dates.map(async date => {
        const { data } = await supabase
          .from('attendance')
          .select('status')
          .eq('date', date)
        
        const present = data?.filter(a => a.status === 'PRESENT').length || 0
        const absent = data?.filter(a => a.status === 'ABSENT').length || 0
        const onLeave = data?.filter(a => a.status === 'ON_LEAVE').length || 0
        
        return {
          date: new Date(date).toLocaleDateString('en', { weekday: 'short' }),
          Present: present,
          Absent: absent,
          Leave: onLeave,
        }
      })
    )
    
    setAttendanceTrend(results)
  }

  const handleExport = () => {
    toast.info('Export feature coming soon!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-slate-600 mt-1">
            Business insights and performance metrics
          </p>
        </div>
        <PermissionGate module="reports" action="export">
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </PermissionGate>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={Building2}
          label="Active Projects"
          value={stats.activeProjects}
          subValue={`${stats.totalProjects} total`}
          color="bg-blue-500"
        />
        <MetricCard
          icon={Users}
          label="Active Employees"
          value={stats.activeEmployees}
          subValue={`${stats.totalEmployees} total`}
          color="bg-green-500"
        />
        <MetricCard
          icon={Package}
          label="Stock Value"
          value={formatCurrency(stats.totalStockValue)}
          subValue={`${stats.totalMaterials} items`}
          color="bg-orange-500"
          large
        />
        <MetricCard
          icon={DollarSign}
          label="Total Payroll"
          value={formatCurrency(stats.totalPayroll)}
          subValue="All periods"
          color="bg-purple-500"
          large
        />
      </div>

      {/* Alerts */}
      {(stats.pendingLeaves > 0 || stats.pendingPOs > 0 || stats.lowStockCount > 0) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-yellow-700" />
              <div className="flex-1 flex flex-wrap gap-3">
                <span className="font-medium text-yellow-900">Action Required:</span>
                {stats.pendingLeaves > 0 && (
                  <Badge className="bg-yellow-200 text-yellow-900">
                    {stats.pendingLeaves} pending leave{stats.pendingLeaves > 1 ? 's' : ''}
                  </Badge>
                )}
                {stats.pendingPOs > 0 && (
                  <Badge className="bg-yellow-200 text-yellow-900">
                    {stats.pendingPOs} PO{stats.pendingPOs > 1 ? 's' : ''} to approve
                  </Badge>
                )}
                {stats.lowStockCount > 0 && (
                  <Badge className="bg-red-200 text-red-900">
                    {stats.lowStockCount} low stock item{stats.lowStockCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="workforce">Workforce</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Status Pie */}
            <Card>
              <CardHeader>
                <CardTitle>Project Status Distribution</CardTitle>
                <CardDescription>Current state of all projects</CardDescription>
              </CardHeader>
              <CardContent>
                {projectStatus.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    No project data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={projectStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: any) => 
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {projectStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Employees by Department */}
            <Card>
              <CardHeader>
                <CardTitle>Employees by Department</CardTitle>
                <CardDescription>Active workforce distribution</CardDescription>
              </CardHeader>
              <CardContent>
                {employeesByDept.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    No employee data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={employeesByDept}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" name="Employees">
                        {employeesByDept.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Attendance Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Trend (Last 7 Days)</CardTitle>
              <CardDescription>Daily attendance breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceTrend.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  No attendance data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="Present" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="Absent" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="Leave" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROJECTS TAB */}
        <TabsContent value="projects" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Budgets Comparison</CardTitle>
              <CardDescription>Estimated vs actual costs (top 5)</CardDescription>
            </CardHeader>
            <CardContent>
              {projectBudgets.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  No project data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={projectBudgets}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={11} />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="Estimated" fill="#3B82F6" />
                    <Bar dataKey="Actual" fill="#F59E0B" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-bold">{stats.totalProjects}</p>
                <p className="text-sm text-slate-600 mt-1">Total Projects</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-bold">{stats.activeProjects}</p>
                <p className="text-sm text-slate-600 mt-1">Active Projects</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-bold">{stats.completedProjects}</p>
                <p className="text-sm text-slate-600 mt-1">Completed</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* WORKFORCE TAB */}
        <TabsContent value="workforce" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Department Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={employeesByDept}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }: any) => `${name}: ${value}`}
                    >
                      {employeesByDept.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attendance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Present" stroke="#10B981" strokeWidth={2} />
                    <Line type="monotone" dataKey="Absent" stroke="#EF4444" strokeWidth={2} />
                    <Line type="monotone" dataKey="Leave" stroke="#F59E0B" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* FINANCIALS TAB */}
        <TabsContent value="financials" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Payroll Trend</CardTitle>
              <CardDescription>Gross, Net and Deductions</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyPayroll.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  No payroll data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={monthlyPayroll}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="Gross" fill="#3B82F6" />
                    <Bar dataKey="Deductions" fill="#EF4444" />
                    <Bar dataKey="Net" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stock Value by Category</CardTitle>
              <CardDescription>Inventory investment breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {stockByCategory.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  No stock data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={stockByCategory} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                    <Bar dataKey="value" name="Value">
                      {stockByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Metric Card Component
interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  subValue?: string
  color: string
  large?: boolean
}

function MetricCard({ icon: Icon, label, value, subValue, color, large }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-600">{label}</p>
            <p className={`font-bold text-slate-900 mt-2 ${large ? 'text-xl' : 'text-3xl'}`}>
              {value}
            </p>
            {subValue && (
              <p className="text-xs text-slate-500 mt-1">{subValue}</p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color} flex-shrink-0`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}