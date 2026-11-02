import { router } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { ModalHeader } from '../components/ModalHeader'
import { Button, ErrorBanner, Field } from '../components/ui'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { colors } from '../lib/theme'

export default function NewTicketScreen() {
  const { customer } = useAuth()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      await api('/api/support/tickets', { method: 'POST', token: customer?.token, body: { subject: subject.trim(), message: message.trim() } })
      router.back()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to submit your ticket.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ModalHeader title="New ticket" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 18 }} keyboardShouldPersistTaps="handled">
          <ErrorBanner message={error} />
          <Field label="Subject" value={subject} onChangeText={setSubject} placeholder="What do you need help with?" maxLength={180} />
          <Field label="Message" value={message} onChangeText={setMessage} placeholder="Describe the issue in detail" multiline maxLength={4000} />
          <Button title="Submit ticket" onPress={submit} loading={loading} disabled={subject.trim().length < 3 || message.trim().length < 3} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
