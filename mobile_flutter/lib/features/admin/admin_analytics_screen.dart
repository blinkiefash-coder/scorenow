import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/resource.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/admin/admin_analytics_charts.dart';
import 'package:scorenow_mobile/features/admin/admin_api.dart';
import 'package:scorenow_mobile/models/support.dart';
import 'package:scorenow_mobile/widgets/app_pill.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/brand_spinner.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

class AdminAnalyticsScreen extends StatefulWidget {
  const AdminAnalyticsScreen({super.key});

  @override
  State<AdminAnalyticsScreen> createState() => _AdminAnalyticsScreenState();
}

class _AdminAnalyticsScreenState extends State<AdminAnalyticsScreen> {
  late final ApiResource<AdminAnalytics> _resource;
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    final services = AppScope.of(context);
    _resource = ApiResource(
      fetch: () async => AdminAnalytics.fromJson(
        await adminRequest(services, 'GET', '/api/admin/analytics'),
      ),
    )..reload();
  }

  @override
  void dispose() {
    _resource.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _resource,
      builder: (context, _) {
        final data = _resource.data;
        if (_resource.loading && data == null) {
          return const FullScreenLoader();
        }
        final summary = data?.summary ?? const <String, num>{};
        int countOf(String key) => (summary[key] ?? 0).toInt();
        return AppScreen(
          onRefresh: _resource.refresh,
          header: const ScreenHeader(
            title: 'Analytics',
            subtitle: 'Last 14 days',
          ),
          children: [
            if (_resource.error.isNotEmpty)
              ErrorBanner(message: _resource.error, onRetry: _resource.reload),
            if (data != null) ...[
              _tileRow(
                StatTile(
                  label: 'Revenue',
                  value: formatMoney(summary['revenue'] ?? 0),
                  tone: AppColors.green,
                ),
                StatTile(
                  label: 'Customers',
                  value: '${countOf('total_users')}',
                ),
              ),
              _tileRow(
                StatTile(label: 'Active', value: '${countOf('active_users')}'),
                StatTile(
                  label: 'Open tickets',
                  value: '${countOf('open_tickets')}',
                ),
              ),
              _tileRow(
                StatTile(
                  label: 'Paid orders',
                  value: '${countOf('paid_payments')}',
                ),
                StatTile(
                  label: 'Failed',
                  value: '${countOf('failed_payments')}',
                  tone: countOf('failed_payments') > 0
                      ? AppColors.red
                      : AppColors.navy,
                ),
              ),
              const SectionTitle('Signups per day'),
              AdminSignupBars(trend: data.trend),
              const SectionTitle('Conversion funnel'),
              if (data.funnel.isEmpty)
                const EmptyState(title: 'No data yet')
              else
                AdminFunnelBars(funnel: data.funnel),
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
