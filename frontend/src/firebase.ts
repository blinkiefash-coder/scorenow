import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics'
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth'

export type { ConfirmationResult }

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

export const firebaseApp: FirebaseApp = getApps().length > 0
  ? getApp()
  : initializeApp(firebaseConfig)

export const firebaseAuth = getAuth(firebaseApp)

let recaptchaVerifier: RecaptchaVerifier | null = null

export const sendFirebasePhoneOtp = async (mobile: string): Promise<ConfirmationResult> => {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, 'firebase-recaptcha', { size: 'invisible' })
  }
  return signInWithPhoneNumber(firebaseAuth, `+91${mobile}`, recaptchaVerifier)
}

export const resetFirebaseRecaptcha = () => {
  recaptchaVerifier?.clear()
  recaptchaVerifier = null
}

// Analytics is unavailable in some browser/privacy contexts, so initialize it safely.
export const initializeFirebaseAnalytics = async (): Promise<Analytics | null> => {
  if (!await isSupported()) return null
  return getAnalytics(firebaseApp)
}