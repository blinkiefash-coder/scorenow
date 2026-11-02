enum CardCategory { all, rupay, free, fd }

class CardOffer {
  const CardOffer({
    required this.bank,
    required this.name,
    required this.network,
    required this.perk,
    required this.tags,
    required this.blurb,
    required this.categories,
    required this.colors,
  });

  final String bank;
  final String name;
  final String network;
  final String perk;
  final List<String> tags;
  final String blurb;
  final List<CardCategory> categories;
  final List<int> colors;
}

// Sample catalogue for display only; fees, rewards and eligibility are set by each issuer.
const cardOffers = <CardOffer>[
  CardOffer(
    bank: 'HDFC Bank',
    name: 'HDFC Millennia Credit Card',
    network: 'Visa',
    perk: '5% Cashback',
    tags: ['Lifestyle'],
    blurb: '5% cashback on top brands, dining, travel and more.',
    categories: [CardCategory.all],
    colors: [0xFF0D2A5C, 0xFF2D6BBD],
  ),
  CardOffer(
    bank: 'SBI',
    name: 'SBI Cashback Card',
    network: 'Visa',
    perk: '5% Cashback',
    tags: ['Online Shopping'],
    blurb: '5% cashback on online spends, no annual fee.',
    categories: [CardCategory.all],
    colors: [0xFF3B1A6E, 0xFF8A3FB8],
  ),
  CardOffer(
    bank: 'Axis Bank',
    name: 'Axis ACE Credit Card',
    network: 'Visa',
    perk: '2% Cashback',
    tags: ['Fuel & Utilities'],
    blurb: '2% cashback on fuel, utilities and Google Pay bill payments.',
    categories: [CardCategory.all],
    colors: [0xFF8A1538, 0xFFD63A63],
  ),
  CardOffer(
    bank: 'ICICI Bank',
    name: 'ICICI Coral Credit Card',
    network: 'Visa',
    perk: '4X Rewards',
    tags: ['Dining & Travel'],
    blurb: 'Get 4X rewards on dining, travel and entertainment.',
    categories: [CardCategory.all],
    colors: [0xFFA3201B, 0xFFE4572E],
  ),
  CardOffer(
    bank: 'Utkarsh SFB',
    name: 'Utkarsh SuperMoney RuPay Credit Card',
    network: 'RuPay',
    perk: 'UPI Enabled',
    tags: ['RuPay'],
    blurb: 'Link to UPI and earn rewards on everyday payments.',
    categories: [CardCategory.rupay],
    colors: [0xFF2A2370, 0xFF5B4BD6],
  ),
  CardOffer(
    bank: 'Kotak Mahindra Bank',
    name: 'Kotak 811 #DreamDifferent Card',
    network: 'Visa',
    perk: 'Lifetime Free',
    tags: ['No annual fee'],
    blurb: 'No joining or annual fee, with rewards on everyday spends.',
    categories: [CardCategory.free],
    colors: [0xFF7A1020, 0xFFC8283F],
  ),
  CardOffer(
    bank: 'IDFC FIRST Bank',
    name: 'IDFC FIRST Wow! Credit Card',
    network: 'Visa',
    perk: 'Against FD',
    tags: ['FD-backed'],
    blurb:
        'Get a credit card against your fixed deposit, no income proof needed.',
    categories: [CardCategory.fd],
    colors: [0xFF6B1230, 0xFFB8264F],
  ),
];

const cardCategoryLabels = <CardCategory, String>{
  CardCategory.all: 'All',
  CardCategory.rupay: 'RuPay',
  CardCategory.free: 'Lifetime free',
  CardCategory.fd: 'Against FD',
};
