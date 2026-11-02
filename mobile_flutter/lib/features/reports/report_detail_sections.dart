import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/models/report.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';
import 'package:scorenow_mobile/widgets/app_pill.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';
import 'package:scorenow_mobile/widgets/score_gauge.dart';

class ReportScoreCard extends StatelessWidget {
  const ReportScoreCard({super.key, required this.report});

  final ReportDetail report;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        children: [
          ScoreGauge(score: report.score),
          const SizedBox(height: 8),
          Text(
            'Report date ${formatDate(report.reportDate)}${report.isDemo ? ' · Demo data' : ''}',
            style: const TextStyle(fontSize: 12, color: AppColors.muted),
          ),
        ],
      ),
    );
  }
}

class ReportSummarySection extends StatelessWidget {
  const ReportSummarySection({super.key, required this.summary});

  final ReportSummary summary;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: StatTile(
                label: 'Accounts',
                value: '${summary.totalAccounts}',
              ),
            ),
            Expanded(
              child: StatTile(
                label: 'Active',
                value: '${summary.activeAccounts}',
                tone: AppColors.green,
              ),
            ),
            Expanded(
              child: StatTile(
                label: 'Overdue',
                value: '${summary.overdueAccounts}',
                tone: summary.overdueAccounts > 0
                    ? AppColors.red
                    : AppColors.navy,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        AppCard(
          child: Column(
            children: [
              InfoRow(
                label: 'Total sanctioned',
                value: formatMoney(summary.totalSanctioned),
              ),
              InfoRow(
                label: 'Total outstanding',
                value: formatMoney(summary.totalBalance),
              ),
              InfoRow(
                label: 'Total overdue',
                value: formatMoney(summary.totalOverdue),
              ),
              InfoRow(
                label: 'Enquiries (6 months)',
                value: '${summary.enquiriesLast6Months}',
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class ScoreFactorsSection extends StatelessWidget {
  const ScoreFactorsSection({super.key, required this.factors});

  final List<ScoreFactor> factors;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionTitle('What affects your score'),
        for (final factor in factors)
          AppCard(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  factor.positive ? Icons.trending_up : Icons.trending_down,
                  color: factor.positive ? AppColors.green : AppColors.red,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        factor.text,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.navy,
                        ),
                      ),
                      if (factor.tip != null && factor.tip!.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            factor.tip!,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.muted,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class RecentEnquiriesSection extends StatelessWidget {
  const RecentEnquiriesSection({super.key, required this.enquiries});

  final List<ReportEnquiry> enquiries;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionTitle('Recent enquiries'),
        AppCard(
          child: Column(
            children: [
              for (final enquiry in enquiries)
                InfoRow(
                  label: enquiry.purpose == null || enquiry.purpose!.isEmpty
                      ? enquiry.lender
                      : '${enquiry.lender} · ${enquiry.purpose}',
                  value: formatDate(enquiry.date),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class PersonalDetailsSection extends StatelessWidget {
  const PersonalDetailsSection({super.key, required this.personal});

  final ReportPersonal personal;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionTitle('Personal details'),
        AppCard(
          child: Column(
            children: [
              InfoRow(label: 'Name', value: personal.name ?? '—'),
              InfoRow(label: 'PAN', value: personal.pan ?? '—'),
              InfoRow(
                label: 'Date of birth',
                value: personal.dateOfBirth ?? '—',
              ),
              if (personal.addresses.isNotEmpty)
                InfoRow(label: 'Address', value: personal.addresses.first),
            ],
          ),
        ),
      ],
    );
  }
}
