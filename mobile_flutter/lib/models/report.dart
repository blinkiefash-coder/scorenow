enum BureauId {
  cibil('TransUnion CIBIL'),
  equifax('Equifax'),
  experian('Experian'),
  crif('CRIF High Mark');

  const BureauId(this.displayName);

  final String displayName;

  static BureauId parse(String value) => BureauId.values.firstWhere(
    (item) => item.name == value,
    orElse: () => BureauId.cibil,
  );
}

String? _string(Object? value) => value is String ? value : null;
int? _int(Object? value) => value is num ? value.toInt() : null;
num? _num(Object? value) => value is num ? value : null;
List<String> _strings(Object? value) =>
    value is List ? value.whereType<String>().toList() : const [];

class PaymentMonth {
  const PaymentMonth({
    required this.month,
    required this.late,
    required this.reported,
  });

  factory PaymentMonth.fromJson(Map<String, dynamic> json) => PaymentMonth(
    month: json['month'] as String,
    late: _int(json['late']) ?? 0,
    reported: _int(json['reported']) ?? 0,
  );

  final String month;
  final int late;
  final int reported;
}

class BureauReport {
  const BureauReport({
    required this.requestId,
    required this.bureau,
    required this.status,
    required this.failureReason,
    required this.requestedAt,
    required this.creditScore,
    required this.scoreBand,
    required this.reportDate,
    required this.totalAccounts,
    required this.activeAccounts,
    required this.overdueAccounts,
    required this.enquiriesLast6Months,
    required this.totalOutstanding,
    required this.paymentMonths,
    required this.isDemo,
  });

  factory BureauReport.fromJson(Map<String, dynamic> json) => BureauReport(
    requestId: json['request_id'] as String,
    bureau: BureauId.parse(json['bureau'] as String),
    status: json['status'] as String,
    failureReason: _string(json['failure_reason']),
    requestedAt: json['requested_at'] as String,
    creditScore: _int(json['credit_score']),
    scoreBand: _string(json['score_band']),
    reportDate: _string(json['report_date']),
    totalAccounts: _int(json['total_accounts']),
    activeAccounts: _int(json['active_accounts']),
    overdueAccounts: _int(json['overdue_accounts']),
    enquiriesLast6Months: _int(json['enquiries_last_6_months']),
    totalOutstanding: _string(json['total_outstanding']),
    paymentMonths: [
      for (final item in (json['payment_months'] as List<dynamic>? ?? const []))
        PaymentMonth.fromJson(item as Map<String, dynamic>),
    ],
    isDemo: json['is_demo'] as bool? ?? false,
  );

  final String requestId;
  final BureauId bureau;
  final String status;
  final String? failureReason;
  final String requestedAt;
  final int? creditScore;
  final String? scoreBand;
  final String? reportDate;
  final int? totalAccounts;
  final int? activeAccounts;
  final int? overdueAccounts;
  final int? enquiriesLast6Months;
  final String? totalOutstanding;
  final List<PaymentMonth> paymentMonths;
  final bool isDemo;
}

class CustomerProfile {
  const CustomerProfile({
    required this.id,
    required this.nameAsPerPan,
    required this.dateOfBirth,
    required this.city,
    required this.state,
    required this.panLast4,
    required this.kycStatus,
  });

  factory CustomerProfile.fromJson(Map<String, dynamic> json) =>
      CustomerProfile(
        id: json['id'] as String,
        nameAsPerPan: json['name_as_per_pan'] as String? ?? '',
        dateOfBirth: json['date_of_birth'] as String? ?? '',
        city: _string(json['city']),
        state: _string(json['state']),
        panLast4: _string(json['pan_last4']),
        kycStatus: json['kyc_status'] as String? ?? '',
      );

  final String id;
  final String nameAsPerPan;
  final String dateOfBirth;
  final String? city;
  final String? state;
  final String? panLast4;
  final String kycStatus;
}

class HistoryEntry {
  const HistoryEntry({
    required this.bureau,
    required this.score,
    required this.date,
  });

  factory HistoryEntry.fromJson(Map<String, dynamic> json) => HistoryEntry(
    bureau: BureauId.parse(json['bureau'] as String),
    score: _int(json['score']) ?? 0,
    date: json['date'] as String? ?? '',
  );

  final BureauId bureau;
  final int score;
  final String date;
}

class DashboardStatus {
  const DashboardStatus({
    required this.profile,
    required this.reports,
    required this.history,
  });

  factory DashboardStatus.fromJson(Map<String, dynamic> json) =>
      DashboardStatus(
        profile: json['profile'] == null
            ? null
            : CustomerProfile.fromJson(json['profile'] as Map<String, dynamic>),
        reports: [
          for (final item in (json['reports'] as List<dynamic>? ?? const []))
            BureauReport.fromJson(item as Map<String, dynamic>),
        ],
        history: [
          for (final item in (json['history'] as List<dynamic>? ?? const []))
            HistoryEntry.fromJson(item as Map<String, dynamic>),
        ],
      );

  final CustomerProfile? profile;
  final List<BureauReport> reports;
  final List<HistoryEntry> history;

  BureauReport? reportFor(BureauId bureau) {
    for (final report in reports) {
      if (report.bureau == bureau) return report;
    }
    return null;
  }
}

class BureauOption {
  const BureauOption({
    required this.id,
    required this.name,
    required this.available,
  });

  factory BureauOption.fromJson(Map<String, dynamic> json) => BureauOption(
    id: BureauId.parse(json['id'] as String),
    name: json['name'] as String? ?? '',
    available: json['available'] as bool? ?? true,
  );

  final BureauId id;
  final String name;
  final bool available;
}

class ReportOptions {
  const ReportOptions({
    required this.price,
    required this.paymentsEnabled,
    required this.paymentsMode,
    required this.demoMode,
    required this.bureaus,
  });

  factory ReportOptions.fromJson(Map<String, dynamic> json) => ReportOptions(
    price: _int(json['price']) ?? 0,
    paymentsEnabled: json['paymentsEnabled'] as bool? ?? false,
    paymentsMode: _string(json['paymentsMode']),
    demoMode: json['demoMode'] as bool? ?? false,
    bureaus: [
      for (final item in (json['bureaus'] as List<dynamic>? ?? const []))
        BureauOption.fromJson(item as Map<String, dynamic>),
    ],
  );

  final int price;
  final bool paymentsEnabled;
  final String? paymentsMode;
  final bool demoMode;
  final List<BureauOption> bureaus;

  bool isAvailable(BureauId bureau) {
    for (final option in bureaus) {
      if (option.id == bureau) return option.available;
    }
    return true;
  }
}

class ReportPersonal {
  const ReportPersonal({
    required this.name,
    required this.pan,
    required this.dateOfBirth,
    required this.gender,
    required this.phones,
    required this.emails,
    required this.addresses,
  });

  factory ReportPersonal.fromJson(Map<String, dynamic> json) => ReportPersonal(
    name: _string(json['name']),
    pan: _string(json['pan']),
    dateOfBirth: _string(json['dateOfBirth']),
    gender: _string(json['gender']),
    phones: _strings(json['phones']),
    emails: _strings(json['emails']),
    addresses: _strings(json['addresses']),
  );

  final String? name;
  final String? pan;
  final String? dateOfBirth;
  final String? gender;
  final List<String> phones;
  final List<String> emails;
  final List<String> addresses;
}

class ReportSummary {
  const ReportSummary({
    required this.totalAccounts,
    required this.activeAccounts,
    required this.closedAccounts,
    required this.overdueAccounts,
    required this.totalSanctioned,
    required this.totalBalance,
    required this.totalOverdue,
    required this.enquiriesLast6Months,
  });

  factory ReportSummary.fromJson(Map<String, dynamic> json) => ReportSummary(
    totalAccounts: _int(json['totalAccounts']) ?? 0,
    activeAccounts: _int(json['activeAccounts']) ?? 0,
    closedAccounts: _int(json['closedAccounts']) ?? 0,
    overdueAccounts: _int(json['overdueAccounts']) ?? 0,
    totalSanctioned: _num(json['totalSanctioned']) ?? 0,
    totalBalance: _num(json['totalBalance']) ?? 0,
    totalOverdue: _num(json['totalOverdue']) ?? 0,
    enquiriesLast6Months: _int(json['enquiriesLast6Months']) ?? 0,
  );

  final int totalAccounts;
  final int activeAccounts;
  final int closedAccounts;
  final int overdueAccounts;
  final num totalSanctioned;
  final num totalBalance;
  final num totalOverdue;
  final int enquiriesLast6Months;
}

class ScoreFactor {
  const ScoreFactor({
    required this.positive,
    required this.text,
    required this.tip,
  });

  factory ScoreFactor.fromJson(Map<String, dynamic> json) => ScoreFactor(
    positive: json['impact'] == 'positive',
    text: json['text'] as String? ?? '',
    tip: _string(json['tip']),
  );

  final bool positive;
  final String text;
  final String? tip;
}

class AccountPayment {
  const AccountPayment({required this.month, required this.daysPastDue});

  factory AccountPayment.fromJson(Map<String, dynamic> json) => AccountPayment(
    month: json['month'] as String? ?? '',
    daysPastDue: _int(json['daysPastDue']),
  );

  final String month;
  final int? daysPastDue;
}

class ReportAccount {
  const ReportAccount({
    required this.lender,
    required this.type,
    required this.accountNumber,
    required this.status,
    required this.openedOn,
    required this.closedOn,
    required this.sanctionedAmount,
    required this.creditLimit,
    required this.currentBalance,
    required this.overdueAmount,
    required this.lastPaymentOn,
    required this.emiAmount,
    required this.interestRate,
    required this.paymentHistory,
  });

  factory ReportAccount.fromJson(Map<String, dynamic> json) => ReportAccount(
    lender: json['lender'] as String? ?? '',
    type: json['type'] as String? ?? '',
    accountNumber: _string(json['accountNumber']),
    status: json['status'] as String? ?? '',
    openedOn: _string(json['openedOn']),
    closedOn: _string(json['closedOn']),
    sanctionedAmount: _num(json['sanctionedAmount']),
    creditLimit: _num(json['creditLimit']),
    currentBalance: _num(json['currentBalance']),
    overdueAmount: _num(json['overdueAmount']),
    lastPaymentOn: _string(json['lastPaymentOn']),
    emiAmount: _num(json['emiAmount']),
    interestRate: _num(json['interestRate'])?.toDouble(),
    paymentHistory: [
      for (final item in (json['paymentHistory'] as List<dynamic>? ?? const []))
        AccountPayment.fromJson(item as Map<String, dynamic>),
    ],
  );

  final String lender;
  final String type;
  final String? accountNumber;
  final String status;
  final String? openedOn;
  final String? closedOn;
  final num? sanctionedAmount;
  final num? creditLimit;
  final num? currentBalance;
  final num? overdueAmount;
  final String? lastPaymentOn;
  final num? emiAmount;
  final double? interestRate;
  final List<AccountPayment> paymentHistory;
}

class ReportEnquiry {
  const ReportEnquiry({
    required this.lender,
    required this.purpose,
    required this.date,
    required this.amount,
  });

  factory ReportEnquiry.fromJson(Map<String, dynamic> json) => ReportEnquiry(
    lender: json['lender'] as String? ?? '',
    purpose: _string(json['purpose']),
    date: _string(json['date']),
    amount: _num(json['amount']),
  );

  final String lender;
  final String? purpose;
  final String? date;
  final num? amount;
}

class ReportDetail {
  const ReportDetail({
    required this.bureau,
    required this.score,
    required this.reportDate,
    required this.isDemo,
    required this.pdfAvailable,
    required this.personal,
    required this.summary,
    required this.scoreFactors,
    required this.accounts,
    required this.enquiries,
  });

  factory ReportDetail.fromJson(Map<String, dynamic> json) => ReportDetail(
    bureau: BureauId.parse(json['bureau'] as String),
    score: _int(json['score']),
    reportDate: _string(json['reportDate']),
    isDemo: json['isDemo'] as bool? ?? false,
    pdfAvailable: json['pdfAvailable'] as bool? ?? false,
    personal: ReportPersonal.fromJson(
      json['personal'] as Map<String, dynamic>? ?? const {},
    ),
    summary: ReportSummary.fromJson(
      json['summary'] as Map<String, dynamic>? ?? const {},
    ),
    scoreFactors: json['scoreFactors'] == null
        ? null
        : [
            for (final item in (json['scoreFactors'] as List<dynamic>))
              ScoreFactor.fromJson(item as Map<String, dynamic>),
          ],
    accounts: [
      for (final item in (json['accounts'] as List<dynamic>? ?? const []))
        ReportAccount.fromJson(item as Map<String, dynamic>),
    ],
    enquiries: [
      for (final item in (json['enquiries'] as List<dynamic>? ?? const []))
        ReportEnquiry.fromJson(item as Map<String, dynamic>),
    ],
  );

  final BureauId bureau;
  final int? score;
  final String? reportDate;
  final bool isDemo;
  final bool pdfAvailable;
  final ReportPersonal personal;
  final ReportSummary summary;
  final List<ScoreFactor>? scoreFactors;
  final List<ReportAccount> accounts;
  final List<ReportEnquiry> enquiries;
}
