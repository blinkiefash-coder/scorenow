import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import type { ComponentProps } from 'react'
import { Alert, Pressable, StyleSheet, View } from 'react-native'
import { Text } from '../../components/Text'
import { Card, Row, Screen, ScreenHeader } from '../../components/ui'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useDashboard } from '../../lib/dashboard'
import { formatDate } from '../../lib/format'
import { colors } from '../../lib/theme'

type IconName = ComponentProps<typeof Ionicons>['name']

function MenuItem({ icon, label, onPress, tone = colors.navy }: { icon: IconName; label: string; onPress: () => void; tone?: string }) {
  return (
    <Pressable onPress={onPress} style={styles.item}>
      <Ionicons name={icon} size={20} color={tone} />
      <Text style={[styles.itemText, { color: tone }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#b2bbd0" />
    </Pressable>
  )
}

export default function ProfileScreen() {
  const { customer, signOutCustomer } = useAuth()
  const { dashboard } = useDashboard()
  const user = customer?.user
  const profile = dashboard?.profile
  const initials = (user?.full_name ?? '?').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()

  const logout = () => Alert.alert('Sign out', 'Do you want to sign out of Scorenow?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Sign out',
      style: 'destructive',
      onPress: () => {
        void api('/api/auth/logout', { method: 'POST', token: customer?.token }).catch(() => undefined)
        void signOutCustomer()
      },
    },
  ])

  return (
    <Screen header={<ScreenHeader title="Profile" />}>
      <Card style={styles.hero}>
        <View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user?.full_name}</Text>
          <Text style={styles.sub}>+91 {user?.mobile}</Text>
          {user?.email ? <Text style={styles.sub}>{user.email}</Text> : null}
        </View>
      </Card>

      <Card>
        <Row label="PAN" value={profile?.pan_last4 ? `XXXXXX${profile.pan_last4}` : 'Not added'} />
        <Row label="Date of birth" value={formatDate(profile?.date_of_birth)} />
        <Row label="City" value={profile?.city ?? '—'} />
        <Row label="KYC status" value={profile?.kyc_status ?? 'Pending'} />
      </Card>

      <Card style={{ paddingVertical: 4 }}>
        <MenuItem icon="id-card-outline" label={profile ? 'Update profile details' : 'Complete your profile'} onPress={() => router.push('/profile-setup')} />
        <MenuItem icon="book-outline" label="Credit guides" onPress={() => router.push('/guides')} />
        <MenuItem icon="chatbubble-ellipses-outline" label="Ask Neha (credit assistant)" onPress={() => router.push('/assistant')} />
        <MenuItem icon="chatbubbles-outline" label="Help & support" onPress={() => router.push('/(tabs)/support')} />
        <MenuItem icon="log-out-outline" label="Sign out" tone={colors.red} onPress={logout} />
      </Card>

      <Text style={styles.footer}>© 2026 Scorenow</Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontSize: 22, fontWeight: '900' },
  name: { fontSize: 18, fontWeight: '800', color: colors.navy },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  itemText: { flex: 1, fontSize: 15, fontWeight: '700' },
  footer: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 8 },
})
