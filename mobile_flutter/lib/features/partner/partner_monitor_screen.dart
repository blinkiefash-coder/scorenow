import 'dart:async';

import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/resource.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/admin/admin_api.dart';
import 'package:scorenow_mobile/models/admin_crm.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';
import 'package:scorenow_mobile/widgets/app_pill.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/brand_spinner.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

const _pollInterval = Duration(seconds: 20);

class PartnerMonitorScreen extends StatefulWidget {
  const PartnerMonitorScreen({super.key});

  @override
  State<PartnerMonitorScreen> createState() => _PartnerMonitorScreenState();
}

class _PartnerMonitorScreenState extends State<PartnerMonitorScreen> {
  late final ApiResource<PartnerMonitorData> _resource;
  Timer? _poll;
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    final services = AppScope.of(context);
    _resource = ApiResource(fetch: () => fetchPartnerMonitor(services))..reload();
    _poll = Timer.periodic(_pollInterval, (_) => _resource.refresh());
  }

  @override
  void dispose() {
    _poll?.cancel();
    _resource.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AppScreen(
      onRefresh: () => _resource.refresh(),
      header: const ScreenHeader(
        title: 'Partner Monitor',
        subtitle: 'Live partner accounts and activity',
      ),
      children: [
        _resource.builder((context, data) {
          if (data == null) {
            return const FullScreenLoader(label: 'Loading partner activity…');
          }
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SectionTitle('Partners and agents'),
              const SizedBox(height: 8),
              if (data.partners.isEmpty)
                const EmptyState(title: 'No partner accounts', text: 'Create partner accounts from the Team page.'),
              for (final partner in data.partners)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                partner.fullName,
                                style: const TextStyle(fontWeight: FontWeight.w700),
                              ),
                            ),
                            AppPill(
                              label: titleCase(partner.role),
                              color: partner.role == 'partner' ? AppColors.blue : AppColors.violet,
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(partner.email, style: const TextStyle(color: AppColors.muted, fontSize: 12)),
                        const SizedBox(height: 8),
                        Text(
                          '${partner.assignedCustomers} customers · ${partner.completedReports} reports · '
                          'Pending ${formatMoney(partner.pendingPaise / 100)} · Paid ${formatMoney(partner.paidPaise / 100)}',
                          style: const TextStyle(fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 20),
              const SectionTitle('Recent activity'),
              const SizedBox(height: 8),
              if (data.activity.isEmpty)
                const EmptyState(title: 'No activity yet', text: 'Partner actions will be listed here.'),
              for (final row in data.activity)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${titleCase(row.event.replaceAll('_', ' '))}'
                          '${row.customerName != null ? ' · ${row.customerName}' : ''}',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${row.actorEmail} · ${formatDateTime(row.createdAt)}',
                          style: const TextStyle(color: AppColors.muted, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          );
        }),
      ],
    );
  }
}
