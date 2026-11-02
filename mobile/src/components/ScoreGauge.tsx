import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from './Text'
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing } from 'react-native-reanimated'
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg'
import { colors, scoreColor } from '../lib/theme'

const AnimatedPath = Animated.createAnimatedComponent(Path)

const MIN = 300
const MAX = 900
const SIZE = 240
const STROKE = 20
const RADIUS = (SIZE - STROKE) / 2
const CENTER = SIZE / 2

const point = (angle: number) => ({ x: CENTER + RADIUS * Math.cos(angle), y: CENTER + RADIUS * Math.sin(angle) })
const arcLength = Math.PI * RADIUS
const arcPath = `M ${CENTER - RADIUS} ${CENTER} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER + RADIUS} ${CENTER}`

export function ScoreGauge({ score, band, dark, size = SIZE }: { score: number | null; band?: string | null; dark?: boolean; size?: number }) {
  const scale = size / SIZE
  const progress = useSharedValue(0)
  const fraction = score ? Math.min(1, Math.max(0, (score - MIN) / (MAX - MIN))) : 0

  useEffect(() => {
    progress.value = withTiming(fraction, { duration: 1200, easing: Easing.out(Easing.cubic) })
  }, [fraction, progress])

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: arcLength * (1 - progress.value) }))
  const marker = point(Math.PI + Math.PI * fraction)
  const tone = dark ? '#fff' : scoreColor(score)

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={(SIZE / 2 + STROKE) * scale} viewBox={`0 0 ${SIZE} ${SIZE / 2 + STROKE}`}>
        <Defs>
          <LinearGradient id="gauge" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.red} />
            <Stop offset="0.5" stopColor={colors.gold} />
            <Stop offset="1" stopColor={colors.green} />
          </LinearGradient>
        </Defs>
        <Path d={arcPath} stroke={dark ? 'rgba(255,255,255,0.16)' : colors.line} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
        <AnimatedPath
          d={arcPath}
          stroke="url(#gauge)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={arcLength}
          animatedProps={animatedProps}
        />
        {score ? <Circle cx={marker.x} cy={marker.y} r={9} fill="#fff" stroke={dark ? colors.gold : tone} strokeWidth={4} /> : null}
      </Svg>
      <View style={[styles.center, { top: 70 * scale }]}>
        <Text style={[styles.score, { color: tone, fontSize: 46 * scale }]}>{score ?? '—'}</Text>
        {band ? <Text style={[styles.band, { fontSize: 13 * scale }, dark && styles.onDark]}>{band}</Text> : <Text style={[styles.band, { fontSize: 13 * scale }, dark && styles.onDark]}>No score yet</Text>}
      </View>
      <View style={[styles.scale, { width: size, marginTop: -2 * scale, paddingHorizontal: 4 * scale }]}>
        <Text style={[styles.scaleText, dark && styles.onDark]}>{MIN}</Text>
        <Text style={[styles.scaleText, dark && styles.onDark]}>{MAX}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center' },
  score: { fontWeight: '900' },
  band: { color: colors.muted, fontWeight: '700', textTransform: 'capitalize' },
  onDark: { color: 'rgba(255,255,255,0.72)' },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleText: { fontSize: 11, color: colors.muted },
})
