import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../lib/theme'
import { ModalHeader } from './ModalHeader'

export function Page({ title, children }: { title: string; children: ReactNode }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ModalHeader title={title} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 28 + insets.bottom }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  )
}
