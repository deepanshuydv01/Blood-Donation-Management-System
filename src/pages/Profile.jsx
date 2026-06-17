import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import Loading from '../components/Loading'
import useToast from '../hooks/useToast'
import { BLOOD_TYPES, formatBloodType } from '../utils/constants'

const formatScreeningDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

const Profile = () => {
  const { user } = useAuth()
  const { toast, ToastContainer } = useToast()
  const [donor, setDonor] = useState(null)
  const [screenings, setScreenings] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    bloodType: '',
    address: '',
    city: '',
    state: '',
    weight: ''
  })

  useEffect(() => {
    const fetchDonor = async () => {
      try {
        const response = await api.get(`/donors/${user.donor.id}`)
        setDonor(response.data)
        setFormData({
          firstName: response.data.firstName || '',
          lastName: response.data.lastName || '',
          phone: response.data.phone || '',
          bloodType: response.data.bloodType || '',
          address: response.data.address || '',
          city: response.data.city || '',
          state: response.data.state || '',
          weight: response.data.weight || ''
        })
        if (response.data.id) {
          const screenRes = await api.get(`/screenings/${response.data.id}`)
          setScreenings(screenRes.data)
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error)
      } finally {
        setLoading(false)
      }
    }
    if (user?.donor?.id) {
      fetchDonor()
    } else {
      setLoading(false)
    }
  }, [user?.donor?.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.firstName || !formData.lastName) {
      toast.error('First name and last name are required')
      return
    }
    setIsSubmitting(true)
    try {
      const response = await api.put(`/donors/${donor?.id}`, formData)
      setDonor(response.data)
      setEditing(false)
      toast.success('Profile updated successfully')
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  if (loading) return <Loading />

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>My Profile</h1>
        {donor && !editing && (
          <button className="btn btn-primary" onClick={() => setEditing(true)}>
            Edit Profile
          </button>
        )}
      </div>

      {/* Profile Info */}
      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">Personal Information</div>
          {editing ? (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2" style={{ marginBottom: 0 }}>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    className="form-input"
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    className="form-input"
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  className="form-input"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input
                  type="text"
                  name="address"
                  className="form-input"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>
              <div className="grid grid-2" style={{ marginBottom: 0 }}>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    name="city"
                    className="form-input"
                    value={formData.city}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input
                    type="text"
                    name="state"
                    className="form-input"
                    value={formData.state}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="flex gap-2" style={{ marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Name</div>
                <div style={{ fontWeight: 500 }}>{donor?.firstName} {donor?.lastName}</div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Email</div>
                <div>{user?.email}</div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Phone</div>
                <div>{donor?.phone || 'Not provided'}</div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Date of Birth</div>
                <div>{donor?.dateOfBirth ? new Date(donor.dateOfBirth).toLocaleDateString() : 'Not provided'}</div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Gender</div>
                <div>{donor?.gender || 'Not provided'}</div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Address</div>
                <div>{donor?.address || 'Not provided'}</div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Weight</div>
                <div>{donor?.weight ? `${donor.weight} kg` : 'Not provided'}</div>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">Blood Information</div>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Blood Type</div>
            {editing ? (
              <select
                name="bloodType"
                className="form-select"
                value={formData.bloodType}
                onChange={handleChange}
              >
                <option value="">Select</option>
                {BLOOD_TYPES.map(type => (
                  <option key={type} value={type}>{formatBloodType(type)}</option>
                ))}
              </select>
            ) : (
              <div style={{ fontWeight: 600, color: '#dc2626', fontSize: '1.25rem' }}>
                {formatBloodType(donor?.bloodType)}
              </div>
            )}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Donation Status</div>
            <span className={`badge ${donor?.eligibilityStatus ? 'badge-success' : 'badge-danger'}`}>
              {donor?.eligibilityStatus ? 'Eligible to Donate' : 'Not Eligible'}
            </span>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Last Donation</div>
            <div>{donor?.lastDonationDate ? new Date(donor.lastDonationDate).toLocaleDateString() : 'No donations yet'}</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Total Donations</div>
            <div style={{ fontWeight: 600 }}>{donor?.donations?.length || 0}</div>
          </div>
        </div>
      </div>

      {/* Health Screenings */}
      {screenings.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">Health Screenings</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Hb (g/dL)</th>
                  <th>BP (mmHg)</th>
                  <th>Heart Rate</th>
                  <th>Temp (°C)</th>
                  <th>Blood Sugar</th>
                  <th>Weight</th>
                </tr>
              </thead>
              <tbody>
                {screenings.slice(0, 5).map(s => (
                  <tr key={s.id}>
                    <td>{formatScreeningDate(s.screeningDate)}</td>
                    <td>{s.haemoglobinLevel ?? '-'}</td>
                    <td>{s.bloodPressureSystolic ? `${s.bloodPressureSystolic}/${s.bloodPressureDiastolic}` : '-'}</td>
                    <td>{s.heartRate ? `${s.heartRate} bpm` : '-'}</td>
                    <td>{s.bodyTemperature ?? '-'}</td>
                    <td>{s.bloodSugarLevel ? `${s.bloodSugarLevel} mg/dL` : '-'}</td>
                    <td>{s.weight ? `${s.weight} kg` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Account Info */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">Account Information</div>
        <div className="grid grid-2">
          <div>
            <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Role</div>
            <div style={{ fontWeight: 500 }}>{user?.role?.replace('_', ' ')}</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Member Since</div>
            <div>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</div>
          </div>
        </div>
      </div>

      {!donor && user?.role === 'DONOR' && (
        <div className="card alert alert-info" style={{ marginTop: '1.5rem' }}>
          <h4>Complete Your Profile</h4>
          <p>Please create your donor profile to book appointments and track donations.</p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setEditing(true)}>
            Create Profile
          </button>
        </div>
      )}
      <ToastContainer />
    </div>
  )
}

export default Profile