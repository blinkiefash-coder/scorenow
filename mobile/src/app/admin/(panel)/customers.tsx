import { Ionicons } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import { Text, TextInput } from '../../../components/Text'
import { Button, Card, EmptyState, ErrorBanner, FullScreenLoader, Pill, Screen, ScreenHeader } from '../../../components/ui'
import { api } from '../../../lib/api'
import { useAuth } from '../../../lib/auth'
import { formatDate, formatDateTime } from '../../../lib/format'
import { colors, radius } from '../../../lib/theme'
import type { AdminCustomer } from '../../../lib/types'
import { useApi } from '../../../lib/useApi'

type CustomerResponse = { customers: AdminCustomer[]; pagination: { page: number; pageSize: number; total: number } }

export default function AdminCustomers() {
  const { admin } = useAuth()
  const canManage = admin?.role === 'owner' || admin?.role === 'manager'
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    const id = setTimeout(() => { setSearch(query.trim()); setPage(1) }, 350)
    return () => clearTimeout(id)
  }, [query])

  const { data, loading, refreshing, error, refresh, reload, setData } = useApi<CustomerResponse>(`/api/admin/customers?q=${encodeURIComponent(search)}&page=${page}`, 'admin')

  const toggle = (customer: AdminCustomer) => {
    const next = customer.status === 'blocked' ? 'active' : 'blocked'
    Alert.alert(`${next === 'blocked' ? 'Block' : 'Unblock'} customer`, `${customer.full_name} will ${next === 'blocked' ? 'no longer be able to sign in' : 'be able to sign in again'}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: next === 'blocked' ? 'Block' : 'Unblock',
        style: next === 'blocked' ? 'destructive' : 'default',
        onPress: async () => {
          setBusyId(customer.id)
          try {
            await api(`/api/admin/customers/${customer.id}/status`, { method: 'PATCH', token: admin?.token, body: { status: next } })
            setData((current) => current && { ...current, customers: current.customers.map((item) => (item.id === customer.id ? { ...item, status: next } : item)) })
          } catch (caught) {
            Alert.alert('Customer', caught instanceof Error ? caught.message : 'Unable to update the customer.')
          } finally {
            setBusyId(null)
          }
        },
      },
    ])
  }

  const total = data?.pagination.total ?? 0
  const pageSize = data?.pagination.pageSize ?? 50
  const pages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <Screen onRefresh={refresh} refreshing={refreshing} header={<ScreenHeader title="Customers" subtitle={`${total} total`} />}>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search name, mobile, email or PAN" placeholderTextColor="#9aa5bd" style={styles.input} autoCapitalize="none" returnKeyType="search" />
      </View>
      <ErrorBanner message={error} onRetry={reload} />
      {loading && !data ? <FullScreenLoader /> : null}
      {data && data.customers.length === 0 ? <EmptyState title="No customers found" /> : null}
      {data?.customers.map((customer) => (
        <Card key={customer.id}>
          <View style={styles.top}>
            <Text style={styles.name}>{customer.full_name}</Text>
            <Pill text={customer.status} color={customer.status === 'blocked' ? colors.red : colors.green} />
          </View>
          <Text style={styles.meta}>+91 {customer.mobile}{customer.email ? ` · ${customer.email}` : ''}</Text>
          <Text style={styles.meta}>{customer.journey_stage} · {customer.paid_payments}/{customer.total_payments} paid</Text>
          <Text style={styles.meta}>Joined {formatDate(customer.created_at)} · Last login {formatDateTime(customer.last_login)}</Text>
          {canManage ? (
            <View style={{ marginTop: 10 }}>
              <Button
                title={customer.status === 'blocked' ? 'Unblock' : 'Block'}
                small
                variant={customer.status === 'blocked' ? 'outline' : 'danger'}
                loading={busyId === customer.id}
                onPress={() => toggle(customer)}
              />
            </View>
          ) : null}
        </Card>
      ))}
      {pages > 1 ? (
        <View style={styles.pager}>
          <Button title="Previous" small variant="outline" disabled={page <= 1} onPress={() => setPage((current) => current - 1)} />
          <Text style={styles.meta}>Page {page} of {pages}</Text>
          <Button title="Next" small variant="outline" disabled={page >= pages} onPress={() => setPage((current) => current + 1)} />
        </View>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, marginBottom: 14 },
  input: { flex: 1, minHeight: 46, fontSize: 15, color: colors.navy },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  name: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.navy },
  meta: { fontSize: 12, color: colors.muted, marginTop: 4 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
})
