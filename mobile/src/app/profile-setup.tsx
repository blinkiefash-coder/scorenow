import { router } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { Text } from '../components/Text'
import { ModalHeader } from '../components/ModalHeader'
import { SelectField } from '../components/SelectField'
import { Button, ErrorBanner, Field } from '../components/ui'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useDashboard } from '../lib/dashboard'
import { indianStates } from '../lib/states'
import { colors } from '../lib/theme'

const genders = ['Male', 'Female', 'Other']

// Accepts DD/MM/YYYY typing and converts it to the YYYY-MM-DD the API expects.
const formatDobInput = (text: string) => {
  const digits = text.replace(/\D/g, '').slice(0, 8)
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/')
}
const toIsoDate = (value: string) => {
  const [day, month, year] = value.split('/')
  return day && month && year?.length === 4 ? `${year}-${month}-${day}` : ''
}

export default function ProfileSetupScreen() {
  const { customer, updateCustomer } = useAuth()
  const { dashboard, reload } = useDashboard()
  const existing = dashboard?.profile
  const [name, setName] = useState(existing?.name_as_per_pan ?? customer?.user.full_name ?? '')
  const [pan, setPan] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState(existing?.city ?? '')
  const [state, setState] = useState(existing?.state ?? '')
  const [pincode, setPincode] = useState('')
  const [email, setEmail] = useState(customer?.user.email ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    const dateOfBirth = toIsoDate(dob)
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(pan)) return setError('Enter a valid 10-character PAN, e.g. ABCDE1234F.')
    if (!dateOfBirth) return setError('Enter your date of birth as DD/MM/YYYY.')
    if (!gender) return setError('Select your gender.')
    if (!state) return setError('Select your state.')
    setLoading(true)
    try {
      await api('/api/profile', {
        method: 'POST',
        token: customer?.token,
        body: {
          nameAsPerPan: name.trim(), pan: pan.toUpperCase(), dateOfBirth, gender: gender.toLowerCase(),
          addressLine1: address.trim(), city: city.trim(), state, pincode, email: email.trim(),
        },
      })
      if (email.trim() && !customer?.user.email) await updateCustomer({ email: email.trim().toLowerCase() })
      reload()
      router.back()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save your profile.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ModalHeader title="Credit profile" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 16 }}>Your PAN is stored encrypted and only shared with the credit bureau to fetch your report.</Text>
          <ErrorBanner message={error} />
          <Field label="Name as per PAN" value={name} onChangeText={setName} autoCapitalize="words" />
          <Field label="PAN" value={pan} onChangeText={(text) => setPan(text.toUpperCase().slice(0, 10))} autoCapitalize="characters" placeholder="ABCDE1234F" />
          <Field label="Date of birth" value={dob} onChangeText={(text) => setDob(formatDobInput(text))} keyboardType="number-pad" placeholder="DD/MM/YYYY" />
          <SelectField label="Gender" value={gender} options={genders} onChange={setGender} />
          {!customer?.user.email ? <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" /> : null}
          <Field label="Address" value={address} onChangeText={setAddress} placeholder="House no., street, area" />
          <Field label="City" value={city} onChangeText={setCity} autoCapitalize="words" />
          <SelectField label="State" value={state} options={indianStates} onChange={setState} />
          <Field label="PIN code" value={pincode} onChangeText={(text) => setPincode(text.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" />
          <Button title="Save profile" onPress={submit} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
