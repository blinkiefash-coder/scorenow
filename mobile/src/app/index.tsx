import { Redirect } from 'expo-router'
import { useAuth } from '../lib/auth'

export default function Index() {
  const { customer } = useAuth()
  return <Redirect href={customer ? '/(tabs)' : '/login'} />
}
