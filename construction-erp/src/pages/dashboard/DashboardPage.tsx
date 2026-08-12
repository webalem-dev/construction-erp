import {
  Building2,
  Users,
  Package,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth.store'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  trend?: string
  color: string
}

function StatCard({ title, value, icon: Icon, trend, color }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
            {trend && (
              <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                <TrendingUp className="w-4 h-4" />
                {trend}
              </div>
            )}
          </div>
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const profile = useAuthStore((state) => state.profile)

  const activities = [
    {
      icon: CheckCircle2,
      text: 'Project "Tower A" milestone completed',
      time: '2 hours ago',
      color: 'text-green-600',
    },
    {
      icon: Clock,
      text: 'New material request from Site 3',
      time: '4 hours ago',
      color: 'text-blue-600',
    },
    {
      icon: AlertCircle,
      text: 'Stock alert: Cement running low',
      time: '6 hours ago',
      color: 'text-orange-600',
    },
    {
      icon: Users,
      text: '5 new employees onboarded',
      time: '1 day ago',
      color: 'text-purple-600',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">
          Welcome back, {profile?.first_name}! Here's what's happening today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Projects"
          value="12"
          icon={Building2}
          trend="+2 this month"
          color="bg-blue-500"
        />
        <StatCard
          title="Total Employees"
          value="248"
          icon={Users}
          trend="+8 this month"
          color="bg-green-500"
        />
        <StatCard
          title="Stock Items"
          value="1,432"
          icon={Package}
          trend="+124 this week"
          color="bg-orange-500"
        />
        <StatCard
          title="Monthly Payroll"
          value="$85K"
          icon={DollarSign}
          trend="On track"
          color="bg-purple-500"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((activity, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0"
                >
                  <div className={`mt-0.5 ${activity.color}`}>
                    <activity.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-900">{activity.text}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Your Access Info */}
        <Card>
          <CardHeader>
            <CardTitle>Your Access Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">
                  Current Role
                </span>
                <span className="text-sm font-bold text-blue-700">
                  {profile?.role?.label}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">
                  Account Status
                </span>
                <span className="text-sm font-bold text-green-700">
                  {profile?.is_active ? '✓ Active' : '✗ Inactive'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">
                  Permissions
                </span>
                <span className="text-sm font-bold text-purple-700">
                  {profile?.permissions?.filter((p) => p.is_granted).length ||
                    0}{' '}
                  granted
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}