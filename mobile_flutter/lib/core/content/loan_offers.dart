enum LoanType { all, personal, home, business }

const loanTypeLabels = <LoanType, String>{
  LoanType.all: 'All',
  LoanType.personal: 'Personal',
  LoanType.home: 'Home',
  LoanType.business: 'Business',
};

class LoanOffer {
  const LoanOffer({
    required this.lender,
    required this.type,
    required this.rate,
    required this.maxAmount,
    required this.tenure,
    required this.fee,
    required this.minScore,
  });

  final String lender;
  final LoanType type;
  final double rate;
  final String maxAmount;
  final String tenure;
  final String fee;
  final int minScore;
}

// Indicative terms for display only; they are not live lender offers.
const loanOffers = <LoanOffer>[
  LoanOffer(
    lender: 'HDFC Bank',
    type: LoanType.personal,
    rate: 10.75,
    maxAmount: '₹40 Lakh',
    tenure: '1 – 6 years',
    fee: 'Up to 2.5%',
    minScore: 725,
  ),
  LoanOffer(
    lender: 'ICICI Bank',
    type: LoanType.personal,
    rate: 10.85,
    maxAmount: '₹50 Lakh',
    tenure: '1 – 6 years',
    fee: 'Up to 2.25%',
    minScore: 720,
  ),
  LoanOffer(
    lender: 'Bajaj Finserv',
    type: LoanType.personal,
    rate: 11.0,
    maxAmount: '₹55 Lakh',
    tenure: '1 – 8 years',
    fee: 'Up to 3.93%',
    minScore: 685,
  ),
  LoanOffer(
    lender: 'SBI',
    type: LoanType.home,
    rate: 8.5,
    maxAmount: '₹5 Crore',
    tenure: 'Up to 30 years',
    fee: '0.35% + GST',
    minScore: 700,
  ),
  LoanOffer(
    lender: 'HDFC Ltd',
    type: LoanType.home,
    rate: 8.7,
    maxAmount: '₹10 Crore',
    tenure: 'Up to 30 years',
    fee: 'Up to 0.5%',
    minScore: 700,
  ),
  LoanOffer(
    lender: 'Axis Bank',
    type: LoanType.home,
    rate: 8.75,
    maxAmount: '₹5 Crore',
    tenure: 'Up to 30 years',
    fee: 'Up to 1%',
    minScore: 710,
  ),
  LoanOffer(
    lender: 'Axis Bank',
    type: LoanType.business,
    rate: 12.0,
    maxAmount: '₹50 Lakh',
    tenure: '1 – 5 years',
    fee: 'Up to 2%',
    minScore: 700,
  ),
  LoanOffer(
    lender: 'Tata Capital',
    type: LoanType.business,
    rate: 12.5,
    maxAmount: '₹75 Lakh',
    tenure: '1 – 6 years',
    fee: 'Up to 2.5%',
    minScore: 680,
  ),
  LoanOffer(
    lender: 'Kotak Mahindra',
    type: LoanType.business,
    rate: 13.0,
    maxAmount: '₹30 Lakh',
    tenure: '1 – 4 years',
    fee: 'Up to 2%',
    minScore: 690,
  ),
];
