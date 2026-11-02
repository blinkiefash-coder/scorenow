import { router, useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'
import { ModalHeader } from '../../components/ModalHeader'
import { TicketThread } from '../../components/TicketThread'
import { EmptyState, FullScreenLoader, Pill } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { titleCase } from '../../lib/format'
import { colors } from '../../lib/theme'
import type { SupportTicket } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { ticketTone } from '../(tabs)/support'

export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { customer } = useAuth()
  const { data, loading, reload } = useApi<{ tickets: SupportTicket[] }>('/api/support/tickets')
  const ticket = data?.tickets.find((item) => item.id === id)

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ModalHeader title={ticket?.subject ?? 'Ticket'} onBack={() => router.back()} />
      {loading && !data ? <FullScreenLoader /> : !ticket ? <EmptyState title="Ticket not found" /> : (
        <TicketThread
          ticket={ticket}
          viewer="customer"
          header={<View style={{ marginBottom: 12 }}><Pill text={titleCase(ticket.status)} color={ticketTone(ticket.status)} /></View>}
          onSend={async (message) => {
            await api(`/api/support/tickets/${ticket.id}/comments`, { method: 'POST', token: customer?.token, body: { message } })
            reload()
          }}
        />
      )}
    </View>
  )
}
