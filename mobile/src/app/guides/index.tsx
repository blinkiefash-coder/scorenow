import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { Text } from '../../components/Text'
import { Page } from '../../components/Page'
import { Card } from '../../components/ui'
import { creditGuides } from '../../lib/content'
import { colors } from '../../lib/theme'

export default function GuidesScreen() {
  return (
    <Page title="Credit guides">
      {creditGuides.map((guide) => (
        <Card key={guide.slug} style={styles.row} onPress={() => router.push({ pathname: '/guides/[slug]', params: { slug: guide.slug } })}>
          <View style={styles.icon}><Ionicons name={guide.icon} size={22} color={colors.blue} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{guide.title}</Text>
            <Text style={styles.meta}>{guide.readTime}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#b2bbd0" />
        </Card>
      ))}
    </Page>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.sky, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '800', color: colors.navy },
  meta: { fontSize: 12, color: colors.muted, marginTop: 3 },
})
