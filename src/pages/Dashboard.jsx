import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import Loading from '../components/Loading'
import { formatBloodType, formatDate } from '../utils/constants'

const Dashboard = () => {
  const { user, hasRole } = useAuth()
  const [stats, setStats] = useState(null)
  const [inventorySummary, setInventorySummary] = useState(null)
  const [recentRequests, setRecentRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, inventoryRes, requestsRes] = await Promise.all([
          hasRole('SUPER_ADMIN', 'BLOOD_BANK_ADMIN') ? api.get('/admin/stats') : Promise.resolve({ data: {} }),
          api.get('/inventory/summary/dashboard'),
          api.get('/requests')
        ])

        setStats(statsRes.data)
        setInventorySummary(inventoryRes.data)
        setRecentRequests(requestsRes.data.data.slice(0, 5))
      } catch (error) {
        console.error('Dashboard fetch error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <Loading />

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      {/* Welcome Section */}
      <div className="card">
        <h2 style={{ marginBottom: '0.5rem' }}>Welcome, {user?.email}</h2>
        <p style={{ color: '#64748b' }}>Role: {user?.role?.replace('_', ' ')}</p>
      </div>

      {/* Admin Stats */}
      {hasRole('SUPER_ADMIN', 'BLOOD_BANK_ADMIN') && stats && (
        <div className="grid grid-4" style={{ marginTop: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-label">Total Users</div>
            <div className="stat-value">{stats.totalUsers}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Donors</div>
            <div className="stat-value">{stats.totalDonors}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Blood Units</div>
            <div className="stat-value">{stats.totalBloodUnits}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Available Units</div>
            <div className="stat-value" style={{ color: '#22c55e' }}>{stats.availableUnits}</div>
          </div>
        </div>
      )}

      {/* Inventory Summary */}
      <div className="grid grid-2" style={{ marginTop: '1.5rem' }}>
        <div className="card">
          <div className="card-header">Blood Inventory</div>
          <div className="grid grid-2">
            <div className="stat-card" style={{ background: '#f0fdf4', padding: '1rem' }}>
              <div className="stat-label">Available</div>
              <div className="stat-value" style={{ color: '#22c55e', fontSize: '1.5rem' }}>{inventorySummary?.available || 0}</div>
            </div>
            <div className="stat-card" style={{ background: '#fef3c7', padding: '1rem' }}>
              <div className="stat-label">Expiring Soon</div>
              <div className="stat-value" style={{ color: '#d97706', fontSize: '1.5rem' }}>{inventorySummary?.expiringSoon || 0}</div>
            </div>
          </div>

          {inventorySummary?.byType?.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ marginBottom: '0.5rem', color: '#64748b' }}>By Blood Type</h4>
              <div className="grid grid-2" style={{ gap: '0.5rem' }}>
                {inventorySummary.byType.map((item) => (
                  <div key={item.bloodType} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: '#f8fafc', borderRadius: '4px' }}>
                    <span>{formatBloodType(item.bloodType)}</span>
                    <span style={{ fontWeight: 600 }}>{item._count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">Recent Requests</div>
          {recentRequests.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((req) => (
                  <tr key={req.id}>
                    <td>{formatBloodType(req.bloodType)}</td>
                    <td>{req.quantity}</td>
                    <td>
                      <span className={`badge ${req.priority === 'EMERGENCY' ? 'badge-danger' : req.priority === 'URGENT' ? 'badge-warning' : 'badge-info'}`}>
                        {req.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${req.status === 'FULFILLED' ? 'badge-success' : req.status === 'PENDING' ? 'badge-warning' : 'badge-info'}`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#64748b' }}>No requests yet</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">Quick Actions</div>
        <div className="flex gap-2">
          <a href="/inventory" className="btn btn-primary">View Inventory</a>
          <a href="/requests" className="btn btn-secondary">Blood Requests</a>
          <a href="/appointments" className="btn btn-outline">Book Appointment</a>
        </div>
      </div>
    </div>
  )
}

export default Dashboard