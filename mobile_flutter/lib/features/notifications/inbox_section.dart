import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/api.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/resource.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';

class InboxMessage {
  const InboxMessage({
    required this.id,
    required this.title,
    required this.body,
    required this.read,
    required this.createdAt,
  });

  factory InboxMessage.fromJson(Map<String, dynamic> json) => InboxMessage(
    id: '${json['id']}',
    title: json['title'] as String? ?? '',
    body: json['body'] as String? ?? '',
    read: json['read_at'] != null,
    createdAt: json['created_at'] as String?,
  );

  final String id;
  final String title;
  final String body;
  final bool read;
  final String? createdAt;
}

// Messages sent by the team (refund decisions, ticket replies) from the server inbox.
class InboxSection extends StatefulWidget {
  const InboxSection({super.key});

  @override
  State<InboxSection> createState() => _InboxSectionState();
}

class _InboxSectionState extends State<InboxSection> {
  late final ApiResource<List<InboxMessage>> _resource;
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    final services = AppScope.of(context);
    _resource = ApiResource(fetch: () => _fetch(services))..reload();
  }

  @override
  void dispose() {
    _resource.dispose();
    super.dispose();
  }

  Future<List<InboxMessage>> _fetch(AppServices services) async {
    final json = await services.api.request(
      'GET',
      '/api/notifications',
      token: services.auth.customer!.token,
    );
    return [
      for (final item in (json['notifications'] as List<dynamic>? ?? const []))
        InboxMessage.fromJson(item as Map<String, dynamic>),
    ];
  }

  Future<void> _markRead(String? id) async {
    final services = AppScope.of(context);
    try {
      await services.api.request(
        'POST',
        '/api/notifications/read',
        token: services.auth.customer!.token,
        body: {'id': id},
      );
      await _resource.refresh();
    } catch (caught) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(caught is ApiException ? caught.message : 'Could not update messages.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return _resource.builder((context, messages) {
      if (messages == null || messages.isEmpty) return const SizedBox.shrink();
      final unread = messages.where((message) => !message.read).length;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  unread == 0 ? 'Messages from Scorenow' : '$unread unread message${unread == 1 ? '' : 's'}',
                  style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.navy),
                ),
              ),
              if (unread > 0)
                TextButton(onPressed: () => _markRead(null), child: const Text('Mark all read')),
            ],
          ),
          for (final message in messages.take(20))
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: AppCard(
                onTap: message.read ? null : () => _markRead(message.id),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (!message.read)
                          const Padding(
                            padding: EdgeInsets.only(right: 8),
                            child: CircleAvatar(radius: 4, backgroundColor: AppColors.blue),
                          ),
                        Expanded(
                          child: Text(
                            message.title,
                            style: TextStyle(
                              fontWeight: message.read ? FontWeight.w600 : FontWeight.w800,
                              color: AppColors.navy,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(message.body, style: const TextStyle(color: AppColors.muted, fontSize: 13)),
                    const SizedBox(height: 4),
                    Text(
                      formatDateTime(message.createdAt),
                      style: const TextStyle(color: AppColors.muted, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 8),
        ],
      );
    });
  }
}
