import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { setStatusBarStyle } from 'expo-status-bar'
import { useCallback, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BureauCard, bureauLogos } from '../../components/BureauCard'
import { FadeUp } from '../../components/FadeUp'
import { ScoreGauge } from '../../components/ScoreGauge'
import { ScoreTrend } from '../../components/ScoreTrend'
import { Text } from '../../components/Text'
import { Card, EmptyState, ErrorBanner, FullScreenLoader } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { useDashboard } from '../../lib/dashboard'
import { formatDate, formatMoney } from '../../lib/format'
import { colors, radius, shadow } from '../../lib/theme'
import { estimateTrend, type TrendDirection } from '../../lib/trend'
import { bureauNames, type BureauId, type BureauReport } from '../../lib/types'

const neha = require('../../../assets/brand/neha-avatar.svg')
const logo = require('../../../assets/brand/logo-transparent.png')

const banks = [
  { name: 'SBI', logo: require('../../../assets/banks/bank-sbi.svg') },
  { name: 'HDFC Bank', logo: require('../../../assets/banks/bank-hdfc.svg') },
  { name: 'ICICI Bank', logo: require('../../../assets/banks/bank-icici.svg') },
  { name: 'Axis Bank', logo: require('../../../assets/banks/bank-axis.svg') },
  { name: 'Kotak', logo: require('../../../assets/banks/bank-kotak.svg') },
  { name: 'PNB', logo: require('../../../assets/banks/bank-pnb.svg') },
]

const tips = [
  { icon: 'time-outline', title: 'Pay on time', text: 'Payment history is the biggest factor in your score.', tone: colors.blue },
  { icon: 'speedometer-outline', title: 'Keep utilisation low', text: 'Use less than 30% of your credit card limit.', tone: colors.violet },
  { icon: 'search-outline', title: 'Limit new enquiries', text: 'Too many applications in a short time can lower your score.', tone: colors.gold },
] as const

const explore = [
  { icon: 'wallet-outline', label: 'Fixed deposits', text: 'Compare bank FD rates', href: '/fixed-deposits', from: '#0a3d9c', to: '#2f6fe0' },
  { icon: 'card-outline', label: 'Credit cards', text: 'Browse card offers', href: '/credit-cards', from: '#7859e8', to: '#a58bff' },
  { icon: 'book-outline', label: 'Credit guides', text: 'Quick reads', href: '/guides', from: '#14bc78', to: '#4fd9a0' },
  { icon: 'chatbubbles-outline', label: 'Support', text: 'We are here to help', href: '/support', from: '#f4b523', to: '#ffd466' },
] as const

const nehaPrompts = [
  { icon: 'trending-up-outline', text: 'How can I improve my score?', tone: colors.green },
  { icon: 'trending-down-outline', text: 'Why is my score decreasing?', tone: colors.red },
  { icon: 'card-outline', text: 'Which credit card suits me?', tone: colors.blue },
  { icon: 'document-text-outline', text: 'Explain my report', tone: colors.violet },
] as const

const greeting = () => {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const { customer } = useAuth()
  const { dashboard, loading, refreshing, error, refresh, reload } = useDashboard()

  useFocusEffect(useCallback(() => {
    setStatusBarStyle('dark')
    return () => setStatusBarStyle('dark')
  }, []))

  const [selectedBureau, setSelectedBureau] = useState<BureauId | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  if (loading && !dashboard) return <FullScreenLoader label="Loading your credit workspace…" />

  const completed = (dashboard?.reports ?? []).filter((report) => report.status === 'completed' && report.credit_score)
  const latest: BureauReport | undefined = [...completed].sort((a, b) => (b.report_date ?? '').localeCompare(a.report_date ?? ''))[0]
  const best: BureauReport | undefined = (selectedBureau && completed.find((report) => report.bureau === selectedBureau)) || latest
  const bureauOptions = (['cibil', 'equifax', 'experian', 'crif'] as const).map((bureau) => ({
    bureau,
    report: completed.find((report) => report.bureau === bureau),
  }))
  const fullName = customer?.user.full_name ?? ''
  const firstName = fullName.split(' ')[0]
  const initials = fullName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'S'
  const overdue = best?.overdue_accounts ?? null
  const overdueTone = overdue === null ? colors.muted : overdue > 0 ? colors.red : colors.green
  const trendReal = best ? (dashboard?.history ?? []).filter((point) => point.bureau === best.bureau) : []
  const trend = trendReal.length >= 2
    ? { points: trendReal.map((point) => ({ score: point.score, date: point.date, estimated: false })), direction: null as TrendDirection | null }
    : estimateTrend(best?.credit_score ?? null, best?.report_date ?? best?.requested_at ?? '', best?.payment_months ?? [])
  const trendPoints = trend.points
  const directionLabel = { improving: 'Improving', declining: 'Declining', stable: 'Stable' } as const
  const directionTone = { improving: colors.green, declining: colors.red, stable: colors.muted } as const

  return (
    <View style={styles.page}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} progressViewOffset={insets.top} colors={[colors.blue]} />}
      >
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Image source={logo} style={styles.brandLogo} contentFit="contain" accessibilityLabel="Scorenow" />
          <View style={styles.headerActions}>
            <View style={styles.iconButton} accessibilityLabel="Notifications">
              <Ionicons name="notifications-outline" size={18} color={colors.navy} />
              <View style={styles.notificationDot} />
            </View>
            <Pressable onPress={() => router.push('/profile')} style={styles.avatar} accessibilityLabel="Profile">
              <Text style={styles.avatarText}>{initials}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.greeting}>
            <Text style={styles.hello}>{greeting()},</Text>
            <Text style={styles.name} numberOfLines={1}>{firstName || 'there'} 👋</Text>
          </View>

          <FadeUp>
            <Pressable onPress={() => router.push('/assistant')}>
              <LinearGradient colors={['#081446', '#0a3d9c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.neha}>
                <View style={styles.nehaTop}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nehaTagRow}>
                      <Ionicons name="sparkles" size={12} color={colors.gold} />
                      <Text style={styles.nehaTag}>AI CREDIT ASSISTANT</Text>
                    </View>
                    <Text style={styles.nehaTitle}>Ask Neha anything about your credit</Text>
                    <Text style={styles.nehaSub}>Personalised insights, tips and answers in seconds.</Text>
                  </View>
                  <Image source={neha} style={styles.nehaAvatar} contentFit="cover" />
                </View>
                <View style={styles.prompts}>
                  {nehaPrompts.map((prompt) => (
                    <View key={prompt.text} style={styles.prompt}>
                      <Ionicons name={prompt.icon} size={15} color={prompt.tone} />
                      <Text style={styles.promptText}>{prompt.text}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.nehaCta}>
                  <Text style={styles.nehaCtaText}>Start chat</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.navy} />
                </View>
              </LinearGradient>
            </Pressable>
          </FadeUp>

          <Heading title="Explore financial products" subtitle="Compare and find the best offers" />
          <View style={styles.grid}>
            {explore.map((item) => (
              <Pressable key={item.label} onPress={() => router.push(item.href)} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}>
                <LinearGradient colors={[item.from, item.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconTile}>
                  <Ionicons name={item.icon} size={18} color="#fff" />
                </LinearGradient>
                <Text style={styles.tileTitle}>{item.label}</Text>
                <Text style={styles.tileText}>{item.text}</Text>
              </Pressable>
            ))}
          </View>

          <Heading title="My financial portfolio" subtitle="Your credit accounts at a glance" />
          <Pressable onPress={() => router.push('/reports')} style={styles.overdueCard}>
            <View style={[styles.iconTile, { backgroundColor: `${overdueTone}1F` }]}>
              <Ionicons name={overdue !== null && overdue > 0 ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={18} color={overdueTone} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tileText}>Overdue payments</Text>
              <Text style={[styles.overdueValue, { color: overdueTone }]}>{overdue === null ? '—' : String(overdue)}</Text>
              <Text style={styles.tileText}>{overdue === null ? 'Not included in this report' : overdue > 0 ? 'Needs your attention' : 'You are all clear'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.blue} />
          </Pressable>
          <View style={styles.grid}>
            <Pressable onPress={() => router.push('/reports')} style={styles.tile}>
              <View style={[styles.iconTile, { backgroundColor: `${colors.blue}1F` }]}>
                <Ionicons name="card-outline" size={18} color={colors.blue} />
              </View>
              <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>{best?.active_accounts == null ? '—' : String(best.active_accounts)}</Text>
              <Text style={styles.tileText}>Active accounts</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/reports')} style={styles.tile}>
              <View style={[styles.iconTile, { backgroundColor: `${colors.gold}1F` }]}>
                <Ionicons name="cash-outline" size={18} color={colors.gold} />
              </View>
              <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(best?.total_outstanding)}</Text>
              <Text style={styles.tileText}>Outstanding balance</Text>
            </Pressable>
          </View>

          <Heading title="Your credit score" subtitle={best ? `Latest from ${bureauNames[best.bureau]}` : 'Get your first report to see your score'} />
          <FadeUp>
            <View style={styles.scoreCard}>
              <View style={styles.scoreHead}>
                <Pressable
                  onPress={() => setPickerOpen((open) => !open)}
                  disabled={completed.length === 0}
                  style={styles.chip}
                  accessibilityRole="button"
                  accessibilityLabel="Choose credit bureau"
                >
                  {best ? (
                    <View style={styles.chipLogoTile}><Image source={bureauLogos[best.bureau]} style={styles.chipLogo} contentFit="contain" /></View>
                  ) : (
                    <Ionicons name="shield-checkmark" size={13} color={colors.gold} />
                  )}
                  <Text style={styles.chipText} numberOfLines={1}>{best ? bureauNames[best.bureau] : 'Credit score'}</Text>
                  <Ionicons name={pickerOpen ? 'chevron-up' : 'chevron-down'} size={13} color={colors.blueDark} />
                </Pressable>
                <Text style={styles.updated}>{best ? `Updated ${formatDate(best.report_date ?? best.requested_at)}` : 'Not generated yet'}</Text>
              </View>
              {pickerOpen ? (
                <View style={styles.picker}>
                  {bureauOptions.map(({ bureau, report }) => {
                    const active = best?.bureau === bureau
                    return (
                      <Pressable
                        key={bureau}
                        disabled={!report}
                        onPress={() => {
                          setSelectedBureau(bureau)
                          setPickerOpen(false)
                        }}
                        style={[styles.pickerRow, active && styles.pickerRowActive, !report && { opacity: 0.45 }]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active, disabled: !report }}
                      >
                        <View style={styles.chipLogoTile}><Image source={bureauLogos[bureau]} style={styles.chipLogo} contentFit="contain" /></View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.pickerName}>{bureauNames[bureau]}</Text>
                          <Text style={styles.pickerMeta}>{report ? `Score ${report.credit_score}` : 'No report yet'}</Text>
                        </View>
                        {active ? <Ionicons name="checkmark-circle" size={18} color={colors.blue} /> : null}
                      </Pressable>
                    )
                  })}
                </View>
              ) : null}
              <ScoreGauge score={best?.credit_score ?? null} band={best?.score_band} size={184} />
              {best ? (
                <Pressable onPress={() => router.push({ pathname: '/report/[id]', params: { id: best.request_id } })} style={styles.cta}>
                  <Text style={styles.ctaText}>View full report</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </Pressable>
              ) : (
                <Pressable onPress={() => router.push('/reports')} style={styles.getReport}>
                  <Text style={styles.getReportText}>Get your credit report</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.blue} />
                </Pressable>
              )}
            </View>
          </FadeUp>

          <Card style={styles.trendCard}>
            <View style={styles.trendHeading}>
              <View>
                <Text style={styles.trendTitle}>Score trend <Text style={styles.trendPeriod}>(last 6 months)</Text></Text>
                <Text style={styles.trendSubtitle}>{best ? `${bureauNames[best.bureau]} score history` : 'Get your first report to start tracking'}</Text>
              </View>
              {best ? <Text style={styles.trendCurrent}>{best.credit_score}</Text> : null}
            </View>
            {trend.direction ? (
              <Text style={[styles.trendDirection, { color: directionTone[trend.direction] }]}>{directionLabel[trend.direction]} based on payment history</Text>
            ) : null}
            {trendPoints.length > 0 ? (
              <ScoreTrend points={trendPoints} />
            ) : (
              <View style={styles.trendEmpty}>
                <Ionicons name="analytics-outline" size={19} color="#4d7fcb" />
                <Text style={styles.trendEmptyText}>We’ll show your score changes as new reports become available.</Text>
              </View>
            )}
          </Card>

          <ErrorBanner message={error} onRetry={reload} />

          {dashboard && !dashboard.profile ? (
            <FadeUp delay={60}>
              <Pressable onPress={() => router.push('/profile-setup')}>
                <LinearGradient colors={['#f4b523', '#ffcf5c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
                  <View style={styles.bannerIcon}><Ionicons name="id-card" size={22} color={colors.navy} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bannerTitle}>Complete your profile</Text>
                    <Text style={styles.bannerText}>Add your PAN details to unlock your credit reports.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.navy} />
                </LinearGradient>
              </Pressable>
            </FadeUp>
          ) : null}

          <Heading title="Your credit reports" subtitle="Four bureaus, one place" />
          {(['cibil', 'equifax', 'experian', 'crif'] as const).map((bureau) => (
            <BureauCard key={bureau} bureau={bureau} report={dashboard?.reports.find((report) => report.bureau === bureau)} />
          ))}

          <Heading title="Credit health analysis" subtitle={best ? `Highlights from your ${best.bureau.toUpperCase()} report` : 'Get a report to see your personal insights'} />
          {best ? (
            <Card style={styles.healthCard}>
              <View style={styles.healthRow}>
                <View style={[styles.healthIcon, { backgroundColor: overdue === null ? '#eff3f8' : overdue > 0 ? '#fff0f1' : '#e8f8ef' }]}>
                  <Ionicons name={overdue === null ? 'help-circle-outline' : overdue > 0 ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={19} color={overdueTone} />
                </View>
                <View style={styles.healthCopy}>
                  <Text style={styles.healthTitle}>Overdue accounts</Text>
                  <Text style={styles.healthDetail}>{overdue === null ? 'Not included in this report' : overdue > 0 ? `${overdue} account${overdue === 1 ? '' : 's'} reported overdue` : 'No overdue accounts reported'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color="#91a0b4" />
              </View>
              <View style={styles.healthDivider} />
              <View style={styles.healthRow}>
                <View style={[styles.healthIcon, { backgroundColor: '#f1edff' }]}>
                  <Ionicons name="search-outline" size={19} color={colors.violet} />
                </View>
                <View style={styles.healthCopy}>
                  <Text style={styles.healthTitle}>Recent enquiries</Text>
                  <Text style={styles.healthDetail}>{best.enquiries_last_6_months === null ? 'Not included in this report' : `${best.enquiries_last_6_months} in the last 6 months`}</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color="#91a0b4" />
              </View>
              <Pressable onPress={() => router.push({ pathname: '/report/[id]', params: { id: best.request_id } })} style={styles.healthAction}>
                <Text style={styles.healthActionText}>View report details</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.blue} />
              </Pressable>
            </Card>
          ) : (
            <Card style={styles.healthEmpty}>
              <Ionicons name="analytics-outline" size={22} color={colors.blue} />
              <Text style={styles.healthDetail}>Your report insights will appear here after you request a credit report.</Text>
            </Card>
          )}

          <Heading title="Your next steps" subtitle="A few simple ways to stay on top of your credit" />
          <View style={styles.nextSteps}>
            <Pressable style={styles.nextStep} onPress={() => router.push(best ? { pathname: '/report/[id]', params: { id: best.request_id } } : '/reports')}>
              <View style={[styles.nextStepIcon, { backgroundColor: '#eaf3ff' }]}><Ionicons name="document-text-outline" size={18} color={colors.blue} /></View>
              <View style={styles.nextStepCopy}>
                <Text style={styles.nextStepTitle}>{best ? 'Review your latest report' : 'Get your first credit report'}</Text>
                <Text style={styles.nextStepDetail}>{best ? 'Check accounts and recent enquiries' : 'See what is in your credit history'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color="#91a0b4" />
            </Pressable>
            <Pressable style={styles.nextStep} onPress={() => router.push('/assistant')}>
              <View style={[styles.nextStepIcon, { backgroundColor: '#f1edff' }]}><Ionicons name="sparkles-outline" size={18} color={colors.violet} /></View>
              <View style={styles.nextStepCopy}>
                <Text style={styles.nextStepTitle}>Get personal guidance</Text>
                <Text style={styles.nextStepDetail}>Ask Neha about your credit</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color="#91a0b4" />
            </Pressable>
            <Pressable style={styles.nextStep} onPress={() => router.push('/guides')}>
              <View style={[styles.nextStepIcon, { backgroundColor: '#e8f8ef' }]}><Ionicons name="book-outline" size={18} color={colors.green} /></View>
              <View style={styles.nextStepCopy}>
                <Text style={styles.nextStepTitle}>Learn how to improve</Text>
                <Text style={styles.nextStepDetail}>Explore short, practical guides</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color="#91a0b4" />
            </Pressable>
          </View>

          <Heading title="Trusted partner banks" subtitle="Compare FD rates from leading banks" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }} style={{ marginHorizontal: -16 }}>
            {banks.map((bank) => (
              <Pressable key={bank.name} onPress={() => router.push('/fixed-deposits')} style={styles.bank}>
                <Image source={bank.logo} style={styles.bankLogo} contentFit="contain" />
              </Pressable>
            ))}
          </ScrollView>

          <Heading title="Tips to improve your score" subtitle="Small habits, big difference" />
          {tips.map((tip, index) => (
            <Card key={tip.title} style={styles.tip}>
              <View style={[styles.tipNumber, { backgroundColor: `${tip.tone}1F` }]}>
                <Ionicons name={tip.icon} size={20} color={tip.tone} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>{index + 1}. {tip.title}</Text>
                <Text style={styles.tipText}>{tip.text}</Text>
              </View>
            </Card>
          ))}
          {!dashboard && !loading ? <EmptyState title="Nothing to show yet" text="Pull down to refresh." /> : null}
        </View>
      </ScrollView>
    </View>
  )
}

function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.heading}>
      <Text style={styles.headingTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headingSub}>{subtitle}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 6 },
  brandLogo: { width: 90, height: 36 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e9eef6', alignItems: 'center', justifyContent: 'center' },
  notificationDot: { position: 'absolute', top: 7, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: '#ff6676', borderWidth: 1, borderColor: '#fff' },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.navy, fontWeight: '800', fontSize: 14 },
  body: { paddingHorizontal: 16, paddingTop: 6 },
  greeting: { marginBottom: 12 },
  hello: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  name: { color: colors.navy, fontSize: 19, fontWeight: '800', letterSpacing: -0.3, marginTop: 1 },
  neha: { borderRadius: 22, padding: 16, overflow: 'hidden', ...shadow },
  nehaTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nehaTagRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  nehaTag: { color: colors.gold, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.9 },
  nehaTitle: { color: '#fff', fontSize: 14, fontWeight: '800', lineHeight: 19, marginTop: 5, marginRight: 4 },
  nehaSub: { color: 'rgba(255,255,255,0.72)', fontSize: 10, lineHeight: 14, marginTop: 4 },
  nehaAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)', backgroundColor: '#fff' },
  prompts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  prompt: { width: '48.5%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 9 },
  promptText: { flex: 1, color: colors.navy, fontSize: 10, fontWeight: '700', lineHeight: 13 },
  nehaCta: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 9, marginTop: 12 },
  nehaCtaText: { color: colors.navy, fontWeight: '800', fontSize: 12 },
  heading: { marginTop: 22, marginBottom: 10 },
  headingTitle: { fontSize: 14, fontWeight: '800', color: colors.navy, letterSpacing: -0.2 },
  headingSub: { fontSize: 10.5, color: colors.muted, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '47.8%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e9eef6', padding: 12, ...shadow },
  iconTile: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  tileTitle: { fontSize: 12, fontWeight: '800', color: colors.navy },
  tileText: { fontSize: 10, color: colors.muted, marginTop: 2 },
  metricValue: { fontSize: 15, fontWeight: '800', color: colors.navy },
  overdueCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e9eef6', padding: 12, marginBottom: 10, ...shadow },
  overdueValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  scoreCard: { borderRadius: 18, padding: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e9eef6', alignItems: 'center', ...shadow },
  scoreHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5, width: '100%', marginBottom: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#eef5ff', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  picker: { width: '100%', marginTop: 8, gap: 6 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  pickerRowActive: { borderColor: colors.blue, backgroundColor: '#eef5ff' },
  pickerName: { color: colors.navy, fontSize: 11, fontWeight: '800' },
  pickerMeta: { color: colors.muted, fontSize: 9.5, marginTop: 1 },
  chipLogoTile: { width: 30, height: 20, borderRadius: 6, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 2 },
  chipLogo: { width: '100%', height: '100%' },
  chipText: { color: colors.blueDark, fontSize: 11, fontWeight: '800', flexShrink: 1 },
  updated: { color: colors.muted, fontSize: 9, fontWeight: '600' },
  cta: { width: '100%', marginTop: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.blueDark, borderRadius: 9, paddingHorizontal: 18, paddingVertical: 9 },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  getReport: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 5, paddingVertical: 5 },
  getReportText: { color: colors.blue, fontSize: 11, fontWeight: '800' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.lg, padding: 14, marginTop: 12, ...shadow },
  bannerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { color: colors.navy, fontWeight: '800', fontSize: 15 },
  bannerText: { color: '#5b4300', fontSize: 12, marginTop: 2 },
  trendCard: { padding: 12, marginTop: 10, marginBottom: 4 },
  trendHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trendTitle: { color: colors.navy, fontSize: 13, fontWeight: '800' },
  trendPeriod: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  trendSubtitle: { color: colors.muted, fontSize: 9, marginTop: 2 },
  trendDirection: { fontSize: 9, fontWeight: '700', marginTop: 4 },
  trendCurrent: { color: colors.blue, fontSize: 18, fontWeight: '800' },
  trendEmpty: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, paddingHorizontal: 9, borderRadius: 9, backgroundColor: '#f4f8ff' },
  trendEmptyText: { flex: 1, color: '#60738d', fontSize: 9, lineHeight: 13 },
  bank: { width: 104, height: 64, borderRadius: radius.md, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 12, borderWidth: 1, borderColor: colors.line },
  bankLogo: { width: '100%', height: '100%' },
  tip: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 10 },
  tipNumber: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontSize: 12, fontWeight: '800', color: colors.navy },
  tipText: { fontSize: 10.5, color: colors.muted, marginTop: 2, lineHeight: 15 },
  healthCard: { padding: 4 },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, paddingHorizontal: 10 },
  healthIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  healthCopy: { flex: 1, gap: 3 },
  healthTitle: { color: colors.navy, fontSize: 12, fontWeight: '800' },
  healthDetail: { color: colors.muted, fontSize: 10.5, lineHeight: 14 },
  healthDivider: { height: StyleSheet.hairlineWidth, marginLeft: 59, backgroundColor: colors.line },
  healthAction: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, margin: 6, borderRadius: radius.md, backgroundColor: '#eef5ff' },
  healthActionText: { color: colors.blue, fontSize: 11, fontWeight: '800' },
  healthEmpty: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nextSteps: { gap: 9 },
  nextStep: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 10, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: '#fff', ...shadow },
  nextStepIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  nextStepCopy: { flex: 1, gap: 3 },
  nextStepTitle: { color: colors.navy, fontSize: 12, fontWeight: '800' },
  nextStepDetail: { color: colors.muted, fontSize: 10.5 },
})
