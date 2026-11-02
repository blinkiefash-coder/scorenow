import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/models/support.dart';
import 'package:scorenow_mobile/widgets/app_button.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';
import 'package:scorenow_mobile/widgets/app_pill.dart';

class AdminCustomerCard extends StatelessWidget {
  const AdminCustomerCard({
    super.key,
    required this.customer,
    required this.canManage,
    required this.updating,
    required this.onToggleStatus,
  });

  final AdminCustomer customer;
  final bool canManage;
  final bool updating;
  final VoidCallback onToggleStatus;

  bool get _blocked => customer.status == 'blocked';

  @override
  Widget build(BuildContext context) {
    final contact = customer.email == null || customer.email!.isEmpty
        ? '+91 ${customer.mobile}'
        : '+91 ${customer.mobile} · ${customer.email}';
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  customer.fullName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.navy,
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                  ),
                ),
              ),
              AppPill(
                label: customer.status,
                color: _blocked ? AppColors.red : AppColors.green,
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            contact,
            style: const TextStyle(color: AppColors.muted, fontSize: 13),
          ),
          const SizedBox(height: 4),
          Text(
            '${customer.journeyStage} · ${customer.paidPayments}/${customer.totalPayments} paid',
            style: const TextStyle(color: AppColors.muted, fontSize: 12),
          ),
          const SizedBox(height: 4),
          Text(
            'Joined ${formatDate(customer.createdAt)} · Last login ${formatDateTime(customer.lastLogin)}',
            style: const TextStyle(color: AppColors.muted, fontSize: 12),
          ),
          if (canManage) ...[
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: AppButton(
                label: _blocked ? 'Unblock' : 'Block',
                variant: _blocked
                    ? AppButtonVariant.outline
                    : AppButtonVariant.danger,
                small: true,
                expanded: false,
                loading: updating,
                onPressed: updating ? null : onToggleStatus,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
