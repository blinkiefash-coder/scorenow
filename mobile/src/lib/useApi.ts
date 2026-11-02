import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import { useAuth } from './auth'

type Role = 'customer' | 'admin'

// Loads a resource with the signed-in token; a 401 signs the user out so the auth gate redirects to login.
export function useApi<T>(path: string | null, role: Role = 'customer') {
  const { customer, admin, signOutCustomer, signOutAdmin } = useAuth()
  const token = role === 'admin' ? admin?.token : customer?.token
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const requestId = useRef(0)

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!path || !token) return
    const current = ++requestId.current
    if (mode === 'refresh') setRefreshing(true)
    else setLoading(true)
    try {
      const result = await api<T>(path, { token, onUnauthorized: () => void (role === 'admin' ? signOutAdmin() : signOutCustomer()) })
      if (current !== requestId.current) return
      setData(result)
      setError('')
    } catch (caught) {
      if (current !== requestId.current) return
      setError(caught instanceof Error ? caught.message : 'Unable to load.')
    } finally {
      if (current === requestId.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [path, token, role, signOutAdmin, signOutCustomer])

  useEffect(() => { void load() }, [load])

  return { data, setData, error, loading, refreshing, reload: () => load('initial'), refresh: () => load('refresh') }
}
