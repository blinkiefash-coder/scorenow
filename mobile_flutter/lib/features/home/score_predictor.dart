import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/home/report_detail_section.dart';
import 'package:scorenow_mobile/features/home/score_factors.dart';
import 'package:scorenow_mobile/models/report.dart';
import 'package:scorenow_mobile/widgets/app_pill.dart';

class ScoreStep {
  const ScoreStep({
    required this.factor,
    required this.minGain,
    required this.maxGain,
    required this.months,
  });

  final FactorInsight factor;
  final int minGain;
  final int maxGain;
  final int months;
}

class ScorePrediction {
  const ScorePrediction({
    required this.current,
    required this.low,
    required this.high,
    required this.steps,
  });

  final int current;
  final int low;
  final int high;
  final List<ScoreStep> steps;
}

// Indicative point ranges per factor: (needs work, good).
const _gains = <String, (int, int, int, int, int)>{
  'Payment history': (40, 80, 10, 20, 6),
  'Credit utilisation': (25, 50, 8, 15, 3),
  'Recent enquiries': (10, 25, 4, 10, 6),
  'Credit mix': (8, 20, 3, 8, 12),
  'Credit age': (5, 15, 3, 8, 12),
};

ScorePrediction? predictScore(
  BureauReport report,
  List<FactorInsight> factors,
) {
  final current = report.creditScore;
  if (current == null || current <= 0) return null;
  final steps = <ScoreStep>[];
  for (final factor in factors) {
    final gain = _gains[factor.title];
    if (gain == null) continue;
    final needsWork = factor.status == FactorStatus.needsWork;
    if (!needsWork && factor.status != FactorStatus.good) continue;
    steps.add(
      ScoreStep(
        factor: factor,
        minGain: needsWork ? gain.$1 : gain.$3,
        maxGain: needsWork ? gain.$2 : gain.$4,
        months: gain.$5,
      ),
    );
  }
  steps.sort((a, b) => b.maxGain.compareTo(a.maxGain));
  final low = steps.fold<int>(0, (sum, step) => sum + step.minGain);
  final high = steps.fold<int>(0, (sum, step) => sum + step.maxGain);
  return ScorePrediction(
    current: current,
    low: (current + low).clamp(300, 900),
    high: (current + high).clamp(300, 900),
    steps: steps,
  );
}

Future<void> showScorePredictor(BuildContext context, BureauReport report) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.bg,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
    ),
    builder: (context) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      builder: (context, controller) => ListView(
        controller: controller,
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 28),
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.line,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 14),
          ReportDetailSection(
            requestId: report.requestId,
            builder: (context, detail) {
              final factors = buildFactorInsights(
                report: report,
                accounts: detail.accounts,
              );
              return _PredictorBody(
                report: report,
                prediction: predictScore(report, factors),
              );
            },
          ),
        ],
      ),
    ),
  );
}

class _PredictorBody extends StatelessWidget {
  const _PredictorBody({required this.report, required this.prediction});

  final BureauReport report;
  final ScorePrediction? prediction;

  @override
  Widget build(BuildContext context) {
    final result = prediction;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Score Predictor',
          style: TextStyle(
            color: AppColors.navy,
            fontSize: 20,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          'Personalised to your ${report.bureau.name.toUpperCase()} report',
          style: const TextStyle(color: AppColors.muted, fontSize: 12),
        ),
        const SizedBox(height: 16),
        if (result == null)
          const _Panel(
            child: Text(
              'We need a completed report with a score to build your forecast.',
              style: TextStyle(color: AppColors.muted, fontSize: 13),
            ),
          )
        else ...[
          _Forecast(result: result),
          const SizedBox(height: 14),
          if (result.steps.isEmpty)
            const _Panel(
              child: Text(
                'Great work! Your report shows no weak areas. Keep paying on time and keep card usage low to hold your score.',
                style: TextStyle(color: AppColors.navy, fontSize: 13),
              ),
            )
          else ...[
            const Text(
              'What will move your score',
              style: TextStyle(
                color: AppColors.navy,
                fontSize: 15,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 10),
            for (final step in result.steps) ...[
              _StepTile(step: step),
              const SizedBox(height: 10),
            ],
          ],
        ],
        const SizedBox(height: 6),
        const Text(
          'Indicative estimate based on your report. Actual changes depend on the bureau and your future credit behaviour, and are not guaranteed.',
          style: TextStyle(color: AppColors.placeholder, fontSize: 11),
        ),
      ],
    );
  }
}

class _Panel extends StatelessWidget {
  const _Panel({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.cardBorder),
        boxShadow: AppShadow.card,
      ),
      child: child,
    );
  }
}

class _Forecast extends StatelessWidget {
  const _Forecast({required this.result});

  final ScorePrediction result;

  @override
  Widget build(BuildContext context) {
    final months = result.steps.isEmpty
        ? 0
        : result.steps.map((s) => s.months).reduce((a, b) => a > b ? a : b);
    final improving = result.high > result.current;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.blueDark, AppColors.blue],
        ),
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Current score',
                  style: TextStyle(color: Colors.white70, fontSize: 12),
                ),
                const SizedBox(height: 4),
                Text(
                  '${result.current}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 30,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
          const Icon(Icons.arrow_forward_rounded, color: Colors.white70),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  improving ? 'In ~$months months' : 'Outlook',
                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                ),
                const SizedBox(height: 4),
                Text(
                  improving ? '${result.low}–${result.high}' : 'Stable',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 30,
                    fontWeight: FontWeight.w900,
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

class _StepTile extends StatelessWidget {
  const _StepTile({required this.step});

  final ScoreStep step;

  @override
  Widget build(BuildContext context) {
    final factor = step.factor;
    return _Panel(
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: factor.tone.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(factor.icon, size: 19, color: factor.tone),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  factor.advice,
                  style: const TextStyle(
                    color: AppColors.navy,
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${factor.title} · ${factor.detail}',
                  style: const TextStyle(color: AppColors.muted, fontSize: 11),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          AppPill(
            label: '+${step.minGain}–${step.maxGain}',
            color: AppColors.green,
          ),
        ],
      ),
    );
  }
}
