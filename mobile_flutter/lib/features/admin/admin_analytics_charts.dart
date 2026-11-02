import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/models/support.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';

const _funnelLabels = {
  'signed_up': 'Signed up',
  'profile_complete': 'Profile complete',
  'payment_started': 'Payment started',
  'payment_paid': 'Payment paid',
};

class AdminSignupBars extends StatelessWidget {
  const AdminSignupBars({super.key, required this.trend});

  final List<AnalyticsTrendDay> trend;

  @override
  Widget build(BuildContext context) {
    final maxSignups = trend.fold<int>(
      1,
      (max, day) => day.signups > max ? day.signups : max,
    );
    return AppCard(
      child: SizedBox(
        height: 100,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            for (final day in trend)
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Container(
                      width: 8,
                      height: 6 + (day.signups / maxSignups) * 74,
                      decoration: BoxDecoration(
                        color: AppColors.blue,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      day.day.length >= 10 ? day.day.substring(8) : day.day,
                      style: const TextStyle(
                        fontSize: 9,
                        color: AppColors.muted,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class AdminFunnelBars extends StatelessWidget {
  const AdminFunnelBars({super.key, required this.funnel});

  final List<FunnelStep> funnel;

  @override
  Widget build(BuildContext context) {
    final funnelMax = funnel.fold<int>(
      1,
      (max, step) => step.count > max ? step.count : max,
    );
    return AppCard(
      child: Column(
        children: [
          for (final step in funnel)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          _funnelLabels[step.step] ?? step.step,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.navy,
                          ),
                        ),
                      ),
                      Text(
                        '${step.count}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: AppColors.navy,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: Container(
                      height: 8,
                      color: const Color(0xFFE8EDF7),
                      alignment: Alignment.centerLeft,
                      child: FractionallySizedBox(
                        widthFactor: step.count / funnelMax,
                        child: Container(color: AppColors.blue),
                      ),
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
