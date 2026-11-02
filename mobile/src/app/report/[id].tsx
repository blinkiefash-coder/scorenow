import { Ionicons } from '@expo/vector-icons'
import { File, Paths } from 'expo-file-system'
import { router, useLocalSearchParams } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '../../components/Text'
import { ModalHeader } from '../../components/ModalHeader'
import { ScoreGauge } from '../../components/ScoreGauge'
import { Button, Card, EmptyState, ErrorBanner, FullScreenLoader, Pill, Row, SectionTitle, Segmented, StatTile } from '../../components/ui'
import { API_URL } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatDate, formatMoney, formatMonth, titleCase } from '../../lib/format'
import { colors } from '../../lib/theme'
import { bureauNames, type ReportAccount, type ReportDetail } from '../../lib/types'
import { useApi } from '../../lib/useApi'

type Filter = 'all' | 'attention' | 'active' | 'closed'

const needsAttention = (account: ReportAccount) => (account.overdueAmount ?? 0) > 0 || account.paymentHistory.some((month) => (month.daysPastDue ?? 0) > 0)

function PaymentDots({ history }: { history: ReportAccount['paymentHistory'] }) {
  if (!history.length) return null
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.small}>Payment history</Text>
      <View style={styles.dots}>
        {history.slice(-12).map((month) => {
          const late = month.daysPastDue
          const tone = late === null ? '#d5dcea' : late > 0 ? (late >= 30 ? colors.red : colors.gold) : colors.green
          return (
            <View key={month.month} style={{ alignItems: 'center' }}>
              <View style={[styles.dot, { backgroundColor: tone }]} />
              <Text style={styles.dotLabel}>{formatMonth(month.month)}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function AccountCard({ account }: { account: ReportAccount }) {
  const [open, setOpen] = useState(false)
  const attention = needsAttention(account)
  return (
    <Card onPress={() => setOpen((current) => !current)}>
      <View style={styles.accountTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.lender}>{account.lender}</Text>
          <Text style={styles.small}>{titleCase(account.type)}{account.accountNumber ? ` · ${account.accountNumber}` : ''}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Pill text={account.status} color={account.status === 'active' ? colors.green : colors.muted} />
          {attention ? <Pill text="Needs attention" color={colors.red} /> : null}
        </View>
      </View>
      <View style={styles.balanceRow}>
        <View>
          <Text style={styles.small}>Outstanding</Text>
          <Text style={styles.balance}>{formatMoney(account.currentBalance)}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
      </View>
      {open ? (
        <View style={{ marginTop: 8 }}>
          <Row label="Sanctioned / limit" value={formatMoney(account.sanctionedAmount ?? account.creditLimit)} />
          <Row label="Overdue" value={formatMoney(account.overdueAmount)} />
          {account.emiAmount ? <Row label="EMI" value={formatMoney(account.emiAmount)} /> : null}
          {account.interestRate ? <Row label="Interest rate" value={`${account.interestRate}%`} /> : null}
          <Row label="Opened" value={formatDate(account.openedOn)} />
          {account.closedOn ? <Row label="Closed" value={formatDate(account.closedOn)} /> : null}
          <Row label="Last payment" value={formatDate(account.lastPaymentOn)} />
          <PaymentDots history={account.paymentHistory} />
        </View>
      ) : null}
    </Card>
  )
}

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { customer } = useAuth()
  const { data: report, loading, error, reload } = useApi<ReportDetail>(`/api/reports/${id}`)
  const [filter, setFilter] = useState<Filter>('all')
  const [downloading, setDownloading] = useState(false)

  const accounts = useMemo(() => {
    const list = report?.accounts ?? []
    if (filter === 'attention') return list.filter(needsAttention)
    if (filter === 'active') return list.filter((account) => account.status === 'active')
    if (filter === 'closed') return list.filter((account) => account.status === 'closed')
    return list
  }, [report, filter])

  const downloadPdf = async () => {
    if (!report) return
    setDownloading(true)
    try {
      const file = await File.downloadFileAsync(
        `${API_URL}/api/reports/${id}/pdf`,
        new File(Paths.cache, `scorenow-${report.bureau}-report.pdf`),
        { headers: { Authorization: `Bearer ${customer?.token}` }, idempotent: true },
      )
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' })
      else Alert.alert('Saved', 'Your report was saved on this device.')
    } catch {
      Alert.alert('Download failed', 'We could not download the PDF right now. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ModalHeader title={report ? bureauNames[report.bureau] : 'Report'} />
      {loading && !report ? <FullScreenLoader label="Loading full report…" /> : !report ? (
        <View style={{ padding: 18 }}><ErrorBanner message={error || 'Report not found.'} onRetry={reload} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
            <ScoreGauge score={report.score} />
            <Text style={styles.small}>Report date {formatDate(report.reportDate)}{report.isDemo ? ' · Demo data' : ''}</Text>
          </Card>

          <View style={styles.tiles}>
            <StatTile label="Accounts" value={String(report.summary.totalAccounts)} />
            <StatTile label="Active" value={String(report.summary.activeAccounts)} tone={colors.green} />
            <StatTile label="Overdue" value={String(report.summary.overdueAccounts)} tone={report.summary.overdueAccounts ? colors.red : colors.navy} />
          </View>
          <Card style={{ marginTop: 14 }}>
            <Row label="Total sanctioned" value={formatMoney(report.summary.totalSanctioned)} />
            <Row label="Total outstanding" value={formatMoney(report.summary.totalBalance)} />
            <Row label="Total overdue" value={formatMoney(report.summary.totalOverdue)} />
            <Row label="Enquiries (6 months)" value={String(report.summary.enquiriesLast6Months)} />
          </Card>

          {report.pdfAvailable ? <Button title="Download PDF" variant="outline" onPress={downloadPdf} loading={downloading} icon={<Ionicons name="download-outline" size={18} color={colors.blue} />} /> : null}

          {report.scoreFactors?.length ? (
            <>
              <SectionTitle title="What affects your score" />
              {report.scoreFactors.map((factor, index) => (
                <Card key={index} style={styles.factor}>
                  <Ionicons name={factor.impact === 'positive' ? 'trending-up' : 'trending-down'} size={22} color={factor.impact === 'positive' ? colors.green : colors.red} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.factorText}>{factor.text}</Text>
                    {factor.tip ? <Text style={styles.small}>{factor.tip}</Text> : null}
                  </View>
                </Card>
              ))}
            </>
          ) : null}

          <SectionTitle title={`Accounts (${accounts.length})`} />
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            options={[{ id: 'all', label: 'All' }, { id: 'attention', label: 'Needs attention' }, { id: 'active', label: 'Active' }, { id: 'closed', label: 'Closed' }]}
          />
          <View style={{ height: 8 }} />
          {accounts.length ? accounts.map((account, index) => <AccountCard key={`${account.lender}-${account.accountNumber}-${index}`} account={account} />) : <EmptyState title="No accounts here" />}

          {report.enquiries.length ? (
            <>
              <SectionTitle title="Recent enquiries" />
              <Card>
                {report.enquiries.map((enquiry, index) => (
                  <Row key={index} label={`${enquiry.lender}${enquiry.purpose ? ` · ${enquiry.purpose}` : ''}`} value={formatDate(enquiry.date)} />
                ))}
              </Card>
            </>
          ) : null}

          <SectionTitle title="Personal details" />
          <Card>
            <Row label="Name" value={report.personal.name ?? '—'} />
            <Row label="PAN" value={report.personal.pan ?? '—'} />
            <Row label="Date of birth" value={formatDate(report.personal.dateOfBirth)} />
            {report.personal.addresses[0] ? <Row label="Address" value={report.personal.addresses[0]} /> : null}
          </Card>
          <Pressable onPress={() => router.back()} style={{ alignItems: 'center', padding: 14 }}>
            <Text style={{ color: colors.blue, fontWeight: '800' }}>Back to dashboard</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  small: { fontSize: 12, color: colors.muted, marginTop: 2 },
  tiles: { flexDirection: 'row', gap: 10 },
  factor: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 10 },
  factorText: { fontSize: 14, fontWeight: '700', color: colors.navy },
  accountTop: { flexDirection: 'row', gap: 10 },
  lender: { fontSize: 15, fontWeight: '800', color: colors.navy },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 },
  balance: { fontSize: 20, fontWeight: '900', color: colors.navy },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  dotLabel: { fontSize: 9, color: colors.muted, marginTop: 3 },
})
