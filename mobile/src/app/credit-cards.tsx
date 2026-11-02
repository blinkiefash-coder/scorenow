import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import { Text } from '../components/Text'
import { Page } from '../components/Page'
import { Button, Card, EmptyState, Pill, Segmented } from '../components/ui'
import { cardCategories, cardOffers, type CardCategory } from '../lib/content'
import { colors, radius } from '../lib/theme'

export default function CreditCardsScreen() {
  const [category, setCategory] = useState<CardCategory>('all')
  const cards = cardOffers.filter((card) => category === 'all' ? true : card.categories.includes(category))

  return (
    <Page title="Credit cards">
      <Segmented options={cardCategories} value={category} onChange={setCategory} />
      <View style={{ height: 12 }} />
      {cards.length === 0 ? <EmptyState title="No cards in this category" /> : cards.map((card) => (
        <Card key={card.name} style={{ padding: 0, overflow: 'hidden' }}>
          <View style={[styles.visual, { backgroundColor: card.colors[0], borderBottomColor: card.colors[1] }]}>
            <View style={[styles.glow, { backgroundColor: card.colors[1] }]} />
            <Text style={styles.bank}>{card.bank}</Text>
            <Ionicons name="card-outline" size={28} color="#ffffffcc" />
            <Text style={styles.network}>{card.network}</Text>
          </View>
          <View style={{ padding: 16 }}>
            <Text style={styles.name}>{card.name}</Text>
            <Text style={styles.blurb}>{card.blurb}</Text>
            <View style={styles.tags}>
              <Pill text={card.perk} color={colors.green} />
              {card.tags.map((tag) => <Pill key={tag} text={tag} />)}
            </View>
            <View style={{ marginTop: 12 }}>
              <Button title="Check eligibility" small onPress={() => Alert.alert('Coming soon', `Applications for ${card.name} will open here soon. Fees, rewards and eligibility are set by the issuer.`)} />
            </View>
          </View>
        </Card>
      ))}
      <Text style={styles.disclaimer}>Card details are indicative. Fees, rewards and eligibility are decided by each issuer.</Text>
    </Page>
  )
}

const styles = StyleSheet.create({
  visual: { height: 120, padding: 16, justifyContent: 'space-between', borderBottomWidth: 3, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, overflow: 'hidden' },
  glow: { position: 'absolute', right: -40, top: -40, width: 150, height: 150, borderRadius: 75, opacity: 0.55 },
  bank: { color: '#fff', fontWeight: '800', fontSize: 14 },
  network: { color: '#fff', fontWeight: '900', fontSize: 13, alignSelf: 'flex-end' },
  name: { fontSize: 16, fontWeight: '800', color: colors.navy },
  blurb: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  disclaimer: { fontSize: 11, color: colors.muted, marginTop: 6, lineHeight: 16 },
})
