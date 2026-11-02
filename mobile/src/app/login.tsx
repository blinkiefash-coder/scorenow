import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { type ComponentRef, type ReactNode, useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, TextInput as RNTextInput, View, type TextInputProps } from 'react-native'
import { Text, TextInput } from '../components/Text'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, ErrorBanner } from '../components/ui'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { confirmPhoneCode, googleIdToken, sendPhoneCode } from '../lib/firebase'
import { colors } from '../lib/theme'
import type { AuthUser } from '../lib/types'

const logo = require('../../assets/brand/logo-full.jpg')

type SessionResponse = { user: AuthUser; token: string }
type Mode = 'login' | 'signup'
type Method = 'mobile' | 'email'

type IconName = keyof typeof Ionicons.glyphMap

function AuthInput({ label, icon, prefix, right, ...props }: TextInputProps & { label: string; icon?: IconName; prefix?: string; right?: ReactNode }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        {prefix ? <View style={styles.prefix}><Text style={styles.prefixText}>{prefix}</Text><Ionicons name="chevron-down" size={12} color={colors.muted} /></View> : null}
        {icon ? <Ionicons name={icon} size={17} color={colors.blue} style={{ marginLeft: 14 }} /> : null}
        <TextInput
          placeholderTextColor="#9aa6bf"
          {...props}
          style={styles.inputText}
        />
        {right}
      </View>
    </View>
  )
}

function OtpBoxes({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const input = useRef<ComponentRef<typeof RNTextInput>>(null)
  useEffect(() => { input.current?.focus() }, [])
  return (
    <Pressable onPress={() => input.current?.focus()} style={styles.otpRow}>
      {Array.from({ length: 6 }, (_, index) => (
        <View key={index} style={[styles.otpBox, value.length === index && styles.otpActive, value[index] ? styles.otpFilled : null]}>
          <Text style={styles.otpDigit}>{value[index] ?? ''}</Text>
        </View>
      ))}
      <TextInput
        ref={input}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={6}
        style={styles.otpHidden}
      />
    </Pressable>
  )
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const { signInCustomer } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [method, setMethod] = useState<Method>('mobile')
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const confirmation = useRef<Awaited<ReturnType<typeof sendPhoneCode>> | null>(null)

  useEffect(() => {
    if (resendIn <= 0) return
    const id = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000)
    return () => clearTimeout(id)
  }, [resendIn])

  const finish = async (session: SessionResponse) => {
    await signInCustomer(session)
    router.replace('/(tabs)')
  }

  const run = async (task: () => Promise<void>) => {
    setError('')
    setLoading(true)
    try {
      await task()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const submitForm = () => run(async () => {
    if (mode === 'login' && method === 'email') {
      await finish(await api<SessionResponse>('/api/auth/email/login', { method: 'POST', body: { email: email.trim(), password } }))
      return
    }
    if (mode === 'signup') {
      if (name.trim().length < 2) throw new Error('Enter your full name.')
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error('Enter a valid email address.')
      if (password.length < 8) throw new Error('Choose a password of at least 8 characters.')
    }
    confirmation.current = await sendPhoneCode(mobile)
    setCode('')
    setResendIn(28)
    setStep('otp')
  })

  const submitOtp = () => run(async () => {
    if (!confirmation.current) throw new Error('Request a new SMS code and try again.')
    const idToken = await confirmPhoneCode(confirmation.current, code)
    await finish(await api<SessionResponse>('/api/auth/firebase-session', {
      method: 'POST',
      body: { idToken, intent: mode, fullName: name.trim(), email: email.trim(), password },
    }))
  })

  const resend = () => run(async () => {
    confirmation.current = await sendPhoneCode(mobile, true)
    setCode('')
    setResendIn(28)
  })

  const google = () => run(async () => {
    const idToken = await googleIdToken()
    await finish(await api<SessionResponse>('/api/auth/google-session', { method: 'POST', body: { idToken } }))
  })

  const emailLogin = mode === 'login' && method === 'email'
  const submitDisabled = mode === 'login' ? (method === 'mobile' ? mobile.length !== 10 : !email || !password) : false

  return (
    <View style={styles.page}>
      <View style={styles.glow} pointerEvents="none" />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.modal}>
          <Image source={logo} style={styles.brand} contentFit="contain" />

          {step === 'otp' ? (
            <View>
              <View style={styles.badge}><Ionicons name="shield-checkmark" size={24} color="#fff" /></View>
              <Text style={styles.title}>Verify Your Mobile Number</Text>
              <Text style={styles.sub}>Enter the 6-digit code sent to{'\n'}<Text style={styles.subStrong}>+91 •••••{mobile.slice(-4)}</Text></Text>
              <ErrorBanner message={error} />
              <OtpBoxes value={code} onChange={setCode} />
              <Pressable disabled={resendIn > 0 || loading} onPress={resend} style={styles.resend}>
                <Text style={[styles.resendText, resendIn <= 0 && styles.resendActive]}>{resendIn > 0 ? `Resend OTP in 00:${String(resendIn).padStart(2, '0')}` : 'Resend OTP'}</Text>
              </Pressable>
              <Button title="Verify & Continue" onPress={submitOtp} loading={loading} disabled={code.length !== 6} icon={<Ionicons name="arrow-forward" size={18} color="#fff" />} style={styles.cta} />
              <View style={styles.secure}>
                <Ionicons name="lock-closed" size={12} color={colors.green} />
                <Text style={styles.secureText}>Your information is protected with bank-level security.</Text>
              </View>
              <Pressable onPress={() => { setStep('form'); setError('') }} style={{ alignSelf: 'center', marginTop: 12 }}>
                <Text style={styles.switchLink}>Change number</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <View style={styles.badge}><Ionicons name="person" size={24} color="#fff" /></View>
              <Text style={styles.title}>{mode === 'login' ? 'Welcome Back' : 'Create Your Account'}</Text>
              <Text style={styles.sub}>{mode === 'login' ? 'Sign in to continue to Scorenow.' : 'Start improving your credit profile in just a few steps.'}</Text>

              {mode === 'login' ? (
                <View style={styles.tabs}>
                  {([['mobile', 'Mobile Number', 'phone-portrait-outline'], ['email', 'Email', 'mail-outline']] as const).map(([id, label, icon]) => (
                    <Pressable key={id} style={[styles.tab, method === id && styles.tabActive]} onPress={() => { setMethod(id); setError('') }}>
                      <Ionicons name={icon} size={14} color={method === id ? colors.blueDark : colors.muted} />
                      <Text style={[styles.tabText, method === id && { color: colors.blueDark }]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <ErrorBanner message={error} />

              {mode === 'signup' ? <AuthInput label="Full Name" icon="person-outline" value={name} onChangeText={setName} placeholder="Enter your full name" autoCapitalize="words" textContentType="name" /> : null}
              {mode === 'signup' || method === 'mobile' ? (
                <AuthInput label="Mobile Number" prefix="🇮🇳 +91" value={mobile} onChangeText={(text) => setMobile(text.replace(/\D/g, '').slice(0, 10))} placeholder="Enter your mobile number" keyboardType="number-pad" textContentType="telephoneNumber" />
              ) : null}
              {mode === 'signup' || method === 'email' ? (
                <AuthInput label="Email Address" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
              ) : null}
              {mode === 'signup' || method === 'email' ? (
                <AuthInput
                  label={mode === 'signup' ? 'Create Password' : 'Password'}
                  icon="lock-closed-outline"
                  value={password}
                  onChangeText={setPassword}
                  placeholder={mode === 'signup' ? 'Minimum 8 characters' : 'Enter your password'}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  right={(
                    <Pressable style={styles.eye} onPress={() => setShowPassword((current) => !current)} hitSlop={10}>
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.muted} />
                    </Pressable>
                  )}
                />
              ) : null}

              {!emailLogin ? (
                <View style={styles.note}>
                  <Ionicons name="shield-checkmark-outline" size={14} color={colors.green} />
                  <Text style={styles.noteText}>{"We'll send a one-time code to verify it's you."}</Text>
                </View>
              ) : null}

              <Button
                title={emailLogin ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send OTP'}
                onPress={submitForm}
                loading={loading}
                disabled={submitDisabled}
                icon={<Ionicons name="arrow-forward" size={18} color="#fff" />}
                style={styles.cta}
              />

              {mode === 'login' ? (
                <>
                  <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>or continue with</Text><View style={styles.line} /></View>
                  <Button title="Continue with Google" variant="outline" onPress={google} disabled={loading} icon={<Ionicons name="logo-google" size={18} color="#ea4335" />} style={styles.google} />
                </>
              ) : null}

              <Text style={styles.switchRow}>
                {mode === 'login' ? 'New to Scorenow? ' : 'Already registered? '}
                <Text style={styles.switchLink} onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}>{mode === 'login' ? 'Create Account' : 'Sign In'}</Text>
              </Text>
            </View>
          )}
        </View>

        <Pressable onPress={() => router.push('/admin/login')} style={styles.adminLink}>
          <Ionicons name="shield-checkmark-outline" size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.adminText}>Admin sign in</Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#07173f' },
  glow: { position: 'absolute', top: -120, alignSelf: 'center', width: 420, height: 420, borderRadius: 210, backgroundColor: 'rgba(40,110,230,0.35)' },
  modal: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 24, paddingTop: 22, paddingBottom: 26, shadowColor: '#051437', shadowOpacity: 0.35, shadowRadius: 40, shadowOffset: { width: 0, height: 20 }, elevation: 16 },
  brand: { width: 150, height: 52, alignSelf: 'center', marginBottom: 14 },
  badge: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12, shadowColor: colors.blue, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy, textAlign: 'center', marginBottom: 4 },
  sub: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 19, marginBottom: 18 },
  subStrong: { color: colors.navy, fontWeight: '800' },
  tabs: { flexDirection: 'row', gap: 4, padding: 4, marginBottom: 16, borderRadius: 10, backgroundColor: '#f3f6fb' },
  tab: { flex: 1, minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8 },
  tabActive: { backgroundColor: '#fff', shadowColor: colors.blue, shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  tabText: { fontSize: 12.5, fontWeight: '800', color: colors.muted },
  label: { fontSize: 11.5, fontWeight: '800', color: colors.navy, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 },
  inputWrap: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: '#fff' },
  inputText: { flex: 1, minHeight: 44, paddingHorizontal: 4, fontSize: 14, fontWeight: '600', color: colors.navy },
  prefix: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 42, marginLeft: 2, borderRadius: 6, backgroundColor: colors.sky },
  prefixText: { fontSize: 13, fontWeight: '800', color: colors.navy },
  eye: { paddingRight: 14 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  noteText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  cta: { minHeight: 48, borderRadius: 8, marginTop: 2 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, marginBottom: 14 },
  line: { flex: 1, height: 1, backgroundColor: colors.line },
  or: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  google: { minHeight: 46, borderRadius: 8 },
  switchRow: { textAlign: 'center', marginTop: 16, fontSize: 12, color: colors.muted },
  switchLink: { color: colors.blueDark, fontWeight: '800', fontSize: 12, textDecorationLine: 'underline' },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  otpBox: { width: 42, height: 52, borderRadius: 8, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  otpActive: { borderColor: colors.blue },
  otpFilled: { backgroundColor: colors.sky },
  otpDigit: { fontSize: 22, fontWeight: '800', color: colors.navy },
  otpHidden: { position: 'absolute', opacity: 0, width: '100%', height: '100%' },
  resend: { alignSelf: 'center', marginTop: 14, marginBottom: 14 },
  resendText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  resendActive: { color: colors.blueDark, textDecorationLine: 'underline' },
  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  secureText: { color: colors.muted, fontSize: 10.5 },
  adminLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20, padding: 8 },
  adminText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
})
