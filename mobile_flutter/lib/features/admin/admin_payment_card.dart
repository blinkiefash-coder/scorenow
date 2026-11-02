import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/models/support.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';
import 'package:scorenow_mobile/widgets/app_pill.dart';

class AdminPaymentCard extends StatelessWidget {
  const AdminPaymentCard({super.key, required this.payment});

  final AdminPayment payment;

  Color get _statusColor => switch (payment.status) {
    'paid' => AppColors.green,
    'failed' => AppColors.red,
    _ => AppColors.gold,
  };

  @override
  Widget build(BuildContext context) {
    final bureau = payment.bureau?.name.toUpperCase() ?? '—';
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  payment.fullName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.navy,
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                  ),
                ),
              ),
              AppPill(label: payment.status, color: _statusColor),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            '•••• ${payment.mobileLast4} · $bureau · ${formatMoney(payment.amount)}',
            style: const TextStyle(color: AppColors.muted, fontSize: 13),
          ),
          if (payment.failureReason != null &&
              payment.failureReason!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              payment.failureReason!,
              style: const TextStyle(color: AppColors.red, fontSize: 12),
            ),
          ],
          const SizedBox(height: 4),
          Text(
            formatDateTime(payment.createdAt),
            style: const TextStyle(color: AppColors.muted, fontSize: 12),
          ),
        ],
      ),
    );
  }
}
