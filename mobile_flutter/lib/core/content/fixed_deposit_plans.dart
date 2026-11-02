class FdPlan {
  const FdPlan({
    required this.bank,
    required this.rate,
    required this.min,
    required this.max,
    required this.minMonths,
    required this.maxMonths,
    required this.tenure,
    required this.payout,
  });

  final String bank;
  final double rate;
  final int min;
  final String max;
  final int minMonths;
  final int maxMonths;
  final String tenure;
  final String payout;
}

class FdTenure {
  const FdTenure(this.label, this.months);

  final String label;
  final int months;
}

// Indicative rates for display only; they are not live bank offers.
const fdPlans = <FdPlan>[
  FdPlan(
    bank: 'ICICI Bank',
    rate: 7.25,
    min: 5000,
    max: '₹5 Crore',
    minMonths: 6,
    maxMonths: 120,
    tenure: '6 months – 10 years',
    payout: 'At maturity / Monthly',
  ),
  FdPlan(
    bank: 'SBI',
    rate: 7.1,
    min: 5000,
    max: '₹5 Crore',
    minMonths: 0,
    maxMonths: 120,
    tenure: '7 days – 10 years',
    payout: 'Monthly / Quarterly',
  ),
  FdPlan(
    bank: 'HDFC Bank',
    rate: 7.4,
    min: 5000,
    max: '₹5 Crore',
    minMonths: 6,
    maxMonths: 120,
    tenure: '6 months – 10 years',
    payout: 'Monthly / At maturity',
  ),
  FdPlan(
    bank: 'Axis Bank',
    rate: 7.3,
    min: 5000,
    max: '₹5 Crore',
    minMonths: 6,
    maxMonths: 120,
    tenure: '6 months – 10 years',
    payout: 'Monthly / Quarterly',
  ),
  FdPlan(
    bank: 'Kotak Mahindra Bank',
    rate: 7.2,
    min: 5000,
    max: '₹5 Crore',
    minMonths: 6,
    maxMonths: 120,
    tenure: '6 months – 10 years',
    payout: 'At maturity',
  ),
  FdPlan(
    bank: 'IndusInd Bank',
    rate: 7.15,
    min: 5000,
    max: '₹5 Crore',
    minMonths: 6,
    maxMonths: 120,
    tenure: '6 months – 10 years',
    payout: 'Monthly / At maturity',
  ),
];

const fdTenures = <FdTenure>[
  FdTenure('6 Months', 6),
  FdTenure('1 Year', 12),
  FdTenure('2 Years', 24),
  FdTenure('3 Years', 36),
  FdTenure('5 Years', 60),
  FdTenure('10 Years', 120),
];
