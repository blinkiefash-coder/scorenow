import { useFocusEffect, router } from 'expo-router'
import { useCallback, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from '../../../components/Text'
import { Card, EmptyState, ErrorBanner, FullScreenLoader, Pill, Screen, ScreenHeader, Segmented } from '../../../components/ui'
import { formatDateTime, titleCase } from '../../../lib/format'
import { colors } from '../../../lib/theme'
import type { SupportTicket } from '../../../lib/types'
import { useApi } from '../../../lib/useApi'
import { ticketTone } from '../../(tabs)/support'

type Filter = '' | 'open' | 'in_progress' | 'resolved' | 'closed'

export default function AdminTickets() {
  const [status, setStatus] = useState<Filter>('')
  const { data, loading, refreshing, error, refresh, reload } = useApi<{ tickets: SupportTicket[] }>(`/api/admin/tickets?status=${status}`, 'admin')

  useFocusEffect(useCallback(() => { void refresh() }, [refresh]))

  const tickets = data?.tickets ?? []
  return (
    <Screen onRefresh={refresh} refreshing={refreshing} header={<ScreenHeader title="Tickets" subtitle="Customer support queue" />}>
      <Segmented<Filter>
        value={status}
        onChange={setStatus}
        options={[{ id: '', label: 'All' }, { id: 'open', label: 'Open' }, { id: 'in_progress', label: 'In progress' }, { id: 'resolved', label: 'Resolved' }, { id: 'closed', label: 'Closed' }]}
      />
      <View style={{ height: 10 }} />
      <ErrorBanner message={error} onRetry={reload} />
      {loading && !data ? <FullScreenLoader /> : null}
      {data && tickets.length === 0 ? <EmptyState title="No tickets" text="Nothing matches this filter." /> : null}
      {tickets.map((ticket) => (
        <Card key={ticket.id} onPress={() => router.push({ pathname: '/admin/ticket/[id]', params: { id: ticket.id } })}>
          <View style={styles.top}>
            <Text style={styles.subject} numberOfLines={1}>{ticket.subject}</Text>
            <Pill text={titleCase(ticket.status)} color={ticketTone(ticket.status)} />
          </View>
          <Text style={styles.meta}>{ticket.requester_name} · +91 {ticket.requester_mobile}</Text>
          <Text style={styles.message} numberOfLines={2}>{ticket.message}</Text>
          <Text style={styles.meta}>{ticket.comments.length} repl{ticket.comments.length === 1 ? 'y' : 'ies'} · {formatDateTime(ticket.updated_at)}</Text>
        </Card>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  subject: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.navy },
  message: { fontSize: 13, color: colors.muted, marginTop: 6 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 4 },
})
