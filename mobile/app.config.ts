import fs from 'node:fs'
import path from 'node:path'
import type { ConfigContext, ExpoConfig } from 'expo/config'

const androidServices = './google-services.json'
const iosServices = './GoogleService-Info.plist'
const hasAndroid = fs.existsSync(path.join(__dirname, androidServices))
const hasIos = fs.existsSync(path.join(__dirname, iosServices))

export default ({ config }: ConfigContext): ExpoConfig => {
  const plugins: NonNullable<ExpoConfig['plugins']> = [
    'expo-router',
    'expo-secure-store',
    'expo-image',
    'expo-sharing',
    'expo-font',
    ['expo-splash-screen', { image: './assets/splash-logo.png', imageWidth: 290, backgroundColor: '#ffffff' }],
    ['expo-build-properties', { ios: { useFrameworks: 'static' } }],
  ]

  // Native Firebase and Google sign-in are only configured once the Firebase files are present.
  if (hasAndroid || hasIos) {
    plugins.push('@react-native-firebase/app', '@react-native-firebase/auth', '@react-native-google-signin/google-signin')
  }

  return {
    ...config,
    name: 'Scorenow',
    slug: 'scorenow',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'scorenow',
    backgroundColor: '#ffffff',
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'in.scorenow.app',
      ...(hasIos ? { googleServicesFile: iosServices } : {}),
    },
    android: {
      adaptiveIcon: { backgroundColor: '#ffffff', foregroundImage: './assets/android-icon-foreground.png' },
      predictiveBackGestureEnabled: false,
      package: 'in.scorenow.app',
      ...(hasAndroid ? { googleServicesFile: androidServices } : {}),
    },
    web: { favicon: './assets/favicon.png' },
    plugins,
    extra: { apiUrl: 'http://localhost:3000' },
  }
}
