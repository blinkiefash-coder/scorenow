import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { ModalHeader } from '../../../components/ModalHeader'
import { TicketThread } from '../../../components/TicketThread'
import { EmptyState, FullScreenLoader, Segmented } from '../../../components/ui'
import { api } from '../../../lib/api'
import { useAuth } from '../../../lib/auth'
import { colors } from '../../../lib/theme'
import type { SupportTicket, TicketStatus } from '../../../lib/types'
import { useApi } from '../../../lib/useApi'

const statuses: { id: TicketStatus; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'closed', label: 'Closed' },
]

export default function AdminTicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { admin } = useAuth()
  const { data, loading, reload } = useApi<{ tickets: SupportTicket[] }>('/api/admin/tickets?status=', 'admin')
  const [updating, setUpdating] = useState(false)
  const ticket = data?.tickets.find((item) => item.id === id)

  const changeStatus = async (status: TicketStatus) => {
    if (!ticket || status === ticket.status || updating) return
    setUpdating(true)
    try {
      await api(`/api/admin/tickets/${ticket.id}`, { method: 'PATCH', token: admin?.token, body: { status, assignedTo: ticket.assigned_to ?? '' } })
      reload()
    } catch (caught) {
      Alert.alert('Ticket', caught instanceof Error ? caught.message : 'Unable to update the ticket.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ModalHeader title={ticket?.subject ?? 'Ticket'} onBack={() => router.back()} />
      {loading && !data ? <FullScreenLoader /> : !ticket ? <EmptyState title="Ticket not found" /> : (
        <TicketThread
          ticket={ticket}
          viewer="admin"
          header={<View style={{ marginBottom: 12 }}><Segmented<TicketStatus> options={statuses} value={ticket.status} onChange={changeStatus} /></View>}
          onSend={async (message) => {
            await api(`/api/admin/tickets/${ticket.id}/comments`, { method: 'POST', token: admin?.token, body: { message } })
            reload()
          }}
        />
      )}
    </View>
  )
}
