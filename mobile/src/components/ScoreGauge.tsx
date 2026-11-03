import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from './Text'
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing } from 'react-native-reanimated'
import Svg, { Circle, Path } from 'react-native-svg'
import { colors, scoreColor } from '../lib/theme'

const AnimatedPath = Animated.createAnimatedComponent(Path)

const MIN = 300
const MAX = 900
const SIZE = 240
const STROKE = 20
const RADIUS = (SIZE - STROKE) / 2
const CENTER = SIZE / 2

const bands = [
  { label: 'Poor', min: 300, max: 579, color: '#e5484d' },
  { label: 'Fair', min: 580, max: 669, color: '#f08a3c' },
  { label: 'Good', min: 670, max: 739, color: '#f4b523' },
  { label: 'Very good', min: 740, max: 799, color: '#8ccf32' },
  { label: 'Excellent', min: 800, max: 900, color: '#14bc78' },
]

const point = (fraction: number, radius = RADIUS) => {
  const angle = Math.PI + Math.PI * fraction
  return { x: CENTER + radius * Math.cos(angle), y: CENTER + radius * Math.sin(angle) }
}

const segmentPath = (start: number, end: number) => {
  const from = point(start)
  const to = point(end)
  return `M ${from.x} ${from.y} A ${RADIUS} ${RADIUS} 0 0 1 ${to.x} ${to.y}`
}

const scoreBand = (score: number) => bands.find((item) => score <= item.max)?.label ?? 'Excellent'

export function ScoreGauge({ score, band, dark, size = SIZE }: { score: number | null; band?: string | null; dark?: boolean; size?: number }) {
  const scale = size / SIZE
  const progress = useSharedValue(0)
  const fraction = score === null ? 0 : Math.min(1, Math.max(0, (score - MIN) / (MAX - MIN)))

  useEffect(() => {
    progress.value = withTiming(fraction, { duration: 1200, easing: Easing.out(Easing.cubic) })
  }, [fraction, progress])

  const needleProps = useAnimatedProps(() => {
    const angle = Math.PI + Math.PI * progress.value
    const tipX = CENTER + (RADIUS - 12) * Math.cos(angle)
    const tipY = CENTER + (RADIUS - 12) * Math.sin(angle)
    const sideX = 7 * Math.sin(angle)
    const sideY = -7 * Math.cos(angle)
    return {
      d: `M ${CENTER + sideX} ${CENTER + sideY} L ${tipX} ${tipY} L ${CENTER - sideX} ${CENTER - sideY} Z`,
    }
  })
  const tone = dark ? '#fff' : scoreColor(score)
  const scoreLabel = score === null ? 'No score yet' : (band || scoreBand(score))

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={(SIZE / 2 + 12) * scale} viewBox={`0 0 ${SIZE} ${SIZE / 2 + 12}`}>
        {bands.map((item) => (
          <Path
            key={item.label}
            d={segmentPath((item.min - MIN) / (MAX - MIN) + 0.006, (item.max - MIN) / (MAX - MIN) - 0.006)}
            stroke={item.color}
            strokeWidth={STROKE}
            fill="none"
          />
        ))}
        {score !== null ? <AnimatedPath d="" fill="#303238" animatedProps={needleProps} /> : null}
        {score !== null ? <Circle cx={CENTER} cy={CENTER} r={15} fill="#fff" stroke="#303238" strokeWidth={5} /> : null}
        {score !== null ? <Circle cx={CENTER} cy={CENTER} r={9} fill="#303238" /> : null}
      </Svg>
      <View style={[styles.scale, { width: size, marginTop: -2 * scale, paddingHorizontal: 4 * scale }]}>
        <Text style={[styles.scaleText, dark && styles.onDark]}>{MIN}</Text>
        <Text style={[styles.scaleText, dark && styles.onDark]}>{MAX}</Text>
      </View>
      <View style={styles.center}>
        <Text style={[styles.score, { color: tone, fontSize: 46 * scale }]}>{score ?? '—'}</Text>
        <Text style={[styles.band, { fontSize: 13 * scale }, dark && styles.onDark]}>{scoreLabel}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', marginTop: 2 },
  score: { fontWeight: '900' },
  band: { color: colors.muted, fontWeight: '700', textTransform: 'capitalize' },
  onDark: { color: 'rgba(255,255,255,0.72)' },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleText: { fontSize: 11, color: colors.muted },
})
