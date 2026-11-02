export type PaymentMonth = { month: string; late: number; reported: number }

export type TrendPoint = { score: number; date: string; estimated: boolean }

export type TrendDirection = 'improving' | 'declining' | 'stable'

const MIN_SCORE = 300
const MAX_SCORE = 900
const MONTHS_SHOWN = 6

const clamp = (value: number) => Math.min(MAX_SCORE, Math.max(MIN_SCORE, Math.round(value)))

// Estimates earlier months by walking back from the real score. Each month's on-time or late
// payments move the score: a clean month adds points, late payments subtract more the higher the late share.
// The latest point is always the real reported score.
export const estimateTrend = (current: number | null, currentDate: string, months: PaymentMonth[]) => {
  if (current === null) return { points: [] as TrendPoint[], direction: null as TrendDirection | null }

  const usable = months.filter((item) => item.reported > 0).sort((a, b) => a.month.localeCompare(b.month)).slice(-MONTHS_SHOWN)
  if (usable.length < 2) {
    return { points: [{ score: current, date: currentDate, estimated: false }], direction: null }
  }

  const deltas = usable.map((item) => {
    const rate = item.late / item.reported
    return item.late === 0 ? 3 : -(5 + 20 * rate)
  })

  const scores = new Array<number>(usable.length)
  scores[usable.length - 1] = current
  for (let index = usable.length - 2; index >= 0; index -= 1) {
    scores[index] = clamp(scores[index + 1] - deltas[index + 1])
  }

  const points: TrendPoint[] = usable.map((item, index) => ({
    score: scores[index],
    date: index === usable.length - 1 ? currentDate : `${item.month}-01`,
    estimated: index !== usable.length - 1,
  }))

  const rate = (items: PaymentMonth[]) => items.reduce((sum, item) => sum + item.late, 0) / Math.max(1, items.reduce((sum, item) => sum + item.reported, 0))
  const half = Math.floor(usable.length / 2)
  const earlier = rate(usable.slice(0, half))
  const recent = rate(usable.slice(half))
  const direction: TrendDirection = Math.abs(recent - earlier) < 0.02 ? 'stable' : recent < earlier ? 'improving' : 'declining'

  return { points, direction }
}
