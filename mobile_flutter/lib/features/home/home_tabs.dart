import 'package:flutter/material.dart';
import 'package:scorenow_mobile/features/home/factor_section.dart';
import 'package:scorenow_mobile/features/home/home_lists.dart';
import 'package:scorenow_mobile/features/home/report_detail_section.dart';
import 'package:scorenow_mobile/features/payments/payment_history.dart';
import 'package:scorenow_mobile/models/report.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

enum HomeTab { overview, payments, accounts, enquiries }

const homeTabOptions = [
  (value: HomeTab.overview, label: 'Overview'),
  (value: HomeTab.payments, label: 'Payments'),
  (value: HomeTab.accounts, label: 'Accounts'),
  (value: HomeTab.enquiries, label: 'Enquiries'),
];

class HomeTabContent extends StatelessWidget {
  const HomeTabContent({super.key, required this.tab, required this.best});

  final HomeTab tab;
  final BureauReport? best;

  @override
  Widget build(BuildContext context) {
    final report = best;
    if (report == null) {
      return const EmptyState(
        title: 'No report yet',
        text: 'Get a report to see this section.',
      );
    }
    switch (tab) {
      case HomeTab.overview:
        return ReportDetailSection(
          key: ValueKey('overview-${report.requestId}'),
          requestId: report.requestId,
          builder: (context, detail) =>
              FactorSection(report: report, accounts: detail.accounts),
        );
      case HomeTab.payments:
        return PaymentHistory(months: report.paymentMonths);
      case HomeTab.accounts:
        return ReportDetailSection(
          key: ValueKey('accounts-${report.requestId}'),
          requestId: report.requestId,
          builder: (context, detail) =>
              HomeAccountsList(accounts: detail.accounts),
        );
      case HomeTab.enquiries:
        return ReportDetailSection(
          key: ValueKey('enquiries-${report.requestId}'),
          requestId: report.requestId,
          builder: (context, detail) => HomeEnquiriesList(
            enquiries: detail.enquiries,
            count: report.enquiriesLast6Months ?? detail.enquiries.length,
          ),
        );
    }
  }
}
