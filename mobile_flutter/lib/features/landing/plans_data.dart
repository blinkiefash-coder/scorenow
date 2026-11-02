// Mirrors servicePlans and subscriptionPlans in frontend/src/App.tsx.

class ServicePlan {
  const ServicePlan({
    required this.name,
    required this.audience,
    required this.duration,
    required this.originalPrice,
    required this.offerPrice,
    required this.features,
    this.featured = false,
  });

  final String name;
  final String audience;
  final String duration;
  final String originalPrice;
  final String offerPrice;
  final List<String> features;
  final bool featured;
}

class SubscriptionPlan {
  const SubscriptionPlan({
    required this.name,
    required this.duration,
    required this.price,
    required this.note,
    this.featured = false,
  });

  final String name;
  final String duration;
  final String price;
  final String note;
  final bool featured;
}

const servicePlans = [
  ServicePlan(
    name: 'Basic',
    audience: 'For report clarity and basic issue identification',
    duration: '3 months',
    originalPrice: '₹10,999',
    offerPrice: '₹7,149.35',
    features: [
      'Detailed credit report review',
      'Issue and negative remark summary',
      'Starter improvement checklist',
      'Email guidance',
    ],
  ),
  ServicePlan(
    name: 'Standard',
    audience: 'For structured improvement with expert support',
    duration: '6 months',
    originalPrice: '₹14,999',
    offerPrice: '₹9,749.35',
    features: [
      'Everything in Basic',
      'Correction and dispute guidance',
      'One-to-one expert consultation',
      'WhatsApp and email support',
      'Progress review checkpoints',
    ],
  ),
  ServicePlan(
    name: 'Premium',
    audience: 'For deeper credit rebuilding and loan readiness',
    duration: '9 months',
    originalPrice: '₹19,999',
    offerPrice: '₹12,999.35',
    featured: true,
    features: [
      'Everything in Standard',
      'Dedicated credit advisor',
      'Personalised improvement roadmap',
      'Continuous monitoring guidance',
      'Loan readiness assessment',
      'Priority case support',
    ],
  ),
  ServicePlan(
    name: 'Exquisite',
    audience: 'For complex personal or commercial profiles',
    duration: '12 months',
    originalPrice: '₹25,000',
    offerPrice: '₹16,250',
    features: [
      'Senior credit strategist',
      'Personal and business report review',
      'Advanced issue-resolution support',
      'Priority consultation',
      'Custom financial health roadmap',
      'High-value loan preparation',
    ],
  ),
];

const subscriptionPlans = [
  SubscriptionPlan(
    name: 'Monthly',
    duration: '1 month',
    price: '₹99',
    note: 'Flexible monthly access',
  ),
  SubscriptionPlan(
    name: '6 Months',
    duration: '6 months',
    price: '₹499',
    note: 'Best for steady progress',
    featured: true,
  ),
  SubscriptionPlan(
    name: '12 Months',
    duration: '12 months',
    price: '₹999',
    note: 'Best long-term value',
  ),
];
