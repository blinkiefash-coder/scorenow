import { Ionicons } from '@expo/vector-icons'
import { Redirect } from 'expo-router'
import { Tabs } from 'expo-router/js-tabs'
import { Platform, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { fontFamilies } from '../../components/Text'
import { useAuth } from '../../lib/auth'
import { colors } from '../../lib/theme'

type IconName = keyof typeof Ionicons.glyphMap

const tab = (title: string, active: IconName, idle: IconName) => ({
  title,
  tabBarIcon: ({ color, focused, size }: { color: unknown; focused: boolean; size: number }) => (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={focused ? active : idle} size={size} color={color as string} />
    </View>
  ),
})

export default function TabsLayout() {
  const { customer } = useAuth()
  if (!customer) return <Redirect href="/login" />
  return <TabBar />
}

function TabBar() {
  const insets = useSafeAreaInsets()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: '#8d98a9',
        tabBarLabelStyle: { fontSize: 10, fontFamily: fontFamilies[700], marginTop: 2 },
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingTop: 7,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : Math.max(insets.bottom, 8),
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.line,
          backgroundColor: '#fff',
          shadowColor: '#17315f',
          shadowOpacity: 0.08,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -6 },
          elevation: 12,
        },
      }}
    >
      <Tabs.Screen name="index" options={tab('Home', 'home', 'home-outline')} />
      <Tabs.Screen name="reports" options={tab('Reports', 'document-text', 'document-text-outline')} />
      <Tabs.Screen name="support" options={tab('Support', 'chatbubbles', 'chatbubbles-outline')} />
      <Tabs.Screen name="profile" options={tab('Profile', 'person', 'person-outline')} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  iconWrap: { minWidth: 40, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: '#eaf1ff' },
})
