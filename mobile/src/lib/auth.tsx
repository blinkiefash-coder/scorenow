import * as SecureStore from 'expo-secure-store'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AdminRole, AuthUser } from './types'

type CustomerSession = { user: AuthUser; token: string }
type AdminSession = { token: string; adminId: string; role: AdminRole }

type AuthContextValue = {
  ready: boolean
  customer: CustomerSession | null
  admin: AdminSession | null
  signInCustomer: (session: CustomerSession) => Promise<void>
  signInAdmin: (session: AdminSession) => Promise<void>
  updateCustomer: (user: Partial<AuthUser>) => Promise<void>
  signOutCustomer: () => Promise<void>
  signOutAdmin: () => Promise<void>
}

const CUSTOMER_KEY = 'scorenow-customer'
const ADMIN_KEY = 'scorenow-admin'

const AuthContext = createContext<AuthContextValue | null>(null)

const read = async <T,>(key: string): Promise<T | null> => {
  try {
    const raw = await SecureStore.getItemAsync(key)
    return raw ? JSON.parse(raw) as T : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [customer, setCustomer] = useState<CustomerSession | null>(null)
  const [admin, setAdmin] = useState<AdminSession | null>(null)

  useEffect(() => {
    void Promise.all([read<CustomerSession>(CUSTOMER_KEY), read<AdminSession>(ADMIN_KEY)]).then(([storedCustomer, storedAdmin]) => {
      if (storedCustomer?.token && storedCustomer.user?.id) setCustomer(storedCustomer)
      if (storedAdmin?.token) setAdmin(storedAdmin)
      setReady(true)
    })
  }, [])

  const signInCustomer = useCallback(async (session: CustomerSession) => {
    await SecureStore.setItemAsync(CUSTOMER_KEY, JSON.stringify(session))
    setCustomer(session)
  }, [])

  const signInAdmin = useCallback(async (session: AdminSession) => {
    await SecureStore.setItemAsync(ADMIN_KEY, JSON.stringify(session))
    setAdmin(session)
  }, [])

  const updateCustomer = useCallback(async (user: Partial<AuthUser>) => {
    setCustomer((current) => {
      if (!current) return current
      const next = { ...current, user: { ...current.user, ...user } }
      void SecureStore.setItemAsync(CUSTOMER_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const signOutCustomer = useCallback(async () => {
    await SecureStore.deleteItemAsync(CUSTOMER_KEY)
    setCustomer(null)
  }, [])

  const signOutAdmin = useCallback(async () => {
    await SecureStore.deleteItemAsync(ADMIN_KEY)
    setAdmin(null)
  }, [])

  const value = useMemo(
    () => ({ ready, customer, admin, signInCustomer, signInAdmin, updateCustomer, signOutCustomer, signOutAdmin }),
    [ready, customer, admin, signInCustomer, signInAdmin, updateCustomer, signOutCustomer, signOutAdmin],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
