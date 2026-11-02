import { Stack } from 'expo-router'
import { colors } from '../../lib/theme'

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(panel)" options={{ animation: 'fade' }} />
      <Stack.Screen name="ticket/[id]" />
    </Stack>
  )
}
