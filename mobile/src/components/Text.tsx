import type { ComponentProps } from 'react'
import {
  StyleSheet, Text as RNText, TextInput as RNTextInput,
  type StyleProp, type TextProps, type TextStyle,
} from 'react-native'

export const fontFamilies = {
  400: 'Manrope_400Regular',
  500: 'Manrope_500Medium',
  600: 'Manrope_600SemiBold',
  700: 'Manrope_700Bold',
  800: 'Manrope_800ExtraBold',
} as const

// Custom fonts have one family per weight on native, so map fontWeight to the matching Manrope file.
export function withFont(style: StyleProp<TextStyle>): TextStyle {
  const flat = StyleSheet.flatten(style) ?? {}
  const raw = flat.fontWeight
  const weight = raw === 'bold' ? 700 : raw === 'normal' || raw === undefined ? 400 : Number(raw)
  const key = weight >= 800 ? 800 : weight >= 700 ? 700 : weight >= 600 ? 600 : weight >= 500 ? 500 : 400
  return { ...flat, fontFamily: flat.fontFamily ?? fontFamilies[key], fontWeight: undefined }
}

export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={withFont(style)} />
}

export function TextInput({ style, ...props }: ComponentProps<typeof RNTextInput>) {
  return <RNTextInput {...props} style={withFont(style)} />
}
