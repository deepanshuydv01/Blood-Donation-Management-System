import { useEffect, useState } from 'react'
import api from '../services/api'
import Loading from '../components/Loading'

const Notifications = () => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications')
      setNotifications(response.data.notifications)
      setUnreadCount(response.data.unreadCount)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, isRead: true } : n
      ))
      setUnreadCount(Math.max(0, unreadCount - 1))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications(notifications.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`)
      setNotifications(notifications.filter(n => n.id !== id))
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const formatTime = (date) => {
    const now = new Date()
    const notifDate = new Date(date)
    const diffMs = now - notifDate
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return notifDate.toLocaleDateString()
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'LOW_STOCK': return '⚠️'
      case 'EXPIRY': return '📅'
      case 'REQUEST_STATUS': return '🏥'
      case 'REMINDER': return '🔔'
      default: return '📢'
    }
  }

  if (loading) return <Loading />

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          Notifications
          {unreadCount > 0 && (
            <span className="badge badge-danger" style={{ marginLeft: '0.75rem' }}>
              {unreadCount} unread
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button className="btn btn-outline" onClick={markAllAsRead}>
            Mark All as Read
          </button>
        )}
      </div>

      {notifications.length > 0 ? (
        <div className="card" style={{ padding: 0 }}>
          {notifications.map(notif => (
            <div
              key={notif.id}
              style={{
                padding: '1rem',
                borderBottom: '1px solid var(--border)',
                background: notif.isRead ? 'white' : '#f0f9ff',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem'
              }}
            >
              <div style={{ fontSize: '1.5rem' }}>{getTypeIcon(notif.type)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{notif.title}</div>
                <div style={{ color: '#64748b', fontSize: '0.875rem' }}>{notif.message}</div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                  {formatTime(notif.createdAt)}
                </div>
              </div>
              <div className="flex gap-1">
                {!notif.isRead && (
                  <button
                    className="btn btn-outline"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    onClick={() => markAsRead(notif.id)}
                  >
                    Mark Read
                  </button>
                )}
                <button
                  className="btn btn-outline"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  onClick={() => deleteNotification(notif.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#64748b' }}>No notifications</p>
        </div>
      )}
    </div>
  )
}

export default Notifications