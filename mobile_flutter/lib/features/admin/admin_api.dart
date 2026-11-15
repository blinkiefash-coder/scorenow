import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/models/admin_crm.dart';
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

// CRM Management Endpoints

Future<Map<CrmStage, int>> fetchCrmPipeline(AppServices services) async {
  final json = await adminRequest(services, 'GET', '/api/admin/crm/pipeline');
  final counts = json['counts'] as Map<String, dynamic>? ?? {};
  return {
    for (final entry in counts.entries)
      CrmStage.parse(entry.key): (entry.value as num?)?.toInt() ?? 0,
  };
}

Future<(List<CrmCustomer>, int)> fetchCrmCustomers(
  AppServices services, {
  int page = 1,
  String query = '',
  String stage = '',
  String tag = '',
}) async {
  final params = [
    'page=$page',
    if (query.isNotEmpty) 'q=${Uri.encodeComponent(query)}',
    if (stage.isNotEmpty) 'stage=$stage',
    if (tag.isNotEmpty) 'tag=$tag',
  ].join('&');
  
  final json = await adminRequest(
    services,
    'GET',
    '/api/admin/crm/customers?$params',
  );
  
  return (
    [
      for (final item in (json['customers'] as List<dynamic>? ?? []))
        CrmCustomer.fromJson(item as Map<String, dynamic>),
    ],
    (json['total'] as num?)?.toInt() ?? 0,
  );
}

Future<List<CrmTask>> fetchCrmTasks(AppServices services) async {
  final json = await adminRequest(services, 'GET', '/api/admin/crm/tasks');
  return [
    for (final item in (json['tasks'] as List<dynamic>? ?? []))
      CrmTask.fromJson(item as Map<String, dynamic>),
  ];
}

Future<CrmTimeline> fetchCrmCustomerTimeline(
  AppServices services,
  String customerId,
) async {
  final json = await adminRequest(
    services,
    'GET',
    '/api/admin/crm/customers/$customerId',
  );
  return CrmTimeline.fromJson(json);
}

Future<void> updateCrmCustomerProfile(
  AppServices services,
  String customerId, {
  CrmStage? stage,
  List<String>? tags,
}) async {
  await adminRequest(
    services,
    'PUT',
    '/api/admin/crm/customers/$customerId/profile',
    body: {
      if (stage != null) 'stage': stage.value,
      if (tags != null) 'tags': tags,
    },
  );
}

Future<void> addCrmActivity(
  AppServices services,
  String customerId, {
  required ActivityKind kind,
  required String body,
}) async {
  await adminRequest(
    services,
    'POST',
    '/api/admin/crm/customers/$customerId/activity',
    body: {
      'kind': kind.value,
      'body': body,
    },
  );
}

Future<void> createCrmTask(
  AppServices services,
  String customerId, {
  required String title,
  String? dueAt,
  String? assigneeEmail,
}) async {
  await adminRequest(
    services,
    'POST',
    '/api/admin/crm/customers/$customerId/task',
    body: {
      'title': title,
      if (dueAt != null) 'due_at': dueAt,
      if (assigneeEmail != null) 'assignee_email': assigneeEmail,
    },
  );
}

// Partner Management Endpoints

Future<List<PartnerAccount>> fetchPartnerAccounts(
  AppServices services,
) async {
  final json = await adminRequest(services, 'GET', '/api/admin/partners');
  return [
    for (final item in (json['accounts'] as List<dynamic>? ?? []))
      PartnerAccount.fromJson(item as Map<String, dynamic>),
  ];
}

Future<List<OwnerCommission>> fetchCommissions(
  AppServices services,
) async {
  final json = await adminRequest(services, 'GET', '/api/admin/commissions');
  return [
    for (final item in (json['commissions'] as List<dynamic>? ?? []))
      OwnerCommission.fromJson(item as Map<String, dynamic>),
  ];
}

Future<List<PortalCustomer>> fetchPartnerCustomers(
  AppServices services,
  String email, {
  required String role,
}) async {
  final json = await adminRequest(
    services,
    'GET',
    '/api/admin/partners/${Uri.encodeComponent(email)}/customers?role=$role',
  );
  return [
    for (final item in (json['customers'] as List<dynamic>? ?? []))
      PortalCustomer.fromJson(item as Map<String, dynamic>),
  ];
}

// Partner Portal Endpoints (for partner/agent users)

Future<Map<String, dynamic>> fetchPartnerPortal(
  AppServices services,
) async {
  final json = await adminRequest(services, 'GET', '/api/admin/portal');
  return {
    'customers': [
      for (final item in (json['customers'] as List<dynamic>? ?? []))
        PortalCustomer.fromJson(item as Map<String, dynamic>),
    ],
    'earnings': {
      'pending_paise': (json['earnings']?['pending_paise'] ?? '0') as String,
      'paid_paise': (json['earnings']?['paid_paise'] ?? '0') as String,
    },
    'commissions': [
      for (final item in (json['commissions'] as List<dynamic>? ?? []))
        CommissionRow.fromJson(item as Map<String, dynamic>),
    ],
  };
}

Future<PayoutProfileForm> fetchPayoutProfile(
  AppServices services,
) async {
  final json = await adminRequest(services, 'GET', '/api/admin/portal/payout-profile');
  return PayoutProfileForm.fromJson(json);
}

Future<void> updatePayoutProfile(
  AppServices services, {
  required String fullName,
  String? upiId,
  String? bankAccountNumber,
  String? ifsc,
}) async {
  await adminRequest(
    services,
    'PUT',
    '/api/admin/portal/payout-profile',
    body: {
      'fullName': fullName,
      if (upiId != null) 'upiId': upiId,
      if (bankAccountNumber != null) 'bankAccountNumber': bankAccountNumber,
      if (ifsc != null) 'ifsc': ifsc,
    },
  );
}
