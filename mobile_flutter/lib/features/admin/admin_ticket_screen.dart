import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/api.dart';
import 'package:scorenow_mobile/core/resource.dart';
import 'package:scorenow_mobile/features/admin/admin_alert.dart';
import 'package:scorenow_mobile/features/admin/admin_api.dart';
import 'package:scorenow_mobile/models/support.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/brand_spinner.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';
import 'package:scorenow_mobile/widgets/segmented_chips.dart';
import 'package:scorenow_mobile/widgets/ticket_thread.dart';

const _statusOptions = [
  (value: 'open', label: 'Open'),
  (value: 'in_progress', label: 'In progress'),
  (value: 'resolved', label: 'Resolved'),
  (value: 'closed', label: 'Closed'),
];

class AdminTicketScreen extends StatefulWidget {
  const AdminTicketScreen({super.key, required this.id});

  final String id;

  @override
  State<AdminTicketScreen> createState() => _AdminTicketScreenState();
}

class _AdminTicketScreenState extends State<AdminTicketScreen> {
  late final ApiResource<List<SupportTicket>> _resource;
  bool _started = false;
  bool _updating = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    final services = AppScope.of(context);
    _resource = ApiResource(fetch: () => fetchAdminTickets(services))..reload();
  }

  @override
  void dispose() {
    _resource.dispose();
    super.dispose();
  }

  Future<void> _changeStatus(SupportTicket ticket, String status) async {
    if (status == ticket.status || _updating) return;
    final services = AppScope.of(context);
    setState(() => _updating = true);
    try {
      await adminRequest(
        services,
        'PATCH',
        '/api/admin/tickets/${ticket.id}',
        body: {'status': status, 'assignedTo': ticket.assignedTo ?? ''},
      );
      await _resource.reload();
    } catch (caught) {
      if (mounted) {
        await showAdminAlert(
          context,
          title: 'Ticket',
          message: caught is ApiException
              ? caught.message
              : 'Unable to update ticket.',
        );
      }
    } finally {
      if (mounted) setState(() => _updating = false);
    }
  }

  Future<void> _sendReply(String message) async {
    final services = AppScope.of(context);
    await adminRequest(
      services,
      'POST',
      '/api/admin/tickets/${widget.id}/comments',
      body: {'message': message},
    );
    await _resource.reload();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _resource,
      builder: (context, _) {
        final tickets = _resource.data;
        final matches = (tickets ?? const <SupportTicket>[]).where(
          (item) => item.id == widget.id,
        );
        final ticket = matches.isEmpty ? null : matches.first;
        if (_resource.loading && tickets == null) {
          return const FullScreenLoader();
        }
        return Scaffold(
          backgroundColor: const Color(0xFFF4F7FC),
          appBar: ModalHeader(
            title: ticket?.subject.isNotEmpty == true
                ? ticket!.subject
                : 'Ticket',
          ),
          body: ticket == null
              ? ListView(
                  padding: const EdgeInsets.all(18),
                  children: [
                    if (_resource.error.isNotEmpty)
                      ErrorBanner(
                        message: _resource.error,
                        onRetry: _resource.reload,
                      ),
                    const EmptyState(title: 'Ticket not found'),
                  ],
                )
              : TicketThread(
                  ticket: ticket,
                  viewer: 'admin',
                  onSend: _sendReply,
                  header: Padding(
                    padding: const EdgeInsets.fromLTRB(18, 12, 18, 4),
                    child: SegmentedChips<String>(
                      options: _statusOptions,
                      selected: ticket.status,
                      onChanged: (status) => _changeStatus(ticket, status),
                    ),
                  ),
                ),
        );
      },
    );
  }
}
