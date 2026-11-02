import { Image } from 'expo-image'
import { useEffect, useRef, type ReactNode } from 'react'
import { ActivityIndicator, Animated, Easing, Pressable, RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native'
import { Text, TextInput } from './Text'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { colors, radius, shadow } from '../lib/theme'

const mark = require('../../assets/brand/mark.png')

export function Spinner({ size = 36 }: { size?: number }) {
  const rotation = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(rotation, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }))
    loop.start()
    return () => loop.stop()
  }, [rotation])
  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate: spin }] }} accessibilityRole="progressbar">
      <Image source={mark} style={{ width: size, height: size }} contentFit="contain" />
    </Animated.View>
  )
}

export function FullScreenLoader({ label }: { label?: string }) {
  return (
    <View style={styles.loader}>
      <Spinner size={56} />
      {label ? <Text style={styles.loaderLabel}>{label}</Text> : null}
    </View>
  )
}

type ScreenProps = {
  children: ReactNode
  onRefresh?: () => void
  refreshing?: boolean
  padded?: boolean
  bottomPad?: number
  header?: ReactNode
}

export function Screen({ children, onRefresh, refreshing = false, padded = true, bottomPad = 24, header }: ScreenProps) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {header}
      <ScrollView
        contentContainerStyle={[padded && { paddingHorizontal: 18 }, { paddingBottom: bottomPad + insets.bottom, paddingTop: 8 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} colors={[colors.blue]} /> : undefined}
      >
        {children}
      </ScrollView>
    </View>
  )
}

export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  )
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable
        onPress={() => { void Haptics.selectionAsync(); onPress() }}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }, style]}
      >
        {children}
      </Pressable>
    )
  }
  return <View style={[styles.card, style]}>{children}</View>
}

type ButtonProps = {
  title: string
  onPress: () => void
  variant?: 'primary' | 'outline' | 'gold' | 'danger' | 'ghost'
  loading?: boolean
  disabled?: boolean
  icon?: ReactNode
  small?: boolean
  style?: StyleProp<ViewStyle>
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, small, style }: ButtonProps) {
  const palette = {
    primary: { bg: colors.blue, fg: '#fff', border: colors.blue },
    gold: { bg: colors.gold, fg: colors.navy, border: colors.gold },
    danger: { bg: colors.red, fg: '#fff', border: colors.red },
    outline: { bg: '#fff', fg: colors.blue, border: colors.line },
    ghost: { bg: 'transparent', fg: colors.blue, border: 'transparent' },
  }[variant]
  const inactive = disabled || loading
  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress() }}
      style={({ pressed }) => [
        styles.button,
        small && { minHeight: 40, paddingHorizontal: 14 },
        variant === 'primary' && !inactive && styles.buttonShadow,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: inactive ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={palette.fg} /> : (
        <>
          {icon}
          <Text style={[styles.buttonText, small && { fontSize: 13 }, { color: palette.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  )
}

export function Field({ label, error, ...props }: TextInputProps & { label?: string; error?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor="#9aa5bd"
        {...props}
        style={[styles.input, error ? { borderColor: colors.red } : null, props.multiline && { minHeight: 110, textAlignVertical: 'top' }, props.style]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  )
}

export function Pill({ text, color = colors.blue, bg }: { text: string; color?: string; bg?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg ?? `${color}1A` }]}>
      <Text style={[styles.pillText, { color }]}>{text}</Text>
    </View>
  )
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
      {options.map((option) => {
        const active = option.id === value
        return (
          <Pressable
            key={option.id}
            onPress={() => { void Haptics.selectionAsync(); onChange(option.id) }}
            style={[styles.chip, active && { backgroundColor: colors.blue, borderColor: colors.blue }]}
          >
            <Text style={[styles.chipText, active && { color: '#fff' }]}>{option.label}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionText}>{title}</Text>
      {action}
    </View>
  )
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!message) return null
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? <Pressable onPress={onRetry}><Text style={styles.retry}>Retry</Text></Pressable> : null}
    </View>
  )
}

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <View style={styles.empty}>
      <Image source={mark} style={{ width: 54, height: 54, opacity: 0.5 }} contentFit="contain" />
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={styles.emptyText}>{text}</Text> : null}
    </View>
  )
}

export function StatTile({ label, value, tone = colors.navy }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={[styles.statValue, { color: tone }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: colors.bg },
  loaderLabel: { color: colors.navy, fontSize: 13, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, gap: 12 },
  headerTitle: { fontSize: 25, fontWeight: '800', color: colors.navy, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: colors.muted, marginTop: 3 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: '#e9eef6', padding: 18, marginBottom: 14, ...shadow },
  button: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonShadow: { shadowColor: colors.blue, shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  buttonText: { fontSize: 15, fontWeight: '800' },
  label: { fontSize: 12, fontWeight: '700', color: colors.navy, marginBottom: 6 },
  input: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: '#f8fbff', paddingHorizontal: 14, fontSize: 16, fontWeight: '500', color: colors.navy },
  fieldError: { color: colors.red, fontSize: 12, marginTop: 4 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  pillText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.navy },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 10 },
  sectionText: { fontSize: 17, fontWeight: '800', color: colors.navy },
  errorBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: '#fdecec', borderRadius: radius.md, padding: 12, marginBottom: 12 },
  errorText: { flex: 1, color: colors.red, fontSize: 13, fontWeight: '600' },
  retry: { color: colors.blue, fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: 36, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.navy },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: 'center', paddingHorizontal: 24 },
  statTile: { flex: 1, backgroundColor: colors.sky, borderRadius: radius.md, padding: 12 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, color: colors.muted, marginTop: 2, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, gap: 12 },
  rowLabel: { color: colors.muted, fontSize: 13 },
  rowValue: { color: colors.navy, fontSize: 13, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
})
