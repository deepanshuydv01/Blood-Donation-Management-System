import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Requests from './pages/Requests'
import Donors from './pages/Donors'
import Appointments from './pages/Appointments'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'
import AdminUsers from './pages/AdminUsers'
import Loading from './components/Loading'

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) return <Loading />

  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" />
  }

  return children
}

const App = () => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <Loading />

  return (
    <div className="app">
      {isAuthenticated && <Navbar />}
      <div className="main-content">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/inventory" element={
            <ProtectedRoute>
              <Inventory />
            </ProtectedRoute>
          } />

          <Route path="/requests" element={
            <ProtectedRoute>
              <Requests />
            </ProtectedRoute>
          } />

          <Route path="/donors" element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BLOOD_BANK_ADMIN', 'COORDINATOR', 'LAB_TECHNICIAN']}>
              <Donors />
            </ProtectedRoute>
          } />

          <Route path="/appointments" element={
            <ProtectedRoute>
              <Appointments />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          <Route path="/notifications" element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          } />

          <Route path="/admin/users" element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BLOOD_BANK_ADMIN']}>
              <AdminUsers />
            </ProtectedRoute>
          } />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
          <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
        </Routes>
      </div>
    </div>
  )
}

export default App