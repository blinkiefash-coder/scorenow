import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native'
import { Text } from './Text'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, radius } from '../lib/theme'

export function SelectField({ label, value, options, onChange, placeholder = 'Select' }: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const insets = useSafeAreaInsets()
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Text style={[styles.value, !value && { color: '#9aa5bd' }]}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>{label}</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable style={styles.option} onPress={() => { onChange(item); setOpen(false) }}>
                <Text style={[styles.optionText, item === value && { color: colors.blue, fontWeight: '800' }]}>{item}</Text>
                {item === value ? <Ionicons name="checkmark" size={18} color={colors.blue} /> : null}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', color: colors.navy, marginBottom: 6 },
  field: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  value: { fontSize: 16, color: colors.navy },
  backdrop: { flex: 1, backgroundColor: 'rgba(8,20,70,0.45)' },
  sheet: { maxHeight: '65%', backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 10 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 12 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.navy, marginBottom: 6 },
  option: { paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.sky },
  optionText: { fontSize: 15, color: colors.navy },
})
