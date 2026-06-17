import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import api from '../services/api'

const Navbar = () => {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications')
        setUnreadCount(response.data.unreadCount)
      } catch (error) {
        // Ignore
      }
    }
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <Link to="/dashboard" className="navbar-brand">
        BDMS
      </Link>
      <div className="navbar-links">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/inventory">Inventory</Link>
        <Link to="/requests">Requests</Link>
        {(hasRole('SUPER_ADMIN', 'BLOOD_BANK_ADMIN', 'COORDINATOR', 'LAB_TECHNICIAN')) && (
          <Link to="/donors">Donors</Link>
        )}
        <Link to="/appointments">Appointments</Link>
        <Link to="/notifications">
          Notifications
          {unreadCount > 0 && <span className="badge badge-danger" style={{ marginLeft: '0.5rem' }}>{unreadCount}</span>}
        </Link>
        {hasRole('SUPER_ADMIN', 'BLOOD_BANK_ADMIN') && (
          <Link to="/admin/users">Admin</Link>
        )}
        <Link to="/profile">Profile</Link>
        <button className="btn btn-outline" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  )
}

export default Navbar