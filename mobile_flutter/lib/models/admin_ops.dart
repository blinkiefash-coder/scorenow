num _num(Object? value) => value is num ? value : num.tryParse('${value ?? 0}') ?? 0;

class RevenueReport {
  const RevenueReport({
    required this.totalRevenue,
    required this.paidPayments,
    required this.pendingCommissionPaise,
    required this.paidCommissionPaise,
  });

  factory RevenueReport.fromJson(Map<String, dynamic> json) {
    final commissions = json['commissions'] as Map<String, dynamic>? ?? {};
    final pending = commissions['pending'] as Map<String, dynamic>? ?? {};
    final paid = commissions['paid'] as Map<String, dynamic>? ?? {};
    return RevenueReport(
      totalRevenue: _num(json['totalRevenue']),
      paidPayments: _num(json['paidPayments']).toInt(),
      pendingCommissionPaise: _num(pending['amountPaise']),
      paidCommissionPaise: _num(paid['amountPaise']),
    );
  }

  // Payment amounts are stored in rupees; commission amounts are in paise.
  final num totalRevenue;
  final int paidPayments;
  final num pendingCommissionPaise;
  final num paidCommissionPaise;
}

class RefundRequest {
  const RefundRequest({
    required this.id,
    required this.paymentId,
    required this.reason,
    required this.status,
    required this.decisionNote,
    required this.createdAt,
    required this.amount,
    required this.reportBureau,
    required this.customerName,
    required this.customerMobile,
  });

  factory RefundRequest.fromJson(Map<String, dynamic> json) => RefundRequest(
    id: _num(json['id']).toInt(),
    paymentId: json['payment_id'] as String? ?? '',
    reason: json['reason'] as String? ?? '',
    status: json['status'] as String? ?? 'pending',
    decisionNote: json['decision_note'] as String?,
    createdAt: json['created_at'] as String? ?? '',
    amount: _num(json['amount']),
    reportBureau: json['report_bureau'] as String?,
    customerName: json['customer_name'] as String? ?? '',
    customerMobile: json['customer_mobile'] as String?,
  );

  final int id;
  final String paymentId;
  final String reason;
  final String status;
  final String? decisionNote;
  final String createdAt;
  final num amount;
  final String? reportBureau;
  final String customerName;
  final String? customerMobile;
}

class CannedReply {
  const CannedReply({required this.id, required this.title, required this.body});

  factory CannedReply.fromJson(Map<String, dynamic> json) => CannedReply(
    id: '${json['id']}',
    title: json['title'] as String? ?? '',
    body: json['body'] as String? ?? '',
  );

  final String id;
  final String title;
  final String body;
}
