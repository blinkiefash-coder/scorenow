import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { Text } from '../../components/Text'
import { Page } from '../../components/Page'
import { Card, EmptyState, SectionTitle } from '../../components/ui'
import { creditGuides } from '../../lib/content'
import { colors } from '../../lib/theme'

export default function GuideScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const guide = creditGuides.find((item) => item.slug === slug)
  if (!guide) return <Page title="Guide"><EmptyState title="Guide not found" text="That guide may have moved." /></Page>

  return (
    <Page title="Credit guide">
      <Text style={styles.title}>{guide.title}</Text>
      <Text style={styles.meta}>{guide.readTime}</Text>
      <Text style={styles.lead}>{guide.description}</Text>
      {guide.sections.map((section) => (
        <Card key={section.title}>
          <Text style={styles.heading}>{section.title}</Text>
          {section.paragraphs.map((paragraph) => <Text key={paragraph} style={styles.body}>{paragraph}</Text>)}
          {section.points?.map((point) => (
            <View key={point} style={styles.point}>
              <Ionicons name="checkmark-circle" size={18} color={colors.green} />
              <Text style={[styles.body, { flex: 1, marginTop: 0 }]}>{point}</Text>
            </View>
          ))}
        </Card>
      ))}
      <SectionTitle title="More guides" />
      {creditGuides.filter((item) => item.slug !== guide.slug).map((item) => (
        <Card key={item.slug} onPress={() => router.replace({ pathname: '/guides/[slug]', params: { slug: item.slug } })}>
          <Text style={styles.heading}>{item.title}</Text>
          <Text style={styles.meta}>{item.readTime}</Text>
        </Card>
      ))}
    </Page>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '900', color: colors.navy, lineHeight: 28 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 4 },
  lead: { fontSize: 14, color: colors.muted, lineHeight: 21, marginVertical: 14 },
  heading: { fontSize: 16, fontWeight: '800', color: colors.navy },
  body: { fontSize: 14, color: '#2b3556', lineHeight: 21, marginTop: 8 },
  point: { flexDirection: 'row', gap: 10, marginTop: 10, alignItems: 'flex-start' },
})
