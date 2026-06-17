import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

const CACHED_USER_KEY = 'cachedUser'
const REMEMBERED_EMAIL_KEY = 'rememberedEmail'

const getCachedUser = () => {
  try {
    const cached = localStorage.getItem(CACHED_USER_KEY)
    return cached ? JSON.parse(cached) : null
  } catch { return null }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getCachedUser)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [token])

  const fetchUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me')
      const freshUser = response.data.user
      setUser(freshUser)
      cacheUser(freshUser)
    } catch (error) {
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const cacheUser = (userData) => {
    try {
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(userData))
    } catch { /* quota exceeded - ignore */ }
  }

  const login = useCallback(async (email, password, rememberMe = false) => {
    const response = await api.post('/auth/login', { email, password, rememberMe })
    const { user: userData, accessToken } = response.data
    localStorage.setItem('token', accessToken)
    if (rememberMe) {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, email)
    } else {
      localStorage.removeItem(REMEMBERED_EMAIL_KEY)
    }
    setToken(accessToken)
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
    setUser(userData)
    cacheUser(userData)
    return userData
  }, [])

  const register = useCallback(async (data) => {
    const response = await api.post('/auth/register', data)
    const { user: userData, accessToken } = response.data
    localStorage.setItem('token', accessToken)
    setToken(accessToken)
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
    setUser(userData)
    cacheUser(userData)
    return userData
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem(CACHED_USER_KEY)
    setToken(null)
    setUser(null)
    delete api.defaults.headers.common['Authorization']
  }, [])

  const hasRole = useCallback((...roles) => {
    return user && roles.includes(user.role)
  }, [user])

  const value = useMemo(() => ({
    user,
    loading,
    login,
    register,
    logout,
    hasRole,
    isAuthenticated: !!user
  }), [user, loading, login, register, logout, hasRole])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}