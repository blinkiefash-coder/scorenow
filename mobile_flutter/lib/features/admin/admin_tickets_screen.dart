import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/resource.dart';
import 'package:scorenow_mobile/features/admin/admin_api.dart';
import 'package:scorenow_mobile/features/admin/admin_ticket_card.dart';
import 'package:scorenow_mobile/models/support.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/brand_spinner.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';
import 'package:scorenow_mobile/widgets/segmented_chips.dart';

const _statusFilters = [
  (value: '', label: 'All'),
  (value: 'open', label: 'Open'),
  (value: 'in_progress', label: 'In progress'),
  (value: 'resolved', label: 'Resolved'),
  (value: 'closed', label: 'Closed'),
];

class AdminTicketsScreen extends StatefulWidget {
  const AdminTicketsScreen({super.key});

  @override
  State<AdminTicketsScreen> createState() => _AdminTicketsScreenState();
}

class _AdminTicketsScreenState extends State<AdminTicketsScreen> {
  late final ApiResource<List<SupportTicket>> _resource;
  bool _started = false;
  String _status = '';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    final services = AppScope.of(context);
    _resource = ApiResource(
      fetch: () => fetchAdminTickets(services, status: _status),
    )..reload();
  }

  @override
  void dispose() {
    _resource.dispose();
    super.dispose();
  }

  void _selectStatus(String status) {
    setState(() => _status = status);
    _resource.reload();
  }

  Future<void> _openTicket(SupportTicket ticket) async {
    await context.push('/admin/ticket/${ticket.id}');
    if (mounted) _resource.reload();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _resource,
      builder: (context, _) {
        final tickets = _resource.data;
        return AppScreen(
          onRefresh: _resource.refresh,
          header: const ScreenHeader(
            title: 'Tickets',
            subtitle: 'Customer support queue',
          ),
          children: [
            SegmentedChips<String>(
              options: _statusFilters,
              selected: _status,
              onChanged: _selectStatus,
            ),
            const SizedBox(height: 14),
            if (_resource.error.isNotEmpty)
              ErrorBanner(message: _resource.error, onRetry: _resource.reload),
            if (tickets == null && _resource.loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Center(child: BrandSpinner(size: 40)),
              )
            else if (tickets != null) ...[
              if (tickets.isEmpty)
                const EmptyState(
                  title: 'No tickets',
                  text: 'Nothing matches this filter.',
                )
              else
                for (final ticket in tickets)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: AdminTicketCard(
                      ticket: ticket,
                      onTap: () => _openTicket(ticket),
                    ),
                  ),
            ],
          ],
        );
      },
    );
  }
}
