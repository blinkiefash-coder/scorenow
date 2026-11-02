import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/models/report.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';
import 'package:scorenow_mobile/widgets/app_pill.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

class PaymentHistory extends StatelessWidget {
  const PaymentHistory({super.key, required this.months});

  final List<PaymentMonth> months;

  @override
  Widget build(BuildContext context) {
    final reported = months.fold<int>(0, (sum, month) => sum + month.reported);
    final late = months.fold<int>(0, (sum, month) => sum + month.late);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  _Stat(
                    label: 'On time',
                    value: '${reported - late}',
                    color: AppColors.green,
                  ),
                  _Stat(
                    label: 'Late',
                    value: '$late',
                    color: late > 0 ? AppColors.red : AppColors.muted,
                  ),
                  const _Stat(
                    label: 'Upcoming',
                    value: '—',
                    color: AppColors.muted,
                  ),
                ],
              ),
              const SizedBox(height: 10),
              const Text(
                'Upcoming dues are not in your credit report yet.',
                style: TextStyle(color: AppColors.muted, fontSize: 12),
              ),
            ],
          ),
        ),
        if (months.isEmpty)
          const EmptyState(title: 'No payment history yet')
        else
          AppCard(
            child: Column(
              children: [
                for (var i = 0; i < months.length; i++) ...[
                  if (i > 0) const Divider(height: 20, color: AppColors.line),
                  _MonthRow(month: months[i]),
                ],
              ],
            ),
          ),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value, required this.color});

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              color: color,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(color: AppColors.muted, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _MonthRow extends StatelessWidget {
  const _MonthRow({required this.month});

  final PaymentMonth month;

  @override
  Widget build(BuildContext context) {
    final late = month.late > 0;
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                formatMonth(month.month),
                style: const TextStyle(
                  color: AppColors.navy,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '${month.reported} reported',
                style: const TextStyle(color: AppColors.muted, fontSize: 12),
              ),
            ],
          ),
        ),
        AppPill(
          label: late ? '${month.late} late' : 'On time',
          color: late ? AppColors.red : AppColors.green,
        ),
      ],
    );
  }
}
