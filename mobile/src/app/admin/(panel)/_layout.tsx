import { Ionicons } from '@expo/vector-icons'
import { Redirect } from 'expo-router'
import { Tabs } from 'expo-router/js-tabs'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { fontFamilies } from '../../../components/Text'
import { useAuth } from '../../../lib/auth'
import { colors } from '../../../lib/theme'
import type { AdminRole } from '../../../lib/types'

export const adminAccess: Record<string, AdminRole[]> = {
  index: ['owner', 'manager'],
  customers: ['owner', 'manager', 'support', 'analyst'],
  tickets: ['owner', 'manager', 'support'],
  analytics: ['owner', 'manager', 'analyst'],
  account: ['owner', 'manager', 'support', 'analyst'],
}

type IconName = keyof typeof Ionicons.glyphMap

export default function PanelLayout() {
  const { admin } = useAuth()
  const insets = useSafeAreaInsets()
  if (!admin) return <Redirect href="/admin/login" />

  const screen = (name: string, title: string, active: IconName, idle: IconName) => (
    <Tabs.Screen
      name={name}
      options={{
        title,
        href: adminAccess[name].includes(admin.role) ? undefined : null,
        tabBarIcon: ({ color, focused, size }) => <Ionicons name={focused ? active : idle} size={size} color={color as string} />,
      }}
    />
  )

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: '#8d98b3',
        tabBarLabelStyle: { fontSize: 11, fontFamily: fontFamilies[700] },
        tabBarStyle: {
          height: 58 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : Math.max(insets.bottom, 8),
          borderTopColor: colors.line,
          backgroundColor: '#fff',
        },
      }}
    >
      {screen('index', 'Overview', 'grid', 'grid-outline')}
      {screen('customers', 'Customers', 'people', 'people-outline')}
      {screen('tickets', 'Tickets', 'chatbubbles', 'chatbubbles-outline')}
      {screen('analytics', 'Analytics', 'stats-chart', 'stats-chart-outline')}
      {screen('account', 'Account', 'person-circle', 'person-circle-outline')}
    </Tabs>
  )
}
