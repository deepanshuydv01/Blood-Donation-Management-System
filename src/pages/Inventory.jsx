import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'
import useToast from '../hooks/useToast'
import { BLOOD_TYPES, formatBloodType, formatDate } from '../utils/constants'

const UNIT_STATUSES = ['COLLECTED', 'TESTED', 'AVAILABLE', 'RESERVED', 'ISSUED', 'EXPIRED', 'DISCARDED']

const Inventory = () => {
  const { hasRole } = useAuth()
  const { toast, ToastContainer } = useToast()
  const [units, setUnits] = useState([])
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [filters, setFilters] = useState({ status: '', bloodType: '', search: '' })
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newUnit, setNewUnit] = useState({
    unitNumber: '',
    bloodType: '',
    component: 'WHOLE_BLOOD',
    volume: 450,
    collectedDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    storageLocation: ''
  })

  const canAddUnit = hasRole('SUPER_ADMIN', 'BLOOD_BANK_ADMIN', 'LAB_TECHNICIAN')
  const canEditUnit = hasRole('SUPER_ADMIN', 'BLOOD_BANK_ADMIN', 'LAB_TECHNICIAN')
  const debounceRef = useRef(null)

  const fetchInventory = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.bloodType) params.append('bloodType', filters.bloodType)
      if (filters.search) params.append('search', filters.search)

      const response = await api.get(`/inventory?${params.toString()}`)
      setUnits(response.data.data)
      setStats(response.data.stats)
      setPagination(response.data.pagination)
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  const handleSearchChange = (e) => {
    const value = e.target.value
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: value }))
    }, 300)
  }

  const handleAddUnit = async (e) => {
    e.preventDefault()
    if (!newUnit.unitNumber || !newUnit.bloodType) {
      toast.error('Unit number and blood type are required')
      return
    }
    setIsSubmitting(true)
    try {
      const expiry = new Date(newUnit.collectedDate)
      expiry.setDate(expiry.getDate() + 42)
      const unitData = {
        ...newUnit,
        collectedDate: new Date(newUnit.collectedDate).toISOString(),
        expiryDate: expiry.toISOString()
      }
      await api.post('/inventory', unitData)
      setShowAddModal(false)
      setNewUnit({
        unitNumber: '',
        bloodType: '',
        component: 'WHOLE_BLOOD',
        volume: 450,
        collectedDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        storageLocation: ''
      })
      fetchInventory()
      toast.success('Blood unit added successfully')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add unit')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/inventory/${id}`, { status })
      fetchInventory()
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  if (loading) return <Loading />

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Blood Inventory</h1>
        {canAddUnit && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Add Blood Unit
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-3">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Search</label>
            <input
              type="text"
              className="form-input"
              placeholder="Unit number or location..."
              defaultValue={filters.search}
              onChange={handleSearchChange}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Statuses</option>
              {UNIT_STATUSES.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Blood Type</label>
            <select
              className="form-select"
              value={filters.bloodType}
              onChange={(e) => setFilters({ ...filters, bloodType: e.target.value })}
            >
              <option value="">All Types</option>
              {BLOOD_TYPES.map(type => (
                <option key={type} value={type}>{formatBloodType(type)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Unit #</th>
              <th>Type</th>
              <th>Component</th>
              <th>Volume</th>
              <th>Expiry</th>
              <th>Status</th>
              <th>Location</th>
              {canEditUnit && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {units.length > 0 ? units.map(unit => (
              <tr key={unit.id}>
                <td style={{ fontWeight: 600 }}>{unit.unitNumber}</td>
                <td>{formatBloodType(unit.bloodType)}</td>
                <td>{unit.component}</td>
                <td>{unit.volume} ml</td>
                <td>{formatDate(unit.expiryDate)}</td>
                <td>
                  <span className={`badge ${
                    unit.status === 'AVAILABLE' ? 'badge-success' :
                    unit.status === 'RESERVED' ? 'badge-warning' :
                    unit.status === 'EXPIRED' || unit.status === 'DISCARDED' ? 'badge-danger' :
                    'badge-info'
                  }`}>
                    {unit.status}
                  </span>
                </td>
                <td>{unit.storageLocation || 'N/A'}</td>
                {canEditUnit && (
                  <td>
                    {unit.status !== 'ISSUED' && unit.status !== 'DISCARDED' && (
                      <select
                        className="form-select"
                        style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                        value={unit.status}
                        onChange={(e) => updateStatus(unit.id, e.target.value)}
                      >
                        {UNIT_STATUSES.filter(s => s !== 'DISCARDED').map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    )}
                  </td>
                )}
              </tr>
            )) : (
              <tr>
                <td colSpan={canEditUnit ? 8 : 7} style={{ textAlign: 'center', color: '#64748b' }}>
                  No blood units found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Blood Unit">
        <form onSubmit={handleAddUnit}>
          <div className="form-group">
            <label className="form-label">Unit Number</label>
            <input
              type="text"
              className="form-input"
              value={newUnit.unitNumber}
              onChange={(e) => setNewUnit({ ...newUnit, unitNumber: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-2" style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label className="form-label">Blood Type</label>
              <select
                className="form-select"
                value={newUnit.bloodType}
                onChange={(e) => setNewUnit({ ...newUnit, bloodType: e.target.value })}
                required
              >
                <option value="">Select</option>
                {BLOOD_TYPES.map(type => (
                  <option key={type} value={type}>{formatBloodType(type)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Component</label>
              <select
                className="form-select"
                value={newUnit.component}
                onChange={(e) => setNewUnit({ ...newUnit, component: e.target.value })}
              >
                <option value="WHOLE_BLOOD">Whole Blood</option>
                <option value="RBC">RBC</option>
                <option value="PLASMA">Plasma</option>
                <option value="PLATELETS">Platelets</option>
              </select>
            </div>
          </div>
          <div className="grid grid-2" style={{ marginBottom: 0 }}>
            <div className="form-group">
              <label className="form-label">Volume (ml)</label>
              <input
                type="number"
                className="form-input"
                value={newUnit.volume}
                onChange={(e) => setNewUnit({ ...newUnit, volume: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Collection Date</label>
              <input
                type="date"
                className="form-input"
                value={newUnit.collectedDate}
                onChange={(e) => setNewUnit({ ...newUnit, collectedDate: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Storage Location</label>
            <input
              type="text"
              className="form-input"
              value={newUnit.storageLocation}
              onChange={(e) => setNewUnit({ ...newUnit, storageLocation: e.target.value })}
              placeholder="e.g., Freezer A, Shelf 3"
            />
          </div>
          <div className="flex gap-2" style={{ marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Unit'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
      <ToastContainer />
    </div>
  )
}

export default Inventory