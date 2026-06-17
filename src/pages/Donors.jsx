import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'
import useToast from '../hooks/useToast'
import { formatBloodType } from '../utils/constants'

const Donors = () => {
  const { user, hasRole } = useAuth()
  const { toast, ToastContainer } = useToast()
  const [donors, setDonors] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [selectedDonor, setSelectedDonor] = useState(null)
  const [showScreeningModal, setShowScreeningModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [screeningFor, setScreeningFor] = useState(null)
  const [screeningData, setScreeningData] = useState({
    haemoglobinLevel: '', bloodPressureSystolic: '', bloodPressureDiastolic: '',
    heartRate: '', bodyTemperature: '', bloodSugarLevel: '', weight: '', notes: ''
  })

  const canScreen = hasRole('SUPER_ADMIN', 'BLOOD_BANK_ADMIN', 'LAB_TECHNICIAN')

  useEffect(() => {
    fetchDonors()
  }, [])

  const fetchDonors = async () => {
    try {
      const response = await api.get('/donors')
      setDonors(response.data.data)
      setPagination(response.data.pagination)
    } catch (error) {
      console.error('Failed to fetch donors:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkEligibility = async (donorId) => {
    try {
      const response = await api.get(`/donors/${donorId}/eligibility`)
      toast.success(`Eligible: ${response.data.eligible ? 'Yes' : 'No'}${response.data.reason ? ' - ' + response.data.reason : ''}`)
    } catch (error) {
      toast.error('Failed to check eligibility')
    }
  }

  const openScreening = (donor) => {
    setScreeningFor(donor)
    setScreeningData({
      haemoglobinLevel: '', bloodPressureSystolic: '', bloodPressureDiastolic: '',
      heartRate: '', bodyTemperature: '', bloodSugarLevel: '', weight: donor.weight || '', notes: ''
    })
    setShowScreeningModal(true)
  }

  const handleScreeningChange = (e) => {
    setScreeningData({ ...screeningData, [e.target.name]: e.target.value })
  }

  const submitScreening = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await api.post('/screenings', {
        donorId: screeningFor.id,
        ...screeningData
      })
      setShowScreeningModal(false)
      toast.success('Screening recorded successfully')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to record screening')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div>
      <h1 className="page-title">Donors</h1>

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Blood Type</th>
              <th>Phone</th>
              <th>Donations</th>
              <th>Last Donation</th>
              <th>Eligible</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {donors.length > 0 ? donors.map(donor => (
              <tr key={donor.id}>
                <td style={{ fontWeight: 600 }}>{donor.firstName} {donor.lastName}</td>
                <td>{donor.user?.email}</td>
                <td>
                  {donor.bloodType ? (
                    <span className="badge badge-danger">{formatBloodType(donor.bloodType)}</span>
                  ) : 'Unknown'}
                </td>
                <td>{donor.phone || 'N/A'}</td>
                <td>{donor._count?.donations || 0}</td>
                <td>{donor.lastDonationDate ? new Date(donor.lastDonationDate).toLocaleDateString() : 'Never'}</td>
                <td>
                  <span className={`badge ${donor.eligibilityStatus ? 'badge-success' : 'badge-danger'}`}>
                    {donor.eligibilityStatus ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>
                  <div className="flex gap-1">
                    <button
                      className="btn btn-outline"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                      onClick={() => checkEligibility(donor.id)}
                    >
                      Eligibility
                    </button>
                    {canScreen && (
                      <button
                        className="btn btn-primary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                        onClick={() => openScreening(donor)}
                      >
                        Screen
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#64748b' }}>
                  No donors found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Screening Modal */}
      <Modal isOpen={showScreeningModal} onClose={() => setShowScreeningModal(false)} title="Health Screening">
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
          {screeningFor?.firstName} {screeningFor?.lastName}
        </p>
        <form onSubmit={submitScreening}>
          <div className="grid grid-2" style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label className="form-label">Haemoglobin (g/dL)</label>
              <input type="number" step="0.1" name="haemoglobinLevel" className="form-input"
                value={screeningData.haemoglobinLevel} onChange={handleScreeningChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Blood Pressure (systolic)</label>
              <input type="number" name="bloodPressureSystolic" className="form-input"
                value={screeningData.bloodPressureSystolic} onChange={handleScreeningChange} />
            </div>
          </div>
          <div className="grid grid-2" style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label className="form-label">Blood Pressure (diastolic)</label>
              <input type="number" name="bloodPressureDiastolic" className="form-input"
                value={screeningData.bloodPressureDiastolic} onChange={handleScreeningChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Heart Rate (bpm)</label>
              <input type="number" name="heartRate" className="form-input"
                value={screeningData.heartRate} onChange={handleScreeningChange} />
            </div>
          </div>
          <div className="grid grid-2" style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label className="form-label">Temperature (°C)</label>
              <input type="number" step="0.1" name="bodyTemperature" className="form-input"
                value={screeningData.bodyTemperature} onChange={handleScreeningChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Blood Sugar (mg/dL)</label>
              <input type="number" name="bloodSugarLevel" className="form-input"
                value={screeningData.bloodSugarLevel} onChange={handleScreeningChange} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Weight (kg)</label>
            <input type="number" step="0.1" name="weight" className="form-input"
              value={screeningData.weight} onChange={handleScreeningChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea name="notes" className="form-input" rows="2"
              value={screeningData.notes} onChange={handleScreeningChange} />
          </div>
          <div className="flex gap-2" style={{ marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Screening'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setShowScreeningModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
      <ToastContainer />
    </div>
  )
}

export default Donors