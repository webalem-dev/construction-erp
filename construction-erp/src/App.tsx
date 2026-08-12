import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'

// ============================================
// LAYOUTS & GUARDS
// ============================================
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'

// ============================================
// PUBLIC & UTILITY PAGES
// ============================================
import LoginPage from '@/pages/auth/LoginPage'
import UnauthorizedPage from '@/pages/UnauthorizedPage'
import PlaceholderPage from '@/pages/PlaceholderPage'

// ============================================
// DASHBOARD
// ============================================
import DashboardPage from '@/pages/dashboard/DashboardPage'

// ============================================
// EMPLOYEES MODULE (Batches 8, 9)
// ============================================
import EmployeesPage from '@/pages/employees/EmployeesPage'
import EmployeeDetailPage from '@/pages/employees/EmployeeDetailPage'

// ============================================
// PROJECTS MODULE (Batch 10)
// ============================================
import ProjectsPage from '@/pages/projects/ProjectsPage'
import ProjectDetailPage from '@/pages/projects/ProjectDetailPage'

// ============================================
// STOCK MODULE (Batches 11, 12)
// ============================================
import StockPage from '@/pages/stock/StockPage'
import MaterialDetailPage from '@/pages/stock/MaterialDetailPage'
import SuppliersPage from '@/pages/stock/SuppliersPage'
import SupplierDetailPage from '@/pages/stock/SupplierDetailPage'
import WarehousesPage from '@/pages/stock/WarehousesPage'
import PurchaseOrdersPage from '@/pages/stock/PurchaseOrdersPage'
import PurchaseOrderDetailPage from '@/pages/stock/PurchaseOrderDetailPage'
import MaterialRequestsPage from '@/pages/stock/MaterialRequestsPage'
import MaterialRequestDetailPage from '@/pages/stock/MaterialRequestDetailPage'

// ============================================
// HR & PAYROLL MODULES (Batches 13, 14)
// ============================================
import AttendancePage from '@/pages/hr/AttendancePage'
import LeavePage from '@/pages/hr/LeavePage'
import PayrollPage from '@/pages/hr/PayrollPage'
import PayslipDetailPage from '@/pages/hr/PayslipDetailPage'

// ============================================
// REPORTS MODULE (Batch 15)
// ============================================
import ReportsPage from '@/pages/reports/ReportsPage'

// ============================================
// SETTINGS MODULE (Batches 6, 7, 16, 20)
// ============================================
import UsersPage from '@/pages/settings/UsersPage'
import RolesPage from '@/pages/settings/RolesPage'
import PermissionsPage from '@/pages/settings/PermissionsPage'
import CompanyPage from '@/pages/settings/CompanyPage'

// ============================================
// PROFILE (Batch 16)
// ============================================
import ProfilePage from '@/pages/profile/ProfilePage'

function App() {
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <Routes>
      {/* ============================================ */}
      {/* PUBLIC ROUTES                                */}
      {/* ============================================ */}
      <Route path="/login" element={<LoginPage />} />

      {/* ============================================ */}
      {/* PROTECTED ROUTES                             */}
      {/* ============================================ */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>

          {/* DASHBOARD */}
          <Route path="/" element={<DashboardPage />} />

          {/* ============================================ */}
          {/* PROJECTS MODULE                              */}
          {/* ============================================ */}
          <Route
            element={
              <ProtectedRoute
                requiredModule="projects"
                requiredAction="view"
              />
            }
          >
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
          </Route>

          {/* ============================================ */}
          {/* STOCK MODULE                                 */}
          {/* ============================================ */}
          <Route
            element={
              <ProtectedRoute requiredModule="stock" requiredAction="view" />
            }
          >
            <Route path="/stock" element={<StockPage />} />
            <Route path="/stock/material/:id" element={<MaterialDetailPage />} />
            <Route path="/stock/purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="/stock/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
            <Route path="/stock/material-requests" element={<MaterialRequestsPage />} />
            <Route path="/stock/material-requests/:id" element={<MaterialRequestDetailPage />} />
            <Route path="/stock/warehouses" element={<WarehousesPage />} />
            <Route path="/stock/suppliers" element={<SuppliersPage />} />
            <Route path="/stock/suppliers/:id" element={<SupplierDetailPage />} />
          </Route>

          {/* ============================================ */}
          {/* EMPLOYEES MODULE                             */}
          {/* ============================================ */}
          <Route
            element={
              <ProtectedRoute
                requiredModule="employees"
                requiredAction="view"
              />
            }
          >
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/employees/:id" element={<EmployeeDetailPage />} />
          </Route>

          {/* ============================================ */}
          {/* HR MODULE                                    */}
          {/* ============================================ */}
          <Route
            element={
              <ProtectedRoute requiredModule="hr" requiredAction="view" />
            }
          >
            <Route path="/hr/attendance" element={<AttendancePage />} />
            <Route path="/hr/leave" element={<LeavePage />} />
          </Route>

          {/* ============================================ */}
          {/* PAYROLL MODULE                               */}
          {/* ============================================ */}
          <Route
            element={
              <ProtectedRoute
                requiredModule="payroll"
                requiredAction="view"
              />
            }
          >
            <Route path="/hr/payroll" element={<PayrollPage />} />
            <Route path="/hr/payslip/:id" element={<PayslipDetailPage />} />
          </Route>

          {/* ============================================ */}
          {/* REPORTS MODULE                               */}
          {/* ============================================ */}
          <Route
            element={
              <ProtectedRoute
                requiredModule="reports"
                requiredAction="view"
              />
            }
          >
            <Route path="/reports" element={<ReportsPage />} />
          </Route>

          {/* ============================================ */}
          {/* SETTINGS MODULE - Admin Only                 */}
          {/* ============================================ */}
          <Route
            element={
              <ProtectedRoute requiredRole={['super_admin', 'admin']} />
            }
          >
            <Route
              path="/settings"
              element={
                <PlaceholderPage
                  title="Settings"
                  description="System configuration"
                />
              }
            />
            <Route path="/settings/users" element={<UsersPage />} />
            <Route path="/settings/roles" element={<RolesPage />} />
            <Route path="/settings/permissions" element={<PermissionsPage />} />
            <Route path="/settings/company" element={<CompanyPage />} />
          </Route>

          {/* ============================================ */}
          {/* PROFILE - Available to Everyone              */}
          {/* ============================================ */}
          <Route path="/profile" element={<ProfilePage />} />

          {/* Unauthorized page */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

        </Route>
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App