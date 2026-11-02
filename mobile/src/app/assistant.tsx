import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { type ComponentRef, useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '../components/Text'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ModalHeader } from '../components/ModalHeader'
import { Button, Field } from '../components/ui'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { chatConcerns, getChatSuggestion, scoreRanges } from '../lib/content'
import { colors, radius } from '../lib/theme'

type Message = { from: 'bot' | 'me'; text: string }

export default function AssistantScreen() {
  const { customer } = useAuth()
  const insets = useSafeAreaInsets()
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null)
  const [step, setStep] = useState(0)
  const [concern, setConcern] = useState('')
  const [scoreRange, setScoreRange] = useState('')
  const [phone, setPhone] = useState(customer?.user.mobile ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const name = customer?.user.full_name ?? ''

  const messages: Message[] = [{ from: 'bot', text: `Hi ${name.split(' ')[0]}! I'm Neha, your credit assistant. What do you need help with?` }]
  if (step >= 1) messages.push({ from: 'me', text: concern }, { from: 'bot', text: 'Got it. What is your current credit score range?' })
  if (step >= 2) messages.push({ from: 'me', text: scoreRange }, { from: 'bot', text: getChatSuggestion(concern, scoreRange) })
  if (step >= 2 && step < 4) messages.push({ from: 'bot', text: 'Want an expert to call you back? Share your 10-digit mobile number.' })
  if (step >= 4) messages.push({ from: 'me', text: phone }, { from: 'bot', text: 'Thanks! Your callback request is saved. Our team will reach out shortly.' })

  useEffect(() => { const id = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 80); return () => clearTimeout(id) }, [step])

  const digits = phone.replace(/\D/g, '')
  const submit = async () => {
    if (digits.length !== 10) { setError('Enter a valid 10-digit mobile number.'); return }
    setError('')
    setSaving(true)
    try {
      await api('/api/inquiries', { method: 'POST', token: customer?.token, body: { fullName: name, mobile: digits, concern, scoreRange } })
      setStep(4)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save your callback request.')
    } finally {
      setSaving(false)
    }
  }

  const whatsapp = () => {
    const text = encodeURIComponent(`Hello Scorenow, I am ${name}. I need help with: ${concern || 'credit guidance'}. My credit score range is: ${scoreRange || 'not shared'}. My phone number is: ${digits.length === 10 ? digits : 'not provided'}.`)
    void Linking.openURL(`https://wa.me/919114141011?text=${text}`)
  }

  const reset = () => { setStep(0); setConcern(''); setScoreRange(''); setError('') }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ModalHeader title="Neha · Credit assistant" />
      <ScrollView ref={scroller} contentContainerStyle={{ padding: 16, paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
        {messages.map((message, index) => (
          <View key={index} style={[styles.row, message.from === 'me' && { justifyContent: 'flex-end' }]}>
            {message.from === 'bot' ? <Image source={require('../../assets/brand/mark.png')} style={styles.avatar} contentFit="contain" /> : null}
            <View style={[styles.bubble, message.from === 'me' ? styles.mine : styles.theirs]}>
              <Text style={[styles.text, message.from === 'me' && { color: '#fff' }]}>{message.text}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
        {step === 0 ? <View style={styles.choices}>{chatConcerns.map((option) => <Choice key={option} label={option} onPress={() => { setConcern(option); setStep(1) }} />)}</View> : null}
        {step === 1 ? <View style={styles.choices}>{scoreRanges.map((option) => <Choice key={option} label={option} onPress={() => { setScoreRange(option); setStep(2) }} />)}</View> : null}
        {step === 2 || step === 3 ? (
          <>
            <Field value={phone} onChangeText={setPhone} placeholder="10-digit mobile number" keyboardType="number-pad" maxLength={10} error={error} />
            <Button title="Request callback" loading={saving} onPress={submit} />
          </>
        ) : null}
        {step >= 2 ? <Button title="Chat on WhatsApp" variant="outline" onPress={whatsapp} style={{ marginTop: 10 }} icon={<Ionicons name="logo-whatsapp" size={18} color={colors.green} />} /> : null}
        {step >= 1 ? <Button title="Start over" variant="ghost" onPress={reset} /> : null}
      </View>
    </KeyboardAvoidingView>
  )
}

function Choice({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.choice}><Text style={styles.choiceText}>{label}</Text></Pressable>
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 10 },
  avatar: { width: 28, height: 28 },
  bubble: { maxWidth: '80%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.md },
  theirs: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 4 },
  mine: { backgroundColor: colors.blue, borderBottomRightRadius: 4 },
  text: { fontSize: 14, color: colors.navy, lineHeight: 20 },
  footer: { padding: 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.line },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.blue, backgroundColor: colors.sky },
  choiceText: { color: colors.blue, fontWeight: '700', fontSize: 13 },
})
