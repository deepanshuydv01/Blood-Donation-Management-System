import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'
import useToast from '../hooks/useToast'

const Appointments = () => {
  const { user, hasRole } = useAuth()
  const { toast, ToastContainer } = useToast()
  const [appointments, setAppointments] = useState([])
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBookModal, setShowBookModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [newAppointment, setNewAppointment] = useState({
    donorId: '',
    appointmentDate: '',
    startTime: '09:00',
    endTime: '10:00',
    notes: ''
  })

  const canBookSlots = hasRole('DONOR')
  const canManageSlots = hasRole('SUPER_ADMIN', 'BLOOD_BANK_ADMIN')

  useEffect(() => {
    fetchAppointments()
  }, [])

  useEffect(() => {
    if (user?.role === 'DONOR' && user?.donor?.id) {
      setNewAppointment(prev => ({ ...prev, donorId: user.donor.id }))
    }
  }, [user])

  const fetchAppointments = async () => {
    try {
      const response = await api.get('/appointments')
      setAppointments(response.data)
    } catch (error) {
      console.error('Failed to fetch appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSlots = async (date) => {
    try {
      const response = await api.get(`/appointments/slots?date=${date}`)
      setSlots(response.data)
    } catch (error) {
      console.error('Failed to fetch slots:', error)
    }
  }

  const handleDateChange = (e) => {
    const date = e.target.value
    setSelectedDate(date)
    setNewAppointment({ ...newAppointment, appointmentDate: date })
    fetchSlots(date)
  }

  const handleBook = async (e) => {
    e.preventDefault()
    if (!newAppointment.appointmentDate) {
      toast.error('Please select a date')
      return
    }
    setIsSubmitting(true)
    try {
      await api.post('/appointments', newAppointment)
      setShowBookModal(false)
      setNewAppointment({
        donorId: user?.donor?.id || '',
        appointmentDate: '',
        startTime: '09:00',
        endTime: '10:00',
        notes: ''
      })
      fetchAppointments()
      toast.success('Appointment booked successfully')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to book appointment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return
    try {
      await api.delete(`/appointments/${id}`)
      fetchAppointments()
      toast.success('Appointment cancelled')
    } catch (error) {
      toast.error('Failed to cancel appointment')
    }
  }

  if (loading) return <Loading />

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Appointments</h1>
        {canBookSlots && (
          <button className="btn btn-primary" onClick={() => setShowBookModal(true)}>
            + Book Appointment
          </button>
        )}
      </div>

      {/* Upcoming Appointments */}
      <div className="card">
        <div className="card-header">Your Appointments</div>
        {appointments.length > 0 ? (
          <div className="grid grid-2">
            {appointments.map(apt => (
              <div key={apt.id} style={{
                padding: '1rem',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <div className="flex-between">
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                      {new Date(apt.appointmentDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    <div style={{ color: '#64748b' }}>
                      {apt.startTime} - {apt.endTime}
                    </div>
                  </div>
                  <span className={`badge ${
                    apt.status === 'SCHEDULED' ? 'badge-success' :
                    apt.status === 'COMPLETED' ? 'badge-info' : 'badge-danger'
                  }`}>
                    {apt.status}
                  </span>
                </div>
                {apt.notes && (
                  <div style={{ marginTop: '0.5rem', color: '#64748b', fontSize: '0.875rem' }}>
                    Note: {apt.notes}
                  </div>
                )}
                {apt.status === 'SCHEDULED' && canBookSlots && (
                  <button
                    className="btn btn-danger"
                    style={{ marginTop: '0.75rem', padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                    onClick={() => handleCancel(apt.id)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#64748b' }}>No appointments scheduled</p>
        )}
      </div>

      {/* Book Modal */}
      <Modal isOpen={showBookModal} onClose={() => setShowBookModal(false)} title="Book Appointment">
        <form onSubmit={handleBook}>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-input"
              value={selectedDate}
              onChange={handleDateChange}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          <div className="grid grid-2" style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <select
                className="form-select"
                value={newAppointment.startTime}
                onChange={(e) => setNewAppointment({ ...newAppointment, startTime: e.target.value })}
              >
                <option value="09:00">09:00</option>
                <option value="10:00">10:00</option>
                <option value="11:00">11:00</option>
                <option value="12:00">12:00</option>
                <option value="14:00">14:00</option>
                <option value="15:00">15:00</option>
                <option value="16:00">16:00</option>
                <option value="17:00">17:00</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">End Time</label>
              <select
                className="form-select"
                value={newAppointment.endTime}
                onChange={(e) => setNewAppointment({ ...newAppointment, endTime: e.target.value })}
              >
                <option value="10:00">10:00</option>
                <option value="11:00">11:00</option>
                <option value="12:00">12:00</option>
                <option value="13:00">13:00</option>
                <option value="15:00">15:00</option>
                <option value="16:00">16:00</option>
                <option value="17:00">17:00</option>
                <option value="18:00">18:00</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-input"
              value={newAppointment.notes}
              onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
              rows="2"
              placeholder="Any special requirements..."
            />
          </div>
          <div className="flex gap-2" style={{ marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Booking...' : 'Book'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setShowBookModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
      <ToastContainer />
    </div>
  )
}

export default Appointments