class GuideSection {
  const GuideSection({
    required this.title,
    required this.paragraphs,
    this.points = const [],
  });

  final String title;
  final List<String> paragraphs;
  final List<String> points;
}

enum GuideIcon { trendingUp, speedometer, search }

class CreditGuide {
  const CreditGuide({
    required this.slug,
    required this.title,
    required this.description,
    required this.readTime,
    required this.icon,
    required this.sections,
  });

  final String slug;
  final String title;
  final String description;
  final String readTime;
  final GuideIcon icon;
  final List<GuideSection> sections;
}

const creditGuides = <CreditGuide>[
  CreditGuide(
    slug: 'improve-credit-score',
    title: '5 Ways to Improve Your Credit Score',
    description:
        'Build healthy credit habits over time, understand the options available, and choose borrowing only when it fits your needs.',
    readTime: '5 min read',
    icon: GuideIcon.trendingUp,
    sections: [
      GuideSection(
        title: 'Start with the habits that matter',
        paragraphs: [
          'Improving a credit profile is usually a gradual process. Focus on accurate reporting and steady repayment habits rather than quick fixes or promises of a particular score.',
        ],
        points: [
          'Pay every loan and card instalment by its due date.',
          'Keep card balances manageable and avoid using all available credit.',
          'Check your report for accounts, balances, or enquiries you do not recognise.',
          'Apply for new credit only when you have a clear need.',
          'Keep well-managed accounts open unless there is a good reason to close them.',
        ],
      ),
      GuideSection(
        title: 'Choose credit carefully',
        paragraphs: [
          'A new credit product is not required for everyone. Consider the total cost, repayment commitment, and whether the lender reports account activity to the credit bureaus before applying.',
        ],
      ),
    ],
  ),
  CreditGuide(
    slug: 'good-credit-score',
    title: 'What is a Good Credit Score?',
    description:
        'Learn how to read your score in context and why lenders look at more than one number.',
    readTime: '4 min read',
    icon: GuideIcon.speedometer,
    sections: [
      GuideSection(
        title: 'A score is a snapshot, not a guarantee',
        paragraphs: [
          'Credit bureaus generally show a score on a 300–900 scale, but score bands and lender criteria can differ. A higher score is often viewed positively, but it does not guarantee loan or card approval.',
        ],
        points: [
          'Lenders may also consider income, existing obligations, employment, and their own policies.',
          'Different bureaus can show different scores because their report data or scoring models may vary.',
          'Use the score together with the report details to understand your credit health.',
        ],
      ),
      GuideSection(
        title: 'Look beyond the score',
        paragraphs: [
          'Review the payment history, balances, account status, and recent enquiries shown on the report. Correct any inaccurate details with the bureau or lender that supplied them.',
        ],
      ),
    ],
  ),
  CreditGuide(
    slug: 'credit-enquiries',
    title: 'How Credit Enquiries Affect Your Score',
    description:
        'Understand what happens when you apply for credit and how to keep track of applications on your report.',
    readTime: '6 min read',
    icon: GuideIcon.search,
    sections: [
      GuideSection(
        title: 'What is a credit enquiry?',
        paragraphs: [
          'When a lender checks your credit report as part of a credit application, that check may appear as an enquiry. The exact score impact depends on bureau methods and lender context. Checking your own report is different from applying for new credit.',
        ],
      ),
      GuideSection(
        title: 'Manage applications thoughtfully',
        paragraphs: [
          'Several applications in a short period can signal increased borrowing activity. Before applying, compare the product terms and check whether you meet the provider’s stated criteria.',
        ],
        points: [
          'Avoid submitting multiple applications just to compare offers.',
          'Ask a lender whether an initial eligibility check is a soft enquiry or a full credit application.',
          'Review enquiry entries and contact the lender or bureau if you see one you do not recognise.',
          'Keep records of applications and consent you provide.',
        ],
      ),
    ],
  ),
];
