import 'package:flutter_test/flutter_test.dart';
import 'package:scorenow_mobile/features/home/score_factors.dart';
import 'package:scorenow_mobile/models/report.dart';

BureauReport _report({
  int? overdue,
  int? enquiries,
  List<PaymentMonth> months = const [],
}) => BureauReport(
  requestId: 'r1',
  bureau: BureauId.cibil,
  status: 'completed',
  failureReason: null,
  requestedAt: '2025-01-01T00:00:00Z',
  creditScore: 720,
  scoreBand: 'Good',
  reportDate: '2025-01-01',
  totalAccounts: 0,
  activeAccounts: 0,
  overdueAccounts: overdue,
  enquiriesLast6Months: enquiries,
  totalOutstanding: null,
  paymentMonths: months,
  isDemo: false,
);

ReportAccount _account({
  required String type,
  String? openedOn,
  num? limit,
  num? balance,
}) => ReportAccount(
  lender: 'Bank',
  type: type,
  accountNumber: null,
  status: 'Active',
  openedOn: openedOn,
  closedOn: null,
  sanctionedAmount: null,
  creditLimit: limit,
  currentBalance: balance,
  overdueAmount: null,
  lastPaymentOn: null,
  emiAmount: null,
  interestRate: null,
  paymentHistory: const [],
);

FactorInsight _factor(List<FactorInsight> factors, String title) =>
    factors.firstWhere((factor) => factor.title == title);

void main() {
  final now = DateTime(2025, 1, 1);

  test('reports no data for factors missing from the report', () {
    final factors = buildFactorInsights(
      report: _report(),
      accounts: const [],
      now: now,
    );
    expect(_factor(factors, 'Payment history').status, FactorStatus.noData);
    expect(_factor(factors, 'Credit utilisation').status, FactorStatus.noData);
    expect(_factor(factors, 'Credit age').status, FactorStatus.noData);
    expect(_factor(factors, 'Credit mix').status, FactorStatus.noData);
    expect(_factor(factors, 'Recent enquiries').status, FactorStatus.noData);
  });

  test('flags overdue accounts and late months as needing work', () {
    final report = _report(
      overdue: 2,
      months: const [PaymentMonth(month: 'Jan', late: 1, reported: 1)],
    );
    final factor = _factor(
      buildFactorInsights(report: report, accounts: const [], now: now),
      'Payment history',
    );
    expect(factor.status, FactorStatus.needsWork);
    expect(factor.detail, '2 overdue accounts · 1 late payment');
  });

  test('marks payment history excellent when nothing is overdue', () {
    final factor = _factor(
      buildFactorInsights(
        report: _report(overdue: 0),
        accounts: const [],
        now: now,
      ),
      'Payment history',
    );
    expect(factor.status, FactorStatus.excellent);
  });

  test('computes card utilisation from balances and limits', () {
    final accounts = [
      _account(type: 'Credit Card', limit: 100000, balance: 20000),
      _account(type: 'Credit Card', limit: 100000, balance: 10000),
    ];
    final factor = _factor(
      buildFactorInsights(report: _report(), accounts: accounts, now: now),
      'Credit utilisation',
    );
    expect(factor.status, FactorStatus.excellent);
    expect(factor.detail, '15% of your card limit in use');
  });

  test('scores credit age from the oldest account open date', () {
    final accounts = [
      _account(type: 'Personal Loan', openedOn: '2015-01-01'),
      _account(type: 'Credit Card', openedOn: '2023-01-01'),
    ];
    final factor = _factor(
      buildFactorInsights(report: _report(), accounts: accounts, now: now),
      'Credit age',
    );
    expect(factor.status, FactorStatus.excellent);
  });

  test('builds next steps only for factors that are not excellent', () {
    final factors = buildFactorInsights(
      report: _report(overdue: 1, enquiries: 0),
      accounts: const [],
      now: now,
    );
    final steps = buildNextSteps(factors);
    expect(steps, hasLength(1));
    expect(steps.single.high, isTrue);
    expect(steps.single.detail, 'Payment history');
  });
}
