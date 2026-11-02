import { Image } from 'expo-image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import { colors } from '../lib/theme'
import { Text } from './Text'

const fullLogo = require('../../assets/brand/logo-full.jpg')

const MIN_VISIBLE_MS = 2400

function Ring({ delay, size }: { delay: number; size: number }) {
  const [progress] = useState(() => new Animated.Value(0))
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(progress, { toValue: 1, duration: 2000, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [delay, progress])
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.5, 0] }),
          transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.6] }) }],
        },
      ]}
    />
  )
}

export function AnimatedSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const [logo] = useState(() => new Animated.Value(0))
  const [tagline] = useState(() => new Animated.Value(0))
  const [bar] = useState(() => new Animated.Value(0))
  const [exit] = useState(() => new Animated.Value(1))
  const minElapsed = useRef(false)
  const exiting = useRef(false)

  const leave = useCallback(() => {
    if (exiting.current || !minElapsed.current) return
    exiting.current = true
    Animated.timing(exit, { toValue: 0, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(onDone)
  }, [exit, onDone])
  const leaveRef = useRef(leave)
  useEffect(() => { leaveRef.current = leave }, [leave])

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logo, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.timing(tagline, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start()
    Animated.timing(bar, { toValue: 1, duration: MIN_VISIBLE_MS - 200, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start()
    const timer = setTimeout(() => { minElapsed.current = true; leaveRef.current() }, MIN_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [logo, tagline, bar])

  useEffect(() => { if (ready) leaveRef.current() }, [ready])

  const rise = (value: Animated.Value) => ({
    opacity: value,
    transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  })

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: exit, backgroundColor: '#fff' }]} pointerEvents={ready ? 'auto' : 'box-only'}>
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />
      <View style={styles.center}>
        <View style={styles.logoWrap}>
          <Ring delay={0} size={260} />
          <Ring delay={700} size={260} />
          <Animated.View
            style={{
              opacity: logo,
              transform: [
                { scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                { translateY: logo.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
              ],
            }}
          >
            <Image source={fullLogo} style={styles.logo} contentFit="contain" />
          </Animated.View>
        </View>
        <Animated.View style={rise(tagline)}>
          <Text style={styles.tagline}>Know your credit score. Improve it with confidence.</Text>
        </Animated.View>
      </View>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logoWrap: { width: 300, height: 260, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  logo: { width: 290, height: 102 },
  ring: { position: 'absolute', borderWidth: 2, borderColor: colors.gold },
  tagline: { fontSize: 14, fontWeight: '600', color: colors.muted, textAlign: 'center', lineHeight: 20 },
  blobTop: { position: 'absolute', top: -90, right: -90, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(10,61,156,0.07)' },
  blobBottom: { position: 'absolute', bottom: -110, left: -80, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(244,181,35,0.14)' },
  barTrack: { position: 'absolute', bottom: 64, alignSelf: 'center', width: 120, height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2, backgroundColor: colors.gold },
})
