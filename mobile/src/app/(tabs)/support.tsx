import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { Text } from '../../components/Text'
import { Button, Card, EmptyState, ErrorBanner, FullScreenLoader, Pill, Screen, ScreenHeader } from '../../components/ui'
import { formatDateTime, titleCase } from '../../lib/format'
import { colors } from '../../lib/theme'
import type { SupportTicket } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'

export const ticketTone = (status: string) =>
  status === 'resolved' || status === 'closed' ? colors.green : status === 'in_progress' ? colors.gold : colors.blue

export default function SupportScreen() {
  const { data, loading, refreshing, error, reload, refresh } = useApi<{ tickets: SupportTicket[] }>('/api/support/tickets')

  useFocusEffect(useCallback(() => { void refresh() }, [refresh]))

  if (loading && !data) return <FullScreenLoader label="Loading your tickets…" />
  const tickets = data?.tickets ?? []

  return (
    <Screen
      onRefresh={refresh}
      refreshing={refreshing}
      header={<ScreenHeader title="Support" subtitle="We usually reply within a day" right={<Button title="New" small icon={<Ionicons name="add" size={18} color="#fff" />} onPress={() => router.push('/new-ticket')} />} />}
    >
      <ErrorBanner message={error} onRetry={reload} />
      {tickets.length === 0 && !error ? (
        <EmptyState title="No tickets yet" text="Having trouble with a report or payment? Raise a ticket and our team will help." />
      ) : null}
      {tickets.map((ticket) => (
        <Card key={ticket.id} onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: ticket.id } })}>
          <View style={styles.top}>
            <Text style={styles.subject} numberOfLines={1}>{ticket.subject}</Text>
            <Pill text={titleCase(ticket.status)} color={ticketTone(ticket.status)} />
          </View>
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
  meta: { fontSize: 11, color: colors.muted, marginTop: 8 },
})
