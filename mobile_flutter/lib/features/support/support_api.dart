import 'package:scorenow_mobile/core/api.dart';
import 'package:scorenow_mobile/models/support.dart';

Future<List<SupportTicket>> fetchSupportTickets(
  ApiClient api,
  String token,
) async {
  final json = await api.request('GET', '/api/support/tickets', token: token);
  return [
    for (final item in (json['tickets'] as List<dynamic>? ?? const []))
      SupportTicket.fromJson(item as Map<String, dynamic>),
  ];
}

Future<void> createSupportTicket(
  ApiClient api, {
  required String token,
  required String subject,
  required String message,
}) => api.request(
  'POST',
  '/api/support/tickets',
  token: token,
  body: {'subject': subject, 'message': message},
);

Future<void> addSupportComment(
  ApiClient api, {
  required String token,
  required String ticketId,
  required String message,
}) => api.request(
  'POST',
  '/api/support/tickets/$ticketId/comments',
  token: token,
  body: {'message': message},
);
