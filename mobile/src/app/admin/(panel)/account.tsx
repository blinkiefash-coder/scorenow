import { router } from 'expo-router'
import { useState } from 'react'
import { Text } from '../../../components/Text'
import { Button, Card, Screen, ScreenHeader } from '../../../components/ui'
import { useAuth } from '../../../lib/auth'
import { titleCase } from '../../../lib/format'
import { colors } from '../../../lib/theme'

export default function AdminAccount() {
  const { admin, signOutAdmin } = useAuth()
  const [busy, setBusy] = useState(false)

  return (
    <Screen header={<ScreenHeader title="Account" subtitle="Admin session" />}>
      <Card>
        <Text style={{ fontSize: 12, color: colors.muted }}>Admin ID</Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.navy, marginBottom: 10 }}>{admin?.adminId}</Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>Role</Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.navy }}>{titleCase(admin?.role ?? '')}</Text>
      </Card>
      <Button
        title="Sign out"
        variant="danger"
        loading={busy}
        onPress={async () => {
          setBusy(true)
          await signOutAdmin()
          router.replace('/login')
        }}
      />
    </Screen>
  )
}
