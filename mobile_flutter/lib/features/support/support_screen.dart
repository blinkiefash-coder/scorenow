import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/api.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/features/support/support_api.dart';
import 'package:scorenow_mobile/features/support/support_ticket_card.dart';
import 'package:scorenow_mobile/models/support.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/brand_spinner.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  AppServices? _services;
  String _token = '';
  List<SupportTicket>? _tickets;
  String _error = '';
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
    setState(() => _error = '');
    try {
      final tickets = await fetchSupportTickets(services.api, _token);
      if (!mounted) return;
      setState(() => _tickets = tickets);
    } catch (caught) {
      if (!mounted) return;
      setState(
        () => _error = caught is ApiException
            ? caught.message
            : 'Unable to load your tickets.',
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // Refreshes the list when returning from a child route, matching Expo's focus refresh.
  Future<void> _open(String path) async {
    await context.push(path);
    if (mounted) await _load();
  }

  @override
  Widget build(BuildContext context) {
    final tickets = _tickets;
    if (_loading && tickets == null) {
      return const FullScreenLoader(label: 'Loading your tickets…');
    }
    final list = tickets ?? const <SupportTicket>[];

    return AppScreen(
      onRefresh: _load,
      header: ScreenHeader(
        title: 'Support',
        subtitle: 'We usually reply within a day',
        trailing: FilledButton.icon(
          onPressed: () => _open('/new-ticket'),
          icon: const Icon(Icons.add, size: 18),
          label: const Text('New'),
        ),
      ),
      children: [
        if (_error.isNotEmpty) ErrorBanner(message: _error, onRetry: _load),
        if (list.isEmpty && _error.isEmpty)
          const EmptyState(
            title: 'No tickets yet',
            text:
                'Having trouble with a report or payment? Raise a ticket and our team will help.',
          ),
        for (final ticket in list)
          SupportTicketCard(
            ticket: ticket,
            onTap: () => _open('/ticket/${ticket.id}'),
          ),
      ],
    );
  }
}
