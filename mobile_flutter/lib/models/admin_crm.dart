/// Models for CRM Management functionality
///
/// Represents customer data, activities, tasks, and related CRM entities
/// for admin and partner management screens.

import 'package:scorenow_mobile/models/report.dart';

// CRM Models

enum CrmStage {
  new_('new'),
  contacted('contacted'),
  interested('interested'),
  paid('paid'),
  closed('closed');

  const CrmStage(this.value);
  final String value;

  static CrmStage parse(String value) => CrmStage.values.firstWhere(
    (item) => item.value == value,
    orElse: () => CrmStage.new_,
  );
}

enum ActivityKind {
  note('note'),
  call('call'),
  whatsapp('whatsapp'),
  email('email');

  const ActivityKind(this.value);
  final String value;

  static ActivityKind parse(String value) => ActivityKind.values.firstWhere(
    (item) => item.value == value,
    orElse: () => ActivityKind.note,
  );
}

class CrmCustomer {
  const CrmCustomer({
    required this.id,
    required this.name,
    required this.email,
    required this.mobile,
    required this.createdAt,
    required this.stage,
    required this.tags,
    required this.lastActivityAt,
    required this.openTasks,
  });

  factory CrmCustomer.fromJson(Map<String, dynamic> json) => CrmCustomer(
    id: json['id'] as String,
    name: json['name'] as String,
    email: json['email'] as String?,
    mobile: json['mobile'] as String?,
    createdAt: json['created_at'] as String,
    stage: CrmStage.parse(json['stage'] as String? ?? 'new'),
    tags: List<String>.from((json['tags'] as List<dynamic>?) ?? []),
    lastActivityAt: json['last_activity_at'] as String?,
    openTasks: (json['open_tasks'] as num?)?.toInt() ?? 0,
  );

  final String id;
  final String name;
  final String? email;
  final String? mobile;
  final String createdAt;
  final CrmStage stage;
  final List<String> tags;
  final String? lastActivityAt;
  final int openTasks;

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'email': email,
    'mobile': mobile,
    'created_at': createdAt,
    'stage': stage.value,
    'tags': tags,
    'last_activity_at': lastActivityAt,
    'open_tasks': openTasks,
  };
}

class CrmActivity {
  const CrmActivity({
    required this.id,
    required this.kind,
    required this.body,
    required this.createdBy,
    required this.createdAt,
  });

  factory CrmActivity.fromJson(Map<String, dynamic> json) => CrmActivity(
    id: json['id'] as String,
    kind: ActivityKind.parse(json['kind'] as String? ?? 'note'),
    body: json['body'] as String,
    createdBy: json['created_by'] as String,
    createdAt: json['created_at'] as String,
  );

  final String id;
  final ActivityKind kind;
  final String body;
  final String createdBy;
  final String createdAt;

  Map<String, dynamic> toJson() => {
    'id': id,
    'kind': kind.value,
    'body': body,
    'created_by': createdBy,
    'created_at': createdAt,
  };
}

class CrmTask {
  const CrmTask({
    required this.id,
    required this.title,
    required this.dueAt,
    required this.assigneeEmail,
    required this.status,
    required this.createdBy,
    required this.createdAt,
    required this.completedAt,
  });

  factory CrmTask.fromJson(Map<String, dynamic> json) => CrmTask(
    id: json['id'] as String,
    title: json['title'] as String,
    dueAt: json['due_at'] as String?,
    assigneeEmail: json['assignee_email'] as String?,
    status: json['status'] as String? ?? 'open',
    createdBy: json['created_by'] as String,
    createdAt: json['created_at'] as String,
    completedAt: json['completed_at'] as String?,
  );

  final String id;
  final String title;
  final String? dueAt;
  final String? assigneeEmail;
  final String status;
  final String createdBy;
  final String createdAt;
  final String? completedAt;

  bool get isOverdue =>
    status == 'open' && dueAt != null && DateTime.parse(dueAt!).isBefore(DateTime.now());

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'due_at': dueAt,
    'assignee_email': assigneeEmail,
    'status': status,
    'created_by': createdBy,
    'created_at': createdAt,
    'completed_at': completedAt,
  };
}

class CrmPayment {
  const CrmPayment({
    required this.id,
    required this.planName,
    required this.amount,
    required this.status,
    required this.failureReason,
    required this.createdAt,
  });

  factory CrmPayment.fromJson(Map<String, dynamic> json) => CrmPayment(
    id: json['id'] as String,
    planName: json['plan_name'] as String,
    amount: json['amount'] as String,
    status: json['status'] as String,
    failureReason: json['failure_reason'] as String?,
    createdAt: json['created_at'] as String,
  );

  final String id;
  final String planName;
  final String amount;
  final String status;
  final String? failureReason;
  final String createdAt;

  Map<String, dynamic> toJson() => {
    'id': id,
    'plan_name': planName,
    'amount': amount,
    'status': status,
    'failure_reason': failureReason,
    'created_at': createdAt,
  };
}

class CrmReport {
  const CrmReport({
    required this.id,
    required this.bureau,
    required this.status,
    required this.requestedAt,
  });

  factory CrmReport.fromJson(Map<String, dynamic> json) => CrmReport(
    id: json['id'] as String,
    bureau: json['bureau'] as String,
    status: json['status'] as String,
    requestedAt: json['requested_at'] as String,
  );

  final String id;
  final String bureau;
  final String status;
  final String requestedAt;

  Map<String, dynamic> toJson() => {
    'id': id,
    'bureau': bureau,
    'status': status,
    'requested_at': requestedAt,
  };
}

class CrmTimeline {
  const CrmTimeline({
    required this.profile,
    required this.activities,
    required this.payments,
    required this.reports,
    required this.tasks,
  });

  factory CrmTimeline.fromJson(Map<String, dynamic> json) => CrmTimeline(
    profile: CrmTimelineProfile.fromJson(
      json['profile'] as Map<String, dynamic>,
    ),
    activities: [
      for (final item in (json['activities'] as List<dynamic>? ?? []))
        CrmActivity.fromJson(item as Map<String, dynamic>),
    ],
    payments: [
      for (final item in (json['payments'] as List<dynamic>? ?? []))
        CrmPayment.fromJson(item as Map<String, dynamic>),
    ],
    reports: [
      for (final item in (json['reports'] as List<dynamic>? ?? []))
        CrmReport.fromJson(item as Map<String, dynamic>),
    ],
    tasks: [
      for (final item in (json['tasks'] as List<dynamic>? ?? []))
        CrmTask.fromJson(item as Map<String, dynamic>),
    ],
  );

  final CrmTimelineProfile profile;
  final List<CrmActivity> activities;
  final List<CrmPayment> payments;
  final List<CrmReport> reports;
  final List<CrmTask> tasks;

  Map<String, dynamic> toJson() => {
    'profile': profile.toJson(),
    'activities': activities.map((e) => e.toJson()).toList(),
    'payments': payments.map((e) => e.toJson()).toList(),
    'reports': reports.map((e) => e.toJson()).toList(),
    'tasks': tasks.map((e) => e.toJson()).toList(),
  };
}

class CrmTimelineProfile {
  const CrmTimelineProfile({
    required this.stage,
    required this.tags,
    required this.updatedBy,
    required this.updatedAt,
  });

  factory CrmTimelineProfile.fromJson(Map<String, dynamic> json) =>
    CrmTimelineProfile(
      stage: CrmStage.parse(json['stage'] as String? ?? 'new'),
      tags: List<String>.from((json['tags'] as List<dynamic>?) ?? []),
      updatedBy: json['updated_by'] as String?,
      updatedAt: json['updated_at'] as String?,
    );

  final CrmStage stage;
  final List<String> tags;
  final String? updatedBy;
  final String? updatedAt;

  Map<String, dynamic> toJson() => {
    'stage': stage.value,
    'tags': tags,
    'updated_by': updatedBy,
    'updated_at': updatedAt,
  };
}

// Partner Models

class PortalCustomer {
  const PortalCustomer({
    required this.id,
    required this.fullName,
    required this.assignedAt,
    required this.latestReportStatus,
    required this.paid,
    required this.ownerEmail,
  });

  factory PortalCustomer.fromJson(Map<String, dynamic> json) =>
    PortalCustomer(
      id: json['id'] as String,
      fullName: json['full_name'] as String,
      assignedAt: json['assigned_at'] as String,
      latestReportStatus: json['latest_report_status'] as String?,
      paid: json['paid'] as bool? ?? false,
      ownerEmail: json['owner_email'] as String?,
    );

  final String id;
  final String fullName;
  final String assignedAt;
  final String? latestReportStatus;
  final bool paid;
  final String? ownerEmail;

  Map<String, dynamic> toJson() => {
    'id': id,
    'full_name': fullName,
    'assigned_at': assignedAt,
    'latest_report_status': latestReportStatus,
    'paid': paid,
    'owner_email': ownerEmail,
  };
}

class CommissionRow {
  const CommissionRow({
    required this.id,
    required this.amountPaise,
    required this.status,
    required this.note,
    required this.createdAt,
    required this.paidAt,
    required this.razorpayPayoutId,
  });

  factory CommissionRow.fromJson(Map<String, dynamic> json) => CommissionRow(
    id: json['id'] as String,
    amountPaise: _numOrString(json['amount_paise']),
    status: json['status'] as String,
    note: json['note'] as String?,
    createdAt: json['created_at'] as String,
    paidAt: json['paid_at'] as String?,
    razorpayPayoutId: json['razorpay_payout_id'] as String?,
  );

  final String id;
  final num amountPaise;
  final String status;
  final String? note;
  final String createdAt;
  final String? paidAt;
  final String? razorpayPayoutId;

  Map<String, dynamic> toJson() => {
    'id': id,
    'amount_paise': amountPaise,
    'status': status,
    'note': note,
    'created_at': createdAt,
    'paid_at': paidAt,
    'razorpay_payout_id': razorpayPayoutId,
  };
}

class OwnerCommission extends CommissionRow {
  const OwnerCommission({
    required super.id,
    required super.amountPaise,
    required super.status,
    required super.note,
    required super.createdAt,
    required super.paidAt,
    required super.razorpayPayoutId,
    required this.payeeEmail,
  });

  factory OwnerCommission.fromJson(Map<String, dynamic> json) =>
    OwnerCommission(
      id: json['id'] as String,
      amountPaise: _numOrString(json['amount_paise']),
      status: json['status'] as String,
      note: json['note'] as String?,
      createdAt: json['created_at'] as String,
      paidAt: json['paid_at'] as String?,
      razorpayPayoutId: json['razorpay_payout_id'] as String?,
      payeeEmail: json['payee_email'] as String,
    );

  final String payeeEmail;

  @override
  Map<String, dynamic> toJson() => {
    ...super.toJson(),
    'payee_email': payeeEmail,
  };
}

class PartnerAccount {
  const PartnerAccount({
    required this.email,
    required this.fullName,
    required this.role,
    required this.status,
    required this.parentEmail,
    required this.createdAt,
    required this.assignedCustomers,
    required this.completedReports,
    required this.agentCount,
    required this.pendingPaise,
    required this.paidPaise,
    required this.payoutReady,
  });

  factory PartnerAccount.fromJson(Map<String, dynamic> json) =>
    PartnerAccount(
      email: json['email'] as String,
      fullName: json['full_name'] as String,
      role: json['role'] as String? ?? 'partner',
      status: json['status'] as String,
      parentEmail: json['parent_email'] as String?,
      createdAt: json['created_at'] as String,
      assignedCustomers:
        _stringToInt(json['assigned_customers'] as String?),
      completedReports: _stringToInt(json['completed_reports'] as String?),
      agentCount: _stringToInt(json['agent_count'] as String?),
      pendingPaise: _stringToInt(json['pending_paise'] as String?),
      paidPaise: _stringToInt(json['paid_paise'] as String?),
      payoutReady: json['payout_ready'] as bool? ?? false,
    );

  final String email;
  final String fullName;
  final String role;
  final String status;
  final String? parentEmail;
  final String createdAt;
  final int assignedCustomers;
  final int completedReports;
  final int agentCount;
  final int pendingPaise;
  final int paidPaise;
  final bool payoutReady;

  Map<String, dynamic> toJson() => {
    'email': email,
    'full_name': fullName,
    'role': role,
    'status': status,
    'parent_email': parentEmail,
    'created_at': createdAt,
    'assigned_customers': assignedCustomers.toString(),
    'completed_reports': completedReports.toString(),
    'agent_count': agentCount.toString(),
    'pending_paise': pendingPaise.toString(),
    'paid_paise': paidPaise.toString(),
    'payout_ready': payoutReady,
  };
}

class PayoutProfileForm {
  const PayoutProfileForm({
    required this.upiId,
    required this.bankAccountMasked,
    required this.ifsc,
    required this.hasBank,
  });

  factory PayoutProfileForm.fromJson(Map<String, dynamic> json) =>
    PayoutProfileForm(
      upiId: json['upiId'] as String?,
      bankAccountMasked: json['bankAccountMasked'] as String?,
      ifsc: json['ifsc'] as String?,
      hasBank: json['hasBank'] as bool? ?? false,
    );

  final String? upiId;
  final String? bankAccountMasked;
  final String? ifsc;
  final bool hasBank;

  Map<String, dynamic> toJson() => {
    'upiId': upiId,
    'bankAccountMasked': bankAccountMasked,
    'ifsc': ifsc,
    'hasBank': hasBank,
  };
}

// Helper functions
num _numOrString(Object? value) {
  if (value is num) return value;
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
}

int _stringToInt(String? value) => int.tryParse(value ?? '') ?? 0;
