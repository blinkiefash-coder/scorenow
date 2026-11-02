import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/resource.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/admin/admin_api.dart';
import 'package:scorenow_mobile/features/admin/admin_payment_card.dart';
import 'package:scorenow_mobile/models/support.dart';
import 'package:scorenow_mobile/widgets/app_pill.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/brand_spinner.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

class AdminOverviewScreen extends StatefulWidget {
  const AdminOverviewScreen({super.key});

  @override
  State<AdminOverviewScreen> createState() => _AdminOverviewScreenState();
}

class _AdminOverviewScreenState extends State<AdminOverviewScreen> {
  late final ApiResource<AdminActivity> _activity;
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    final services = AppScope.of(context);
    _activity = ApiResource(
      fetch: () async => AdminActivity.fromJson(
        await adminRequest(services, 'GET', '/api/admin/activity'),
      ),
    )..reload();
  }

  @override
  void dispose() {
    _activity.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final role = AppScope.of(context).auth.admin?.role ?? '';
    return ListenableBuilder(
      listenable: _activity,
      builder: (context, _) {
        final data = _activity.data;
        if (_activity.loading && data == null) {
          return const FullScreenLoader(label: 'Loading activity…');
        }
        final summary = data?.summary;
        return AppScreen(
          onRefresh: _activity.refresh,
          header: ScreenHeader(
            title: 'Overview',
            subtitle: 'Signed in as ${titleCase(role)}',
          ),
          children: [
            if (_activity.error.isNotEmpty)
              ErrorBanner(message: _activity.error, onRetry: _activity.reload),
            if (summary != null) ...[
              _tileRow(
                StatTile(label: 'Customers', value: '${summary.totalUsers}'),
                StatTile(
                  label: 'Revenue',
                  value: formatMoney(summary.paymentRevenue),
                  tone: AppColors.green,
                ),
              ),
              _tileRow(
                StatTile(
                  label: 'Paid orders',
                  value: '${summary.paidPayments}',
                ),
                StatTile(
                  label: 'Failed payments',
                  value: '${summary.failedPayments}',
                  tone: summary.failedPayments > 0
                      ? AppColors.red
                      : AppColors.navy,
                ),
              ),
              _tileRow(
                StatTile(
                  label: 'Report requests',
                  value: '${summary.reportRequests}',
                ),
                StatTile(
                  label: 'Failed reports',
                  value: '${summary.failedReportRequests}',
                  tone: summary.failedReportRequests > 0
                      ? AppColors.red
                      : AppColors.navy,
                ),
              ),
              const SectionTitle('Recent payments'),
              if (data!.payments.isEmpty)
                const EmptyState(title: 'No payments yet')
              else
                for (final payment in data.payments)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: AdminPaymentCard(payment: payment),
                  ),
            ],
          ],
        );
      },
    );
  }

  Widget _tileRow(Widget left, Widget right) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Expanded(child: left),
          const SizedBox(width: 10),
          Expanded(child: right),
        ],
      ),
    );
  }
}
