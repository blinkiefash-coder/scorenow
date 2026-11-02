import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/home/factor_section.dart';
import 'package:scorenow_mobile/features/home/report_detail_section.dart';
import 'package:scorenow_mobile/features/payments/payment_history.dart';
import 'package:scorenow_mobile/features/reports/report_account_card.dart';
import 'package:scorenow_mobile/models/report.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';
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
          builder: (context, detail) {
            if (detail.accounts.isEmpty) {
              return const EmptyState(title: 'No accounts reported');
            }
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final account in detail.accounts)
                  AccountCard(account: account),
              ],
            );
          },
        );
      case HomeTab.enquiries:
        return ReportDetailSection(
          key: ValueKey('enquiries-${report.requestId}'),
          requestId: report.requestId,
          builder: (context, detail) {
            if (detail.enquiries.isEmpty) {
              return const EmptyState(title: 'No recent enquiries');
            }
            return AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    '${report.enquiriesLast6Months ?? detail.enquiries.length} enquiries in the last 6 months',
                    style: const TextStyle(
                      color: AppColors.muted,
                      fontSize: 12,
                    ),
                  ),
                  for (final enquiry in detail.enquiries) ...[
                    const Divider(height: 22, color: AppColors.line),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                enquiry.lender,
                                style: const TextStyle(
                                  color: AppColors.navy,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                [
                                  enquiry.purpose,
                                  formatDate(enquiry.date),
                                ].whereType<String>().join(' · '),
                                style: const TextStyle(
                                  color: AppColors.muted,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          formatMoney(enquiry.amount),
                          style: const TextStyle(
                            color: AppColors.navy,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            );
          },
        );
    }
  }
}
