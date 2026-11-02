import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/models/support.dart';

Future<Map<String, dynamic>> adminRequest(
  AppServices services,
  String method,
  String path, {
  Object? body,
}) {
  return services.api.request(
    method,
    path,
    token: services.auth.admin!.token,
    body: body,
  );
}

Future<List<SupportTicket>> fetchAdminTickets(
  AppServices services, {
  String status = '',
}) async {
  final json = await adminRequest(
    services,
    'GET',
    '/api/admin/tickets?status=$status',
  );
  return [
    for (final item in (json['tickets'] as List<dynamic>? ?? const []))
      SupportTicket.fromJson(item as Map<String, dynamic>),
  ];
}
