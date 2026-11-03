import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/models/report.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';
import 'package:scorenow_mobile/widgets/score_gauge.dart';

class ReportCard extends StatelessWidget {
  const ReportCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.borderColor,
    this.onTap,
  });

  final Widget child;
  final EdgeInsets padding;
  final Color? borderColor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: AppShadow.card,
        border: borderColor == null ? null : Border.all(color: borderColor!),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(padding: padding, child: child),
      ),
    );
  }
}

class ReportSectionHeader extends StatelessWidget {
  const ReportSectionHeader({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.color = AppColors.blue,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 6, bottom: 12),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.navy,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if (subtitle != null)
                  Text(
                    subtitle!,
                    style: const TextStyle(
                      color: AppColors.muted,
                      fontSize: 12,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class ReportScoreCard extends StatelessWidget {
  const ReportScoreCard({super.key, required this.report});

  final ReportDetail report;

  @override
  Widget build(BuildContext context) {
    return ReportCard(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
      child: Column(
        children: [
          ScoreGauge(score: report.score),
          const SizedBox(height: 28),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.sky,
              borderRadius: BorderRadius.circular(AppRadius.pill),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.event_rounded,
                  size: 14,
                  color: AppColors.blue,
                ),
                const SizedBox(width: 6),
                Text(
                  'Report date ${formatDate(report.reportDate)}${report.isDemo ? ' · Demo data' : ''}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.navy,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
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
    final hasOverdue = summary.overdueAccounts > 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const ReportSectionHeader(
          icon: Icons.assessment_rounded,
          title: 'Report summary',
          subtitle: 'Your credit at a glance',
        ),
        Container(
          margin: const EdgeInsets.only(bottom: 14),
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0B3C9C), Color(0xFF1B5FD6)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(AppRadius.lg),
            boxShadow: AppShadow.card,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Total outstanding',
                style: TextStyle(color: Colors.white70, fontSize: 13),
              ),
              const SizedBox(height: 4),
              FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  formatMoney(summary.totalBalance),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 30,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    Icon(
                      hasOverdue
                          ? Icons.error_outline_rounded
                          : Icons.check_circle_outline_rounded,
                      size: 20,
                      color: hasOverdue
                          ? const Color(0xFFFFB4B4)
                          : Colors.white,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        hasOverdue
                            ? '${formatMoney(summary.totalOverdue)} overdue'
                            : 'No overdue amount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        Row(
          children: [
            Expanded(
              child: _MiniStat(
                icon: Icons.account_balance_wallet_outlined,
                label: 'Accounts',
                value: '${summary.totalAccounts}',
                color: AppColors.blue,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _MiniStat(
                icon: Icons.check_circle_outline_rounded,
                label: 'Active',
                value: '${summary.activeAccounts}',
                color: AppColors.green,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _MiniStat(
                icon: Icons.schedule_rounded,
                label: 'Overdue',
                value: '${summary.overdueAccounts}',
                color: hasOverdue ? AppColors.red : AppColors.muted,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        ReportCard(
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

class _MiniStat extends StatelessWidget {
  const _MiniStat({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: AppShadow.card,
      ),
      child: Column(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(11),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              color: AppColors.navy,
              fontSize: 20,
              fontWeight: FontWeight.w800,
            ),
          ),
          Text(
            label,
            style: const TextStyle(color: AppColors.muted, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class ScoreFactorsSection extends StatelessWidget {
  const ScoreFactorsSection({super.key, required this.factors});

  final List<ScoreFactor> factors;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const ReportSectionHeader(
          icon: Icons.insights_rounded,
          title: 'What affects your score',
          subtitle: 'Positives and things to work on',
          color: AppColors.violet,
        ),
        for (final factor in factors)
          ReportCard(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: (factor.positive ? AppColors.green : AppColors.red)
                        .withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    factor.positive ? Icons.trending_up : Icons.trending_down,
                    color: factor.positive ? AppColors.green : AppColors.red,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        factor.text,
                        style: const TextStyle(
                          fontSize: 13,
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
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ReportSectionHeader(
          icon: Icons.manage_search_rounded,
          title: 'Recent enquiries',
          subtitle: '${enquiries.length} on your report',
          color: AppColors.gold,
        ),
        ReportCard(
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
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const ReportSectionHeader(
          icon: Icons.badge_outlined,
          title: 'Personal details',
          color: AppColors.green,
        ),
        ReportCard(
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
