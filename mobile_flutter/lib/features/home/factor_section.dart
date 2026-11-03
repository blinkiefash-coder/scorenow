import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/home/score_factors.dart';
import 'package:scorenow_mobile/models/report.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';

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
    void openReport() => context.push('/report/${report.requestId}');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Score factors',
                          style: TextStyle(
                            color: AppColors.navy,
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'What is shaping your score today?',
                          style: TextStyle(
                            color: AppColors.muted,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  InkWell(
                    onTap: openReport,
                    child: const Padding(
                      padding: EdgeInsets.only(top: 3),
                      child: Row(
                        children: [
                          Text(
                            'View details',
                            style: TextStyle(
                              color: AppColors.blueDark,
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          SizedBox(width: 4),
                          Icon(
                            Icons.arrow_forward,
                            size: 14,
                            color: AppColors.blueDark,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              for (var i = 0; i < factors.length; i++) ...[
                if (i > 0) const Divider(height: 1, color: AppColors.line),
                _FactorRow(factor: factors[i], onTap: openReport),
              ],
            ],
          ),
        ),
        _NextStepsCard(factors: factors),
      ],
    );
  }
}

Color _factorTone(FactorInsight factor) => switch (factor.status) {
  FactorStatus.excellent => AppColors.green,
  FactorStatus.good => AppColors.blue,
  FactorStatus.needsWork => AppColors.red,
  FactorStatus.noData => AppColors.muted,
};

const _tileColors = {
  'Payment history': AppColors.red,
  'Credit utilisation': AppColors.blue,
  'Credit age': AppColors.violet,
  'Credit mix': AppColors.green,
  'Recent enquiries': AppColors.gold,
};

class _FactorRow extends StatelessWidget {
  const _FactorRow({required this.factor, required this.onTap});

  final FactorInsight factor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tone = _factorTone(factor);
    final tile = _tileColors[factor.title] ?? AppColors.blue;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: tile.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: Icon(factor.icon, size: 20, color: tile),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    factor.title,
                    style: const TextStyle(
                      color: AppColors.navy,
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(AppRadius.pill),
                    child: LinearProgressIndicator(
                      value: factor.status == FactorStatus.noData
                          ? 0
                          : factor.progress,
                      minHeight: 5,
                      color: tone,
                      backgroundColor: AppColors.line,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    factor.detail,
                    style: const TextStyle(
                      color: AppColors.muted,
                      fontSize: 10.5,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
              decoration: BoxDecoration(
                color: tone.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(AppRadius.pill),
              ),
              child: Text(
                factor.statusLabel,
                style: TextStyle(
                  color: tone,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            const Icon(
              Icons.chevron_right_rounded,
              size: 20,
              color: AppColors.muted,
            ),
          ],
        ),
      ),
    );
  }
}

class _NextStepsCard extends StatelessWidget {
  const _NextStepsCard({required this.factors});

  final List<FactorInsight> factors;

  @override
  Widget build(BuildContext context) {
    final steps = buildNextSteps(factors).take(4).toList();
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Your next steps',
            style: TextStyle(
              color: AppColors.navy,
              fontSize: 18,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 2),
          const Text(
            'Personalised actions to improve your score',
            style: TextStyle(color: AppColors.muted, fontSize: 12),
          ),
          const SizedBox(height: 14),
          if (steps.isEmpty)
            const Padding(
              padding: EdgeInsets.only(bottom: 10),
              child: Text(
                'Great work. Keep paying on time and keep your usage low.',
                style: TextStyle(color: AppColors.muted, fontSize: 12),
              ),
            )
          else
            for (var i = 0; i < steps.length; i++) ...[
              _StepRow(
                index: i + 1,
                title: steps[i].title,
                area: steps[i].detail,
                high: steps[i].high,
                onTap: () =>
                    steps[i].detail == 'Payment history' ||
                        steps[i].detail == 'Credit age'
                    ? context.go('/payments')
                    : context.push('/guides'),
              ),
              const SizedBox(height: 10),
            ],
          InkWell(
            borderRadius: BorderRadius.circular(AppRadius.sm),
            onTap: () => context.push('/guides'),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
              decoration: BoxDecoration(
                color: AppColors.sky,
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: const Row(
                children: [
                  Icon(
                    Icons.checklist_rtl_rounded,
                    size: 20,
                    color: AppColors.blueDark,
                  ),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'View all personalised recommendations',
                      style: TextStyle(
                        color: AppColors.navy,
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  Icon(
                    Icons.chevron_right_rounded,
                    size: 20,
                    color: AppColors.blueDark,
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
  const _StepRow({
    required this.index,
    required this.title,
    required this.area,
    required this.high,
    required this.onTap,
  });

  final int index;
  final String title;
  final String area;
  final bool high;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tone = high ? AppColors.red : AppColors.gold;
    final pillText = high ? AppColors.red : const Color(0xFFB07A00);
    return InkWell(
      borderRadius: BorderRadius.circular(AppRadius.md),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: tone.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        child: Row(
          children: [
            Container(
              width: 26,
              height: 26,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: tone.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: Text(
                '$index',
                style: TextStyle(
                  color: pillText,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
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
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    area,
                    style: const TextStyle(
                      color: AppColors.muted,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: tone.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(AppRadius.pill),
              ),
              child: Text(
                high ? 'High' : 'Medium',
                style: TextStyle(
                  color: pillText,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            const Icon(
              Icons.chevron_right_rounded,
              size: 20,
              color: AppColors.muted,
            ),
          ],
        ),
      ),
    );
  }
}
