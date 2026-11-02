import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '../../components/Text'
import { ModalHeader } from '../../components/ModalHeader'
import { Button, ErrorBanner, Field } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { colors } from '../../lib/theme'
import type { AdminRole } from '../../lib/types'

export default function AdminLogin() {
  const { signInAdmin, admin } = useAuth()
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      const session = await api<{ token: string; adminId: string; role: AdminRole }>('/api/admin/login', { method: 'POST', body: { id: id.trim(), password, pin } })
      await signInAdmin(session)
      router.replace('/admin')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ModalHeader title="Admin sign in" onBack={() => router.replace(admin ? '/admin' : '/login')} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 22 }} keyboardShouldPersistTaps="handled">
          <View style={styles.icon}><Ionicons name="shield-checkmark" size={34} color={colors.blue} /></View>
          <Text style={styles.sub}>Restricted to Scorenow team members.</Text>
          <ErrorBanner message={error} />
          <Field label="Admin ID" value={id} onChangeText={setId} autoCapitalize="none" autoCorrect={false} />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
          <Field label="6-digit PIN" value={pin} onChangeText={(text) => setPin(text.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" secureTextEntry />
          <Button title="Sign in" onPress={submit} loading={loading} disabled={!id || !password || pin.length !== 6} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  icon: { alignSelf: 'center', width: 72, height: 72, borderRadius: 36, backgroundColor: colors.sky, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  sub: { textAlign: 'center', color: colors.muted, fontSize: 13, marginBottom: 20 },
})
