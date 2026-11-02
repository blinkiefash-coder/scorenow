const chatConcerns = <String>[
  'Improve my credit score',
  'Fix a report error',
  'Loan application rejected',
  'Business CMR support',
];

const scoreRanges = <String>[
  'Below 600',
  '600 - 699',
  '700 - 749',
  '750+',
  "I don't know",
];

String chatSuggestion(String concern, String scoreRange) {
  if (concern == 'Fix a report error')
    return 'Start with your latest bureau report. Note the account name, disputed entry, and supporting proof before raising a correction. Our expert can help you organise the right documents.';
  if (concern == 'Loan application rejected')
    return 'Avoid making several new applications immediately. First review recent enquiries, overdue accounts, utilisation, and lender remarks to identify the likely reason for rejection.';
  if (concern == 'Business CMR support')
    return 'Review payment behaviour, credit exposure, trade lines, and lender-reported errors in your Commercial CIBIL report. A focused CMR review is the right next step.';
  if (scoreRange == 'Below 600')
    return 'Prioritise overdue payments, settled or written-off accounts, and report errors. Keep every current payment on time while working through the highest-impact issues first.';
  if (scoreRange == '600 - 699')
    return 'Focus on on-time payments and bringing credit utilisation below 30%. Avoid unnecessary enquiries while older positive payment history builds.';
  if (scoreRange == '700 - 749')
    return 'You are close to a strong lending profile. Keep utilisation low, preserve older accounts, and check your report for small errors before applying for new credit.';
  if (scoreRange == '750+')
    return 'Your score is already strong. Protect it with timely payments, low utilisation, and limited hard enquiries, and review your report periodically for unexpected changes.';
  return 'Begin with a current credit report from a recognised bureau. Once you know your score and key factors, an expert can help prioritise the actions with the most impact.';
}
