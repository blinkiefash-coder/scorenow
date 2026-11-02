import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/models/report.dart';

enum FactorStatus { excellent, good, needsWork, noData }

class FactorInsight {
  const FactorInsight({
    required this.title,
    required this.icon,
    required this.status,
    required this.detail,
    required this.advice,
    required this.progress,
  });

  final String title;
  final IconData icon;
  final FactorStatus status;
  final String detail;
  final String advice;

  /// Visual fill for the factor bar, 0 to 1.
  final double progress;

  String get statusLabel => switch (status) {
    FactorStatus.excellent => 'Excellent',
    FactorStatus.good => 'Good',
    FactorStatus.needsWork => 'Needs Improvement',
    FactorStatus.noData => 'No data',
  };

  Color get tone => switch (status) {
    FactorStatus.excellent => AppColors.green,
    FactorStatus.good => AppColors.blue,
    FactorStatus.needsWork => AppColors.gold,
    FactorStatus.noData => AppColors.muted,
  };
}

/// Derives credit factor insights from report data only. Factors without
/// the required data return [FactorStatus.noData] instead of guessing.
List<FactorInsight> buildFactorInsights({
  required BureauReport report,
  required List<ReportAccount> accounts,
  DateTime? now,
}) {
  final today = now ?? DateTime.now();
  return [
    _paymentHistory(report),
    _utilisation(accounts),
    _creditAge(accounts, today),
    _creditMix(accounts),
    _enquiries(report),
  ];
}

/// Priority-ordered actions for every factor that is not already excellent.
List<({String title, String detail, bool high})> buildNextSteps(
  List<FactorInsight> factors,
) {
  return [
    for (final factor in factors)
      if (factor.status == FactorStatus.needsWork ||
          factor.status == FactorStatus.good)
        (
          title: factor.advice,
          detail: factor.title,
          high: factor.status == FactorStatus.needsWork,
        ),
  ];
}

FactorInsight _paymentHistory(BureauReport report) {
  final overdue = report.overdueAccounts;
  final latePayments = report.paymentMonths.fold<int>(
    0,
    (sum, month) => sum + month.late,
  );
  final reportedMonths = report.paymentMonths
      .where((month) => month.reported > 0)
      .length;

  if (overdue == null && reportedMonths == 0) {
    return const FactorInsight(
      title: 'Payment history',
      icon: Icons.event_available_outlined,
      status: FactorStatus.noData,
      detail: 'Not included in this report',
      advice: 'Pay every EMI and card bill on time',
      progress: 0,
    );
  }
  if ((overdue ?? 0) > 0 || latePayments > 0) {
    final parts = <String>[
      if ((overdue ?? 0) > 0)
        '$overdue overdue account${overdue == 1 ? '' : 's'}',
      if (latePayments > 0)
        '$latePayments late payment${latePayments == 1 ? '' : 's'}',
    ];
    return FactorInsight(
      title: 'Payment history',
      icon: Icons.event_busy_outlined,
      status: FactorStatus.needsWork,
      detail: parts.join(' · '),
      advice: 'Clear overdue payments and stay on schedule',
      progress: 0.35,
    );
  }
  return const FactorInsight(
    title: 'Payment history',
    icon: Icons.event_available_outlined,
    status: FactorStatus.excellent,
    detail: 'No overdue accounts reported',
    advice: 'Keep paying on time',
    progress: 1,
  );
}

FactorInsight _utilisation(List<ReportAccount> accounts) {
  final cards = accounts.where(
    (account) =>
        account.type == 'Credit Card' && (account.creditLimit ?? 0) > 0,
  );
  final limit = cards.fold<num>(
    0,
    (sum, account) => sum + account.creditLimit!,
  );
  final balance = cards.fold<num>(
    0,
    (sum, account) => sum + (account.currentBalance ?? 0),
  );

  if (limit <= 0) {
    return const FactorInsight(
      title: 'Credit utilisation',
      icon: Icons.credit_card_outlined,
      status: FactorStatus.noData,
      detail: 'No credit cards with a limit reported',
      advice: 'Use a credit card lightly and pay it in full',
      progress: 0,
    );
  }
  final percent = (balance / limit * 100).round();
  final detail = '$percent% of your card limit in use';
  if (percent < 30) {
    return FactorInsight(
      title: 'Credit utilisation',
      icon: Icons.credit_card_outlined,
      status: FactorStatus.excellent,
      detail: detail,
      advice: 'Keep card usage below 30%',
      progress: 1,
    );
  }
  if (percent < 50) {
    return FactorInsight(
      title: 'Credit utilisation',
      icon: Icons.credit_card_outlined,
      status: FactorStatus.good,
      detail: detail,
      advice: 'Bring card usage under 30% of the limit',
      progress: 0.7,
    );
  }
  return FactorInsight(
    title: 'Credit utilisation',
    icon: Icons.credit_card_outlined,
    status: FactorStatus.needsWork,
    detail: detail,
    advice: 'Reduce card balances below 30% of the limit',
    progress: 0.35,
  );
}

FactorInsight _creditAge(List<ReportAccount> accounts, DateTime today) {
  DateTime? oldest;
  for (final account in accounts) {
    final opened = DateTime.tryParse(account.openedOn ?? '');
    if (opened != null && (oldest == null || opened.isBefore(oldest))) {
      oldest = opened;
    }
  }
  if (oldest == null) {
    return const FactorInsight(
      title: 'Credit age',
      icon: Icons.timelapse_outlined,
      status: FactorStatus.noData,
      detail: 'No account open dates reported',
      advice: 'Keep your oldest accounts open',
      progress: 0,
    );
  }
  final years = today.difference(oldest).inDays / 365;
  final detail =
      'Oldest account is ${years.floor()} year${years.floor() == 1 ? '' : 's'} old';
  if (years >= 7) {
    return FactorInsight(
      title: 'Credit age',
      icon: Icons.timelapse_outlined,
      status: FactorStatus.excellent,
      detail: detail,
      advice: 'Keep your oldest accounts open',
      progress: 1,
    );
  }
  if (years >= 3) {
    return FactorInsight(
      title: 'Credit age',
      icon: Icons.timelapse_outlined,
      status: FactorStatus.good,
      detail: detail,
      advice: 'Let existing accounts age and avoid closing them',
      progress: 0.7,
    );
  }
  return FactorInsight(
    title: 'Credit age',
    icon: Icons.timelapse_outlined,
    status: FactorStatus.needsWork,
    detail: detail,
    advice: 'Keep accounts open for longer to build history',
    progress: 0.35,
  );
}

FactorInsight _creditMix(List<ReportAccount> accounts) {
  final types = accounts
      .map((account) => account.type)
      .where((type) => type.isNotEmpty)
      .toSet();
  if (types.isEmpty) {
    return const FactorInsight(
      title: 'Credit mix',
      icon: Icons.pie_chart_outline_rounded,
      status: FactorStatus.noData,
      detail: 'No accounts reported',
      advice: 'Build a mix of secured and unsecured credit',
      progress: 0,
    );
  }
  final count = types.length;
  final detail =
      '$count type${count == 1 ? '' : 's'} of credit: ${types.join(', ')}';
  if (count >= 3) {
    return FactorInsight(
      title: 'Credit mix',
      icon: Icons.pie_chart_outline_rounded,
      status: FactorStatus.excellent,
      detail: detail,
      advice: 'Maintain a healthy mix of credit types',
      progress: 1,
    );
  }
  if (count == 2) {
    return FactorInsight(
      title: 'Credit mix',
      icon: Icons.pie_chart_outline_rounded,
      status: FactorStatus.good,
      detail: detail,
      advice: 'Add another type of credit over time if you can manage it',
      progress: 0.7,
    );
  }
  return FactorInsight(
    title: 'Credit mix',
    icon: Icons.pie_chart_outline_rounded,
    status: FactorStatus.needsWork,
    detail: detail,
    advice: 'Diversify your credit types gradually',
    progress: 0.35,
  );
}

FactorInsight _enquiries(BureauReport report) {
  final count = report.enquiriesLast6Months;
  if (count == null) {
    return const FactorInsight(
      title: 'Recent enquiries',
      icon: Icons.search_rounded,
      status: FactorStatus.noData,
      detail: 'Not included in this report',
      advice: 'Apply for credit only when you need it',
      progress: 0,
    );
  }
  final detail = '$count in the last 6 months';
  if (count <= 1) {
    return FactorInsight(
      title: 'Recent enquiries',
      icon: Icons.search_rounded,
      status: FactorStatus.excellent,
      detail: detail,
      advice: 'Keep new applications limited',
      progress: 1,
    );
  }
  if (count <= 3) {
    return FactorInsight(
      title: 'Recent enquiries',
      icon: Icons.search_rounded,
      status: FactorStatus.good,
      detail: detail,
      advice: 'Space out new credit applications',
      progress: 0.7,
    );
  }
  return FactorInsight(
    title: 'Recent enquiries',
    icon: Icons.search_rounded,
    status: FactorStatus.needsWork,
    detail: detail,
    advice: 'Avoid multiple credit applications for now',
    progress: 0.35,
  );
}
