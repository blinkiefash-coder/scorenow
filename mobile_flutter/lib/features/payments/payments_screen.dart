import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/dashboard/completed_reports.dart';
import 'package:scorenow_mobile/features/dashboard/dashboard_scope.dart';
import 'package:scorenow_mobile/features/home/report_detail_section.dart';
import 'package:scorenow_mobile/features/payments/payment_history.dart';
import 'package:scorenow_mobile/models/report.dart';
import 'package:scorenow_mobile/widgets/app_pill.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/brand_spinner.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';
import 'package:scorenow_mobile/widgets/underline_tabs.dart';

class PaymentsScreen extends StatelessWidget {
  const PaymentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = DashboardScope.of(context);
    final state = controller.dashboard;
    final dashboard = state.data;
    if (state.loading && dashboard == null) {
      return const FullScreenLoader(label: 'Loading your payments…');
    }

    final completed = completedReports(
      dashboard?.reports ?? const <BureauReport>[],
    );
    final best = completed.isEmpty ? null : completed.first;

    return AppScreen(
      onRefresh: state.refresh,
      header: const ScreenHeader(
        title: 'Payments',
        subtitle: 'Your loans and repayments',
      ),
      children: [
        if (state.error.isNotEmpty)
          ErrorBanner(message: state.error, onRetry: state.reload),
        if (best == null)
          const EmptyState(
            title: 'No payment data yet',
            text: 'Get a report to see your loans and payments.',
          )
        else
          ReportDetailSection(
            requestId: best.requestId,
            builder: (context, detail) =>
                _PaymentsBody(detail: detail, best: best),
          ),
      ],
    );
  }
}

enum _LoanFilter { all, defaulted, running, closed }

const _loanFilterOptions = [
  (value: _LoanFilter.all, label: 'All'),
  (value: _LoanFilter.defaulted, label: 'Overdue'),
  (value: _LoanFilter.running, label: 'Running'),
  (value: _LoanFilter.closed, label: 'Closed'),
];

bool _isDefaulted(ReportAccount account) => (account.overdueAmount ?? 0) > 0;

bool _isRunning(ReportAccount account) =>
    account.status == 'active' && !_isDefaulted(account);

class _PaymentsBody extends StatefulWidget {
  const _PaymentsBody({required this.detail, required this.best});

  final ReportDetail detail;
  final BureauReport best;

  @override
  State<_PaymentsBody> createState() => _PaymentsBodyState();
}

class _PaymentsBodyState extends State<_PaymentsBody> {
  _LoanFilter _filter = _LoanFilter.all;
  String _query = '';

  bool _matchesFilter(ReportAccount account) => switch (_filter) {
    _LoanFilter.all => true,
    _LoanFilter.defaulted => _isDefaulted(account),
    _LoanFilter.running => _isRunning(account),
    _LoanFilter.closed => account.status == 'closed' && !_isDefaulted(account),
  };

  void _showPayComingSoon() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Online loan payments are coming soon. Please contact the lender directly to make a payment.',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final accounts = widget.detail.accounts;
    final defaulted = accounts.where(_isDefaulted).toList();
    final running = accounts.where(_isRunning).toList();
    final totalEmi = accounts
        .where(
          (account) =>
              _isRunning(account) ||
              (_isDefaulted(account) && account.status == 'active'),
        )
        .fold<num>(0, (sum, account) => sum + (account.emiAmount ?? 0));
    final totalOverdue = defaulted.fold<num>(
      0,
      (sum, account) => sum + (account.overdueAmount ?? 0),
    );

    final query = _query.trim().toLowerCase();
    final visible =
        accounts
            .where(
              (account) =>
                  _matchesFilter(account) &&
                  (query.isEmpty ||
                      account.lender.toLowerCase().contains(query) ||
                      (account.accountNumber ?? '').toLowerCase().contains(
                        query,
                      )),
            )
            .toList()
          ..sort(
            (a, b) => (_isDefaulted(b) ? 1 : 0) - (_isDefaulted(a) ? 1 : 0),
          );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _PaymentsHero(
          emi: formatMoney(totalEmi),
          overdue: formatMoney(totalOverdue),
          hasOverdue: totalOverdue > 0,
          overdueCount: defaulted.length,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _StatTile(
                icon: Icons.account_balance_wallet_outlined,
                label: 'Total loans',
                value: '${accounts.length}',
                color: AppColors.blue,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _StatTile(
                icon: Icons.check_circle_outline_rounded,
                label: 'Running loans',
                value: '${running.length}',
                color: AppColors.green,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        UnderlineTabs<_LoanFilter>(
          options: _loanFilterOptions,
          selected: _filter,
          onChanged: (filter) => setState(() => _filter = filter),
        ),
        const SizedBox(height: 12),
        TextField(
          onChanged: (value) => setState(() => _query = value),
          decoration: InputDecoration(
            hintText: 'Search by lender or account number',
            prefixIcon: const Icon(Icons.search_rounded),
            isDense: true,
            filled: true,
            fillColor: AppColors.fieldFill,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: const BorderSide(color: AppColors.cardBorder),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: const BorderSide(color: AppColors.cardBorder),
            ),
          ),
        ),
        const SizedBox(height: 12),
        if (visible.isEmpty)
          const EmptyState(
            title: 'No loans found',
            text: 'Try another filter or search.',
          )
        else
          for (final account in visible)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: _LoanCard(account: account, onPay: _showPayComingSoon),
            ),
        const SizedBox(height: 6),
        PaymentHistory(months: widget.best.paymentMonths),
      ],
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({
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
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: AppShadow.card,
      ),
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
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(color: AppColors.muted, fontSize: 12),
                ),
                Text(
                  value,
                  style: const TextStyle(
                    color: AppColors.navy,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
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

class _PaymentsHero extends StatelessWidget {
  const _PaymentsHero({
    required this.emi,
    required this.overdue,
    required this.hasOverdue,
    required this.overdueCount,
  });

  final String emi;
  final String overdue;
  final bool hasOverdue;
  final int overdueCount;

  @override
  Widget build(BuildContext context) {
    return Container(
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
            'Monthly EMI',
            style: TextStyle(color: Colors.white70, fontSize: 13),
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              emi,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 32,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
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
                  color: hasOverdue ? const Color(0xFFFFB4B4) : Colors.white,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    hasOverdue
                        ? '$overdue overdue on $overdueCount account${overdueCount == 1 ? '' : 's'}'
                        : 'No overdue payments. Great job!',
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
    );
  }
}

class _LoanCard extends StatelessWidget {
  const _LoanCard({required this.account, required this.onPay});

  final ReportAccount account;
  final VoidCallback onPay;

  @override
  Widget build(BuildContext context) {
    final defaulted = _isDefaulted(account);
    final closed = account.status == 'closed';
    final payable = defaulted || account.status == 'active';
    final statusLabel = defaulted
        ? 'Overdue'
        : (account.status.isEmpty ? 'Unknown' : account.status);
    final statusColor = defaulted
        ? AppColors.red
        : (closed ? AppColors.muted : AppColors.green);
    final details = [
      account.type,
      if (account.accountNumber != null) account.accountNumber!,
    ].join(' · ');

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: AppShadow.card,
        border: defaulted
            ? Border.all(color: AppColors.red.withValues(alpha: 0.35))
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                margin: const EdgeInsets.only(right: 12),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.account_balance_rounded,
                  color: statusColor,
                  size: 22,
                ),
              ),
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
                      details,
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              AppPill(label: statusLabel, color: statusColor),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _Figure(
                  label: 'EMI',
                  value: formatMoney(account.emiAmount),
                ),
              ),
              Expanded(
                child: _Figure(
                  label: 'Outstanding',
                  value: formatMoney(account.currentBalance),
                ),
              ),
              Expanded(
                child: _Figure(
                  label: 'Overdue',
                  value: formatMoney(account.overdueAmount ?? 0),
                  color: defaulted ? AppColors.red : AppColors.navy,
                ),
              ),
            ],
          ),
          if (account.lastPaymentOn != null) ...[
            const SizedBox(height: 10),
            Text(
              'Last payment: ${formatDate(account.lastPaymentOn)}',
              style: const TextStyle(color: AppColors.muted, fontSize: 12),
            ),
          ],
          if (payable) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: FilledButton(
                style: FilledButton.styleFrom(shape: const StadiumBorder()),
                onPressed: onPay,
                child: const Text('Pay now'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Figure extends StatelessWidget {
  const _Figure({
    required this.label,
    required this.value,
    this.color = AppColors.navy,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(color: AppColors.muted, fontSize: 11),
        ),
        const SizedBox(height: 4),
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text(
            value,
            style: TextStyle(
              color: color,
              fontSize: 14,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ],
    );
  }
}
