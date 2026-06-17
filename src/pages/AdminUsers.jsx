import { useEffect, useState } from 'react'
import api from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'
import useToast from '../hooks/useToast'

const ROLES = ['SUPER_ADMIN', 'BLOOD_BANK_ADMIN', 'HOSPITAL_STAFF', 'LAB_TECHNICIAN', 'DONOR', 'COORDINATOR']

const AdminUsers = () => {
  const { toast, ToastContainer } = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [stats, setStats] = useState(null)
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'DONOR'
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/stats')
      ])
      setUsers(usersRes.data.data)
      setPagination(usersRes.data.pagination)
      setStats(statsRes.data)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    if (!newUser.email || !newUser.password) {
      toast.error('Email and password are required')
      return
    }
    if (newUser.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setIsSubmitting(true)
    try {
      await api.post('/admin/users', newUser)
      setShowCreateModal(false)
      setNewUser({ email: '', password: '', role: 'DONOR' })
      fetchData()
      toast.success('User created successfully')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateRole = async (userId, newRole) => {
    if (!confirm(`Change role to ${newRole}?`)) return
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole })
      fetchData()
      toast.success('Role updated')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update role')
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    try {
      await api.delete(`/admin/users/${userId}`)
      fetchData()
      toast.success('User deleted')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete user')
    }
  }

  if (loading) return <Loading />

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>User Management</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Add User
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-label">Total Users</div>
            <div className="stat-value">{stats.totalUsers}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Donors</div>
            <div className="stat-value">{stats.totalDonors}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Blood Units</div>
            <div className="stat-value">{stats.totalBloodUnits}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending Requests</div>
            <div className="stat-value" style={{ color: '#f59e0b' }}>{stats.pendingRequests}</div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Profile</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? users.map(user => (
              <tr key={user.id}>
                <td style={{ fontWeight: 500 }}>{user.email}</td>
                <td>
                  <span className={`badge ${
                    user.role === 'SUPER_ADMIN' ? 'badge-danger' :
                    user.role === 'BLOOD_BANK_ADMIN' ? 'badge-warning' : 'badge-info'
                  }`}>
                    {user.role.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  {user.donor ? (
                    <span>{user.donor.firstName} {user.donor.lastName}</span>
                  ) : user.staff ? (
                    <span>{user.staff.firstName} {user.staff.lastName}</span>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>No profile</span>
                  )}
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <select
                    className="form-select"
                    style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                    value={user.role}
                    onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                  >
                    {ROLES.map(role => (
                      <option key={role} value={role}>{role.replace('_', ' ')}</option>
                    ))}
                  </select>
                  <button
                    className="btn btn-danger"
                    style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#64748b' }}>
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create User">
        <form onSubmit={handleCreateUser}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              minLength={8}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select
              className="form-select"
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            >
              {ROLES.map(role => (
                <option key={role} value={role}>{role.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2" style={{ marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
      <ToastContainer />
    </div>
  )
}

export default AdminUsers