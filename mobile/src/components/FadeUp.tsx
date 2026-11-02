import { useEffect, useState, type ReactNode } from 'react'
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native'

export function FadeUp({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const [value] = useState(() => new Animated.Value(0))
  useEffect(() => {
    Animated.timing(value, { toValue: 1, duration: 520, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
  }, [value, delay])
  return (
    <Animated.View style={[{ opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  )
}
