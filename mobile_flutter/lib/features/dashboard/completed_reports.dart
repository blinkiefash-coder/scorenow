import 'package:scorenow_mobile/models/report.dart';

// Completed reports that carry a score, newest first.
List<BureauReport> completedReports(List<BureauReport> reports) {
  return reports
      .where(
        (report) => report.status == 'completed' && report.creditScore != null,
      )
      .toList()
    ..sort((a, b) => (b.reportDate ?? '').compareTo(a.reportDate ?? ''));
}
