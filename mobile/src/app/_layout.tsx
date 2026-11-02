import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import {
  Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold, useFonts,
} from '@expo-google-fonts/manrope'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AnimatedSplash } from '../components/AnimatedSplash'
import { AuthProvider, useAuth } from '../lib/auth'
import { DashboardProvider } from '../lib/dashboard'
import { colors } from '../lib/theme'

void SplashScreen.preventAutoHideAsync()

function Gate() {
  const { ready } = useAuth()
  return ready ? <Navigator /> : null
}

// Lives outside Session so the splash plays once per launch, not on every sign-in/out remount.
function Splash() {
  const { ready } = useAuth()
  const [done, setDone] = useState(false)
  useEffect(() => { void SplashScreen.hideAsync() }, [])
  return done ? null : <AnimatedSplash ready={ready} onDone={() => setDone(true)} />
}

function Navigator() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="report/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="new-ticket" options={{ presentation: 'modal' }} />
      <Stack.Screen name="ticket/[id]" />
      <Stack.Screen name="profile-setup" options={{ presentation: 'modal' }} />
      <Stack.Screen name="fixed-deposits" />
      <Stack.Screen name="credit-cards" />
      <Stack.Screen name="guides/index" />
      <Stack.Screen name="guides/[slug]" />
      <Stack.Screen name="assistant" />
      <Stack.Screen name="admin" options={{ animation: 'fade' }} />
    </Stack>
  )
}

// Remounting per session token discards the previous customer's cached data on sign-out.
function Session() {
  const { customer } = useAuth()
  return (
    <DashboardProvider key={customer?.token ?? 'anonymous'}>
      <Gate />
    </DashboardProvider>
  )
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
  })
  if (!fontsLoaded && !fontError) return null
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <View style={{ flex: 1 }}>
            <Session />
            <Splash />
          </View>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
