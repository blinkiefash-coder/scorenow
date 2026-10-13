import { initializeApp, getApps, type FirebaseOptions } from 'firebase/app'
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth'

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

const app = isFirebaseConfigured
  ? (getApps()[0] ?? initializeApp(firebaseConfig))
  : null

export const firebaseAuth = app ? getAuth(app) : null

let recaptchaVerifier: RecaptchaVerifier | null = null

const getRecaptchaVerifier = (containerId: string) => {
  if (!firebaseAuth) throw new Error('Firebase is not configured.')
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, containerId, { size: 'invisible' })
  }
  return recaptchaVerifier
}

export const startPhoneSignIn = async (phoneNumber: string, recaptchaContainerId: string): Promise<ConfirmationResult> => {
  if (!firebaseAuth) throw new Error('Firebase is not configured.')
  const verifier = getRecaptchaVerifier(recaptchaContainerId)
  return signInWithPhoneNumber(firebaseAuth, phoneNumber, verifier)
}

export type { ConfirmationResult }
