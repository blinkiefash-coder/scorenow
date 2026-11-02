import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/features/support/support_api.dart';
import 'package:scorenow_mobile/features/support/ticket_tone.dart';
import 'package:scorenow_mobile/models/support.dart';
import 'package:scorenow_mobile/widgets/app_pill.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/brand_spinner.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';
import 'package:scorenow_mobile/widgets/ticket_thread.dart';

class TicketScreen extends StatefulWidget {
  const TicketScreen({super.key, required this.id});

  final String id;

  @override
  State<TicketScreen> createState() => _TicketScreenState();
}

class _TicketScreenState extends State<TicketScreen> {
  AppServices? _services;
  String _token = '';
  List<SupportTicket>? _tickets;
  bool _loading = true;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_services != null) return;
    final services = AppScope.of(context);
    _services = services;
    _token = services.auth.customer?.token ?? '';
    _load();
  }

  Future<void> _load() async {
    final services = _services;
    if (services == null) return;
    try {
      final tickets = await fetchSupportTickets(services.api, _token);
      if (mounted) setState(() => _tickets = tickets);
    } catch (_) {
      // Expo shows "Ticket not found" when the list can't be loaded, so keep the current state.
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _send(String message) async {
    final services = _services;
    if (services == null) return;
    await addSupportComment(
      services.api,
      token: _token,
      ticketId: widget.id,
      message: message,
    );
    await _load();
  }

  SupportTicket? get _ticket {
    for (final ticket in _tickets ?? const <SupportTicket>[]) {
      if (ticket.id == widget.id) return ticket;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final ticket = _ticket;
    return Scaffold(
      appBar: ModalHeader(title: ticket?.subject ?? 'Ticket'),
      body: _body(ticket),
    );
  }

  Widget _body(SupportTicket? ticket) {
    if (_loading && _tickets == null)
      return const Center(child: BrandSpinner());
    if (ticket == null) return const EmptyState(title: 'Ticket not found');
    return TicketThread(
      ticket: ticket,
      viewer: 'customer',
      onSend: _send,
      header: Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Align(
          alignment: Alignment.centerLeft,
          child: AppPill(
            label: titleCase(ticket.status),
            color: ticketTone(ticket.status),
          ),
        ),
      ),
    );
  }
}
