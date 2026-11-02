import 'report.dart';

class TicketComment {
  const TicketComment({
    required this.id,
    required this.authorType,
    required this.authorName,
    required this.message,
    required this.createdAt,
  });

  factory TicketComment.fromJson(Map<String, dynamic> json) => TicketComment(
    id: json['id'].toString(),
    authorType: json['author_type'] as String? ?? 'customer',
    authorName: json['author_name'] as String? ?? '',
    message: json['message'] as String? ?? '',
    createdAt: json['created_at'] as String? ?? '',
  );

  final String id;
  final String authorType;
  final String authorName;
  final String message;
  final String createdAt;
}

class SupportTicket {
  const SupportTicket({
    required this.id,
    required this.requesterName,
    required this.requesterMobile,
    required this.subject,
    required this.message,
    required this.status,
    required this.priority,
    required this.assignedTo,
    required this.createdAt,
    required this.updatedAt,
    required this.comments,
  });

  factory SupportTicket.fromJson(Map<String, dynamic> json) => SupportTicket(
    id: json['id'].toString(),
    requesterName: json['requester_name'] as String? ?? '',
    requesterMobile: json['requester_mobile'] as String? ?? '',
    subject: json['subject'] as String? ?? '',
    message: json['message'] as String? ?? '',
    status: json['status'] as String? ?? 'open',
    priority: json['priority'] as String? ?? 'normal',
    assignedTo: json['assigned_to'] as String?,
    createdAt: json['created_at'] as String? ?? '',
    updatedAt: json['updated_at'] as String? ?? '',
    comments: [
      for (final item in (json['comments'] as List<dynamic>? ?? const []))
        TicketComment.fromJson(item as Map<String, dynamic>),
    ],
  );

  final String id;
  final String requesterName;
  final String requesterMobile;
  final String subject;
  final String message;
  final String status;
  final String priority;
  final String? assignedTo;
  final String createdAt;
  final String updatedAt;
  final List<TicketComment> comments;
}

class AdminCustomer {
  const AdminCustomer({
    required this.id,
    required this.fullName,
    required this.mobile,
    required this.email,
    required this.status,
    required this.createdAt,
    required this.panLast4,
    required this.kycStatus,
    required this.totalPayments,
    required this.paidPayments,
    required this.latestReportStatus,
    required this.lastLogin,
    required this.journeyStage,
  });

  factory AdminCustomer.fromJson(Map<String, dynamic> json) => AdminCustomer(
    id: json['id'].toString(),
    fullName: json['full_name'] as String? ?? '',
    mobile: json['mobile'] as String? ?? '',
    email: json['email'] as String?,
    status: json['status'] as String? ?? '',
    createdAt: json['created_at'] as String? ?? '',
    panLast4: json['pan_last4'] as String?,
    kycStatus: json['kyc_status'] as String?,
    totalPayments: json['total_payments']?.toString() ?? '0',
    paidPayments: json['paid_payments']?.toString() ?? '0',
    latestReportStatus: json['latest_report_status'] as String?,
    lastLogin: json['last_login'] as String?,
    journeyStage: json['journey_stage'] as String? ?? '',
  );

  final String id;
  final String fullName;
  final String mobile;
  final String? email;
  final String status;
  final String createdAt;
  final String? panLast4;
  final String? kycStatus;
  final String totalPayments;
  final String paidPayments;
  final String? latestReportStatus;
  final String? lastLogin;
  final String journeyStage;
}

class AdminCustomerPage {
  const AdminCustomerPage({
    required this.customers,
    required this.page,
    required this.pageSize,
    required this.total,
  });

  factory AdminCustomerPage.fromJson(Map<String, dynamic> json) {
    final pagination = json['pagination'] as Map<String, dynamic>? ?? const {};
    return AdminCustomerPage(
      customers: [
        for (final item in (json['customers'] as List<dynamic>? ?? const []))
          AdminCustomer.fromJson(item as Map<String, dynamic>),
      ],
      page: (pagination['page'] as num?)?.toInt() ?? 1,
      pageSize: (pagination['pageSize'] as num?)?.toInt() ?? 20,
      total: (pagination['total'] as num?)?.toInt() ?? 0,
    );
  }

  final List<AdminCustomer> customers;
  final int page;
  final int pageSize;
  final int total;
}

class AdminPayment {
  const AdminPayment({
    required this.id,
    required this.fullName,
    required this.mobileLast4,
    required this.bureau,
    required this.amount,
    required this.gateway,
    required this.status,
    required this.failureReason,
    required this.createdAt,
  });

  factory AdminPayment.fromJson(Map<String, dynamic> json) => AdminPayment(
    id: json['id'].toString(),
    fullName: json['full_name'] as String? ?? '',
    mobileLast4: json['mobile_last4'] as String? ?? '',
    bureau: json['bureau'] == null
        ? null
        : BureauId.parse(json['bureau'] as String),
    amount: json['amount'] is num
        ? json['amount'] as num
        : num.tryParse('${json['amount']}') ?? 0,
    gateway: json['gateway'] as String? ?? '',
    status: json['status'] as String? ?? '',
    failureReason: json['failure_reason'] as String?,
    createdAt: json['created_at'] as String? ?? '',
  );

  final String id;
  final String fullName;
  final String mobileLast4;
  final BureauId? bureau;
  final num amount;
  final String gateway;
  final String status;
  final String? failureReason;
  final String createdAt;
}

class AdminActivity {
  const AdminActivity({required this.summary, required this.payments});

  factory AdminActivity.fromJson(Map<String, dynamic> json) {
    final summary = json['summary'] as Map<String, dynamic>? ?? const {};
    num read(String key) => summary[key] is num ? summary[key] as num : 0;
    return AdminActivity(
      summary: AdminActivitySummary(
        totalUsers: read('totalUsers').toInt(),
        paidPayments: read('paidPayments').toInt(),
        paymentRevenue: read('paymentRevenue'),
        failedPayments: read('failedPayments').toInt(),
        reportRequests: read('reportRequests').toInt(),
        failedReportRequests: read('failedReportRequests').toInt(),
      ),
      payments: [
        for (final item in (json['payments'] as List<dynamic>? ?? const []))
          AdminPayment.fromJson(item as Map<String, dynamic>),
      ],
    );
  }

  final AdminActivitySummary summary;
  final List<AdminPayment> payments;
}

class AdminActivitySummary {
  const AdminActivitySummary({
    required this.totalUsers,
    required this.paidPayments,
    required this.paymentRevenue,
    required this.failedPayments,
    required this.reportRequests,
    required this.failedReportRequests,
  });

  final int totalUsers;
  final int paidPayments;
  final num paymentRevenue;
  final int failedPayments;
  final int reportRequests;
  final int failedReportRequests;
}

class AnalyticsTrendDay {
  const AnalyticsTrendDay({
    required this.day,
    required this.signups,
    required this.paidOrders,
    required this.revenue,
    required this.failedAttempts,
  });

  factory AnalyticsTrendDay.fromJson(Map<String, dynamic> json) =>
      AnalyticsTrendDay(
        day: json['day'] as String? ?? '',
        signups: (json['signups'] as num?)?.toInt() ?? 0,
        paidOrders: (json['paid_orders'] as num?)?.toInt() ?? 0,
        revenue: (json['revenue'] as num?) ?? 0,
        failedAttempts: (json['failed_attempts'] as num?)?.toInt() ?? 0,
      );

  final String day;
  final int signups;
  final int paidOrders;
  final num revenue;
  final int failedAttempts;
}

class FunnelStep {
  const FunnelStep({required this.step, required this.count});

  factory FunnelStep.fromJson(Map<String, dynamic> json) => FunnelStep(
    step: json['step'] as String? ?? '',
    count: (json['count'] as num?)?.toInt() ?? 0,
  );

  final String step;
  final int count;
}

class AdminAnalytics {
  const AdminAnalytics({
    required this.summary,
    required this.trend,
    required this.funnel,
  });

  factory AdminAnalytics.fromJson(Map<String, dynamic> json) => AdminAnalytics(
    summary: {
      for (final entry
          in (json['summary'] as Map<String, dynamic>? ?? const {}).entries)
        entry.key: (entry.value as num?) ?? 0,
    },
    trend: [
      for (final item in (json['trend'] as List<dynamic>? ?? const []))
        AnalyticsTrendDay.fromJson(item as Map<String, dynamic>),
    ],
    funnel: [
      for (final item in (json['funnel'] as List<dynamic>? ?? const []))
        FunnelStep.fromJson(item as Map<String, dynamic>),
    ],
  );

  final Map<String, num> summary;
  final List<AnalyticsTrendDay> trend;
  final List<FunnelStep> funnel;
}
