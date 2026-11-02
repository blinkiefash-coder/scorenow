import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { Text, TextInput } from './Text'
import { Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, radius } from '../lib/theme'
import { formatDateTime } from '../lib/format'
import type { SupportTicket } from '../lib/types'
import { ErrorBanner } from './ui'

// Conversation view shared by the customer ticket screen and the admin ticket screen.
export function TicketThread({
  ticket, viewer, onSend, header,
}: {
  ticket: SupportTicket
  viewer: 'customer' | 'admin'
  onSend: (message: string) => Promise<void>
  header?: React.ReactNode
}) {
  const insets = useSafeAreaInsets()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const closed = ticket.status === 'closed'

  const send = async () => {
    const text = message.trim()
    if (!text || sending) return
    setSending(true)
    setError('')
    try {
      await onSend(text)
      setMessage('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to send your reply.')
    } finally {
      setSending(false)
    }
  }

  const original = { id: 'original', author_type: 'customer' as const, author_name: ticket.requester_name, message: ticket.message, created_at: ticket.created_at }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {header}
        {[original, ...ticket.comments].map((comment) => {
          const mine = comment.author_type === viewer
          return (
            <View key={comment.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={[styles.author, mine && { color: '#cfe0ff' }]}>{comment.author_type === 'admin' ? `${comment.author_name} · Scorenow` : comment.author_name}</Text>
              <Text style={[styles.text, mine && { color: '#fff' }]}>{comment.message}</Text>
              <Text style={[styles.time, mine && { color: '#cfe0ff' }]}>{formatDateTime(comment.created_at)}</Text>
            </View>
          )
        })}
      </ScrollView>
      <View style={{ paddingBottom: insets.bottom + 8 }}>
        <ErrorBanner message={error} />
        {closed ? (
          <Text style={styles.closed}>This ticket is closed.</Text>
        ) : (
          <View style={styles.composer}>
            <TextInput value={message} onChangeText={setMessage} placeholder="Write a reply…" placeholderTextColor="#9aa5bd" multiline style={styles.input} maxLength={4000} />
            <Pressable onPress={send} disabled={!message.trim() || sending} style={[styles.send, (!message.trim() || sending) && { opacity: 0.5 }]}>
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '86%', padding: 12, borderRadius: radius.md, marginBottom: 10 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.blue, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  author: { fontSize: 11, fontWeight: '800', color: colors.muted, marginBottom: 4 },
  text: { fontSize: 14, color: colors.navy, lineHeight: 20 },
  time: { fontSize: 10, color: colors.muted, marginTop: 6 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: '#fff' },
  input: { flex: 1, maxHeight: 110, minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, fontSize: 15, color: colors.navy },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  closed: { textAlign: 'center', color: colors.muted, padding: 14, fontSize: 13 },
})
