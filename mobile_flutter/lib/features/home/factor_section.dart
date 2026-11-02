import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/home/score_factors.dart';
import 'package:scorenow_mobile/models/report.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';
import 'package:scorenow_mobile/widgets/app_pill.dart';

class FactorSection extends StatelessWidget {
  const FactorSection({
    super.key,
    required this.report,
    required this.accounts,
  });

  final BureauReport report;
  final List<ReportAccount> accounts;

  @override
  Widget build(BuildContext context) {
    final factors = buildFactorInsights(report: report, accounts: accounts);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Score factors',
                style: TextStyle(
                  color: AppColors.navy,
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'What is shaping your score today',
                style: TextStyle(color: AppColors.muted, fontSize: 12),
              ),
              for (final factor in factors) ...[
                const Divider(height: 22, color: AppColors.line),
                _FactorRow(factor: factor),
              ],
              const SizedBox(height: 8),
              InkWell(
                borderRadius: BorderRadius.circular(AppRadius.sm),
                onTap: () => context.push('/report/${report.requestId}'),
                child: const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'View report details',
                        style: TextStyle(
                          color: AppColors.blue,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      SizedBox(width: 6),
                      Icon(
                        Icons.arrow_forward,
                        size: 14,
                        color: AppColors.blue,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        _NextStepsCard(factors: factors),
      ],
    );
  }
}

class _FactorRow extends StatelessWidget {
  const _FactorRow({required this.factor});

  final FactorInsight factor;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Icon(factor.icon, size: 18, color: AppColors.blue),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                factor.title,
                style: const TextStyle(
                  color: AppColors.navy,
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            AppPill(label: factor.statusLabel, color: factor.tone),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(AppRadius.pill),
          child: LinearProgressIndicator(
            value: factor.status == FactorStatus.noData ? 0 : factor.progress,
            minHeight: 6,
            color: factor.tone,
            backgroundColor: AppColors.line,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          factor.detail,
          style: const TextStyle(color: AppColors.muted, fontSize: 11),
        ),
      ],
    );
  }
}

class _NextStepsCard extends StatelessWidget {
  const _NextStepsCard({required this.factors});

  final List<FactorInsight> factors;

  @override
  Widget build(BuildContext context) {
    final steps = buildNextSteps(factors);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Your next steps',
            style: TextStyle(
              color: AppColors.navy,
              fontSize: 15,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 10),
          if (steps.isEmpty)
            const Text(
              'Great work. Keep paying on time and keep your usage low.',
              style: TextStyle(color: AppColors.muted, fontSize: 12),
            )
          else
            for (final step in steps.take(4)) ...[
              _StepRow(title: step.title, area: step.detail, high: step.high),
              const SizedBox(height: 10),
            ],
          const SizedBox(height: 4),
          InkWell(
            borderRadius: BorderRadius.circular(AppRadius.sm),
            onTap: () => context.push('/guides'),
            child: const Padding(
              padding: EdgeInsets.symmetric(vertical: 6),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Learn how to improve',
                    style: TextStyle(
                      color: AppColors.blue,
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  SizedBox(width: 6),
                  Icon(
                    Icons.menu_book_outlined,
                    size: 14,
                    color: AppColors.blue,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StepRow extends StatelessWidget {
  const _StepRow({required this.title, required this.area, required this.high});

  final String title;
  final String area;
  final bool high;

  @override
  Widget build(BuildContext context) {
    final tone = high ? AppColors.red : AppColors.gold;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.fieldFill,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.navy,
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  area,
                  style: const TextStyle(color: AppColors.muted, fontSize: 11),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          AppPill(label: high ? 'High' : 'Medium', color: tone),
        ],
      ),
    );
  }
}
