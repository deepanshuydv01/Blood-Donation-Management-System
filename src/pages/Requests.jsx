import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'
import useToast from '../hooks/useToast'
import { BLOOD_TYPES, formatBloodType } from '../utils/constants'

const Requests = () => {
  const { user, hasRole } = useAuth()
  const { toast, ToastContainer } = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingRequest, setEditingRequest] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableUnits, setAvailableUnits] = useState([])
  const [newRequest, setNewRequest] = useState({
    bloodType: '',
    quantity: 1,
    priority: 'NORMAL',
    hospitalId: '',
    patientName: '',
    patientContact: '',
    requesterRelation: 'self',
    notes: ''
  })
  const [editForm, setEditForm] = useState({
    bloodType: '',
    quantity: 1,
    priority: 'NORMAL',
    patientName: '',
    patientContact: '',
    requesterRelation: 'self',
    notes: ''
  })

  const isStaff = hasRole('HOSPITAL_STAFF', 'SUPER_ADMIN', 'BLOOD_BANK_ADMIN')
  const canFulfill = hasRole('SUPER_ADMIN', 'BLOOD_BANK_ADMIN')

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const response = await api.get('/requests')
      setRequests(response.data.data)
      setPagination(response.data.pagination)
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRequest = async (e) => {
    e.preventDefault()
    if (!newRequest.bloodType) {
      toast.error('Blood type is required')
      return
    }
    if (newRequest.quantity < 1) {
      toast.error('Quantity must be at least 1')
      return
    }
    setIsSubmitting(true)
    try {
      const payload = { ...newRequest }
      if (!payload.hospitalId) delete payload.hospitalId
      if (!payload.patientName) delete payload.patientName
      if (!payload.patientContact) delete payload.patientContact
      await api.post('/requests', payload)
      setShowCreateModal(false)
      setNewRequest({
        bloodType: '', quantity: 1, priority: 'NORMAL',
        hospitalId: '', patientName: '', patientContact: '',
        requesterRelation: 'self', notes: ''
      })
      fetchRequests()
      toast.success('Blood request created successfully')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const cancelRequest = async (id) => {
    if (!confirm('Cancel this request?')) return
    try {
      await api.delete(`/requests/${id}`)
      fetchRequests()
      toast.success('Request cancelled')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to cancel')
    }
  }

  const openEditModal = (req) => {
    setEditingRequest(req)
    setEditForm({
      bloodType: req.bloodType,
      quantity: req.quantity,
      priority: req.priority,
      patientName: req.patientName || '',
      patientContact: req.patientContact || '',
      requesterRelation: req.requesterRelation || 'self',
      notes: req.notes || ''
    })
    setShowEditModal(true)
  }

  const handleEditRequest = async (e) => {
    e.preventDefault()
    if (!editForm.bloodType) {
      toast.error('Blood type is required')
      return
    }
    if (editForm.quantity < 1) {
      toast.error('Quantity must be at least 1')
      return
    }
    setIsSubmitting(true)
    try {
      await api.put(`/requests/${editingRequest.id}`, editForm)
      setShowEditModal(false)
      setEditingRequest(null)
      fetchRequests()
      toast.success('Request updated successfully')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const searchCompatible = async (bloodType) => {
    try {
      const response = await api.get(`/inventory/search?bloodType=${bloodType}`)
      setAvailableUnits(response.data.units)
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  if (loading) return <Loading />

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Blood Requests</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + New Request
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Requester</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length > 0 ? requests.map(req => (
              <tr key={req.id}>
                <td>{req.patientName || req.hospitalId || req.id.slice(0, 8)}</td>
                <td>{formatBloodType(req.bloodType)}</td>
                <td>{req.quantity}</td>
                <td>
                  <span className={`badge ${
                    req.priority === 'EMERGENCY' ? 'badge-danger' :
                    req.priority === 'URGENT' ? 'badge-warning' : 'badge-info'
                  }`}>
                    {req.priority}
                  </span>
                </td>
                <td>
                  <span className={`badge ${
                    req.status === 'FULFILLED' ? 'badge-success' :
                    req.status === 'REJECTED' || req.status === 'CANCELLED' ? 'badge-danger' :
                    req.status === 'APPROVED' ? 'badge-warning' : 'badge-info'
                  }`}>
                    {req.status}
                  </span>
                </td>
                <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="flex gap-1">
                    {canFulfill && req.status === 'PENDING' && (
                      <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                        onClick={() => searchCompatible(req.bloodType)}>
                        Find Units
                      </button>
                    )}
                    {req.requestedById === user?.id && req.status === 'PENDING' && (
                      <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                        onClick={() => openEditModal(req)}>
                        Edit
                      </button>
                    )}
                    {(req.requestedById === user?.id || canFulfill) && req.status === 'PENDING' && (
                      <button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                        onClick={() => cancelRequest(req.id)}>
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#64748b' }}>
                  No requests found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Available Units for Fulfillment */}
      {availableUnits.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">Available Compatible Units</div>
          <p style={{ color: '#64748b', marginBottom: '1rem' }}>Select units to fulfill a request</p>
          <table className="table">
            <thead>
              <tr>
                <th>Unit #</th>
                <th>Type</th>
                <th>Expiry</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {availableUnits.slice(0, 5).map(unit => (
                <tr key={unit.id}>
                  <td>{unit.unitNumber}</td>
                  <td>{formatBloodType(unit.bloodType)}</td>
                  <td>{new Date(unit.expiryDate).toLocaleDateString()}</td>
                  <td><span className="badge badge-success">{unit.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Blood Request">
        <form onSubmit={handleCreateRequest}>
          {isStaff ? (
            <div className="form-group">
              <label className="form-label">Hospital ID</label>
              <input type="text" className="form-input" value={newRequest.hospitalId}
                onChange={(e) => setNewRequest({ ...newRequest, hospitalId: e.target.value })} placeholder="e.g. HOSP-001" />
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Patient Name</label>
                <input type="text" className="form-input" value={newRequest.patientName}
                  onChange={(e) => setNewRequest({ ...newRequest, patientName: e.target.value })} required />
              </div>
              <div className="grid grid-2" style={{ marginBottom: 0 }}>
                <div className="form-group">
                  <label className="form-label">Contact</label>
                  <input type="text" className="form-input" value={newRequest.patientContact}
                    onChange={(e) => setNewRequest({ ...newRequest, patientContact: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Relation to Patient</label>
                  <select className="form-select" value={newRequest.requesterRelation}
                    onChange={(e) => setNewRequest({ ...newRequest, requesterRelation: e.target.value })}>
                    <option value="self">Self</option>
                    <option value="family">Family</option>
                    <option value="friend">Friend</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="grid grid-2" style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label className="form-label">Blood Type Needed</label>
              <select className="form-select" value={newRequest.bloodType}
                onChange={(e) => setNewRequest({ ...newRequest, bloodType: e.target.value })} required>
                <option value="">Select</option>
                {BLOOD_TYPES.map(type => (
                  <option key={type} value={type}>{formatBloodType(type)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity (units)</label>
              <input type="number" className="form-input" value={newRequest.quantity}
                onChange={(e) => setNewRequest({ ...newRequest, quantity: parseInt(e.target.value) })}
                min="1" required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="form-select" value={newRequest.priority}
              onChange={(e) => setNewRequest({ ...newRequest, priority: e.target.value })}>
              <option value="NORMAL">Normal</option>
              <option value="URGENT">Urgent</option>
              <option value="EMERGENCY">Emergency</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-input" value={newRequest.notes}
              onChange={(e) => setNewRequest({ ...newRequest, notes: e.target.value })} rows="2" />
          </div>
          <div className="flex gap-2" style={{ marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Blood Request">
        <form onSubmit={handleEditRequest}>
          <div className="form-group">
            <label className="form-label">Patient Name</label>
            <input type="text" className="form-input" value={editForm.patientName}
              onChange={(e) => setEditForm({ ...editForm, patientName: e.target.value })} />
          </div>
          <div className="grid grid-2" style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label className="form-label">Contact</label>
              <input type="text" className="form-input" value={editForm.patientContact}
                onChange={(e) => setEditForm({ ...editForm, patientContact: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Relation to Patient</label>
              <select className="form-select" value={editForm.requesterRelation}
                onChange={(e) => setEditForm({ ...editForm, requesterRelation: e.target.value })}>
                <option value="self">Self</option>
                <option value="family">Family</option>
                <option value="friend">Friend</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-2" style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label className="form-label">Blood Type Needed</label>
              <select className="form-select" value={editForm.bloodType}
                onChange={(e) => setEditForm({ ...editForm, bloodType: e.target.value })} required>
                <option value="">Select</option>
                {BLOOD_TYPES.map(type => (
                  <option key={type} value={type}>{formatBloodType(type)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity (units)</label>
              <input type="number" className="form-input" value={editForm.quantity}
                onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) })}
                min="1" required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="form-select" value={editForm.priority}
              onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}>
              <option value="NORMAL">Normal</option>
              <option value="URGENT">Urgent</option>
              <option value="EMERGENCY">Emergency</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-input" value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows="2" />
          </div>
          <div className="flex gap-2" style={{ marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
      <ToastContainer />
    </div>
  )
}

export default Requests