// Firebase phone/Google auth needs native modules, so they are loaded lazily.
// In Expo Go (no native modules) the app still runs and email/admin sign-in keep working.
type PhoneConfirmation = { confirm: (code: string) => Promise<{ user: { getIdToken: () => Promise<string> } } | null> }

type FirebaseAuth = (() => {
  signInWithPhoneNumber: (phone: string, forceResend?: boolean) => Promise<PhoneConfirmation>
  signInWithCredential: (credential: unknown) => Promise<{ user: { getIdToken: () => Promise<string> } }>
}) & { GoogleAuthProvider: { credential: (idToken: string) => unknown } }

const NATIVE_MESSAGE = 'Phone and Google sign-in need the Scorenow development build (not Expo Go). See mobile/README.md.'

const loadAuth = (): FirebaseAuth => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/auth').default as FirebaseAuth
  } catch {
    throw new Error(NATIVE_MESSAGE)
  }
}

const friendly = (error: unknown) => {
  const code = (error as { code?: string })?.code ?? ''
  if (code === 'auth/invalid-phone-number') return 'Enter a valid 10-digit mobile number.'
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please try again later.'
  if (code === 'auth/invalid-verification-code') return 'Incorrect code. Please try again.'
  if (code === 'auth/code-expired' || code === 'auth/session-expired') return 'This code has expired. Request a new one.'
  if (code === 'auth/network-request-failed') return 'Network error. Check your connection.'
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export async function sendPhoneCode(mobile: string, forceResend = false) {
  const digits = mobile.replace(/\D/g, '')
  if (digits.length !== 10) throw new Error('Enter a valid 10-digit mobile number.')
  try {
    return await loadAuth()().signInWithPhoneNumber(`+91${digits}`, forceResend)
  } catch (error) {
    throw new Error(friendly(error))
  }
}

export async function confirmPhoneCode(confirmation: PhoneConfirmation, code: string) {
  try {
    const credential = await confirmation.confirm(code)
    if (!credential) throw new Error('Unable to verify the code.')
    return await credential.user.getIdToken()
  } catch (error) {
    throw new Error(friendly(error))
  }
}

export async function googleIdToken() {
  const auth = loadAuth()
  let GoogleSignin: typeof import('@react-native-google-signin/google-signin').GoogleSignin
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin
  } catch {
    throw new Error(NATIVE_MESSAGE)
  }
  try {
    GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID })
    await GoogleSignin.hasPlayServices()
    const result = await GoogleSignin.signIn()
    const idToken = result.data?.idToken
    if (!idToken) throw new Error('Google sign-in was cancelled.')
    const credential = await auth().signInWithCredential(auth.GoogleAuthProvider.credential(idToken))
    return await credential.user.getIdToken()
  } catch (error) {
    throw new Error(friendly(error))
  }
}
