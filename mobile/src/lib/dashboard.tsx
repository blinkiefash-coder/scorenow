import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Alert } from 'react-native'
import { api } from './api'
import { useAuth } from './auth'
import { useApi } from './useApi'
import type { BureauId, DashboardStatus, ReportOptions } from './types'

type DashboardContextValue = {
  dashboard: DashboardStatus | null
  options: ReportOptions | null
  loading: boolean
  refreshing: boolean
  error: string
  busyBureau: BureauId | null
  refresh: () => void
  reload: () => void
  getReport: (bureau: BureauId) => Promise<void>
  retryReport: (requestId: string, bureau: BureauId) => Promise<void>
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { customer } = useAuth()
  const token = customer?.token
  const dashboard = useApi<DashboardStatus>('/api/dashboard')
  const options = useApi<ReportOptions>('/api/reports/options')
  const [busyBureau, setBusyBureau] = useState<BureauId | null>(null)

  const run = useCallback(async (bureau: BureauId, task: () => Promise<DashboardStatus>) => {
    setBusyBureau(bureau)
    try {
      dashboard.setData(await task())
    } catch (error) {
      Alert.alert('Report', error instanceof Error ? error.message : 'Unable to fetch the report.')
    } finally {
      setBusyBureau(null)
    }
  }, [dashboard])

  const getReport = useCallback(async (bureau: BureauId) => {
    if (!token || !options.data) return
    if (options.data.demoMode) {
      await run(bureau, () => api<DashboardStatus>('/api/reports/demo', { method: 'POST', token, body: { bureau } }))
      return
    }
    if (options.data.paymentsMode !== 'simulated') {
      Alert.alert('Payment required', 'In-app payments are coming soon. Please buy this report on the Scorenow website and it will appear here.')
      return
    }
    await run(bureau, async () => {
      const order = await api<{ orderId: string }>('/api/reports/order', { method: 'POST', token, body: { bureau } })
      return api<DashboardStatus>('/api/reports/verify', { method: 'POST', token, body: { orderId: order.orderId } })
    })
  }, [token, options.data, run])

  const retryReport = useCallback(async (requestId: string, bureau: BureauId) => {
    if (!token) return
    await run(bureau, () => api<DashboardStatus>(`/api/reports/${requestId}/retry`, { method: 'POST', token }))
  }, [token, run])

  const value = useMemo<DashboardContextValue>(() => ({
    dashboard: dashboard.data,
    options: options.data,
    loading: dashboard.loading,
    refreshing: dashboard.refreshing,
    error: dashboard.error,
    busyBureau,
    refresh: () => { void dashboard.refresh(); void options.refresh() },
    reload: () => { void dashboard.reload() },
    getReport,
    retryReport,
  }), [dashboard, options, busyBureau, getReport, retryReport])

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

export const useDashboard = () => {
  const value = useContext(DashboardContext)
  if (!value) throw new Error('useDashboard must be used inside DashboardProvider')
  return value
}
