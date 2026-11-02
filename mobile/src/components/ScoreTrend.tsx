import { useState } from 'react'
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native'
import Svg, { Circle, Line } from 'react-native-svg'
import { Text } from './Text'
import { formatDate } from '../lib/format'
import { colors } from '../lib/theme'
import type { TrendPoint } from '../lib/trend'

const HEIGHT = 92
const PAD_X = 8
const PAD_TOP = 10
const PAD_BOTTOM = 8
const MIN_SCORE = 300
const MAX_SCORE = 900

export function ScoreTrend({ points }: { points: TrendPoint[] }) {
  const [width, setWidth] = useState(0)

  const scores = points.map((point) => point.score)
  let low = Math.min(...scores) - 20
  let high = Math.max(...scores) + 20
  if (high - low < 60) {
    const mid = (low + high) / 2
    low = mid - 30
    high = mid + 30
  }
  low = Math.max(MIN_SCORE, low)
  high = Math.min(MAX_SCORE, high)

  const innerWidth = Math.max(0, width - PAD_X * 2)
  const innerHeight = HEIGHT - PAD_TOP - PAD_BOTTOM
  const coords = points.map((point, index) => ({
    x: PAD_X + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth),
    y: PAD_TOP + (1 - (point.score - low) / (high - low)) * innerHeight,
  }))
  const gridY = [0, 0.5, 1].map((fraction) => PAD_TOP + fraction * innerHeight)
  const hasEstimate = points.some((point) => point.estimated)

  return (
    <View>
      <View style={styles.chart} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            {gridY.map((y) => (
              <Line key={y} x1={PAD_X} x2={width - PAD_X} y1={y} y2={y} stroke={colors.line} strokeWidth={1} strokeDasharray="3 4" />
            ))}
            {coords.slice(1).map((coord, index) => {
              const from = coords[index]
              const estimated = points[index + 1].estimated
              return (
                <Line
                  key={`segment-${index}`}
                  x1={from.x}
                  y1={from.y}
                  x2={coord.x}
                  y2={coord.y}
                  stroke={colors.blue}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeDasharray={estimated ? '4 4' : undefined}
                  opacity={estimated ? 0.55 : 1}
                />
              )
            })}
            {coords.map((coord, index) => {
              const real = !points[index].estimated
              return (
                <Circle
                  key={`${points[index].date}-${index}`}
                  cx={coord.x}
                  cy={coord.y}
                  r={real ? 4.5 : 3}
                  fill={real ? colors.blue : '#fff'}
                  stroke={colors.blue}
                  strokeWidth={2}
                />
              )
            })}
          </Svg>
        ) : null}
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisText}>{formatDate(points[0]?.date)}</Text>
        <Text style={styles.axisText}>{formatDate(points[points.length - 1]?.date)}</Text>
      </View>
      {hasEstimate ? <Text style={styles.note}>Dashed points are estimated from your payment history. The solid point is your latest report.</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  chart: { height: HEIGHT, marginTop: 8 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2, paddingHorizontal: PAD_X },
  axisText: { fontSize: 9, color: colors.muted, fontWeight: '600' },
  note: { fontSize: 9, color: colors.muted, marginTop: 6, paddingHorizontal: PAD_X, lineHeight: 12 },
})
