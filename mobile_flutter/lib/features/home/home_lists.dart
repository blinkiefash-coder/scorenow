import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/reports/report_account_card.dart';
import 'package:scorenow_mobile/models/report.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

const _tileBlue = Color(0xFFE6F0FD);
const _softBorder = Color(0xFFE3ECF8);

BoxDecoration _card({double radius = AppRadius.lg}) => BoxDecoration(
  color: AppColors.card,
  borderRadius: BorderRadius.circular(radius),
  border: Border.all(color: _softBorder),
  boxShadow: AppShadow.card,
);

class _IconTile extends StatelessWidget {
  const _IconTile({
    required this.icon,
    this.color = AppColors.blue,
    this.fill = _tileBlue,
    this.size = 42,
  });

  final IconData icon;
  final Color color;
  final Color fill;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: fill,
        borderRadius: BorderRadius.circular(AppRadius.sm + 2),
      ),
      child: Icon(icon, size: size * 0.5, color: color),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 112,
      padding: const EdgeInsets.symmetric(vertical: 4),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(AppRadius.pill),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11.5,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class HomeAccountsList extends StatelessWidget {
  const HomeAccountsList({super.key, required this.accounts});

  final List<ReportAccount> accounts;

  @override
  Widget build(BuildContext context) {
    if (accounts.isEmpty) {
      return const EmptyState(title: 'No accounts reported');
    }
    final total = accounts.fold<num>(
      0,
      (sum, account) => sum + (account.currentBalance ?? 0),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const _IconTile(
              icon: Icons.layers_outlined,
              fill: Color(0xFFE6F0FD),
              size: 46,
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Your credit accounts',
                    style: TextStyle(
                      color: AppColors.navy,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(
                    'Review account status and balances',
                    style: TextStyle(color: AppColors.muted, fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: _card(radius: AppRadius.md),
          child: Row(
            children: [
              const Icon(
                Icons.account_balance_wallet_outlined,
                size: 22,
                color: AppColors.blue,
              ),
              const SizedBox(width: 8),
              Text.rich(
                TextSpan(
                  text: '${accounts.length}',
                  style: const TextStyle(
                    color: AppColors.blue,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                  children: const [
                    TextSpan(
                      text: ' accounts',
                      style: TextStyle(
                        color: AppColors.navy,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                width: 1,
                height: 30,
                margin: const EdgeInsets.symmetric(horizontal: 12),
                color: AppColors.line,
              ),
              const Icon(
                Icons.savings_outlined,
                size: 22,
                color: AppColors.gold,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      formatMoney(total),
                      style: const TextStyle(
                        color: AppColors.navy,
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const Text(
                      'total outstanding',
                      style: TextStyle(color: AppColors.muted, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        for (final account in accounts) _HomeAccountCard(account: account),
      ],
    );
  }
}

class _HomeAccountCard extends StatefulWidget {
  const _HomeAccountCard({required this.account});

  final ReportAccount account;

  @override
  State<_HomeAccountCard> createState() => _HomeAccountCardState();
}

class _HomeAccountCardState extends State<_HomeAccountCard> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final account = widget.account;
    final attention = needsAttention(account);
    final number = account.accountNumber;
    final active = account.status == 'active';
    final sanctioned = account.sanctionedAmount ?? account.creditLimit;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: _card(),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          onTap: () => setState(() => _open = !_open),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _IconTile(icon: Icons.account_balance_outlined),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            account.lender,
                            style: const TextStyle(
                              color: AppColors.navy,
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${titleCase(account.type)}${number != null && number.isNotEmpty ? ' · $number' : ''}',
                            style: const TextStyle(
                              color: AppColors.muted,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Column(
                      children: [
                        _Pill(
                          label: titleCase(account.status),
                          color: active ? AppColors.green : AppColors.muted,
                        ),
                        if (attention) ...[
                          const SizedBox(height: 5),
                          const _Pill(
                            label: 'Needs attention',
                            color: AppColors.red,
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                const Divider(height: 1, color: AppColors.line),
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Text(
                      'Outstanding',
                      style: TextStyle(color: AppColors.muted, fontSize: 12),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Text(
                        formatMoney(account.currentBalance),
                        style: const TextStyle(
                          color: AppColors.navy,
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    Icon(
                      _open ? Icons.expand_less : Icons.expand_more,
                      size: 22,
                      color: AppColors.navy,
                    ),
                  ],
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
                    InfoRow(
                      label: 'EMI',
                      value: formatMoney(account.emiAmount),
                    ),
                  InfoRow(label: 'Opened', value: formatDate(account.openedOn)),
                  InfoRow(
                    label: 'Last payment',
                    value: formatDate(account.lastPaymentOn),
                  ),
                  PaymentDots(history: account.paymentHistory),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class HomeEnquiriesList extends StatelessWidget {
  const HomeEnquiriesList({
    super.key,
    required this.enquiries,
    required this.count,
  });

  final List<ReportEnquiry> enquiries;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: _card(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFFF1F6FE), Color(0xFFE4EEFC)],
              ),
            ),
            child: Row(
              children: [
                const _IconTile(
                  icon: Icons.search_rounded,
                  color: AppColors.blueDark,
                  fill: Color(0xFFFFE9C7),
                  size: 54,
                ),
                const SizedBox(width: 12),
                Container(width: 3, height: 54, color: AppColors.gold),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Credit enquiries',
                        style: TextStyle(
                          color: AppColors.navy,
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text.rich(
                        TextSpan(
                          text: '$count',
                          style: const TextStyle(
                            color: AppColors.blueDark,
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                          ),
                          children: const [
                            TextSpan(
                              text: ' in the last 6 months',
                              style: TextStyle(
                                color: AppColors.navy,
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Text(
                        'These are enquiries recorded in the selected report.',
                        style: TextStyle(color: AppColors.muted, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          for (var i = 0; i < enquiries.length; i++) ...[
            if (i > 0)
              const Divider(
                height: 1,
                indent: 16,
                endIndent: 16,
                color: AppColors.line,
              ),
            _EnquiryRow(enquiry: enquiries[i]),
          ],
        ],
      ),
    );
  }
}

class _EnquiryRow extends StatelessWidget {
  const _EnquiryRow({required this.enquiry});

  final ReportEnquiry enquiry;

  @override
  Widget build(BuildContext context) {
    final purpose = enquiry.purpose?.trim() ?? '';
    final isLoan = purpose.toLowerCase().contains('loan');
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          _IconTile(
            icon: isLoan
                ? Icons.credit_card_outlined
                : Icons.account_balance_outlined,
            size: 40,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  enquiry.lender,
                  style: const TextStyle(
                    color: AppColors.navy,
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  [
                    if (purpose.isNotEmpty) titleCase(purpose),
                    formatDate(enquiry.date),
                  ].join(' · '),
                  style: const TextStyle(color: AppColors.muted, fontSize: 12),
                ),
              ],
            ),
          ),
          Container(
            width: 1,
            height: 34,
            margin: const EdgeInsets.symmetric(horizontal: 12),
            color: AppColors.line,
          ),
          Text(
            formatMoney(enquiry.amount),
            style: const TextStyle(
              color: AppColors.navy,
              fontSize: 15,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}
