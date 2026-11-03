import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/models/report.dart';
import 'package:scorenow_mobile/features/reports/report_detail_sections.dart';
import 'package:scorenow_mobile/widgets/app_pill.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

const _smallStyle = TextStyle(fontSize: 12, color: AppColors.muted);
const _noDataDot = Color(0xFFD5DCEA);

bool needsAttention(ReportAccount account) =>
    (account.overdueAmount ?? 0) > 0 ||
    account.paymentHistory.any((month) => (month.daysPastDue ?? 0) > 0);

class AccountCard extends StatefulWidget {
  const AccountCard({super.key, required this.account});

  final ReportAccount account;

  @override
  State<AccountCard> createState() => _AccountCardState();
}

class _AccountCardState extends State<AccountCard> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final account = widget.account;
    final attention = needsAttention(account);
    final accountNumber = account.accountNumber;
    final sanctioned = account.sanctionedAmount ?? account.creditLimit;
    return ReportCard(
      borderColor: attention ? AppColors.red.withValues(alpha: 0.35) : null,
      onTap: () => setState(() => _open = !_open),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                margin: const EdgeInsets.only(right: 12),
                decoration: BoxDecoration(
                  color: (attention ? AppColors.red : AppColors.blue)
                      .withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.account_balance_rounded,
                  size: 22,
                  color: attention ? AppColors.red : AppColors.blue,
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      account.lender,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.navy,
                      ),
                    ),
                    Text(
                      '${titleCase(account.type)}${accountNumber != null && accountNumber.isNotEmpty ? ' · $accountNumber' : ''}',
                      style: _smallStyle,
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisSize: MainAxisSize.min,
                children: [
                  AppPill(
                    label: account.status,
                    color: account.status == 'active'
                        ? AppColors.green
                        : AppColors.muted,
                  ),
                  if (attention) ...[
                    const SizedBox(height: 4),
                    const AppPill(
                      label: 'Needs attention',
                      color: AppColors.red,
                    ),
                  ],
                ],
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Outstanding', style: _smallStyle),
                      Text(
                        formatMoney(account.currentBalance),
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                          color: AppColors.navy,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  _open ? Icons.expand_less : Icons.expand_more,
                  size: 20,
                  color: AppColors.muted,
                ),
              ],
            ),
          ),
          if (_open) ...[
            const SizedBox(height: 8),
            InfoRow(
              label: 'Sanctioned / limit',
              value: formatMoney(sanctioned),
            ),
            InfoRow(
              label: 'Overdue',
              value: formatMoney(account.overdueAmount),
            ),
            if ((account.emiAmount ?? 0) != 0)
              InfoRow(label: 'EMI', value: formatMoney(account.emiAmount)),
            if ((account.interestRate ?? 0) != 0)
              InfoRow(
                label: 'Interest rate',
                value: '${_plainNumber(account.interestRate!)}%',
              ),
            InfoRow(label: 'Opened', value: formatDate(account.openedOn)),
            if (account.closedOn != null && account.closedOn!.isNotEmpty)
              InfoRow(label: 'Closed', value: formatDate(account.closedOn)),
            InfoRow(
              label: 'Last payment',
              value: formatDate(account.lastPaymentOn),
            ),
            PaymentDots(history: account.paymentHistory),
          ],
        ],
      ),
    );
  }
}

class PaymentDots extends StatelessWidget {
  const PaymentDots({super.key, required this.history});

  final List<AccountPayment> history;

  @override
  Widget build(BuildContext context) {
    if (history.isEmpty) return const SizedBox.shrink();
    final visible = history.length > 12
        ? history.sublist(history.length - 12)
        : history;
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Payment history', style: _smallStyle),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final month in visible)
                Column(
                  children: [
                    Container(
                      width: 14,
                      height: 14,
                      decoration: BoxDecoration(
                        color: _dotColor(month.daysPastDue),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      formatMonth(month.month),
                      style: const TextStyle(
                        fontSize: 9,
                        color: AppColors.muted,
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ],
      ),
    );
  }
}

// Mirrors JavaScript number output so whole rates print as "10", not "10.0".
String _plainNumber(double value) =>
    value % 1 == 0 ? value.toInt().toString() : value.toString();

Color _dotColor(int? daysPastDue) {
  if (daysPastDue == null) return _noDataDot;
  if (daysPastDue > 0)
    return daysPastDue >= 30 ? AppColors.red : AppColors.gold;
  return AppColors.green;
}
